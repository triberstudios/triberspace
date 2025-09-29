import * as THREE from 'three';

import { UIDiv, UIRow, UIText, UIInteger, UINumber, UISelect, UIButton, UIInput, UICheckbox } from './libs/ui.js';

import { SetGeometryCommand } from './commands/SetGeometryCommand.js';
import { SetValueCommand } from './commands/SetValueCommand.js';
import { SetMaterialMapCommand } from './commands/SetMaterialMapCommand.js';

/**
 * Media plane R2 upload utilities
 */
class MediaUploadUtils {
	/**
	 * Upload a file to Cloudflare R2 storage
	 * @param {File} file - The file to upload
	 * @returns {Promise<string>} The CDN URL of the uploaded file
	 */
	static async uploadToR2( file ) {
		try {
			const headers = {
				'Content-Type': 'application/json',
				'X-Dev-Bypass': 'media-plane-editor'
			};

			if ( document.cookie ) {
				headers['Cookie'] = document.cookie;
			}

			// Get presigned upload URL
			const presignedResponse = await fetch( 'http://localhost:3001/api/v1/uploads/presigned', {
				method: 'POST',
				headers: headers,
				credentials: 'include',
				body: JSON.stringify( {
					category: 'temp',
					entityId: 'media-plane-dev',
					filename: file.name,
					fileSize: file.size
				} )
			} );

			if ( !presignedResponse.ok ) {
				throw new Error( `Failed to get presigned URL: ${presignedResponse.status}` );
			}

			const response = await presignedResponse.json();
			const { uploadUrl, cdnUrl } = response.data || response;

			// Upload file to R2
			const uploadResponse = await fetch( uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': file.type },
				body: file
			} );

			if ( !uploadResponse.ok ) {
				throw new Error( `Failed to upload to R2: ${uploadResponse.status}` );
			}

			const fileType = MediaUploadUtils.getFileType( file.name );
			console.log( `📤 ${fileType} uploaded to R2:`, cdnUrl );
			return cdnUrl;

		} catch ( error ) {
			console.error( '📤 R2 upload failed:', error );
			throw error;
		}
	}

	/**
	 * Determine file type from filename
	 * @param {string} filename - The filename to check
	 * @returns {string} 'video', 'image', or 'unknown'
	 */
	static getFileType( filename ) {
		if ( /\.(mp4|webm|ogg|avi|mov)$/i.test( filename ) ) {
			return 'video';
		} else if ( /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test( filename ) ) {
			return 'image';
		}
		return 'unknown';
	}

	/**
	 * Check if URL is a video URL
	 * @param {string} url - The URL to check
	 * @returns {boolean} True if it's a video URL
	 */
	static isVideoUrl( url ) {
		return /\.(mp4|webm|ogg|avi|mov)(\?|$)/i.test( url ) ||
			   url.includes( 'youtube.com' ) ||
			   url.includes( 'vimeo.com' ) ||
			   url.includes( 'twitch.tv' );
	}

	/**
	 * Create a hidden DOM element for media processing
	 * @param {string} tagName - 'video' or 'img'
	 * @returns {HTMLVideoElement|HTMLImageElement} The created element
	 */
	static createHiddenMediaElement( tagName ) {
		const element = document.createElement( tagName );

		if ( tagName === 'video' ) {
			element.crossOrigin = 'anonymous';
			element.playsInline = true;
			element.preload = 'metadata';
		} else if ( tagName === 'img' ) {
			element.crossOrigin = 'anonymous';
		}

		// Hide element
		element.style.position = 'absolute';
		element.style.width = '1px';
		element.style.height = '1px';
		element.style.left = '-9999px';
		element.style.opacity = '0';
		element.style.pointerEvents = 'none';

		document.body.appendChild( element );
		return element;
	}

	/**
	 * Configure video element with user settings
	 * @param {HTMLVideoElement} video - The video element
	 * @param {Object} userData - User settings
	 */
	static configureVideoElement( video, userData ) {
		video.autoplay = userData.autoplay !== false;
		video.loop = userData.loop !== false;
		video.muted = userData.muted !== false;
	}

	/**
	 * Create Three.js texture from media element
	 * @param {HTMLVideoElement|HTMLImageElement} element - The media element
	 * @param {string} type - 'video' or 'image'
	 * @returns {THREE.VideoTexture|THREE.Texture} The created texture
	 */
	static createTexture( element, type ) {
		const texture = type === 'video'
			? new THREE.VideoTexture( element )
			: new THREE.Texture( element );

		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.wrapS = THREE.ClampToEdgeWrapping;
		texture.wrapT = THREE.ClampToEdgeWrapping;
		texture.needsUpdate = true;

		if ( type === 'video' ) {
			texture.format = THREE.RGBAFormat;
			texture.generateMipmaps = false;
		}

		return texture;
	}

	/**
	 * Check if browser supports screen sharing
	 * @returns {boolean} True if screen sharing is supported
	 */
	static supportsScreenShare() {
		return navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';
	}

	/**
	 * Start screen sharing capture
	 * @param {Object} options - Screen capture options
	 * @returns {Promise<MediaStream>} The screen capture stream
	 */
	static async startScreenShare( options = {} ) {
		if ( !MediaUploadUtils.supportsScreenShare() ) {
			throw new Error( 'Screen sharing not supported in this browser' );
		}

		try {
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					cursor: 'always',
					...options.video
				},
				audio: options.audio || false
			});

			console.log( '🖥️ Screen share started:', {
				videoTracks: stream.getVideoTracks().length,
				audioTracks: stream.getAudioTracks().length
			});

			return stream;
		} catch ( error ) {
			console.error( '🖥️ Screen share failed:', error );
			throw error;
		}
	}

	/**
	 * Stop screen sharing
	 * @param {MediaStream} stream - The stream to stop
	 */
	static stopScreenShare( stream ) {
		if ( stream ) {
			stream.getTracks().forEach( track => {
				track.stop();
				console.log( '🖥️ Stopped track:', track.kind );
			});
			console.log( '🖥️ Screen share stopped' );
		}
	}

	/**
	 * Create video element from MediaStream
	 * @param {MediaStream} stream - The media stream
	 * @returns {HTMLVideoElement} The video element
	 */
	static createVideoFromStream( stream ) {
		const video = MediaUploadUtils.createHiddenMediaElement( 'video' );
		video.srcObject = stream;
		video.autoplay = true;
		video.muted = true; // Always mute screen share to prevent feedback
		video.play();
		return video;
	}

	/**
	 * Create a default "Click to share screen" texture for the editor
	 * @param {number} aspectRatio - The aspect ratio (width/height) of the target plane
	 * @returns {THREE.CanvasTexture} The default screenshare texture
	 */
	static createDefaultScreenshareTexture( aspectRatio = 2.0 ) {
		const canvas = document.createElement( 'canvas' );

		// Create canvas with the correct aspect ratio
		const baseHeight = 256;
		canvas.height = baseHeight;
		canvas.width = Math.round( baseHeight * aspectRatio );

		const ctx = canvas.getContext( '2d' );

		// Dark background (matching the design)
		ctx.fillStyle = '#2a2a2a';
		ctx.fillRect( 0, 0, canvas.width, canvas.height );

		// Play button circle
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2 - 20; // Slightly above center to leave room for text
		const circleRadius = 40;

		// Circle background (light gray)
		ctx.fillStyle = '#d0d0d0';
		ctx.beginPath();
		ctx.arc( centerX, centerY, circleRadius, 0, Math.PI * 2 );
		ctx.fill();

		// Play triangle
		ctx.fillStyle = '#2a2a2a';
		ctx.beginPath();
		const triangleSize = 20;
		// Move triangle slightly right to center it visually
		const triangleX = centerX + 3;
		ctx.moveTo( triangleX - triangleSize / 2, centerY - triangleSize / 2 );
		ctx.lineTo( triangleX - triangleSize / 2, centerY + triangleSize / 2 );
		ctx.lineTo( triangleX + triangleSize / 2, centerY );
		ctx.closePath();
		ctx.fill();

		// Text below the play button
		ctx.fillStyle = '#ffffff';
		ctx.font = '24px Arial, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText( 'Click to share screen', centerX, centerY + circleRadius + 35 );

		const texture = new THREE.CanvasTexture( canvas );
		texture.needsUpdate = true;
		return texture;
	}
}

/**
 * Aspect ratio utility functions
 */
const AspectRatioUtils = {
	/**
	 * Get numeric ratio from string
	 * @param {string} ratioString - e.g., "16:9", "4:3", "custom"
	 * @returns {number|null} - The ratio as a decimal (width/height) or null for custom
	 */
	getRatioValue( ratioString ) {
		if ( ratioString === 'custom' ) return null;

		const ratios = {
			'16:9': 16 / 9,
			'4:3': 4 / 3,
			'1:1': 1 / 1,
			'3:2': 3 / 2,
			'21:9': 21 / 9,
			'9:16': 9 / 16
		};

		return ratios[ ratioString ] || null;
	},

	/**
	 * Calculate height from width and ratio
	 * @param {number} width
	 * @param {number} ratio
	 * @returns {number}
	 */
	getHeightFromWidth( width, ratio ) {
		return width / ratio;
	},

	/**
	 * Calculate width from height and ratio
	 * @param {number} height
	 * @param {number} ratio
	 * @returns {number}
	 */
	getWidthFromHeight( height, ratio ) {
		return height * ratio;
	}
};

function GeometryParametersPanel( editor, object ) {

	const strings = editor.strings;
	const signals = editor.signals;

	const container = new UIDiv();

	const geometry = object.geometry;
	const parameters = geometry.parameters;

	// Basic Plane Geometry Controls

	// width
	const widthRow = new UIRow();
	const width = new UINumber( parameters.width ).onChange( updateGeometry );

	widthRow.add( new UIText( strings.getKey( 'sidebar/geometry/plane_geometry/width' ) ).setClass( 'Label' ) );
	widthRow.add( width );

	container.add( widthRow );

	// height
	const heightRow = new UIRow();
	const height = new UINumber( parameters.height ).onChange( updateGeometry );

	heightRow.add( new UIText( strings.getKey( 'sidebar/geometry/plane_geometry/height' ) ).setClass( 'Label' ) );
	heightRow.add( height );

	container.add( heightRow );

	// widthSegments
	const widthSegmentsRow = new UIRow();
	const widthSegments = new UIInteger( parameters.widthSegments ).setRange( 1, Infinity ).onChange( updateGeometry );

	widthSegmentsRow.add( new UIText( strings.getKey( 'sidebar/geometry/plane_geometry/widthsegments' ) ).setClass( 'Label' ) );
	widthSegmentsRow.add( widthSegments );

	container.add( widthSegmentsRow );

	// heightSegments
	const heightSegmentsRow = new UIRow();
	const heightSegments = new UIInteger( parameters.heightSegments ).setRange( 1, Infinity ).onChange( updateGeometry );

	heightSegmentsRow.add( new UIText( strings.getKey( 'sidebar/geometry/plane_geometry/heightsegments' ) ).setClass( 'Label' ) );
	heightSegmentsRow.add( heightSegments );

	container.add( heightSegmentsRow );

	//

	function refreshUI() {
		const parameters = object.geometry.parameters;

		width.setValue( parameters.width );
		height.setValue( parameters.height );
		widthSegments.setValue( parameters.widthSegments );
		heightSegments.setValue( parameters.heightSegments );
	}

	function updateGeometry() {
		editor.execute( new SetGeometryCommand( editor, object, new THREE.PlaneGeometry(
			width.getValue(),
			height.getValue(),
			widthSegments.getValue(),
			heightSegments.getValue()
		) ) );
	}

	// Aspect ratio-aware dimension change handlers
	function onWidthChange() {
		const newWidth = width.getValue();

		// If ratio is locked, adjust height accordingly
		if ( lockRatio.getValue() && aspectRatio.getValue() !== 'custom' ) {
			const ratio = AspectRatioUtils.getRatioValue( aspectRatio.getValue() );
			if ( ratio ) {
				const newHeight = AspectRatioUtils.getHeightFromWidth( newWidth, ratio );
				height.setValue( newHeight );
			}
		}

		updateGeometry();
	}

	function onHeightChange() {
		const newHeight = height.getValue();

		// If ratio is locked, adjust width accordingly
		if ( lockRatio.getValue() && aspectRatio.getValue() !== 'custom' ) {
			const ratio = AspectRatioUtils.getRatioValue( aspectRatio.getValue() );
			if ( ratio ) {
				const newWidth = AspectRatioUtils.getWidthFromHeight( newHeight, ratio );
				width.setValue( newWidth );
			}
		}

		updateGeometry();
	}

	function onAspectRatioChange() {
		const ratioValue = aspectRatio.getValue();

		// Store aspect ratio in userData
		const newUserData = Object.assign( {}, object.userData, { aspectRatio: ratioValue } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Auto-lock ratio when selecting standard ratios
		if ( ratioValue !== 'custom' ) {
			lockRatio.setValue( true );
			onLockRatioChange(); // Update lock state

			// Apply the selected ratio to current dimensions
			const ratio = AspectRatioUtils.getRatioValue( ratioValue );
			if ( ratio ) {
				const currentWidth = width.getValue();
				const newHeight = AspectRatioUtils.getHeightFromWidth( currentWidth, ratio );
				height.setValue( newHeight );
				updateGeometry();
			}
		} else {
			// When selecting custom, unlock the ratio
			lockRatio.setValue( false );
			onLockRatioChange();
		}
	}

	function onLockRatioChange() {
		const isLocked = lockRatio.getValue();

		// Store lock state in userData
		const newUserData = Object.assign( {}, object.userData, { aspectRatioLocked: isLocked } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	function updateSectionVisibility() {
		const type = sourceType.getValue();

		uploadSection.setDisplay( type === 'upload' ? '' : 'none' );
		urlSection.setDisplay( type === 'url' ? '' : 'none' );
		controlsSection.setDisplay( type !== 'none' && type !== 'screenshare' ? '' : 'none' );

	}

	function onSourceTypeChange() {
		const type = sourceType.getValue();

		const newUserData = Object.assign( {}, object.userData, { mediaSourceType: type } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Handle different source types
		if ( type === 'none' ) {
			clearMedia();
		} else if ( type === 'screenshare' ) {
			// Apply default screenshare texture immediately with correct aspect ratio
			const currentAspectRatio = width.getValue() / height.getValue();
			const defaultTexture = MediaUploadUtils.createDefaultScreenshareTexture( currentAspectRatio );
			applyTextureToObject( defaultTexture );

			// Update userData to reflect screenshare configuration
			const screenshareUserData = Object.assign( {}, object.userData, {
				mediaSourceType: 'screenshare',
				mediaType: 'screenshare',
				isScreenshareReady: true
			} );
			editor.execute( new SetValueCommand( editor, object, 'userData', screenshareUserData ) );
		}

		updateSectionVisibility();
	}

	/**
	 * Apply texture to the object's material
	 * @param {THREE.Texture} texture - The texture to apply
	 */
	function applyTextureToObject( texture ) {
		if ( object.material ) {
			editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture ) );
		}
	}

	/**
	 * Handle uploaded media file (unified video/image handler)
	 * @param {File} file - The uploaded file
	 */
	function handleMediaFile( file ) {
		if ( !file ) return;

		const fileType = MediaUploadUtils.getFileType( file.name );
		if ( fileType === 'unknown' ) {
			mediaFileName.setValue( 'Unsupported file type' );
			return;
		}

		mediaFileName.setValue( `Uploading ${fileType}...` );

		// Upload to R2 storage
		MediaUploadUtils.uploadToR2( file )
			.then( ( mediaUrl ) => createMediaTexture( mediaUrl, fileType, file.name ) )
			.catch( ( error ) => {
				console.error( `Failed to upload ${fileType} to R2:`, error );
				mediaFileName.setValue( 'Upload failed' );
			});
	}

	/**
	 * Create Three.js texture from uploaded media
	 * @param {string} mediaUrl - The R2 CDN URL
	 * @param {string} fileType - 'video' or 'image'
	 * @param {string} fileName - Original filename
	 */
	function createMediaTexture( mediaUrl, fileType, fileName ) {
		if ( fileType === 'video' ) {
			createVideoTexture( mediaUrl, fileName );
		} else if ( fileType === 'image' ) {
			createImageTexture( mediaUrl, fileName );
		}
	}

	/**
	 * Create video texture from R2 URL
	 * @param {string} videoUrl - The video URL
	 * @param {string} fileName - Original filename
	 */
	function createVideoTexture( videoUrl, fileName ) {
		const video = MediaUploadUtils.createHiddenMediaElement( 'video' );
		MediaUploadUtils.configureVideoElement( video, object.userData );

		video.src = videoUrl;
		video.load();

		video.onloadeddata = function() {
			const texture = MediaUploadUtils.createTexture( video, 'video' );

			const newUserData = Object.assign( {}, object.userData, {
				mediaType: 'video',
				mediaSource: texture,
				mediaFileName: fileName,
				mediaRestoreInfo: {
					hasVideoTexture: true,
					videoSrc: videoUrl,
					originalFileName: fileName
				}
			} );

			applyMediaTexture( texture, newUserData );
			mediaFileName.setValue( fileName );

			// Handle autoplay
			if ( object.userData.autoplay !== false ) {
				setTimeout(() => {
					video.play().catch( e => {
						console.warn( 'Video autoplay failed:', e );
						video.muted = true;
						video.play().catch( e2 => {
							console.warn( 'Video play failed even with muting:', e2 );
						});
					});
				}, 100);
			}
		};

		video.onerror = function() {
			console.error( 'Failed to load video file:', fileName );
			mediaFileName.setValue( 'Error loading video' );
		};
	}

	/**
	 * Create image texture from R2 URL
	 * @param {string} imageUrl - The image URL
	 * @param {string} fileName - Original filename
	 */
	function createImageTexture( imageUrl, fileName ) {
		const image = MediaUploadUtils.createHiddenMediaElement( 'img' );

		image.onload = function() {
			const texture = MediaUploadUtils.createTexture( image, 'image' );

			const newUserData = Object.assign( {}, object.userData, {
				mediaType: 'image',
				mediaSource: texture,
				mediaFileName: fileName,
				mediaRestoreInfo: {
					hasImageTexture: true,
					imageSrc: imageUrl,
					originalFileName: fileName
				}
			} );

			applyMediaTexture( texture, newUserData );
			mediaFileName.setValue( fileName );
		};

		image.onerror = function() {
			console.error( 'Failed to load image from R2:', imageUrl );
			mediaFileName.setValue( 'Error loading image' );
		};

		image.src = imageUrl;
	}

	/**
	 * Apply media texture to the object
	 * @param {THREE.Texture} texture - The texture to apply
	 * @param {Object} userData - The user data to set
	 */
	function applyMediaTexture( texture, userData ) {
		editor.execute( new SetValueCommand( editor, object, 'userData', userData ) );
		editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture, 0 ) );

		// Update material and force render
		if ( object.material ) {
			object.material.needsUpdate = true;
			object.material.map = texture;
		}

		if ( editor.signals?.sceneGraphChanged ) {
			editor.signals.sceneGraphChanged.dispatch();
		}
	}

	function onUrlChange() {
		const url = mediaUrl.getValue();
		const newUserData = Object.assign( {}, object.userData, { mediaUrl: url } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		if ( url ) {
			loadExternalMedia( url );
		}
	}

	function onAutoplayChange() {
		const newUserData = Object.assign( {}, object.userData, { autoplay: autoplay.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	function onLoopChange() {
		const newUserData = Object.assign( {}, object.userData, { loop: loop.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	function onMutedChange() {
		const newUserData = Object.assign( {}, object.userData, { muted: muted.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	function clearMedia() {
		const newUserData = Object.assign( {}, object.userData, {
			mediaSource: null,
			mediaType: null
		} );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
		editor.execute( new SetMaterialMapCommand( editor, object, 'map', null, 0 ) );
	}



	/**
	 * Load external media from URL
	 * @param {string} url - The media URL
	 */
	function loadExternalMedia( url ) {
		if ( MediaUploadUtils.isVideoUrl( url ) ) {
			loadVideoFromUrl( url );
		} else {
			loadImageFromUrl( url );
		}
	}

	/**
	 * Load video from external URL
	 * @param {string} url - The video URL
	 */
	function loadVideoFromUrl( url ) {
		try {
			const video = MediaUploadUtils.createHiddenMediaElement( 'video' );
			MediaUploadUtils.configureVideoElement( video, object.userData );
			video.src = url;

			video.onloadeddata = function() {
				const texture = MediaUploadUtils.createTexture( video, 'video' );

				const newUserData = Object.assign( {}, object.userData, {
					mediaType: 'video',
					mediaSource: texture,
					mediaRestoreInfo: {
						hasVideoTexture: true,
						videoSrc: url,
						originalFileName: 'external-video'
					}
				} );

				applyMediaTexture( texture, newUserData );

				// Start video if autoplay is enabled
				if ( object.userData.autoplay ) {
					video.play().catch( e => console.warn( 'Video autoplay failed:', e ) );
				}
			};

			video.onerror = function() {
				console.error( 'Failed to load video from URL:', url );
			};

		} catch ( error ) {
			console.error( 'Error loading video:', error );
		}
	}

	/**
	 * Load image from external URL
	 * @param {string} url - The image URL
	 */
	function loadImageFromUrl( url ) {
		try {
			const loader = new THREE.TextureLoader();
			loader.setCrossOrigin( 'anonymous' );

			loader.load(
				url,
				function( texture ) {
					// Configure texture
					texture.minFilter = THREE.LinearFilter;
					texture.magFilter = THREE.LinearFilter;
					texture.wrapS = THREE.ClampToEdgeWrapping;
					texture.wrapT = THREE.ClampToEdgeWrapping;

					const newUserData = Object.assign( {}, object.userData, {
						mediaType: 'image',
						mediaSource: texture,
						mediaRestoreInfo: {
							hasImageTexture: true,
							imageSrc: url,
							originalFileName: 'external-image'
						}
					} );

					applyMediaTexture( texture, newUserData );
				},
				undefined, // progress callback
				function( error ) {
					console.error( 'Failed to load image from URL:', url, error );
				}
			);

		} catch ( error ) {
			console.error( 'Error loading image:', error );
		}
	}

	signals.geometryChanged.add( function ( mesh ) {
		if ( mesh === object ) {
			refreshUI();
		}
	} );

	signals.objectChanged.add( function ( mesh ) {
		if ( mesh === object ) {
			refreshUI();
		}
	} );


	return container;
}

export { GeometryParametersPanel };