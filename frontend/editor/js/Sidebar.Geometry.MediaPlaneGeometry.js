import * as THREE from 'three';

import { UIDiv, UIRow, UIText, UIInteger, UINumber, UISelect, UIButton, UIInput, UICheckbox } from './libs/ui.js';

import { SetGeometryCommand } from './commands/SetGeometryCommand.js';
import { SetValueCommand } from './commands/SetValueCommand.js';
import { SetMaterialMapCommand } from './commands/SetMaterialMapCommand.js';

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

	// Add separator
	container.add( new UIDiv().setClass( 'Separator' ) );

	// Media Configuration Section
	const mediaHeader = new UIRow();
	mediaHeader.add( new UIText( 'Media Configuration' ).setClass( 'Label' ).setFontWeight( 'bold' ) );
	container.add( mediaHeader );

	// Media Source Type
	const sourceTypeRow = new UIRow();
	const sourceType = new UISelect().setOptions( {
		'none': 'None',
		'upload': 'Upload File',
		'url': 'External URL'
	} ).setValue( object.userData.mediaSourceType || 'none' ).onChange( onSourceTypeChange );

	sourceTypeRow.add( new UIText( 'Media Source' ).setClass( 'Label' ) );
	sourceTypeRow.add( sourceType );
	container.add( sourceTypeRow );

	// File Upload Section
	const uploadSection = new UIDiv();
	const uploadRow = new UIRow();

	// Create custom file input for media files
	const mediaFileInput = document.createElement( 'input' );
	mediaFileInput.type = 'file';
	mediaFileInput.accept = 'image/*,video/*';
	mediaFileInput.style.display = 'none';

	const mediaUploadButton = new UIButton( 'Choose File' );
	mediaUploadButton.onClick( function() {
		mediaFileInput.click();
	} );

	const mediaFileName = new UIText( 'No file selected' ).setMarginLeft( '10px' ).setColor( '#888' );

	mediaFileInput.addEventListener( 'change', function( event ) {
		const file = event.target.files[ 0 ];
		if ( file ) {
			mediaFileName.setValue( file.name );
			handleMediaFile( file );
		}
	} );

	uploadRow.add( new UIText( 'Media File' ).setClass( 'Label' ) );
	uploadRow.add( mediaUploadButton );
	uploadRow.add( mediaFileName );
	uploadSection.add( uploadRow );
	document.body.appendChild( mediaFileInput );

	// URL Input Section
	const urlSection = new UIDiv();
	const urlRow = new UIRow();
	const mediaUrl = new UIInput( object.userData.mediaUrl || '' );
	mediaUrl.dom.placeholder = 'Enter video URL...';
	mediaUrl.onChange( onUrlChange );
	urlRow.add( new UIText( 'Media URL' ).setClass( 'Label' ) );
	urlRow.add( mediaUrl );
	urlSection.add( urlRow );

	// Media Controls Section
	const controlsSection = new UIDiv();

	// Autoplay
	const autoplayRow = new UIRow();
	const autoplay = new UICheckbox( object.userData.autoplay || false ).onChange( onAutoplayChange );
	autoplayRow.add( new UIText( 'Autoplay' ).setClass( 'Label' ) );
	autoplayRow.add( autoplay );
	controlsSection.add( autoplayRow );

	// Loop
	const loopRow = new UIRow();
	const loop = new UICheckbox( object.userData.loop || true ).onChange( onLoopChange );
	loopRow.add( new UIText( 'Loop' ).setClass( 'Label' ) );
	loopRow.add( loop );
	controlsSection.add( loopRow );

	// Muted
	const mutedRow = new UIRow();
	const muted = new UICheckbox( object.userData.muted || true ).onChange( onMutedChange );
	mutedRow.add( new UIText( 'Muted' ).setClass( 'Label' ) );
	mutedRow.add( muted );
	controlsSection.add( mutedRow );

	container.add( uploadSection );
	container.add( urlSection );
	container.add( controlsSection );

	// Initial visibility setup
	updateSectionVisibility();

	//

	function refreshUI() {
		const parameters = object.geometry.parameters;

		width.setValue( parameters.width );
		height.setValue( parameters.height );
		widthSegments.setValue( parameters.widthSegments );
		heightSegments.setValue( parameters.heightSegments );

		// Update media controls
		sourceType.setValue( object.userData.mediaSourceType || 'none' );
		mediaUrl.setValue( object.userData.mediaUrl || '' );
		autoplay.setValue( object.userData.autoplay || false );
		loop.setValue( object.userData.loop || true );
		muted.setValue( object.userData.muted || true );

		// Update file name display if there's a media source
		if ( object.userData.mediaFileName ) {
			mediaFileName.setValue( object.userData.mediaFileName );
		}

		updateSectionVisibility();
	}

	function updateGeometry() {
		editor.execute( new SetGeometryCommand( editor, object, new THREE.PlaneGeometry(
			width.getValue(),
			height.getValue(),
			widthSegments.getValue(),
			heightSegments.getValue()
		) ) );
	}

	function updateSectionVisibility() {
		const type = sourceType.getValue();

		uploadSection.setDisplay( type === 'upload' ? '' : 'none' );
		urlSection.setDisplay( type === 'url' ? '' : 'none' );
		controlsSection.setDisplay( type !== 'none' ? '' : 'none' );
	}

	function onSourceTypeChange() {
		const type = sourceType.getValue();

		const newUserData = Object.assign( {}, object.userData, { mediaSourceType: type } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Clear existing media if changing type
		if ( type === 'none' ) {
			clearMedia();
		}

		updateSectionVisibility();
	}

	function handleMediaFile( file ) {
		if ( !file ) return;

		const isVideo = /\.(mp4|webm|ogg|avi|mov)$/i.test( file.name );

		if ( isVideo ) {
			// Show upload progress
			mediaFileName.setValue( 'Uploading video...' );

			// Upload video to R2 storage
			uploadVideoToR2( file ).then( ( videoUrl ) => {
				// Handle video file with R2 URL
				const video = document.createElement( 'video' );
				video.crossOrigin = 'anonymous';
				video.autoplay = object.userData.autoplay !== false;
				video.loop = object.userData.loop !== false;
				video.muted = object.userData.muted !== false;
				video.playsInline = true;
				video.preload = 'metadata';

				// Hide video element but keep it in DOM
				video.style.position = 'absolute';
				video.style.width = '1px';
				video.style.height = '1px';
				video.style.left = '-9999px';
				video.style.opacity = '0';
				video.style.pointerEvents = 'none';
				document.body.appendChild( video );

				video.src = videoUrl; // Use R2 URL instead of base64
				video.load(); // Explicitly load the video

				video.onloadeddata = function() {
					const texture = new THREE.VideoTexture( video );
					texture.minFilter = THREE.LinearFilter;
					texture.magFilter = THREE.LinearFilter;
					texture.format = THREE.RGBAFormat; // Use RGBA instead of RGB for better compatibility
					texture.generateMipmaps = false; // Disable mipmaps for video textures
					texture.wrapS = THREE.ClampToEdgeWrapping;
					texture.wrapT = THREE.ClampToEdgeWrapping;
					texture.needsUpdate = true;

					const newUserData = Object.assign( {}, object.userData, {
						mediaType: 'video',
						mediaSource: texture,
						mediaFileName: file.name,
						mediaRestoreInfo: {
							hasVideoTexture: true,
							videoSrc: videoUrl,
							originalFileName: file.name
						}
					} );
					editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
					editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture, 0 ) );

					// Start playing if autoplay is enabled
					if ( object.userData.autoplay !== false ) {
						// Add a small delay to ensure texture is ready
						setTimeout(() => {
							video.play().catch( e => {
								console.warn( 'Video autoplay failed:', e );
								// Try muting and playing again if autoplay failed
								video.muted = true;
								video.play().catch( e2 => {
									console.warn( 'Video play failed even with muting:', e2 );
								});
							});
						}, 100);
					}

					// Update material to ensure video shows
					if ( object.material ) {
						object.material.needsUpdate = true;
						object.material.map = texture; // Ensure texture is set
					}

					// Force viewport render
					if ( editor.signals && editor.signals.sceneGraphChanged ) {
						editor.signals.sceneGraphChanged.dispatch();
					}
				};

				video.onerror = function() {
					console.error( 'Failed to load video file:', file.name );
					mediaFileName.setValue( 'Error loading video' );
				};

			}).catch( ( error ) => {
				console.error( 'Failed to upload video to R2:', error );
				mediaFileName.setValue( 'Upload failed' );
			});

		} else {
			// Handle image file - upload to R2 like videos
			mediaFileName.setValue( 'Uploading image...' );

			// Upload image to R2 storage
			uploadImageToR2( file ).then( ( imageUrl ) => {
				// Load image from R2 URL
				const image = new Image();
				image.crossOrigin = 'anonymous';

				image.onload = function() {
					const texture = new THREE.Texture( image );
					texture.needsUpdate = true;

					const newUserData = Object.assign( {}, object.userData, {
						mediaType: 'image',
						mediaSource: texture,
						mediaFileName: file.name,
						mediaRestoreInfo: {
							hasImageTexture: true,
							imageSrc: imageUrl,
							originalFileName: file.name
						}
					} );
					editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
					editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture, 0 ) );

					mediaFileName.setValue( file.name );
					console.log( '🖼️ Image texture applied from R2:', imageUrl );
				};

				image.onerror = function() {
					console.error( 'Failed to load image from R2:', imageUrl );
					mediaFileName.setValue( 'Error loading image' );
				};

				image.src = imageUrl; // Use R2 URL instead of base64

			}).catch( ( error ) => {
				console.error( 'Failed to upload image to R2:', error );
				mediaFileName.setValue( 'Upload failed' );
			});
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

	function createVideoTexture( file, src ) {
		try {
			const video = document.createElement( 'video' );
			video.crossOrigin = 'anonymous';
			video.autoplay = object.userData.autoplay || false;
			video.loop = object.userData.loop !== false;
			video.muted = object.userData.muted !== false;
			video.playsInline = true;

			// Hide video element
			video.style.display = 'none';
			document.body.appendChild( video );

			video.onloadeddata = function() {
				const texture = new THREE.VideoTexture( video );
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.format = THREE.RGBAFormat; // Use RGBA instead of RGB for better compatibility
				texture.generateMipmaps = false; // Disable mipmaps for video textures
				texture.wrapS = THREE.ClampToEdgeWrapping;
				texture.wrapT = THREE.ClampToEdgeWrapping;
				texture.needsUpdate = true;
				texture.sourceFile = file.name || 'video';

				const newUserData = Object.assign( {}, object.userData, {
					mediaType: 'video',
					mediaSource: texture
				} );
				editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
				editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture, 0 ) );

				// Start video if autoplay is enabled
				if ( object.userData.autoplay ) {
					video.play().catch( e => console.warn( 'Video autoplay failed:', e ) );
				}
			};

			video.onerror = function() {
				console.error( 'Failed to load video file:', file.name );
			};

			// Set video source
			if ( file instanceof File ) {
				const url = URL.createObjectURL( file );
				video.src = url;
				video.load();
			} else {
				video.src = src;
				video.load();
			}

		} catch ( error ) {
			console.error( 'Error creating video texture:', error );
		}
	}

	function setupVideoTexture( texture ) {
		// Configure video texture settings
		if ( texture.image && texture.image.tagName === 'VIDEO' ) {
			const video = texture.image;
			video.autoplay = object.userData.autoplay || false;
			video.loop = object.userData.loop !== false;
			video.muted = object.userData.muted !== false;
		}
	}

	function loadExternalMedia( url ) {
		// Determine if URL is video or image
		const isVideoUrl = /\.(mp4|webm|ogg|avi|mov)(\?|$)/i.test( url ) ||
						   url.includes( 'youtube.com' ) ||
						   url.includes( 'vimeo.com' ) ||
						   url.includes( 'twitch.tv' );

		if ( isVideoUrl ) {
			loadVideoFromUrl( url );
		} else {
			loadImageFromUrl( url );
		}
	}

	function loadVideoFromUrl( url ) {
		try {
			const video = document.createElement( 'video' );
			video.crossOrigin = 'anonymous';
			video.src = url;
			video.autoplay = object.userData.autoplay || false;
			video.loop = object.userData.loop !== false;
			video.muted = object.userData.muted !== false;
			video.playsInline = true;

			// Hide video element
			video.style.display = 'none';
			document.body.appendChild( video );

			video.onloadeddata = function() {
				const texture = new THREE.VideoTexture( video );
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.format = THREE.RGBAFormat; // Use RGBA instead of RGB for better compatibility
				texture.generateMipmaps = false; // Disable mipmaps for video textures
				texture.wrapS = THREE.ClampToEdgeWrapping;
				texture.wrapT = THREE.ClampToEdgeWrapping;
				texture.needsUpdate = true;

				const newUserData = Object.assign( {}, object.userData, {
					mediaType: 'video',
					mediaSource: texture,
					mediaRestoreInfo: {
						hasVideoTexture: true,
						videoSrc: url,
						originalFileName: 'external-video'
					}
				} );
				editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
				editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture, 0 ) );

				// Start video if autoplay is enabled
				if ( object.userData.autoplay ) {
					video.play().catch( e => console.warn( 'Video autoplay failed:', e ) );
				}
			};

			video.onerror = function() {
				console.error( 'Failed to load video from URL:', url );
				// Could show error message to user here
			};

		} catch ( error ) {
			console.error( 'Error loading video:', error );
		}
	}

	function loadImageFromUrl( url ) {
		try {
			const loader = new THREE.TextureLoader();
			loader.setCrossOrigin( 'anonymous' );

			loader.load(
				url,
				function( texture ) {
					const newUserData = Object.assign( {}, object.userData, {
						mediaType: 'image',
						mediaSource: texture
					} );
					editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
					editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture, 0 ) );
				},
				function( progress ) {
					// Progress callback
				},
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

	// Upload video to Cloudflare R2 storage
	async function uploadVideoToR2( file ) {
		try {
			// Get presigned upload URL from API (with dev bypass for editor)
			const headers = {
				'Content-Type': 'application/json',
			};

			// Try to include cookies if available, but add dev bypass header for editor
			if ( document.cookie ) {
				headers['Cookie'] = document.cookie;
			}

			// Add development bypass header for the editor
			headers['X-Dev-Bypass'] = 'media-plane-editor';

			const presignedResponse = await fetch( 'http://localhost:3001/api/v1/uploads/presigned', {
				method: 'POST',
				headers: headers,
				credentials: 'include',
				body: JSON.stringify( {
					category: 'temp',
					entityId: 'media-plane-dev', // Dev entity ID
					filename: file.name,
					fileSize: file.size
				} )
			} );

			if ( !presignedResponse.ok ) {
				throw new Error( `Failed to get presigned URL: ${presignedResponse.status}` );
			}

			const response = await presignedResponse.json();
			const { uploadUrl, cdnUrl } = response.data || response;

			// Upload file directly to R2 using presigned URL
			const uploadResponse = await fetch( uploadUrl, {
				method: 'PUT',
				headers: {
					'Content-Type': file.type
				},
				body: file
			} );

			if ( !uploadResponse.ok ) {
				throw new Error( `Failed to upload to R2: ${uploadResponse.status}` );
			}

			console.log( '📤 Video uploaded to R2:', cdnUrl );
			return cdnUrl;

		} catch ( error ) {
			console.error( '📤 R2 upload failed:', error );
			throw error;
		}
	}

	// Upload image to Cloudflare R2 storage (similar to video upload)
	async function uploadImageToR2( file ) {
		try {
			// Get presigned upload URL from API (with dev bypass for editor)
			const headers = {
				'Content-Type': 'application/json',
			};

			// Try to include cookies if available, but add dev bypass header for editor
			if ( document.cookie ) {
				headers['Cookie'] = document.cookie;
			}

			// Add development bypass header for the editor
			headers['X-Dev-Bypass'] = 'media-plane-editor';

			const presignedResponse = await fetch( 'http://localhost:3001/api/v1/uploads/presigned', {
				method: 'POST',
				headers: headers,
				credentials: 'include',
				body: JSON.stringify( {
					category: 'temp',
					entityId: 'media-plane-dev', // Dev entity ID
					filename: file.name,
					fileSize: file.size
				} )
			} );

			if ( !presignedResponse.ok ) {
				throw new Error( `Failed to get presigned URL: ${presignedResponse.status}` );
			}

			const response = await presignedResponse.json();
			const { uploadUrl, cdnUrl } = response.data || response;

			// Upload file directly to R2 using presigned URL
			const uploadResponse = await fetch( uploadUrl, {
				method: 'PUT',
				headers: {
					'Content-Type': file.type
				},
				body: file
			} );

			if ( !uploadResponse.ok ) {
				throw new Error( `Failed to upload to R2: ${uploadResponse.status}` );
			}

			console.log( '🖼️ Image uploaded to R2:', cdnUrl );
			return cdnUrl;

		} catch ( error ) {
			console.error( '🖼️ R2 image upload failed:', error );
			throw error;
		}
	}

	return container;
}

export { GeometryParametersPanel };