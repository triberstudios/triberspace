/**
 * Sketchfab Model Loader
 * Handles downloading and importing Sketchfab models into the editor
 */

import * as THREE from 'three';
import { ZipReader, BlobWriter, Uint8ArrayReader } from '@zip.js/zip.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import { AddObjectCommand } from '../commands/AddObjectCommand.js';

// Configuration constants
const SKETCHFAB_CONFIG = {
	DOWNLOAD_TIMEOUT: 120000, // 2 minutes
	TARGET_MODEL_SIZE: 2, // Target size in units
	AUTO_SCALE_THRESHOLD: 2, // Scale if model is bigger/smaller than target * threshold
	BLOB_URL_BATCH_SIZE: 5, // Process blob URLs in batches to prevent UI blocking
	YIELD_INTERVAL: 0, // Yield control to UI (setTimeout with 0ms)
	MAX_RETRY_ATTEMPTS: 3, // Maximum retry attempts for downloads
	RETRY_DELAY: 1000 // Delay between retries (ms)
};

class SketchfabLoader {

	constructor( editor ) {

		this.editor = editor;
		this.loadingManager = new THREE.LoadingManager();
		this.gltfLoader = null;
		this.downloadCache = new Map(); // Cache for downloaded models
		this.loadersInitialized = false;

	}

	/**
	 * Setup Three.js loaders with extensions
	 */
	setupLoaders() {

		if ( this.loadersInitialized ) return;

		// Setup DRACO loader
		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/libs/draco/gltf/' );

		// Setup basic GLTF loader first
		this.gltfLoader = new GLTFLoader( this.loadingManager );
		this.gltfLoader.setDRACOLoader( dracoLoader );
		this.gltfLoader.setMeshoptDecoder( MeshoptDecoder );

		// Only set up KTX2 if renderer exists and has proper capabilities
		if ( this.editor.renderer && this.editor.renderer.capabilities && this.editor.renderer.capabilities.isWebGL2 ) {

			try {

				// Setup KTX2 loader
				const ktx2Loader = new KTX2Loader( this.loadingManager );
				ktx2Loader.setTranscoderPath( 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/libs/basis/' );

				this.gltfLoader.setKTX2Loader( ktx2Loader );

				// Detect KTX2 support
				if ( this.editor.signals && this.editor.signals.rendererDetectKTX2Support ) {

					this.editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );

				}

			} catch ( error ) {

				// Gracefully handle KTX2 setup errors - GLTF loader will still work without it

			}

		}

		this.loadersInitialized = true;

	}

	/**
	 * Retry wrapper for network operations
	 */
	async retryOperation( operation, maxRetries = SKETCHFAB_CONFIG.MAX_RETRY_ATTEMPTS ) {
		let lastError;

		for ( let attempt = 1; attempt <= maxRetries; attempt++ ) {
			try {
				return await operation();
			} catch ( error ) {
				lastError = error;

				// Don't retry on certain error types
				if ( error.name === 'AbortError' ||
					 error.message.includes( '401' ) ||
					 error.message.includes( '403' ) ||
					 error.message.includes( '404' ) ) {
					throw error;
				}

				if ( attempt < maxRetries ) {
					// Exponential backoff
					const delay = SKETCHFAB_CONFIG.RETRY_DELAY * Math.pow( 2, attempt - 1 );
					await new Promise( resolve => setTimeout( resolve, delay ) );
				}
			}
		}

		throw lastError;
	}

	/**
	 * Download and import a model from Sketchfab
	 */
	async loadModel( downloadData, modelData, onProgress ) {

		try {

			// Ensure loaders are set up before loading
			this.setupLoaders();

			// Show loading indicator
			this.showLoadingIndicator( modelData.name );

			// Check cache first
			const cacheKey = modelData.uid;
			let extractedFiles = this.downloadCache.get( cacheKey );

			if ( extractedFiles ) {

				if ( onProgress ) onProgress( { phase: 'loading_cached', progress: 0.5 } );
				this.updateLoadingProgress( 'loading_cached', 0.5 );

			} else {

				// Download and extract the model archive with progress and retry logic
				extractedFiles = await this.retryOperation( async () => {
					return await this.downloadAndExtract( downloadData.gltf.url, ( progress ) => {
						this.updateLoadingProgress( progress.phase, progress.progress );
						if ( onProgress ) onProgress( progress );
					} );
				} );

				// Cache the extracted files
				this.downloadCache.set( cacheKey, extractedFiles );

			}

			// Find the main scene file
			const sceneFile = this.findSceneFile( extractedFiles );
			if ( ! sceneFile ) {

				throw new Error( 'No valid glTF scene file found in archive' );

			}

			// Create blob URLs for all files asynchronously
			const fileUrls = await this.createBlobUrls( extractedFiles );

			// Update scene file to use blob URLs
			const updatedSceneData = await this.updateSceneReferences( sceneFile, fileUrls );

			// Load the model using GLTFLoader
			const model = await this.loadGLTF( updatedSceneData, fileUrls );

			// Process and add to scene
			this.processModel( model, modelData );

			// Clean up blob URLs
			this.cleanupBlobUrls( fileUrls );

			this.hideLoadingIndicator();

			return model;

		} catch ( error ) {

			this.hideLoadingIndicator();
			throw error;

		}

	}

	/**
	 * Download and extract archive with progress tracking
	 */
	async downloadAndExtract( url, onProgress ) {

		const DOWNLOAD_TIMEOUT = SKETCHFAB_CONFIG.DOWNLOAD_TIMEOUT;

		try {
			if ( onProgress ) {
				onProgress( {
					phase: 'downloading',
					progress: 0
				} );
			}

			// Create abort controller for timeout
			const controller = new AbortController();
			const timeoutId = setTimeout( () => {
				controller.abort();
			}, DOWNLOAD_TIMEOUT );

			let response;
			try {
				// Download with progress tracking and timeout
				response = await fetch( url, {
					signal: controller.signal
				} );

				clearTimeout( timeoutId );

				if ( !response.ok ) {
					throw new Error( `Download failed: ${response.status} ${response.statusText}` );
				}
			} catch ( fetchError ) {
				clearTimeout( timeoutId );
				if ( fetchError.name === 'AbortError' ) {
					throw new Error( 'Download timeout after 2 minutes' );
				}
				throw fetchError;
			}

			const contentLength = response.headers.get( 'content-length' );
			const total = contentLength ? parseInt( contentLength ) : 0;
			let loaded = 0;

			const reader = response.body.getReader();
			const chunks = [];

			while ( true ) {
				const { done, value } = await reader.read();

				if ( done ) break;

				chunks.push( value );
				loaded += value.length;

				if ( onProgress && total > 0 ) {
					onProgress( {
						phase: 'downloading',
						progress: ( loaded / total ) * 0.4 // 40% for download
					} );
				}
			}

			// Combine chunks into single array buffer
			const arrayBuffer = new Uint8Array( loaded );
			let offset = 0;
			for ( const chunk of chunks ) {
				arrayBuffer.set( chunk, offset );
				offset += chunk.length;
			}

			if ( onProgress ) {
				onProgress( {
					phase: 'extracting',
					progress: 0.4
				} );
			}

			// Extract ZIP efficiently
			const zipReader = new ZipReader( new Uint8ArrayReader( arrayBuffer ) );
			const entries = await zipReader.getEntries();

			// Validate ZIP structure
			if ( ! this.validateZipStructure( entries ) ) {
				throw new Error( 'Invalid model archive: missing required glTF files' );
			}

			const extractedFiles = {};

			// Only extract files we need (glTF, textures, etc.)
			const relevantFiles = entries.filter( entry =>
				!entry.directory &&
				( entry.filename.toLowerCase().endsWith( '.gltf' ) ||
				  entry.filename.toLowerCase().endsWith( '.bin' ) ||
				  entry.filename.toLowerCase().match( /\.(jpg|jpeg|png|webp|ktx2)$/i ) )
			);

			let processedFiles = 0;
			const totalFiles = relevantFiles.length;

			for ( const entry of relevantFiles ) {
				const blobWriter = new BlobWriter();
				const blob = await entry.getData( blobWriter );

				extractedFiles[ entry.filename ] = {
					blob: blob,
					filename: entry.filename,
					size: entry.uncompressedSize
				};

				processedFiles++;

				if ( onProgress ) {
					onProgress( {
						phase: 'extracting',
						progress: 0.4 + ( processedFiles / totalFiles ) * 0.6
					} );
				}
			}

			await zipReader.close();

			return extractedFiles;

		} catch ( error ) {
			throw error;
		}

	}

	/**
	 * Validate ZIP structure has required files
	 */
	validateZipStructure( entries ) {
		// Check for at least one .gltf file
		const hasGltf = entries.some( entry =>
			! entry.directory && entry.filename.toLowerCase().endsWith( '.gltf' )
		);

		if ( ! hasGltf ) {
			return false;
		}

		// Check for reasonable file count (not empty, not too many files)
		const fileCount = entries.filter( entry => ! entry.directory ).length;
		if ( fileCount === 0 || fileCount > 1000 ) {
			return false;
		}

		// Check for suspicious file names (basic security check)
		const hasSuspiciousFiles = entries.some( entry => {
			const filename = entry.filename.toLowerCase();
			return filename.includes( '..' ) ||
				   ( filename.includes( '/' ) && filename.startsWith( '/' ) ) ||
				   filename.includes( '\\' );
		} );

		if ( hasSuspiciousFiles ) {
			return false;
		}

		return true;
	}

	/**
	 * Find the main glTF scene file
	 */
	findSceneFile( files ) {

		// Look for scene.gltf first (common Sketchfab convention)
		if ( files[ 'scene.gltf' ] ) {

			return files[ 'scene.gltf' ];

		}

		// Look for any .gltf file
		for ( const filename in files ) {

			if ( filename.toLowerCase().endsWith( '.gltf' ) ) {

				return files[ filename ];

			}

		}

		return null;

	}

	/**
	 * Create blob URLs for all files asynchronously to prevent UI blocking
	 */
	async createBlobUrls( files ) {

		const urls = {};
		const filenames = Object.keys( files );

		for ( let i = 0; i < filenames.length; i++ ) {

			const filename = filenames[ i ];
			const file = files[ filename ];
			urls[ filename ] = URL.createObjectURL( file.blob );

			// Yield control every N files to prevent UI blocking
			if ( i % SKETCHFAB_CONFIG.BLOB_URL_BATCH_SIZE === 0 && i > 0 ) {
				await new Promise( resolve => setTimeout( resolve, SKETCHFAB_CONFIG.YIELD_INTERVAL ) );
			}

		}

		return urls;

	}

	/**
	 * Update glTF scene references to use blob URLs
	 */
	async updateSceneReferences( sceneFile, fileUrls ) {

		const text = await sceneFile.blob.text();
		const gltfData = JSON.parse( text );

		// Update buffer URIs
		if ( gltfData.buffers ) {

			gltfData.buffers.forEach( buffer => {

				if ( buffer.uri && fileUrls[ buffer.uri ] ) {

					buffer.uri = fileUrls[ buffer.uri ];

				}

			} );

		}

		// Update image URIs
		if ( gltfData.images ) {

			gltfData.images.forEach( image => {

				if ( image.uri && fileUrls[ image.uri ] ) {

					image.uri = fileUrls[ image.uri ];

				}

			} );

		}

		return JSON.stringify( gltfData );

	}

	/**
	 * Load glTF data using Three.js GLTFLoader
	 */
	loadGLTF( gltfData, fileUrls ) {

		return new Promise( ( resolve, reject ) => {

			// Create a blob URL for the updated scene data
			const sceneBlob = new Blob( [ gltfData ], { type: 'application/json' } );
			const sceneUrl = URL.createObjectURL( sceneBlob );

			this.gltfLoader.load(
				sceneUrl,
				( gltf ) => {

					URL.revokeObjectURL( sceneUrl );
					resolve( gltf );

				},
				( progress ) => {

					// Loading progress handled by Three.js

				},
				( error ) => {

					URL.revokeObjectURL( sceneUrl );
					reject( error );

				}
			);

		} );

	}

	/**
	 * Process loaded model and add to scene
	 */
	processModel( gltf, modelData ) {

		const model = gltf.scene;

		// Set model name
		model.name = modelData.name || 'Sketchfab Model';

		// Add Sketchfab metadata
		model.userData.sketchfab = {
			uid: modelData.uid,
			name: modelData.name,
			description: modelData.description,
			user: modelData.user,
			license: modelData.license,
			attributionText: this.generateAttributionText( modelData ),
			importedAt: new Date().toISOString()
		};

		// Scale model if needed (Sketchfab models can be very large or small)
		this.autoScaleModel( model );

		// Position model at origin
		model.position.set( 0, 0, 0 );

		// Add to scene using editor command system
		this.editor.execute( new AddObjectCommand( this.editor, model ) );

		// Select the imported model
		this.editor.select( model );

	}

	/**
	 * Auto-scale model to reasonable size
	 */
	autoScaleModel( model ) {

		const box = new THREE.Box3().setFromObject( model );
		const size = box.getSize( new THREE.Vector3() );
		const maxDimension = Math.max( size.x, size.y, size.z );

		// Target size from config
		const targetSize = SKETCHFAB_CONFIG.TARGET_MODEL_SIZE;
		const threshold = SKETCHFAB_CONFIG.AUTO_SCALE_THRESHOLD;

		if ( maxDimension > targetSize * threshold || maxDimension < targetSize / threshold ) {

			const scale = targetSize / maxDimension;
			model.scale.setScalar( scale );

		}

	}

	/**
	 * Generate attribution text for Creative Commons compliance
	 */
	generateAttributionText( modelData ) {

		const licenseName = modelData.license ? modelData.license.label : 'Unknown License';
		const authorName = modelData.user ? modelData.user.displayName : 'Unknown Author';

		return `"${modelData.name}" by ${authorName} is licensed under ${licenseName}. Source: Sketchfab`;

	}

	/**
	 * Clean up blob URLs
	 */
	cleanupBlobUrls( fileUrls ) {

		for ( const url of Object.values( fileUrls ) ) {

			URL.revokeObjectURL( url );

		}

	}

	/**
	 * Show loading indicator with progress
	 */
	showLoadingIndicator( modelName ) {

		// Create loading overlay
		const overlay = document.createElement( 'div' );
		overlay.id = 'sketchfab-loading-overlay';
		overlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.8);
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			z-index: 10000;
			color: white;
			font-family: Arial, sans-serif;
		`;

		const spinner = document.createElement( 'div' );
		spinner.style.cssText = `
			width: 40px;
			height: 40px;
			border: 4px solid #333;
			border-top: 4px solid #fff;
			border-radius: 50%;
			animation: spin 1s linear infinite;
			margin-bottom: 20px;
		`;

		const text = document.createElement( 'div' );
		text.id = 'sketchfab-loading-text';
		text.textContent = `Importing "${modelName}" from Sketchfab...`;
		text.style.fontSize = '16px';
		text.style.textAlign = 'center';
		text.style.marginBottom = '10px';

		// Progress bar
		const progressBar = document.createElement( 'div' );
		progressBar.id = 'sketchfab-progress-bar';
		progressBar.style.cssText = `
			width: 300px;
			height: 4px;
			background: #333;
			border-radius: 2px;
			overflow: hidden;
		`;

		const progressFill = document.createElement( 'div' );
		progressFill.id = 'sketchfab-progress-fill';
		progressFill.style.cssText = `
			width: 0%;
			height: 100%;
			background: #4CAF50;
			border-radius: 2px;
			transition: width 0.3s ease;
		`;

		progressBar.appendChild( progressFill );

		overlay.appendChild( spinner );
		overlay.appendChild( text );
		overlay.appendChild( progressBar );

		document.body.appendChild( overlay );

		// Add animations
		if ( ! document.getElementById( 'sketchfab-spinner-style' ) ) {
			const style = document.createElement( 'style' );
			style.id = 'sketchfab-spinner-style';
			style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
			document.head.appendChild( style );
		}

	}

	/**
	 * Update loading progress
	 */
	updateLoadingProgress( phase, progress ) {

		const text = document.getElementById( 'sketchfab-loading-text' );
		const fill = document.getElementById( 'sketchfab-progress-fill' );

		if ( text && fill ) {
			const phaseText = phase === 'downloading' ? 'Downloading' :
							 phase === 'extracting' ? 'Extracting' :
							 phase === 'loading_cached' ? 'Loading from cache' : 'Processing';

			text.textContent = `${phaseText} model... ${Math.round(progress * 100)}%`;
			fill.style.width = `${progress * 100}%`;
		}

	}

	/**
	 * Hide loading indicator
	 */
	hideLoadingIndicator() {

		const overlay = document.getElementById( 'sketchfab-loading-overlay' );
		if ( overlay ) {

			overlay.remove();

		}

	}

	/**
	 * Clear download cache to free memory
	 */
	clearCache() {

		// Clean up any blob URLs in cached files
		for ( const [ key, files ] of this.downloadCache.entries() ) {
			for ( const filename in files ) {
				if ( files[ filename ].blobUrl ) {
					URL.revokeObjectURL( files[ filename ].blobUrl );
				}
			}
		}

		this.downloadCache.clear();

	}

	/**
	 * Dispose of loader and clean up resources
	 */
	dispose() {

		this.clearCache();

		// Clean up loaders
		if ( this.gltfLoader && this.gltfLoader.dracoLoader ) {
			this.gltfLoader.dracoLoader.dispose();
		}

		this.gltfLoader = null;
		this.loadersInitialized = false;

	}

}

export { SketchfabLoader };