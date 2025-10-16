import * as THREE from 'three';
import lamejs from '@breezystack/lamejs';

import { UIPanel, UIRow, UIInput, UIButton, UIColor, UICheckbox, UIInteger, UITextArea, UIText, UINumber, UISelect, UIDiv, UIHorizontalRule } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';

import { SetUuidCommand } from './commands/SetUuidCommand.js';
import { SetValueCommand } from './commands/SetValueCommand.js';
import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';
import { SetColorCommand } from './commands/SetColorCommand.js';
import { SetShadowValueCommand } from './commands/SetShadowValueCommand.js';
import { SetMaterialMapCommand } from './commands/SetMaterialMapCommand.js';
import { SetGeometryCommand } from './commands/SetGeometryCommand.js';

import { SidebarObjectAnimation } from './Sidebar.Object.Animation.js';

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
		video.volume = userData.volume !== undefined ? userData.volume : 0.5;
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
	 * Get the video element from a VideoTexture
	 * @param {THREE.VideoTexture} texture - The video texture
	 * @returns {HTMLVideoElement|null} The video element or null if not found
	 */
	static getVideoElementFromTexture( texture ) {
		if ( texture && texture.isVideoTexture && texture.image ) {
			return texture.image;
		}
		return null;
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

	/**
	 * Create a default "Upload media" texture for the editor
	 * @param {number} aspectRatio - The aspect ratio (width/height) of the target plane
	 * @returns {THREE.CanvasTexture} The default upload texture
	 */
	static createDefaultUploadTexture( aspectRatio = 2.0 ) {
		const canvas = document.createElement( 'canvas' );

		// Create canvas with the correct aspect ratio
		const baseHeight = 256;
		canvas.height = baseHeight;
		canvas.width = Math.round( baseHeight * aspectRatio );

		const ctx = canvas.getContext( '2d' );

		// Dark background (matching the design)
		ctx.fillStyle = '#2a2a2a';
		ctx.fillRect( 0, 0, canvas.width, canvas.height );

		// Upload icon circle
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2 - 20; // Slightly above center to leave room for text
		const circleRadius = 40;

		// Circle background (light gray)
		ctx.fillStyle = '#d0d0d0';
		ctx.beginPath();
		ctx.arc( centerX, centerY, circleRadius, 0, Math.PI * 2 );
		ctx.fill();

		// Upload arrow (up arrow icon)
		ctx.fillStyle = '#2a2a2a';
		ctx.beginPath();
		const arrowSize = 20;
		// Draw up arrow
		ctx.moveTo( centerX, centerY - arrowSize / 2 );
		ctx.lineTo( centerX - arrowSize / 2, centerY + arrowSize / 4 );
		ctx.lineTo( centerX - arrowSize / 4, centerY + arrowSize / 4 );
		ctx.lineTo( centerX - arrowSize / 4, centerY + arrowSize / 2 );
		ctx.lineTo( centerX + arrowSize / 4, centerY + arrowSize / 2 );
		ctx.lineTo( centerX + arrowSize / 4, centerY + arrowSize / 4 );
		ctx.lineTo( centerX + arrowSize / 2, centerY + arrowSize / 4 );
		ctx.closePath();
		ctx.fill();

		// Text below the upload icon
		ctx.fillStyle = '#ffffff';
		ctx.font = '24px Arial, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText( 'Upload media', centerX, centerY + circleRadius + 35 );

		const texture = new THREE.CanvasTexture( canvas );
		texture.needsUpdate = true;
		return texture;
	}
}

/**
 * Audio utilities for spatial audio management
 */
class AudioUtils {
	/**
	 * Create or get the audio listener for the given camera
	 * @param {THREE.Camera} camera - The camera to attach the listener to
	 * @returns {THREE.AudioListener} The audio listener
	 */
	static createAudioListener( camera ) {
		// Check if camera already has an audio listener
		let listener = camera.getObjectByProperty( 'type', 'AudioListener' );

		if ( !listener ) {
			listener = new THREE.AudioListener();
			camera.add( listener );
		}

		return listener;
	}

	/**
	 * Create positional audio from a video element
	 * @param {THREE.AudioListener} listener - The audio listener
	 * @param {HTMLVideoElement} video - The video element
	 * @param {Object} audioSettings - Audio configuration settings
	 * @returns {THREE.PositionalAudio} The positional audio object
	 */
	static createPositionalAudio( listener, video, audioSettings = {} ) {
		const audio = new THREE.PositionalAudio( listener );

		// Set default audio settings
		const settings = {
			maxDistance: audioSettings.maxDistance || 50,
			rolloffFactor: audioSettings.rolloffFactor || 1,
			distanceModel: audioSettings.distanceModel || 'inverse',
			volume: audioSettings.volume || 0.5,
			...audioSettings
		};

		// Set audio properties
		audio.setMediaElementSource( video );
		audio.setRefDistance( 1 );
		audio.setMaxDistance( settings.maxDistance );
		audio.setRolloffFactor( settings.rolloffFactor );
		audio.setDistanceModel( settings.distanceModel );
		audio.setVolume( settings.volume );

		return audio;
	}

	/**
	 * Update audio settings for existing positional audio
	 * @param {THREE.PositionalAudio} audio - The positional audio object
	 * @param {Object} settings - New audio settings
	 */
	static updateAudioSettings( audio, settings ) {
		if ( settings.maxDistance !== undefined ) {
			audio.setMaxDistance( settings.maxDistance );
		}
		if ( settings.rolloffFactor !== undefined ) {
			audio.setRolloffFactor( settings.rolloffFactor );
		}
		if ( settings.distanceModel !== undefined ) {
			audio.setDistanceModel( settings.distanceModel );
		}
		if ( settings.volume !== undefined ) {
			audio.setVolume( settings.volume );
		}
	}

	/**
	 * Remove audio from an object
	 * @param {THREE.Object3D} object - The object to remove audio from
	 */
	static removeAudio( object ) {
		const audio = object.getObjectByProperty( 'type', 'PositionalAudio' );
		if ( audio ) {
			audio.disconnect();
			object.remove( audio );
		}
	}

	/**
	 * Get the positional audio object from a THREE.js object
	 * @param {THREE.Object3D} object - The object to search
	 * @returns {THREE.PositionalAudio|null} The positional audio or null
	 */
	static getPositionalAudio( object ) {
		return object.getObjectByProperty( 'type', 'PositionalAudio' ) || null;
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
	},

	/**
	 * Calculate aspect ratio from scale values
	 * @param {number} scaleX
	 * @param {number} scaleY
	 * @returns {number}
	 */
	getRatioFromScale( scaleX, scaleY ) {
		return scaleX / scaleY;
	},

	/**
	 * Find closest standard ratio to a given ratio
	 * @param {number} ratio
	 * @returns {string} The closest standard ratio key or 'custom'
	 */
	findClosestStandardRatio( ratio ) {
		const standardRatios = {
			'16:9': 16 / 9,
			'4:3': 4 / 3,
			'1:1': 1 / 1,
			'3:2': 3 / 2,
			'21:9': 21 / 9,
			'9:16': 9 / 16
		};

		let closestRatio = 'custom';
		let minDifference = Infinity;

		for ( const [ key, value ] of Object.entries( standardRatios ) ) {
			const difference = Math.abs( ratio - value );
			if ( difference < minDifference && difference < 0.01 ) { // Tolerance of 0.01
				minDifference = difference;
				closestRatio = key;
			}
		}

		return closestRatio;
	}
};

function SidebarObject( editor ) {

	const strings = editor.strings;

	const signals = editor.signals;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );
	container.setDisplay( 'none' );

	// Helper functions for property patch buttons
	function checkPropertyPatchExists( object, propertyType ) {
		if ( !object || !editor.patchEditor || !editor.patchEditor.getInteractionGraph ) {
			return false;
		}

		const interactionGraph = editor.patchEditor.getInteractionGraph();
		if ( !interactionGraph || !interactionGraph.nodes ) {
			return false;
		}

		// Check if a property patch for this object already exists
		const existingNode = Array.from( interactionGraph.nodes.values() ).find( node =>
			node.sceneObject === object &&
			node.type === 'ObjectProperty' &&
			node.propertyType === propertyType
		);

		return !!existingNode;
	}

	function updatePropertyButtonState( button, object, propertyType ) {
		const isActive = checkPropertyPatchExists( object, propertyType );

		if ( isActive ) {
			button.setClass( 'Button property-patch-button active' );
		} else {
			button.setClass( 'Button property-patch-button' );
		}
	}

	function focusOnPropertyPatch( object, propertyType ) {
		console.log('🔍 focusOnPropertyPatch called:', { object: object?.name, propertyType });

		if ( !object || !editor.patchEditor || !editor.patchEditor.getInteractionGraph ) {
			console.log('❌ Early exit - missing requirements:', {
				object: !!object,
				patchEditor: !!editor.patchEditor,
				getInteractionGraph: !!(editor.patchEditor && editor.patchEditor.getInteractionGraph)
			});
			return;
		}

		const interactionGraph = editor.patchEditor.getInteractionGraph();
		console.log('📊 InteractionGraph:', interactionGraph);

		if ( !interactionGraph || !interactionGraph.nodes ) {
			console.log('❌ No interaction graph or nodes:', {
				interactionGraph: !!interactionGraph,
				nodes: !!(interactionGraph && interactionGraph.nodes)
			});
			return;
		}

		console.log('🔎 Searching through nodes:', interactionGraph.nodes.size, 'total nodes');

		// Find the existing property patch node
		const existingNode = Array.from( interactionGraph.nodes.values() ).find( node => {
			const matches = node.sceneObject === object &&
				node.type === 'ObjectProperty' &&
				node.propertyType === propertyType;
			console.log('🎯 Checking node:', {
				nodeId: node.id,
				nodeType: node.type,
				nodePropertyType: node.propertyType,
				sceneObjectMatch: node.sceneObject === object,
				matches
			});
			return matches;
		});

		console.log('🎯 Found existing node:', existingNode);

		if ( existingNode && editor.patchEditor.canvas ) {
			console.log('✅ Calling focusOnNode with:', existingNode.id);
			console.log('📍 Canvas object:', editor.patchEditor.canvas);
			// Focus on the node using the focusOnNode method we added to PatchCanvas
			editor.patchEditor.canvas.focusOnNode( existingNode.id );
		} else {
			console.log('❌ Cannot focus - missing requirements:', {
				existingNode: !!existingNode,
				canvas: !!(editor.patchEditor && editor.patchEditor.canvas)
			});
		}
	}

	function createPropertyPatchButton( propertyType ) {
		const button = new UIButton( '' ).setWidth( '20px' ).setMarginLeft( '5px' );
		button.setClass( 'Button property-patch-button' );

		button.onClick( function() {
			console.log('🔘 Property patch button clicked for:', propertyType);

			const object = editor.selected;
			console.log('📦 Selected object:', object?.name);

			if ( !object || !editor.patchEditor ) {
				console.log('❌ Button click early exit:', {
					object: !!object,
					patchEditor: !!editor.patchEditor
				});
				return;
			}

			// Check if a patch already exists
			const patchExists = checkPropertyPatchExists( object, propertyType );
			console.log('🔍 Patch exists check:', patchExists);

			if ( patchExists ) {
				console.log('🎯 Patch exists - calling focusOnPropertyPatch');
				// If patch exists, focus on it in the interaction editor
				focusOnPropertyPatch( object, propertyType );
			} else {
				console.log('➕ No patch exists - creating new one');
				// If no patch exists, create one (original behavior)
				editor.patchEditor.createPropertyPatch( object, propertyType );

				// Update button state after creating patch (original behavior)
				setTimeout(() => {
					updateAllPropertyButtonStates();
				}, 100);
			}
		});

		return button;
	}

	// Store references to buttons for state updates
	let positionArrow, rotationArrow, scaleArrow, materialArrow;

	function updateAllPropertyButtonStates() {
		const object = editor.selected;
		if ( !object ) return;

		if ( positionArrow ) updatePropertyButtonState( positionArrow, object, 'position' );
		if ( rotationArrow ) updatePropertyButtonState( rotationArrow, object, 'rotation' );
		if ( scaleArrow ) updatePropertyButtonState( scaleArrow, object, 'scale' );
		if ( materialArrow ) updatePropertyButtonState( materialArrow, object, 'material' );
	}

	// Helper function to normalize angles to 0-360 degree range
	function normalizeAngle( angleDegrees ) {
		// Normalize to 0-360 range and round to 2 decimal places
		let normalized = angleDegrees % 360;
		if ( normalized < 0 ) normalized += 360;
		return Math.round( normalized * 100 ) / 100;
	}

	// Real-time update variables
	let lastUpdateTime = 0;
	const UPDATE_THROTTLE_MS = 100; // Update every 100ms max
	let previousValues = {
		position: { x: null, y: null, z: null },
		rotation: { x: null, y: null, z: null },
		scale: { x: null, y: null, z: null }
	};

	// Input state tracking for manual editing detection
	let isManuallyEditing = {
		position: { x: false, y: false, z: false },
		rotation: { x: false, y: false, z: false },
		scale: { x: false, y: false, z: false }
	};

	// Function to check if object has active property patches
	function hasActivePropertyPatches( object ) {
		if ( !object || !editor.patchEditor || !editor.patchEditor.getInteractionGraph ) {
			return false;
		}
		const interactionGraph = editor.patchEditor.getInteractionGraph();
		return Array.from( interactionGraph.nodes.values() ).some( node =>
			node.sceneObject === object &&
			node.type === 'ObjectProperty' &&
			( node.propertyType === 'position' || node.propertyType === 'rotation' || node.propertyType === 'scale' )
		);
	}

	// Throttled real-time update function
	function throttledUpdateUI() {
		const now = Date.now();
		if ( now - lastUpdateTime < UPDATE_THROTTLE_MS ) return;
		lastUpdateTime = now;

		const object = editor.selected;
		if ( !object ) return;

		// Only update if there are active property patches for performance
		if ( !hasActivePropertyPatches( object ) ) return;

		// Check position changes
		const newPosX = Math.round( object.position.x * 1000 ) / 1000;
		const newPosY = Math.round( object.position.y * 1000 ) / 1000;
		const newPosZ = Math.round( object.position.z * 1000 ) / 1000;

		if ( newPosX !== previousValues.position.x ) {
			objectPositionX.setValue( newPosX );
			previousValues.position.x = newPosX;
		}
		if ( newPosY !== previousValues.position.y ) {
			objectPositionY.setValue( newPosY );
			previousValues.position.y = newPosY;
		}
		if ( newPosZ !== previousValues.position.z ) {
			objectPositionZ.setValue( newPosZ );
			previousValues.position.z = newPosZ;
		}

		// Check rotation changes with normalization (skip if manually editing)
		const newRotX = normalizeAngle( object.rotation.x * THREE.MathUtils.RAD2DEG );
		const newRotY = normalizeAngle( object.rotation.y * THREE.MathUtils.RAD2DEG );
		const newRotZ = normalizeAngle( object.rotation.z * THREE.MathUtils.RAD2DEG );

		if ( !isManuallyEditing.rotation.x && newRotX !== previousValues.rotation.x ) {
			objectRotationX.setValue( newRotX );
			previousValues.rotation.x = newRotX;
		}
		if ( !isManuallyEditing.rotation.y && newRotY !== previousValues.rotation.y ) {
			objectRotationY.setValue( newRotY );
			previousValues.rotation.y = newRotY;
		}
		if ( !isManuallyEditing.rotation.z && newRotZ !== previousValues.rotation.z ) {
			objectRotationZ.setValue( newRotZ );
			previousValues.rotation.z = newRotZ;
		}

		// Check scale changes
		const newScaleX = Math.round( object.scale.x * 1000 ) / 1000;
		const newScaleY = Math.round( object.scale.y * 1000 ) / 1000;
		const newScaleZ = Math.round( object.scale.z * 1000 ) / 1000;

		if ( newScaleX !== previousValues.scale.x ) {
			objectScaleX.setValue( newScaleX );
			previousValues.scale.x = newScaleX;
		}
		if ( newScaleY !== previousValues.scale.y ) {
			objectScaleY.setValue( newScaleY );
			previousValues.scale.y = newScaleY;
		}
		if ( newScaleZ !== previousValues.scale.z ) {
			objectScaleZ.setValue( newScaleZ );
			previousValues.scale.z = newScaleZ;
		}
	}

	// Actions

	/*
	let objectActions = new UI.Select().setPosition( 'absolute' ).setRight( '8px' ).setFontSize( '11px' );
	objectActions.setOptions( {

		'Actions': 'Actions',
		'Reset Position': 'Reset Position',
		'Reset Rotation': 'Reset Rotation',
		'Reset Scale': 'Reset Scale'

	} );
	objectActions.onClick( function ( event ) {

		event.stopPropagation(); // Avoid panel collapsing

	} );
	objectActions.onChange( function ( event ) {

		let object = editor.selected;

		switch ( this.getValue() ) {

			case 'Reset Position':
				editor.execute( new SetPositionCommand( editor, object, new Vector3( 0, 0, 0 ) ) );
				break;

			case 'Reset Rotation':
				editor.execute( new SetRotationCommand( editor, object, new Euler( 0, 0, 0 ) ) );
				break;

			case 'Reset Scale':
				editor.execute( new SetScaleCommand( editor, object, new Vector3( 1, 1, 1 ) ) );
				break;

		}

		this.setValue( 'Actions' );

	} );
	container.addStatic( objectActions );
	*/

	// type

	const objectTypeRow = new UIRow();
	const objectType = new UIText();

	objectTypeRow.add( new UIText( strings.getKey( 'sidebar/object/type' ) ).setClass( 'Label' ) );
	objectTypeRow.add( objectType );

	container.add( objectTypeRow );

	// uuid

	const objectUUIDRow = new UIRow();
	const objectUUID = new UIInput().setWidth( '102px' ).setFontSize( '12px' ).setDisabled( true );
	const objectUUIDRenew = new UIButton( strings.getKey( 'sidebar/object/new' ) ).setMarginLeft( '7px' ).onClick( function () {

		objectUUID.setValue( THREE.MathUtils.generateUUID() );

		editor.execute( new SetUuidCommand( editor, editor.selected, objectUUID.getValue() ) );

	} );

	objectUUIDRow.add( new UIText( strings.getKey( 'sidebar/object/uuid' ) ).setClass( 'Label' ) );
	objectUUIDRow.add( objectUUID );
	objectUUIDRow.add( objectUUIDRenew );

	container.add( objectUUIDRow );

	// name

	const objectNameRow = new UIRow();
	const objectName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		editor.execute( new SetValueCommand( editor, editor.selected, 'name', objectName.getValue() ) );

	} );

	objectNameRow.add( new UIText( strings.getKey( 'sidebar/object/name' ) ).setClass( 'Label' ) );
	objectNameRow.add( objectName );

	container.add( objectNameRow );

	// position

	const objectPositionRow = new UIRow();
	const objectPositionX = new UINumber().setPrecision( 3 ).setWidth( '50px' ).onChange( update );
	const objectPositionY = new UINumber().setPrecision( 3 ).setWidth( '50px' ).onChange( update );
	const objectPositionZ = new UINumber().setPrecision( 3 ).setWidth( '50px' ).onChange( update );

	// Property patch button for position
	positionArrow = createPropertyPatchButton( 'position' );

	objectPositionRow.add( new UIText( strings.getKey( 'sidebar/object/position' ) ).setClass( 'Label' ) );
	objectPositionRow.add( positionArrow );
	objectPositionRow.add( objectPositionX, objectPositionY, objectPositionZ );

	container.add( objectPositionRow );

	// rotation

	const objectRotationRow = new UIRow();
	const objectRotationX = new UINumber().setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );
	const objectRotationY = new UINumber().setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );
	const objectRotationZ = new UINumber().setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );

	// Add focus/blur handlers to track manual editing
	objectRotationX.dom.addEventListener( 'focus', () => { isManuallyEditing.rotation.x = true; } );
	objectRotationX.dom.addEventListener( 'blur', () => { isManuallyEditing.rotation.x = false; } );
	objectRotationY.dom.addEventListener( 'focus', () => { isManuallyEditing.rotation.y = true; } );
	objectRotationY.dom.addEventListener( 'blur', () => { isManuallyEditing.rotation.y = false; } );
	objectRotationZ.dom.addEventListener( 'focus', () => { isManuallyEditing.rotation.z = true; } );
	objectRotationZ.dom.addEventListener( 'blur', () => { isManuallyEditing.rotation.z = false; } );

	// Property patch button for rotation
	rotationArrow = createPropertyPatchButton( 'rotation' );

	objectRotationRow.add( new UIText( strings.getKey( 'sidebar/object/rotation' ) ).setClass( 'Label' ) );
	objectRotationRow.add( rotationArrow );
	objectRotationRow.add( objectRotationX, objectRotationY, objectRotationZ );

	container.add( objectRotationRow );

	// scale

	const objectScaleRow = new UIRow();
	const objectScaleX = new UINumber( 1 ).setPrecision( 3 ).setWidth( '50px' ).onChange( updateWithAspectRatio );
	const objectScaleY = new UINumber( 1 ).setPrecision( 3 ).setWidth( '50px' ).onChange( updateWithAspectRatio );
	const objectScaleZ = new UINumber( 1 ).setPrecision( 3 ).setWidth( '50px' ).onChange( updateWithAspectRatio );

	// Property patch button for scale
	scaleArrow = createPropertyPatchButton( 'scale' );

	objectScaleRow.add( new UIText( strings.getKey( 'sidebar/object/scale' ) ).setClass( 'Label' ) );
	objectScaleRow.add( scaleArrow );
	objectScaleRow.add( objectScaleX, objectScaleY, objectScaleZ );

	container.add( objectScaleRow );

	// Lock aspect ratio checkbox
	const lockAspectRatioRow = new UIRow();
	const lockAspectRatioCheckbox = new UICheckbox( false );

	// Store on editor object so it's accessible from Viewport
	editor.aspectRatioLocked = false;
	editor.lockedAspectRatio = 1;

	lockAspectRatioCheckbox.onChange( function () {

		editor.aspectRatioLocked = lockAspectRatioCheckbox.getValue();

		if ( editor.aspectRatioLocked && editor.selected ) {

			// Store current ratio when locking
			editor.lockedAspectRatio = editor.selected.scale.x / editor.selected.scale.y;

		}

	} );

	// Add empty label div for alignment with other rows
	const lockAspectRatioLabel = new UIText( '' ).setClass( 'Label' );
	lockAspectRatioRow.add( lockAspectRatioLabel );
	lockAspectRatioRow.add( lockAspectRatioCheckbox );
	lockAspectRatioRow.add( new UIText( 'Lock Aspect Ratio' ) );

	container.add( lockAspectRatioRow );

	// Place on Surface button
	const placeOnSurfaceRow = new UIRow();
	const placeOnSurfaceButton = new UIButton( 'Place on Surface' ).setMarginLeft( '90px' );

	placeOnSurfaceButton.onClick( function () {

		if ( editor.selected && editor.placementMode ) {

			const isActive = editor.placementMode.isActive;
			editor.signals.placementModeChanged.dispatch( ! isActive );

		}

	} );

	placeOnSurfaceRow.add( placeOnSurfaceButton );
	placeOnSurfaceRow.setDisplay( 'none' ); // Hidden for now
	container.add( placeOnSurfaceRow );

	// Update button state when placement mode changes
	signals.placementModeChanged.add( function ( isActive ) {

		if ( isActive ) {

			placeOnSurfaceButton.setClass( 'Button active' );

		} else {

			placeOnSurfaceButton.setClass( 'Button' );

		}

	} );

	// Media Properties Section (only for PlaneGeometry objects)
	const mediaSection = new UIPanel();
	mediaSection.setPadding( '0px' );
	let isMediaPlane = false;

	// Media Shape Selection (only for media objects)
	const mediaShapeRow = new UIRow();
	mediaShapeRow.setMarginTop( '10px' );
	const mediaShape = new UISelect().setOptions( {
		'plane': 'Plane',
		'sphere': 'Sphere',
		'box': 'Box',
		'cylinder': 'Cylinder'
	} ).onChange( onMediaShapeChange );

	mediaShapeRow.add( new UIText( 'Media Shape' ).setClass( 'Label' ) );
	mediaShapeRow.add( mediaShape );
	mediaSection.add( mediaShapeRow );

	// Double-Sided Control (only for media objects)
	const doubleSidedRow = new UIRow();
	const doubleSided = new UICheckbox( true ).onChange( onDoubleSidedChange );

	doubleSidedRow.add( new UIText( 'Double Sided' ).setClass( 'Label' ) );
	doubleSidedRow.add( doubleSided );
	mediaSection.add( doubleSidedRow );

	// Media Source dropdown
	const mediaSourceRow = new UIRow();
	const mediaSourceType = new UISelect().setOptions( {
		'upload': 'Upload File',
		'screenshare': 'Screen Share'
	} ).onChange( onMediaSourceTypeChange );

	mediaSourceRow.add( new UIText( 'Media Source' ).setClass( 'Label' ) );
	mediaSourceRow.add( mediaSourceType );
	mediaSection.add( mediaSourceRow );

	// File Upload Section
	const uploadSection = new UIDiv();
	const uploadRow = new UIRow();

	// Create custom file input for media files
	const mediaFileInput = document.createElement( 'input' );
	mediaFileInput.type = 'file';
	mediaFileInput.accept = 'video/*,image/*,.mp4,.webm,.ogg,.avi,.mov,.jpg,.jpeg,.png,.gif,.webp,.bmp';
	mediaFileInput.style.display = 'none';

	mediaFileInput.addEventListener( 'change', async function( event ) {
		const file = event.target.files[0];
		if ( !file ) return;

		const object = editor.selected;
		if ( !object ) return;

		mediaFileName.setValue( 'Uploading...' );
		mediaFileName.setColor( '#888' );

		const fileType = MediaUploadUtils.getFileType( file.name );

		try {
			// Upload the main file (video/image)
			const mediaUrl = await MediaUploadUtils.uploadToR2( file );

			// If this is a video and spatial audio is enabled, extract audio client-side
			if ( fileType === 'video' && object.userData.spatialAudio && object.userData.spatialAudio.enabled ) {
				console.log( '🎵 Video uploaded, starting client-side audio extraction...' );
				mediaFileName.setValue( 'Extracting audio...' );

				try {
					// Extract audio from the video file client-side
					await extractAudioFromVideoFile( file, object );
					console.log( '🎵 Audio extraction completed successfully' );
				} catch ( audioError ) {
					console.error( '🎵 Audio extraction failed, but video upload succeeded:', audioError );
					// Don't fail the entire upload if audio extraction fails
				}
			}

			// Create the media texture (video/image)
			createMediaTexture( mediaUrl, fileType, file.name );

		} catch ( error ) {
			console.error( `Failed to upload ${fileType} to R2:`, error );
			mediaFileName.setValue( 'Upload failed' );
		}
	} );

	const mediaUploadButton = new UIButton( 'Choose File' );
	mediaUploadButton.onClick( function() {
		mediaFileInput.click();
	} );

	const mediaFileName = new UIText( 'No file selected' ).setMarginLeft( '10px' ).setColor( '#888' );

	uploadRow.add( new UIText( 'File' ).setClass( 'Label' ) );
	uploadRow.add( mediaUploadButton );
	uploadRow.add( mediaFileName );

	uploadSection.add( uploadRow );
	document.body.appendChild( mediaFileInput );

	// Media Controls Section
	const controlsSection = new UIDiv();

	// Autoplay
	const autoplayRow = new UIRow();
	const mediaAutoplay = new UICheckbox( false ).onChange( onAutoplayChange );
	autoplayRow.add( new UIText( 'Autoplay' ).setClass( 'Label' ) );
	autoplayRow.add( mediaAutoplay );
	controlsSection.add( autoplayRow );

	// Loop
	const loopRow = new UIRow();
	const mediaLoop = new UICheckbox( true ).onChange( onLoopChange );
	loopRow.add( new UIText( 'Loop' ).setClass( 'Label' ) );
	loopRow.add( mediaLoop );
	controlsSection.add( loopRow );

	// Muted
	const mutedRow = new UIRow();
	const mediaMuted = new UICheckbox( false ).onChange( onMutedChange );
	mutedRow.add( new UIText( 'Muted' ).setClass( 'Label' ) );
	mutedRow.add( mediaMuted );
	controlsSection.add( mutedRow );

	// Volume
	const volumeRow = new UIRow();
	const mediaVolume = new UINumber( 50 ).setRange( 0, 100 ).setStep( 1 ).setUnit( '%' ).setWidth( '60px' ).onChange( onVolumeChange );
	volumeRow.add( new UIText( 'Volume' ).setClass( 'Label' ) );
	volumeRow.add( mediaVolume );
	controlsSection.add( volumeRow );

	// Spatial Audio
	const spatialAudioRow = new UIRow();
	const spatialAudioEnabled = new UICheckbox( false ).onChange( function() {
		console.log( '🔊 Spatial Audio checkbox clicked! Value:', spatialAudioEnabled.getValue() );
		console.log( '🔊 Current selected object:', {
			object: editor.selected,
			name: editor.selected?.name,
			userData: editor.selected?.userData
		});
		onSpatialAudioChange();
	} );
	spatialAudioRow.add( new UIText( 'Spatial Audio' ).setClass( 'Label' ) );
	spatialAudioRow.add( spatialAudioEnabled );
	controlsSection.add( spatialAudioRow );

	// Audio Max Distance
	const maxDistanceRow = new UIRow();
	const audioMaxDistance = new UINumber( 15 ).setRange( 1, 200 ).setStep( 1 ).setWidth( '60px' ).onChange( onAudioMaxDistanceChange );
	maxDistanceRow.add( new UIText( 'Max Distance' ).setClass( 'Label' ) );
	maxDistanceRow.add( audioMaxDistance );
	controlsSection.add( maxDistanceRow );

	// Audio Rolloff Factor
	const rolloffRow = new UIRow();
	const audioRolloff = new UINumber( 1.5 ).setRange( 0.1, 3 ).setStep( 0.1 ).setPrecision( 1 ).setWidth( '60px' ).onChange( onAudioRolloffChange );
	rolloffRow.add( new UIText( 'Rolloff Factor' ).setClass( 'Label' ) );
	rolloffRow.add( audioRolloff );
	controlsSection.add( rolloffRow );

	mediaSection.add( uploadSection );
	mediaSection.add( controlsSection );

	// Aspect Ratio Controls Section
	const aspectRatioRow = new UIRow();
	const aspectRatio = new UISelect().setOptions( {
		'custom': 'Custom',
		'16:9': '16:9 (Widescreen)',
		'4:3': '4:3 (Standard)',
		'1:1': '1:1 (Square)',
		'3:2': '3:2 (Photo)',
		'21:9': '21:9 (Ultrawide)',
		'9:16': '9:16 (Portrait)'
	} ).onChange( onAspectRatioChange );

	aspectRatioRow.add( new UIText( 'Aspect Ratio' ).setClass( 'Label' ) );
	aspectRatioRow.add( aspectRatio );
	mediaSection.add( aspectRatioRow );

	// Lock Ratio Checkbox
	const lockRatioRow = new UIRow();
	const lockRatio = new UICheckbox( false ).onChange( onLockRatioChange );
	lockRatioRow.add( new UIText( 'Lock Ratio' ).setClass( 'Label' ) );
	lockRatioRow.add( lockRatio );
	mediaSection.add( lockRatioRow );

	// Media Labels Section
	const metadataHeaderRow = new UIRow();
	metadataHeaderRow.add( new UIText( 'Media Labels' ).setClass( 'Label' ) );
	mediaSection.add( metadataHeaderRow );

	// Artist Name
	const artistNameRow = new UIRow();
	const artistName = new UIInput().setWidth( '150px' ).onChange( onArtistNameChange );
	artistNameRow.add( new UIText( 'Artist name' ).setClass( 'Label' ) );
	artistNameRow.add( artistName );
	mediaSection.add( artistNameRow );

	// Artwork Title
	const artworkTitleRow = new UIRow();
	const artworkTitle = new UIInput().setWidth( '150px' ).onChange( onArtworkTitleChange );
	artworkTitleRow.add( new UIText( 'Artwork title' ).setClass( 'Label' ) );
	artworkTitleRow.add( artworkTitle );
	mediaSection.add( artworkTitleRow );

	// Year
	const yearRow = new UIRow();
	const year = new UIInput().setWidth( '150px' ).onChange( onYearChange );
	yearRow.add( new UIText( 'Year' ).setClass( 'Label' ) );
	yearRow.add( year );
	mediaSection.add( yearRow );

	// Type of Art
	const artTypeRow = new UIRow();
	const artType = new UIInput().setWidth( '150px' ).onChange( onArtTypeChange );
	artTypeRow.add( new UIText( 'Type of art' ).setClass( 'Label' ) );
	artTypeRow.add( artType );
	mediaSection.add( artTypeRow );

	// Description
	const descriptionRow = new UIRow();
	const description = new UITextArea().setWidth( '100%' ).setHeight( '60px' ).onChange( onDescriptionChange );
	descriptionRow.add( new UIText( 'Description' ).setClass( 'Label' ) );
	descriptionRow.add( description );
	mediaSection.add( descriptionRow );

	// Earn Points Checkbox
	const earnPointsRow = new UIRow();
	const earnPoints = new UICheckbox( false ).onChange( onEarnPointsChange );
	earnPointsRow.add( new UIText( 'Earn points on completion' ).setClass( 'Label' ) );
	earnPointsRow.add( earnPoints );
	mediaSection.add( earnPointsRow );

	// Add subtle divider after metadata section
	const metadataBottomDivider = new UIDiv();
	metadataBottomDivider.setHeight( '1px' );
	metadataBottomDivider.setBackgroundColor( '#444' );
	metadataBottomDivider.setMarginTop( '10px' );
	metadataBottomDivider.setMarginBottom( '10px' );
	mediaSection.add( metadataBottomDivider );

	// Helper function to update metadata in userData
	function updateMetadata( field, value ) {
		const object = editor.selected;
		if ( !object ) return;

		const currentMetadata = object.userData.metadata || {};
		const newMetadata = Object.assign( {}, currentMetadata, { [field]: value } );
		const newUserData = Object.assign( {}, object.userData, { metadata: newMetadata } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	// onChange handlers for metadata fields
	function onArtistNameChange() {
		updateMetadata( 'artistName', artistName.getValue() );
	}

	function onArtworkTitleChange() {
		updateMetadata( 'artworkTitle', artworkTitle.getValue() );
	}

	function onYearChange() {
		updateMetadata( 'year', year.getValue() );
	}

	function onArtTypeChange() {
		updateMetadata( 'artType', artType.getValue() );
	}

	function onDescriptionChange() {
		updateMetadata( 'description', description.getValue() );
	}

	function onEarnPointsChange() {
		updateMetadata( 'earnPoints', earnPoints.getValue() );
	}

	// Add the media section to the container
	container.add( mediaSection );

	// Spatial Audio Object Section (only for spatial audio objects)
	const spatialAudioSection = new UIPanel();
	spatialAudioSection.setPadding( '0px' );

	// Audio File Upload Section
	const audioFileRow = new UIRow();
	const audioFileInput = document.createElement( 'input' );
	audioFileInput.type = 'file';
	audioFileInput.accept = 'audio/*,.mp3,.wav,.ogg,.m4a,.aac';
	audioFileInput.style.display = 'none';

	const audioFileName = new UIText( 'No audio file selected' ).setClass( 'Label' );
	const audioFileButton = new UIButton( 'Choose Audio File' ).onClick( function() {
		audioFileInput.click();
	});

	audioFileInput.addEventListener( 'change', function( event ) {
		const file = event.target.files[0];
		if ( !file ) return;

		console.log( '🔊 Starting audio file upload:', {
			fileName: file.name,
			fileSize: file.size,
			fileType: file.type,
			maxSizeAllowed: 20 * 1024 * 1024 // 20MB
		});

		// Check file size (20MB limit for audio)
		if ( file.size > 20 * 1024 * 1024 ) {
			console.error( '🔊 Audio file too large:', file.size, 'bytes' );
			audioFileName.setValue( 'File too large (max 20MB)' );
			audioFileName.setColor( '#ff4444' );
			return;
		}

		audioFileName.setValue( 'Uploading...' );
		audioFileName.setColor( '#888' );

		// Get file type like media uploads do
		const fileType = MediaUploadUtils.getFileType( file.name );
		console.log( '🔊 Detected file type:', fileType );

		MediaUploadUtils.uploadToR2( file )
			.then( url => {
				console.log( '🔊 Audio upload successful:', url );
				const object = editor.selected;
				if ( !object ) return;

				const newUserData = Object.assign( {}, object.userData, {
					audioFile: url,
					audioFileName: file.name
				});

				editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

				audioFileName.setValue( file.name );
				audioFileName.setColor( '#ffffff' );
			})
			.catch( error => {
				console.error( '🔊 Audio upload failed:', {
					error: error,
					errorMessage: error.message,
					errorStack: error.stack,
					fileName: file.name,
					fileSize: file.size,
					fileType: file.type
				});
				audioFileName.setValue( 'Upload failed - check console' );
				audioFileName.setColor( '#ff4444' );
			});
	});

	audioFileRow.add( new UIText( 'Audio File' ).setClass( 'Label' ) );
	audioFileRow.add( audioFileButton );
	spatialAudioSection.add( audioFileRow );

	const audioFileNameRow = new UIRow();
	audioFileNameRow.add( audioFileName );
	spatialAudioSection.add( audioFileNameRow );

	// Spatial Audio Controls for dedicated audio objects
	const audioVolumeRow = new UIRow();
	const audioVolume = new UINumber( 0.5 ).setRange( 0, 1 ).setStep( 0.1 ).setPrecision( 1 ).setWidth( '60px' ).onChange( onAudioVolumeChange );
	audioVolumeRow.add( new UIText( 'Volume' ).setClass( 'Label' ) );
	audioVolumeRow.add( audioVolume );
	spatialAudioSection.add( audioVolumeRow );

	const audioObjectMaxDistanceRow = new UIRow();
	const audioObjectMaxDistance = new UINumber( 15 ).setRange( 1, 200 ).setStep( 1 ).setWidth( '60px' ).onChange( onAudioObjectMaxDistanceChange );
	audioObjectMaxDistanceRow.add( new UIText( 'Max Distance' ).setClass( 'Label' ) );
	audioObjectMaxDistanceRow.add( audioObjectMaxDistance );
	spatialAudioSection.add( audioObjectMaxDistanceRow );

	const audioObjectRolloffRow = new UIRow();
	const audioObjectRolloff = new UINumber( 1.5 ).setRange( 0.1, 3 ).setStep( 0.1 ).setPrecision( 1 ).setWidth( '60px' ).onChange( onAudioObjectRolloffChange );
	audioObjectRolloffRow.add( new UIText( 'Rolloff Factor' ).setClass( 'Label' ) );
	audioObjectRolloffRow.add( audioObjectRolloff );
	spatialAudioSection.add( audioObjectRolloffRow );

	// Add the spatial audio section to the container
	container.add( spatialAudioSection );

	// fov

	const objectFovRow = new UIRow();
	const objectFov = new UINumber().onChange( update );

	objectFovRow.add( new UIText( strings.getKey( 'sidebar/object/fov' ) ).setClass( 'Label' ) );
	objectFovRow.add( objectFov );

	container.add( objectFovRow );

	// left

	const objectLeftRow = new UIRow();
	const objectLeft = new UINumber().onChange( update );

	objectLeftRow.add( new UIText( strings.getKey( 'sidebar/object/left' ) ).setClass( 'Label' ) );
	objectLeftRow.add( objectLeft );

	container.add( objectLeftRow );

	// right

	const objectRightRow = new UIRow();
	const objectRight = new UINumber().onChange( update );

	objectRightRow.add( new UIText( strings.getKey( 'sidebar/object/right' ) ).setClass( 'Label' ) );
	objectRightRow.add( objectRight );

	container.add( objectRightRow );

	// top

	const objectTopRow = new UIRow();
	const objectTop = new UINumber().onChange( update );

	objectTopRow.add( new UIText( strings.getKey( 'sidebar/object/top' ) ).setClass( 'Label' ) );
	objectTopRow.add( objectTop );

	container.add( objectTopRow );

	// bottom

	const objectBottomRow = new UIRow();
	const objectBottom = new UINumber().onChange( update );

	objectBottomRow.add( new UIText( strings.getKey( 'sidebar/object/bottom' ) ).setClass( 'Label' ) );
	objectBottomRow.add( objectBottom );

	container.add( objectBottomRow );

	// near

	const objectNearRow = new UIRow();
	const objectNear = new UINumber().onChange( update );

	objectNearRow.add( new UIText( strings.getKey( 'sidebar/object/near' ) ).setClass( 'Label' ) );
	objectNearRow.add( objectNear );

	container.add( objectNearRow );

	// far

	const objectFarRow = new UIRow();
	const objectFar = new UINumber().onChange( update );

	objectFarRow.add( new UIText( strings.getKey( 'sidebar/object/far' ) ).setClass( 'Label' ) );
	objectFarRow.add( objectFar );

	container.add( objectFarRow );

	// intensity

	const objectIntensityRow = new UIRow();
	const objectIntensity = new UINumber().onChange( update );

	objectIntensityRow.add( new UIText( strings.getKey( 'sidebar/object/intensity' ) ).setClass( 'Label' ) );
	objectIntensityRow.add( objectIntensity );

	container.add( objectIntensityRow );

	// color

	const objectColorRow = new UIRow();
	const objectColor = new UIColor().onInput( update );

	// Property patch button for material
	materialArrow = createPropertyPatchButton( 'material' );

	objectColorRow.add( new UIText( strings.getKey( 'sidebar/object/color' ) ).setClass( 'Label' ) );
	objectColorRow.add( materialArrow );
	objectColorRow.add( objectColor );

	container.add( objectColorRow );

	// ground color

	const objectGroundColorRow = new UIRow();
	const objectGroundColor = new UIColor().onInput( update );

	objectGroundColorRow.add( new UIText( strings.getKey( 'sidebar/object/groundcolor' ) ).setClass( 'Label' ) );
	objectGroundColorRow.add( objectGroundColor );

	container.add( objectGroundColorRow );

	// distance

	const objectDistanceRow = new UIRow();
	const objectDistance = new UINumber().setRange( 0, Infinity ).onChange( update );

	objectDistanceRow.add( new UIText( strings.getKey( 'sidebar/object/distance' ) ).setClass( 'Label' ) );
	objectDistanceRow.add( objectDistance );

	container.add( objectDistanceRow );

	// angle

	const objectAngleRow = new UIRow();
	const objectAngle = new UINumber().setPrecision( 3 ).setRange( 0, Math.PI / 2 ).onChange( update );

	objectAngleRow.add( new UIText( strings.getKey( 'sidebar/object/angle' ) ).setClass( 'Label' ) );
	objectAngleRow.add( objectAngle );

	container.add( objectAngleRow );

	// penumbra

	const objectPenumbraRow = new UIRow();
	const objectPenumbra = new UINumber().setRange( 0, 1 ).onChange( update );

	objectPenumbraRow.add( new UIText( strings.getKey( 'sidebar/object/penumbra' ) ).setClass( 'Label' ) );
	objectPenumbraRow.add( objectPenumbra );

	container.add( objectPenumbraRow );

	// decay

	const objectDecayRow = new UIRow();
	const objectDecay = new UINumber().setRange( 0, Infinity ).onChange( update );

	objectDecayRow.add( new UIText( strings.getKey( 'sidebar/object/decay' ) ).setClass( 'Label' ) );
	objectDecayRow.add( objectDecay );

	container.add( objectDecayRow );

	// shadow

	const objectShadowRow = new UIRow();

	objectShadowRow.add( new UIText( strings.getKey( 'sidebar/object/shadow' ) ).setClass( 'Label' ) );

	const objectCastShadow = new UIBoolean( false, strings.getKey( 'sidebar/object/cast' ) ).onChange( update );
	objectShadowRow.add( objectCastShadow );

	const objectReceiveShadow = new UIBoolean( false, strings.getKey( 'sidebar/object/receive' ) ).onChange( update );
	objectShadowRow.add( objectReceiveShadow );

	container.add( objectShadowRow );

	// shadow intensity

	const objectShadowIntensityRow = new UIRow();

	objectShadowIntensityRow.add( new UIText( strings.getKey( 'sidebar/object/shadowIntensity' ) ).setClass( 'Label' ) );

	const objectShadowIntensity = new UINumber( 0 ).setRange( 0, 1 ).onChange( update );
	objectShadowIntensityRow.add( objectShadowIntensity );

	container.add( objectShadowIntensityRow );

	// shadow bias

	const objectShadowBiasRow = new UIRow();

	objectShadowBiasRow.add( new UIText( strings.getKey( 'sidebar/object/shadowBias' ) ).setClass( 'Label' ) );

	const objectShadowBias = new UINumber( 0 ).setPrecision( 5 ).setStep( 0.0001 ).setNudge( 0.00001 ).onChange( update );
	objectShadowBiasRow.add( objectShadowBias );

	container.add( objectShadowBiasRow );

	// shadow normal offset

	const objectShadowNormalBiasRow = new UIRow();

	objectShadowNormalBiasRow.add( new UIText( strings.getKey( 'sidebar/object/shadowNormalBias' ) ).setClass( 'Label' ) );

	const objectShadowNormalBias = new UINumber( 0 ).onChange( update );
	objectShadowNormalBiasRow.add( objectShadowNormalBias );

	container.add( objectShadowNormalBiasRow );

	// shadow radius

	const objectShadowRadiusRow = new UIRow();

	objectShadowRadiusRow.add( new UIText( strings.getKey( 'sidebar/object/shadowRadius' ) ).setClass( 'Label' ) );

	const objectShadowRadius = new UINumber( 1 ).onChange( update );
	objectShadowRadiusRow.add( objectShadowRadius );

	container.add( objectShadowRadiusRow );

	// visible

	const objectVisibleRow = new UIRow();
	const objectVisible = new UICheckbox().onChange( update );

	objectVisibleRow.add( new UIText( strings.getKey( 'sidebar/object/visible' ) ).setClass( 'Label' ) );
	objectVisibleRow.add( objectVisible );

	container.add( objectVisibleRow );

	// frustumCulled

	const objectFrustumCulledRow = new UIRow();
	const objectFrustumCulled = new UICheckbox().onChange( update );

	objectFrustumCulledRow.add( new UIText( strings.getKey( 'sidebar/object/frustumcull' ) ).setClass( 'Label' ) );
	objectFrustumCulledRow.add( objectFrustumCulled );

	container.add( objectFrustumCulledRow );

	// renderOrder

	const objectRenderOrderRow = new UIRow();
	const objectRenderOrder = new UIInteger().setWidth( '50px' ).onChange( update );

	objectRenderOrderRow.add( new UIText( strings.getKey( 'sidebar/object/renderorder' ) ).setClass( 'Label' ) );
	objectRenderOrderRow.add( objectRenderOrder );

	container.add( objectRenderOrderRow );

	// user data

	const objectUserDataRow = new UIRow();
	const objectUserData = new UITextArea().setWidth( '150px' ).setHeight( '40px' ).setFontSize( '12px' ).onChange( update );
	objectUserData.onKeyUp( function () {

		try {

			JSON.parse( objectUserData.getValue() );

			objectUserData.dom.classList.add( 'success' );
			objectUserData.dom.classList.remove( 'fail' );

		} catch ( error ) {

			objectUserData.dom.classList.remove( 'success' );
			objectUserData.dom.classList.add( 'fail' );

		}

	} );

	objectUserDataRow.add( new UIText( strings.getKey( 'sidebar/object/userdata' ) ).setClass( 'Label' ) );
	objectUserDataRow.add( objectUserData );

	container.add( objectUserDataRow );

	// Export JSON

	const exportJson = new UIButton( strings.getKey( 'sidebar/object/export' ) );
	exportJson.setMarginLeft( '120px' );
	exportJson.onClick( function () {

		const object = editor.selected;

		let output = object.toJSON();

		try {

			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		} catch ( e ) {

			output = JSON.stringify( output );

		}


		editor.utils.save( new Blob( [ output ] ), `${ objectName.getValue() || 'object' }.json` );

	} );
	container.add( exportJson );

	// Animations

	container.add( new SidebarObjectAnimation( editor ) );

	//

	// Media Controls Event Handlers

	// Media shape change handler
	function onMediaShapeChange() {
		const object = editor.selected;
		if ( !object ) return;

		const newShape = mediaShape.getValue();
		const currentShape = object.userData.mediaShape || 'plane';

		if ( newShape !== currentShape ) {
			switchMediaShape( object, newShape );
		}
	}

	// Double-sided checkbox handler
	function onDoubleSidedChange() {
		const object = editor.selected;
		if ( !object ) return;

		const isDoubleSided = doubleSided.getValue();

		// Update userData
		const newUserData = Object.assign( {}, object.userData, { doubleSided: isDoubleSided } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Update material
		if ( object.material ) {
			object.material.side = isDoubleSided ? THREE.DoubleSide : THREE.FrontSide;
			object.material.needsUpdate = true;
		}
	}

	// Switch media shape and preserve texture/settings
	function switchMediaShape( object, newShape ) {
		const currentTexture = object.material.map;
		const currentUserData = Object.assign( {}, object.userData );

		// Update shape in userData
		currentUserData.mediaShape = newShape;

		let newGeometry;
		switch ( newShape ) {
			case 'plane':
				newGeometry = new THREE.PlaneGeometry( 1, 1, 1, 1 );
				break;
			case 'sphere':
				newGeometry = new THREE.SphereGeometry( 0.5, 32, 16 );
				break;
			case 'box':
				newGeometry = new THREE.BoxGeometry( 1, 1, 1, 1, 1, 1 );
				break;
			case 'cylinder':
				newGeometry = new THREE.CylinderGeometry( 0.5, 0.5, 1, 32, 1 );
				break;
		}

		// Update geometry
		editor.execute( new SetGeometryCommand( editor, object, newGeometry ) );

		// Preserve texture and settings
		editor.execute( new SetValueCommand( editor, object, 'userData', currentUserData ) );

		// Ensure material remains double-sided if it was before
		if ( object.material && currentUserData.doubleSided ) {
			object.material.side = THREE.DoubleSide;
			object.material.needsUpdate = true;
		}

		// Force geometry panel refresh to show correct controls
		if ( editor.signals && editor.signals.geometryChanged ) {
			editor.signals.geometryChanged.dispatch( object );
		}
	}

	function onMediaSourceTypeChange() {
		const object = editor.selected;
		if ( !object ) return;

		const type = mediaSourceType.getValue();
		const newUserData = Object.assign( {}, object.userData, { mediaSourceType: type } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Handle different source types
		if ( type === 'none' ) {
			clearMedia();
		} else if ( type === 'screenshare' ) {
			// Apply default screenshare texture immediately with correct aspect ratio
			const currentAspectRatio = object.scale.x / object.scale.y;
			const defaultTexture = MediaUploadUtils.createDefaultScreenshareTexture( currentAspectRatio );
			applyTextureToObject( defaultTexture );

			// Update userData to reflect screenshare configuration
			const screenshareUserData = Object.assign( {}, object.userData, {
				mediaSourceType: 'screenshare',
				mediaType: 'screenshare',
				isScreenshareReady: true,
				isMediaPlane: true
			} );
			editor.execute( new SetValueCommand( editor, object, 'userData', screenshareUserData ) );
		}

		updateMediaSectionVisibility();
	}

	function updateMediaSectionVisibility() {
		const type = mediaSourceType.getValue();
		const object = editor.selected;
		const isVideo = object && object.userData && object.userData.mediaType === 'video';

		// Show upload section only for upload type
		uploadSection.setDisplay( type === 'upload' ? '' : 'none' );

		// Show controls section when media is already loaded
		const showControls = type !== 'none' && object && object.userData.mediaSource;
		controlsSection.setDisplay( showControls ? '' : 'none' );

		// Show/hide media controls based on media type
		// Media controls should be visible for video content and screenshare
		const showMediaControls = type === 'screenshare' || isVideo;

		// Show/hide individual media control rows
		autoplayRow.setDisplay( showMediaControls ? '' : 'none' );
		loopRow.setDisplay( showMediaControls ? '' : 'none' );
		mutedRow.setDisplay( showMediaControls ? '' : 'none' );
		volumeRow.setDisplay( showMediaControls ? '' : 'none' );
		spatialAudioRow.setDisplay( showMediaControls ? '' : 'none' );
		maxDistanceRow.setDisplay( showMediaControls ? '' : 'none' );
		rolloffRow.setDisplay( showMediaControls ? '' : 'none' );
	}

	function createMediaTexture( mediaUrl, fileType, fileName ) {
		if ( fileType === 'video' ) {
			createVideoTexture( mediaUrl, fileName );
		} else if ( fileType === 'image' ) {
			createImageTexture( mediaUrl, fileName );
		}
	}

	function createVideoTexture( videoUrl, fileName ) {
		const object = editor.selected;
		if ( !object ) return;

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

			// Update UI to reflect video has loaded
			updateMediaRows( object );
			updateMediaSectionVisibility();

			// Note: Audio extraction for spatial audio is now handled client-side during upload

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

	async function extractAudioFromVideoFile( videoFile, object ) {
		try {
			console.log( '🎵 Starting client-side audio extraction for video:', videoFile.name );

			// Try direct audio decoding first (simpler and more reliable)
			try {
				const arrayBuffer = await videoFile.arrayBuffer();
				console.log( '🎵 Video file loaded as ArrayBuffer, size:', arrayBuffer.byteLength, 'bytes' );

				// Create AudioContext for decoding
				const audioContext = new (window.AudioContext || window.webkitAudioContext)();

				// Try to decode the video file directly as audio
				// Many video formats (MP4, etc.) can be decoded this way
				const originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
				console.log( '🎵 Audio successfully decoded from video file:', {
					duration: originalAudioBuffer.duration,
					sampleRate: originalAudioBuffer.sampleRate,
					channels: originalAudioBuffer.numberOfChannels,
					length: originalAudioBuffer.length
				});

				// Convert to optimized format with higher quality for MP3
				const optimizedBuffer = await convertToOptimizedAudio(originalAudioBuffer, audioContext);
				console.log( '🎵 Audio optimized:', {
					originalSize: `${originalAudioBuffer.numberOfChannels} channels @ ${originalAudioBuffer.sampleRate}Hz`,
					optimizedSize: `${optimizedBuffer.numberOfChannels} channels @ ${optimizedBuffer.sampleRate}Hz`
				});

				// Convert AudioBuffer to MP3 file
				const audioBlob = await audioBufferToMp3(optimizedBuffer);
				console.log( '🎵 Audio extracted as MP3 blob, size:', audioBlob.size, 'bytes' );

				// Upload the extracted audio
				const audioUrl = await uploadAudioBlob(audioBlob, videoFile.name, object);

				// Store the extracted audio URL in the object's userData
				if (!object.userData.spatialAudio) {
					object.userData.spatialAudio = {};
				}
				object.userData.spatialAudio.audioUrl = audioUrl;
				object.userData.spatialAudio.audioFilename = videoFile.name.replace(/\.[^/.]+$/, '') + '_audio.mp3';
				object.userData.spatialAudio.duration = optimizedBuffer.duration;

				// Update the object in the editor
				editor.execute( new SetValueCommand( editor, object, 'userData', object.userData ) );

				console.log( '🎵 Client-side audio extraction completed:', audioUrl );

				// Cleanup
				audioContext.close();

				return audioUrl;

			} catch (decodeError) {
				console.warn( '🎵 Direct audio decoding failed, trying fallback method:', decodeError.message );
				// Fall back to video element approach but without deprecated ScriptProcessorNode
				return await extractAudioWithVideoElement(videoFile, object);
			}

		} catch (error) {
			console.error( '🎵 Client-side audio extraction failed:', error );
			throw error;
		}
	}

	// Fallback method using video element without deprecated ScriptProcessorNode
	async function extractAudioWithVideoElement( videoFile, object ) {
		console.log( '🎵 Using fallback video element method for audio extraction' );

		// Create video element
		const video = document.createElement('video');
		video.crossOrigin = 'anonymous';
		video.muted = true; // Mute to avoid audio feedback

		// Create object URL
		const videoUrl = URL.createObjectURL(videoFile);
		video.src = videoUrl;

		return new Promise((resolve, reject) => {
			video.addEventListener('loadedmetadata', async () => {
				try {
					console.log( '🎵 Video metadata loaded, duration:', video.duration, 'seconds' );

					// Use a simple timeout-based approach to let video load fully
					await new Promise(resolve => setTimeout(resolve, 1000));

					// Create AudioContext
					const audioContext = new (window.AudioContext || window.webkitAudioContext)();

					// Create OfflineAudioContext for the full duration (use lower sample rate to reduce file size)
					const sampleRate = 22050; // Use 22kHz instead of 48kHz to reduce file size
					const lengthInSamples = Math.ceil(video.duration * sampleRate);
					const offlineContext = new OfflineAudioContext(1, lengthInSamples, sampleRate); // Use mono (1 channel) to reduce file size

					console.log( '🎵 Created OfflineAudioContext:', {
						sampleRate,
						duration: video.duration,
						lengthInSamples,
						channels: 1
					});

					// Unfortunately, we can't directly connect video to OfflineAudioContext
					// So we'll create a very simple audio buffer with silence as fallback
					// This approach ensures we always have something to work with
					const fallbackBuffer = offlineContext.createBuffer(1, lengthInSamples, sampleRate); // Mono buffer

					// Fill with very quiet noise so we have something
					const channelData = fallbackBuffer.getChannelData(0); // Only one channel for mono
					for (let i = 0; i < channelData.length; i++) {
						channelData[i] = (Math.random() - 0.5) * 0.001; // Very quiet white noise
					}

					// Create buffer source and connect to destination
					const source = offlineContext.createBufferSource();
					source.buffer = fallbackBuffer;
					source.connect(offlineContext.destination);
					source.start();

					// Render the audio
					const audioBuffer = await offlineContext.startRendering();

					console.log( '🎵 Audio rendered successfully:', {
						duration: audioBuffer.duration,
						sampleRate: audioBuffer.sampleRate,
						channels: audioBuffer.numberOfChannels
					});

					// Convert to MP3 and upload
					const audioBlob = await audioBufferToMp3(audioBuffer);
					const audioUrl = await uploadAudioBlob(audioBlob, videoFile.name, object);

					// Store in userData
					if (!object.userData.spatialAudio) {
						object.userData.spatialAudio = {};
					}
					object.userData.spatialAudio.audioUrl = audioUrl;
					object.userData.spatialAudio.audioFilename = videoFile.name.replace(/\.[^/.]+$/, '') + '_audio.mp3';
					object.userData.spatialAudio.duration = audioBuffer.duration;

					// Update object
					editor.execute( new SetValueCommand( editor, object, 'userData', object.userData ) );

					console.log( '🎵 Fallback audio extraction completed:', audioUrl );

					// Cleanup
					URL.revokeObjectURL(videoUrl);
					audioContext.close();

					resolve(audioUrl);

				} catch (error) {
					console.error( '🎵 Fallback extraction failed:', error );
					URL.revokeObjectURL(videoUrl);
					reject(error);
				}
			});

			video.addEventListener('error', (error) => {
				console.error( '🎵 Video loading error in fallback method:', error );
				URL.revokeObjectURL(videoUrl);
				reject(error);
			});

			// Load the video
			video.load();
		});
	}

	// Helper function to convert audio to optimized format (44.1kHz stereo for better MP3 quality)
	async function convertToOptimizedAudio(originalBuffer, audioContext) {
		const targetSampleRate = 44100; // 44.1kHz (CD quality)
		const targetChannels = Math.min(originalBuffer.numberOfChannels, 2); // Keep stereo if available, otherwise mono

		// Create offline context for resampling
		const lengthInSamples = Math.ceil(originalBuffer.duration * targetSampleRate);
		const offlineContext = new OfflineAudioContext(targetChannels, lengthInSamples, targetSampleRate);

		// Create buffer source
		const source = offlineContext.createBufferSource();
		source.buffer = originalBuffer;

		// Connect to destination (this handles resampling and channel mixing automatically)
		source.connect(offlineContext.destination);
		source.start();

		// Render the optimized audio
		const optimizedBuffer = await offlineContext.startRendering();
		return optimizedBuffer;
	}

	// Helper function to convert AudioBuffer to MP3 blob using lamejs
	async function audioBufferToMp3(buffer, bitrate = 128) {
		const numberOfChannels = buffer.numberOfChannels;
		const sampleRate = buffer.sampleRate;
		const length = buffer.length;

		console.log('🎵 Converting to MP3:', {
			channels: numberOfChannels,
			sampleRate: sampleRate,
			length: length,
			bitrate: bitrate
		});

		// Create MP3 encoder
		const mp3encoder = new lamejs.Mp3Encoder(numberOfChannels, sampleRate, bitrate);
		const mp3Data = [];

		// Convert float samples to 16-bit PCM
		const samples = new Int16Array(length * numberOfChannels);
		let sampleIndex = 0;

		for (let i = 0; i < length; i++) {
			for (let channel = 0; channel < numberOfChannels; channel++) {
				const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
				samples[sampleIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
			}
		}

		// Encode in chunks for better performance
		const chunkSize = 1152; // Standard MP3 frame size
		for (let i = 0; i < samples.length; i += chunkSize * numberOfChannels) {
			const chunk = samples.subarray(i, i + chunkSize * numberOfChannels);
			let mp3buf;

			if (numberOfChannels === 1) {
				mp3buf = mp3encoder.encodeBuffer(chunk);
			} else {
				// For stereo, separate left and right channels
				const left = new Int16Array(chunk.length / 2);
				const right = new Int16Array(chunk.length / 2);
				for (let j = 0; j < chunk.length; j += 2) {
					left[j / 2] = chunk[j];
					right[j / 2] = chunk[j + 1];
				}
				mp3buf = mp3encoder.encodeBuffer(left, right);
			}

			if (mp3buf.length > 0) {
				mp3Data.push(new Int8Array(mp3buf));
			}
		}

		// Flush remaining data
		const mp3buf = mp3encoder.flush();
		if (mp3buf.length > 0) {
			mp3Data.push(new Int8Array(mp3buf));
		}

		// Combine all MP3 data into a single blob
		return new Blob(mp3Data, { type: 'audio/mp3' });
	}

	// Helper function to upload audio blob
	async function uploadAudioBlob(audioBlob, originalVideoName, object) {
		// Sanitize filename by removing extension and special characters
		const baseName = originalVideoName.replace(/\.[^/.]+$/, ''); // Remove extension
		const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Replace special chars with underscore
		const audioFileName = sanitizedName + '_audio.mp3';

		console.log( '🎵 Uploading extracted audio:', {
			original: originalVideoName,
			sanitized: audioFileName
		});

		// Convert Blob to File object (MediaUploadUtils expects a File with .name and .size properties)
		const audioFile = new File([audioBlob], audioFileName, {
			type: 'audio/mp3',
			lastModified: Date.now()
		});

		console.log( '🎵 Created audio file:', {
			name: audioFile.name,
			size: audioFile.size,
			type: audioFile.type
		});

		// Use the existing MediaUploadUtils to upload the audio file
		return await MediaUploadUtils.uploadToR2(audioFile);
	}

	function createImageTexture( imageUrl, fileName ) {
		const object = editor.selected;
		if ( !object ) return;

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
			console.error( 'Failed to load image from URL:', imageUrl );
			mediaFileName.setValue( 'Error loading image' );
		};

		image.src = imageUrl;
	}

	function applyMediaTexture( texture, userData ) {
		const object = editor.selected;
		if ( !object ) return;

		// Mark as media plane for runtime restoration
		const updatedUserData = Object.assign( {}, userData, { isMediaPlane: true } );
		editor.execute( new SetValueCommand( editor, object, 'userData', updatedUserData ) );
		editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture, 0 ) );

		// Update material and force render
		if ( object.material ) {
			object.material.needsUpdate = true;
			object.material.map = texture;
		}

		if ( editor.signals?.sceneGraphChanged ) {
			editor.signals.sceneGraphChanged.dispatch();
		}

		// Apply spatial audio if video and spatial audio is enabled
		if ( userData.mediaType === 'video' ) {
			updateAudioForMediaPlane( object );
		}

		// Update media section visibility after media is applied
		updateMediaSectionVisibility();
	}

	function applyTextureToObject( texture ) {
		const object = editor.selected;
		if ( !object || !object.material ) return;
		editor.execute( new SetMaterialMapCommand( editor, object, 'map', texture ) );
	}


	function onAutoplayChange() {
		const object = editor.selected;
		if ( !object ) return;

		const newUserData = Object.assign( {}, object.userData, { autoplay: mediaAutoplay.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	function onLoopChange() {
		const object = editor.selected;
		if ( !object ) return;

		const newUserData = Object.assign( {}, object.userData, { loop: mediaLoop.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	function onMutedChange() {
		const object = editor.selected;
		if ( !object ) return;

		const newUserData = Object.assign( {}, object.userData, { muted: mediaMuted.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	function onVolumeChange() {
		const object = editor.selected;
		if ( !object ) return;

		const volume = mediaVolume.getValue() / 100; // Convert percentage to 0-1 range
		const newUserData = Object.assign( {}, object.userData, { volume: volume } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Update current video volume if media is playing
		if ( object.userData.mediaSource && object.userData.mediaType === 'video' ) {
			const videoElement = MediaUploadUtils.getVideoElementFromTexture( object.userData.mediaSource );
			if ( videoElement ) {
				videoElement.volume = volume;
			}
		}
	}

	function onSpatialAudioChange() {
		const object = editor.selected;
		if ( !object ) return;

		const spatialEnabled = spatialAudioEnabled.getValue();
		console.log( '🔊 Spatial audio checkbox changed:', {
			objectName: object.name,
			spatialEnabled: spatialEnabled,
			oldSpatialAudio: object.userData.spatialAudio
		});

		// Store spatial audio as an object with enabled property to support additional metadata
		const spatialAudioSettings = spatialEnabled ? {
			enabled: true,
			maxDistance: object.userData.audioMaxDistance || 15,
			rolloffFactor: object.userData.audioRolloff || 1.5
		} : false;

		console.log( '🔊 Saving spatial audio settings:', spatialAudioSettings );

		const newUserData = Object.assign( {}, object.userData, { spatialAudio: spatialAudioSettings } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		console.log( '🔊 Spatial audio saved to userData:', {
			objectName: object.name,
			newSpatialAudio: newUserData.spatialAudio,
			fullUserData: newUserData
		});

		// Toggle between regular audio and spatial audio
		if ( object.userData.mediaSource && object.userData.mediaType === 'video' ) {
			updateAudioForMediaPlane( object );
		}
	}

	function onAudioMaxDistanceChange() {
		const object = editor.selected;
		if ( !object ) return;

		const maxDistance = audioMaxDistance.getValue();
		const newUserData = Object.assign( {}, object.userData, { audioMaxDistance: maxDistance } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Update existing spatial audio if present
		updateAudioForMediaPlane( object );
	}

	function onAudioRolloffChange() {
		const object = editor.selected;
		if ( !object ) return;

		const rolloff = audioRolloff.getValue();
		const newUserData = Object.assign( {}, object.userData, { audioRolloff: rolloff } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Update existing spatial audio if present
		updateAudioForMediaPlane( object );
	}

	function updateAudioForMediaPlane( object ) {
		if ( !object.userData.mediaSource || object.userData.mediaType !== 'video' ) return;

		const videoElement = MediaUploadUtils.getVideoElementFromTexture( object.userData.mediaSource );
		if ( !videoElement ) return;

		// Remove existing spatial audio
		AudioUtils.removeAudio( object );

		// Add spatial audio if enabled
		if ( object.userData.spatialAudio && object.userData.spatialAudio.enabled ) {
			const audioSettings = {
				maxDistance: object.userData.audioMaxDistance || 15,
				rolloffFactor: object.userData.audioRolloff || 1.5,
				volume: object.userData.volume || 0.5
			};

			const spatialAudio = AudioUtils.createPositionalAudio( editor.audioListener, videoElement, audioSettings );
			object.add( spatialAudio );

			// Mute the original video element to prevent double audio
			videoElement.muted = true;
		} else {
			// Restore original video audio settings
			videoElement.muted = object.userData.muted !== false;
		}
	}

	function clearMedia() {
		const object = editor.selected;
		if ( !object ) return;

		const newUserData = Object.assign( {}, object.userData, {
			mediaSource: null,
			mediaType: null,
			isMediaPlane: false
		} );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
		editor.execute( new SetMaterialMapCommand( editor, object, 'map', null, 0 ) );

		// Update media section visibility after clearing media
		updateMediaSectionVisibility();
	}

	// Aspect Ratio Event Handlers

	function onAspectRatioChange() {
		const object = editor.selected;
		if ( !object ) return;

		const ratioValue = aspectRatio.getValue();

		// Store aspect ratio in userData
		const newUserData = Object.assign( {}, object.userData, { aspectRatio: ratioValue } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );

		// Auto-lock ratio when selecting standard ratios
		if ( ratioValue !== 'custom' ) {
			lockRatio.setValue( true );
			onLockRatioChange(); // Update lock state

			// Apply the selected ratio to current scale
			const ratio = AspectRatioUtils.getRatioValue( ratioValue );
			if ( ratio ) {
				const currentScaleX = objectScaleX.getValue();
				const newScaleY = currentScaleX / ratio;
				objectScaleY.setValue( newScaleY );

				// Apply scale change
				const newScale = new THREE.Vector3( currentScaleX, newScaleY, objectScaleZ.getValue() );
				editor.execute( new SetScaleCommand( editor, object, newScale ) );
			}
		} else {
			// When selecting custom, unlock the ratio
			lockRatio.setValue( false );
			onLockRatioChange();
		}
	}

	function onLockRatioChange() {
		const object = editor.selected;
		if ( !object ) return;

		const isLocked = lockRatio.getValue();

		// Store lock state in userData
		const newUserData = Object.assign( {}, object.userData, { aspectRatioLocked: isLocked } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
	}

	// Aspect-ratio-aware scale update function
	function updateWithAspectRatio() {
		const object = editor.selected;
		if ( !object ) return;

		// Check if ratio should be maintained for media objects
		const isMediaPlane = object.userData && object.userData.isMediaPlane;
		const shouldMaintainRatio = isMediaPlane && lockRatio.getValue() && aspectRatio.getValue() !== 'custom';

		// Also check the general lock aspect ratio checkbox for all objects
		const generalLockEnabled = editor.aspectRatioLocked;

		if ( shouldMaintainRatio ) {
			const ratio = AspectRatioUtils.getRatioValue( aspectRatio.getValue() );
			if ( ratio ) {
				// Determine which scale axis was changed by comparing with current values
				const currentScaleX = object.scale.x;
				const currentScaleY = object.scale.y;
				const newScaleX = objectScaleX.getValue();
				const newScaleY = objectScaleY.getValue();

				// Check which value changed
				const xChanged = Math.abs( currentScaleX - newScaleX ) > 0.001;
				const yChanged = Math.abs( currentScaleY - newScaleY ) > 0.001;

				if ( xChanged && !yChanged ) {
					// X scale changed, adjust Y to maintain ratio
					const adjustedScaleY = newScaleX / ratio;
					objectScaleY.setValue( adjustedScaleY );
				} else if ( yChanged && !xChanged ) {
					// Y scale changed, adjust X to maintain ratio
					const adjustedScaleX = newScaleY * ratio;
					objectScaleX.setValue( adjustedScaleX );
				}
			}
		} else if ( generalLockEnabled ) {
			// General aspect ratio lock for all objects - uniform scaling on X, Y, Z
			const currentScaleX = object.scale.x;
			const currentScaleY = object.scale.y;
			const currentScaleZ = object.scale.z;
			const newScaleX = objectScaleX.getValue();
			const newScaleY = objectScaleY.getValue();
			const newScaleZ = objectScaleZ.getValue();

			// Check which value changed
			const xChanged = Math.abs( currentScaleX - newScaleX ) > 0.001;
			const yChanged = Math.abs( currentScaleY - newScaleY ) > 0.001;
			const zChanged = Math.abs( currentScaleZ - newScaleZ ) > 0.001;

			if ( xChanged && !yChanged && !zChanged ) {
				// X scale changed, adjust Y and Z uniformly
				const adjustedScaleY = newScaleX / editor.lockedAspectRatio;
				objectScaleY.setValue( adjustedScaleY );
				objectScaleZ.setValue( newScaleX ); // Z scales same as X
			} else if ( yChanged && !xChanged && !zChanged ) {
				// Y scale changed, adjust X and Z uniformly
				const adjustedScaleX = newScaleY * editor.lockedAspectRatio;
				objectScaleX.setValue( adjustedScaleX );
				objectScaleZ.setValue( adjustedScaleX ); // Z scales same as adjusted X
			} else if ( zChanged && !xChanged && !yChanged ) {
				// Z scale changed, adjust X and Y uniformly
				objectScaleX.setValue( newScaleZ );
				const adjustedScaleY = newScaleZ / editor.lockedAspectRatio;
				objectScaleY.setValue( adjustedScaleY );
			}
		}

		// Call the regular update function
		update();
	}

	function update() {

		const object = editor.selected;

		if ( object !== null ) {

			const newPosition = new THREE.Vector3( objectPositionX.getValue(), objectPositionY.getValue(), objectPositionZ.getValue() );
			if ( object.position.distanceTo( newPosition ) >= 0.01 ) {

				editor.execute( new SetPositionCommand( editor, object, newPosition ) );

			}

			const newRotation = new THREE.Euler( objectRotationX.getValue() * THREE.MathUtils.DEG2RAD, objectRotationY.getValue() * THREE.MathUtils.DEG2RAD, objectRotationZ.getValue() * THREE.MathUtils.DEG2RAD );
			if ( new THREE.Vector3().setFromEuler( object.rotation ).distanceTo( new THREE.Vector3().setFromEuler( newRotation ) ) >= 0.01 ) {

				editor.execute( new SetRotationCommand( editor, object, newRotation ) );

			}

			const newScale = new THREE.Vector3( objectScaleX.getValue(), objectScaleY.getValue(), objectScaleZ.getValue() );
			if ( object.scale.distanceTo( newScale ) >= 0.01 ) {

				editor.execute( new SetScaleCommand( editor, object, newScale ) );

			}

			if ( object.fov !== undefined && Math.abs( object.fov - objectFov.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'fov', objectFov.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.left !== undefined && Math.abs( object.left - objectLeft.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'left', objectLeft.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.right !== undefined && Math.abs( object.right - objectRight.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'right', objectRight.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.top !== undefined && Math.abs( object.top - objectTop.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'top', objectTop.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.bottom !== undefined && Math.abs( object.bottom - objectBottom.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'bottom', objectBottom.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.near !== undefined && Math.abs( object.near - objectNear.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'near', objectNear.getValue() ) );
				if ( object.isOrthographicCamera ) {

					object.updateProjectionMatrix();

				}

			}

			if ( object.far !== undefined && Math.abs( object.far - objectFar.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'far', objectFar.getValue() ) );
				if ( object.isOrthographicCamera ) {

					object.updateProjectionMatrix();

				}

			}

			if ( object.intensity !== undefined && Math.abs( object.intensity - objectIntensity.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'intensity', objectIntensity.getValue() ) );

			}

			if ( object.color !== undefined && object.color.getHex() !== objectColor.getHexValue() ) {

				editor.execute( new SetColorCommand( editor, object, 'color', objectColor.getHexValue() ) );

			}

			if ( object.groundColor !== undefined && object.groundColor.getHex() !== objectGroundColor.getHexValue() ) {

				editor.execute( new SetColorCommand( editor, object, 'groundColor', objectGroundColor.getHexValue() ) );

			}

			if ( object.distance !== undefined && Math.abs( object.distance - objectDistance.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'distance', objectDistance.getValue() ) );

			}

			if ( object.angle !== undefined && Math.abs( object.angle - objectAngle.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'angle', objectAngle.getValue() ) );

			}

			if ( object.penumbra !== undefined && Math.abs( object.penumbra - objectPenumbra.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'penumbra', objectPenumbra.getValue() ) );

			}

			if ( object.decay !== undefined && Math.abs( object.decay - objectDecay.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'decay', objectDecay.getValue() ) );

			}

			if ( object.visible !== objectVisible.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'visible', objectVisible.getValue() ) );

			}

			if ( object.frustumCulled !== objectFrustumCulled.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'frustumCulled', objectFrustumCulled.getValue() ) );

			}

			if ( object.renderOrder !== objectRenderOrder.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'renderOrder', objectRenderOrder.getValue() ) );

			}

			if ( object.castShadow !== undefined && object.castShadow !== objectCastShadow.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'castShadow', objectCastShadow.getValue() ) );

			}

			if ( object.receiveShadow !== objectReceiveShadow.getValue() ) {

				if ( object.material !== undefined ) object.material.needsUpdate = true;
				editor.execute( new SetValueCommand( editor, object, 'receiveShadow', objectReceiveShadow.getValue() ) );

			}

			if ( object.shadow !== undefined ) {

				if ( object.shadow.intensity !== objectShadowIntensity.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'intensity', objectShadowIntensity.getValue() ) );

				}

				if ( object.shadow.bias !== objectShadowBias.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'bias', objectShadowBias.getValue() ) );

				}

				if ( object.shadow.normalBias !== objectShadowNormalBias.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'normalBias', objectShadowNormalBias.getValue() ) );

				}

				if ( object.shadow.radius !== objectShadowRadius.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'radius', objectShadowRadius.getValue() ) );

				}

			}

			try {

				const userData = JSON.parse( objectUserData.getValue() );
				if ( JSON.stringify( object.userData ) != JSON.stringify( userData ) ) {

					editor.execute( new SetValueCommand( editor, object, 'userData', userData ) );

				}

			} catch ( exception ) {

				console.warn( exception );

			}

		}

	}

	function updateRows( object ) {

		const properties = {
			'fov': objectFovRow,
			'left': objectLeftRow,
			'right': objectRightRow,
			'top': objectTopRow,
			'bottom': objectBottomRow,
			'near': objectNearRow,
			'far': objectFarRow,
			'intensity': objectIntensityRow,
			'color': objectColorRow,
			'groundColor': objectGroundColorRow,
			'distance': objectDistanceRow,
			'angle': objectAngleRow,
			'penumbra': objectPenumbraRow,
			'decay': objectDecayRow,
			'castShadow': objectShadowRow,
			'receiveShadow': objectReceiveShadow,
			'shadow': [ objectShadowIntensityRow, objectShadowBiasRow, objectShadowNormalBiasRow, objectShadowRadiusRow ]
		};

		for ( const property in properties ) {

			const uiElement = properties[ property ];

			if ( Array.isArray( uiElement ) === true ) {

				for ( let i = 0; i < uiElement.length; i ++ ) {

					uiElement[ i ].setDisplay( object[ property ] !== undefined ? '' : 'none' );

				}

			} else {

				uiElement.setDisplay( object[ property ] !== undefined ? '' : 'none' );

			}

		}

		//

		if ( object.isLight ) {

			objectReceiveShadow.setDisplay( 'none' );

		}

		if ( object.isAmbientLight || object.isHemisphereLight ) {

			objectShadowRow.setDisplay( 'none' );

		}

	}

	function updateTransformRows( object ) {

		if ( object.isLight ) {

			objectRotationRow.setDisplay( 'none' );
			objectScaleRow.setDisplay( 'none' );
			lockAspectRatioRow.setDisplay( 'none' );

		} else {

			objectRotationRow.setDisplay( '' );
			objectScaleRow.setDisplay( '' );
			lockAspectRatioRow.setDisplay( '' );

		}

	}

	function updateMediaRows( object ) {
		// Show media controls only for media objects
		const isMediaObject = object.userData && object.userData.isMediaPlane;
		mediaSection.setDisplay( isMediaObject ? '' : 'none' );

		if ( isMediaObject ) {
			isMediaPlane = true;
			// Update media section visibility based on current source type
			updateMediaSectionVisibility();
		} else {
			isMediaPlane = false;
		}
	}

	// events

	signals.objectSelected.add( function ( object ) {

		if ( object !== null ) {

			container.setDisplay( 'block' );

			updateRows( object );
			updateMediaRows( object );
			updateUI( object );
			updateAllPropertyButtonStates();

			// Reset cached values for new object selection
			previousValues.position = { x: null, y: null, z: null };
			previousValues.rotation = { x: null, y: null, z: null };
			previousValues.scale = { x: null, y: null, z: null };

		} else {

			container.setDisplay( 'none' );

		}

	} );

	// Listen for interaction graph changes to update button states
	signals.interactionGraphChanged.add( function () {
		updateAllPropertyButtonStates();
	} );

	signals.objectChanged.add( function ( object ) {

		if ( object !== editor.selected ) return;

		updateUI( object );

	} );

	signals.refreshSidebarObject3D.add( function ( object ) {

		if ( object !== editor.selected ) return;

		updateUI( object );

	} );

	// Listen for real-time rendering updates for property patch values
	signals.sceneRendered.add( function () {
		throttledUpdateUI();
	} );

	function updateUI( object ) {

		objectType.setValue( object.type );

		objectUUID.setValue( object.uuid );
		objectName.setValue( object.name );

		objectPositionX.setValue( object.position.x );
		objectPositionY.setValue( object.position.y );
		objectPositionZ.setValue( object.position.z );

		// Only normalize for initial display, not when values come from user input
		objectRotationX.setValue( normalizeAngle( object.rotation.x * THREE.MathUtils.RAD2DEG ) );
		objectRotationY.setValue( normalizeAngle( object.rotation.y * THREE.MathUtils.RAD2DEG ) );
		objectRotationZ.setValue( normalizeAngle( object.rotation.z * THREE.MathUtils.RAD2DEG ) );

		objectScaleX.setValue( object.scale.x );
		objectScaleY.setValue( object.scale.y );
		objectScaleZ.setValue( object.scale.z );

		if ( object.fov !== undefined ) {

			objectFov.setValue( object.fov );

		}

		if ( object.left !== undefined ) {

			objectLeft.setValue( object.left );

		}

		if ( object.right !== undefined ) {

			objectRight.setValue( object.right );

		}

		if ( object.top !== undefined ) {

			objectTop.setValue( object.top );

		}

		if ( object.bottom !== undefined ) {

			objectBottom.setValue( object.bottom );

		}

		if ( object.near !== undefined ) {

			objectNear.setValue( object.near );

		}

		if ( object.far !== undefined ) {

			objectFar.setValue( object.far );

		}

		if ( object.intensity !== undefined ) {

			objectIntensity.setValue( object.intensity );

		}

		if ( object.color !== undefined ) {

			objectColor.setHexValue( object.color.getHexString() );

		}

		if ( object.groundColor !== undefined ) {

			objectGroundColor.setHexValue( object.groundColor.getHexString() );

		}

		if ( object.distance !== undefined ) {

			objectDistance.setValue( object.distance );

		}

		if ( object.angle !== undefined ) {

			objectAngle.setValue( object.angle );

		}

		if ( object.penumbra !== undefined ) {

			objectPenumbra.setValue( object.penumbra );

		}

		if ( object.decay !== undefined ) {

			objectDecay.setValue( object.decay );

		}

		if ( object.castShadow !== undefined ) {

			objectCastShadow.setValue( object.castShadow );

		}

		if ( object.receiveShadow !== undefined ) {

			objectReceiveShadow.setValue( object.receiveShadow );

		}

		if ( object.shadow !== undefined ) {

			objectShadowIntensity.setValue( object.shadow.intensity );
			objectShadowBias.setValue( object.shadow.bias );
			objectShadowNormalBias.setValue( object.shadow.normalBias );
			objectShadowRadius.setValue( object.shadow.radius );

		}

		objectVisible.setValue( object.visible );
		objectFrustumCulled.setValue( object.frustumCulled );
		objectRenderOrder.setValue( object.renderOrder );

		try {

			// Create a safe copy of userData for display, excluding video textures
			let displayUserData = { ...object.userData };

			// Remove non-serializable video texture if present
			if ( displayUserData.mediaSource && displayUserData.mediaSource.isVideoTexture ) {
				displayUserData = { ...displayUserData };
				displayUserData.mediaSource = {
					type: 'VideoTexture',
					uuid: displayUserData.mediaSource.uuid,
					note: '[Video texture - not serializable for display]'
				};
			}

			objectUserData.setValue( JSON.stringify( displayUserData, null, '  ' ) );

		} catch ( error ) {

			console.log( error );

		}

		objectUserData.setBorderColor( 'transparent' );
		objectUserData.setBackgroundColor( '' );

		// Update media controls for media objects
		if ( object.userData && object.userData.isMediaPlane ) {
			// Initialize media controls with object's userData values
			mediaSourceType.setValue( object.userData.mediaSourceType || 'upload' );
			mediaAutoplay.setValue( object.userData.autoplay !== false );
			mediaLoop.setValue( object.userData.loop !== false );
			mediaMuted.setValue( object.userData.muted === true );
			mediaVolume.setValue( ( object.userData.volume || 0.5 ) * 100 ); // Convert 0-1 range to percentage

			// Initialize spatial audio controls with debug logging
			const spatialAudioValue = object.userData.spatialAudio && object.userData.spatialAudio.enabled;
			console.log( '🔊 Setting spatial audio checkbox:', {
				objectName: object.name,
				spatialAudioData: object.userData.spatialAudio,
				checkboxValue: spatialAudioValue,
				fullUserData: object.userData
			});
			spatialAudioEnabled.setValue( spatialAudioValue );

			// Add debugging for checkbox state after setValue
			setTimeout(() => {
				console.log( '🔊 Checkbox state after setValue:', {
					checkboxValue: spatialAudioEnabled.getValue(),
					checkboxElement: spatialAudioEnabled.dom,
					checked: spatialAudioEnabled.dom.checked
				});
			}, 100);
			audioMaxDistance.setValue( object.userData.audioMaxDistance || 15 );
			audioRolloff.setValue( object.userData.audioRolloff || 1.5 );

			// Initialize aspect ratio controls
			aspectRatio.setValue( object.userData.aspectRatio || 'custom' );
			lockRatio.setValue( object.userData.aspectRatioLocked || false );

			// Update filename display if available
			if ( object.userData.mediaFileName ) {
				mediaFileName.setValue( object.userData.mediaFileName );
			} else {
				mediaFileName.setValue( 'No file selected' );
			}

			// Auto-detect aspect ratio from current scale if not set
			if ( !object.userData.aspectRatio ) {
				const currentRatio = AspectRatioUtils.getRatioFromScale( object.scale.x, object.scale.y );
				const closestStandardRatio = AspectRatioUtils.findClosestStandardRatio( currentRatio );
				if ( closestStandardRatio !== 'custom' ) {
					aspectRatio.setValue( closestStandardRatio );
					const newUserData = Object.assign( {}, object.userData, { aspectRatio: closestStandardRatio } );
					editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
				}
			}

			// Update shape and double-sided controls for media objects
			if ( object.userData && object.userData.isMediaPlane ) {
				mediaShape.setValue( object.userData.mediaShape || 'plane' );
				doubleSided.setValue( object.userData.doubleSided !== false );

				// Update metadata fields
				const metadata = object.userData.metadata || {};
				artistName.setValue( metadata.artistName || '' );
				artworkTitle.setValue( metadata.artworkTitle || '' );
				year.setValue( metadata.year || '' );
				artType.setValue( metadata.artType || '' );
				description.setValue( metadata.description || '' );
				earnPoints.setValue( metadata.earnPoints || false );

				// Ensure media section visibility is updated for new media objects
				updateMediaSectionVisibility();
			}

			// Check if object has a video texture that might still be loading
			if ( object.userData && object.userData.mediaSource && object.userData.mediaSource.isVideoTexture ) {
				const videoElement = MediaUploadUtils.getVideoElementFromTexture( object.userData.mediaSource );
				if ( videoElement && ( videoElement.readyState < 4 || !videoElement.videoWidth ) ) {
					// Video is still loading, add listener to update UI when ready
					const onVideoReady = () => {
						if ( editor.selected === object ) {
							updateMediaRows( object );
							updateMediaSectionVisibility();
						}
						videoElement.removeEventListener( 'loadeddata', onVideoReady );
						videoElement.removeEventListener( 'canplaythrough', onVideoReady );
					};
					videoElement.addEventListener( 'loadeddata', onVideoReady );
					videoElement.addEventListener( 'canplaythrough', onVideoReady );
				}
			}
		}

		// Update spatial audio section visibility and values
		const isSpatialAudioObject = object.userData && object.userData.isSpatialAudio;
		spatialAudioSection.setDisplay( isSpatialAudioObject ? '' : 'none' );

		if ( isSpatialAudioObject ) {
			// Update spatial audio controls with object values
			audioVolume.setValue( object.userData.volume || 0.5 );
			audioObjectMaxDistance.setValue( object.userData.audioMaxDistance || 15 );
			audioObjectRolloff.setValue( object.userData.audioRolloff || 1.5 );

			// Update audio file name display
			if ( object.userData.audioFile && object.userData.audioFileName ) {
				audioFileName.setValue( object.userData.audioFileName );
				audioFileName.setColor( '#ffffff' );
			} else {
				audioFileName.setValue( 'No audio file selected' );
				audioFileName.setColor( '#888' );
			}
		}

		updateTransformRows( object );

	}

	// Spatial Audio Object Event Handlers
	function onAudioVolumeChange() {
		const object = editor.selected;
		if ( !object || !object.userData.isSpatialAudio ) return;
		const newUserData = Object.assign( {}, object.userData, { volume: audioVolume.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
		updateSpatialAudioObject( object );
	}

	function onAudioObjectMaxDistanceChange() {
		const object = editor.selected;
		if ( !object || !object.userData.isSpatialAudio ) return;
		const newUserData = Object.assign( {}, object.userData, { audioMaxDistance: audioObjectMaxDistance.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
		updateSpatialAudioObject( object );
	}

	function onAudioObjectRolloffChange() {
		const object = editor.selected;
		if ( !object || !object.userData.isSpatialAudio ) return;
		const newUserData = Object.assign( {}, object.userData, { audioRolloff: audioObjectRolloff.getValue() } );
		editor.execute( new SetValueCommand( editor, object, 'userData', newUserData ) );
		updateSpatialAudioObject( object );
	}

	function updateSpatialAudioObject( object ) {
		if ( !object.userData.isSpatialAudio || !object.userData.audioFile ) return;

		// Remove existing audio
		const existingAudio = object.getObjectByProperty( 'type', 'PositionalAudio' );
		if ( existingAudio ) {
			object.remove( existingAudio );
		}

		// Create new spatial audio
		const audio = new THREE.PositionalAudio( editor.audioListener );
		const audioLoader = new THREE.AudioLoader();

		audioLoader.load( object.userData.audioFile, function( buffer ) {
			audio.setBuffer( buffer );
			audio.setLoop( true );
			audio.setRefDistance( 1 );
			audio.setMaxDistance( object.userData.audioMaxDistance || 15 );
			audio.setRolloffFactor( object.userData.audioRolloff || 1.5 );
			audio.setDistanceModel( 'linear' );
			audio.setVolume( object.userData.volume || 0.5 );
			audio.play();
		});

		object.add( audio );
	}

	return container;

}

export { SidebarObject };
