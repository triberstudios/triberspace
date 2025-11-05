import * as THREE from 'three';

import { Config } from './Config.js';
import { Loader } from './Loader.js';
import { History as _History } from './History.js';
import { Strings } from './Strings.js';
import { Storage as _Storage } from './Storage.js';
import { Selector } from './Selector.js';
import { SpinNode } from './interaction-editor/nodes/SpinNode.js';
import { ObjectRotationNode } from './interaction-editor/nodes/ObjectRotationNode.js';
import { PatchCompiler } from './ai/PatchCompiler.js';

var _DEFAULT_CAMERA = new THREE.PerspectiveCamera( 50, 1, 0.01, 5000 );
_DEFAULT_CAMERA.name = 'Camera';
_DEFAULT_CAMERA.position.set( 0, 5, 10 );
_DEFAULT_CAMERA.lookAt( new THREE.Vector3() );

function Editor() {

	const Signal = signals.Signal; // eslint-disable-line no-undef

	this.signals = {

		// script

		editScript: new Signal(),

		// player

		startPlayer: new Signal(),
		stopPlayer: new Signal(),

		// xr

		enterXR: new Signal(),
		offerXR: new Signal(),
		leaveXR: new Signal(),

		// notifications

		editorCleared: new Signal(),

		savingStarted: new Signal(),
		savingFinished: new Signal(),

		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		placementModeChanged: new Signal(),
		rendererCreated: new Signal(),
		rendererUpdated: new Signal(),
		rendererDetectKTX2Support: new Signal(),

		sceneBackgroundChanged: new Signal(),
		sceneEnvironmentChanged: new Signal(),
		sceneFogChanged: new Signal(),
		sceneFogSettingsChanged: new Signal(),
		sceneGraphChanged: new Signal(),
		sceneRendered: new Signal(),

		cameraChanged: new Signal(),
		cameraResetted: new Signal(),

		// interaction editor
		interactionGraphChanged: new Signal(),

		geometryChanged: new Signal(),

		objectSelected: new Signal(),
		objectFocused: new Signal(),

		objectAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		cameraAdded: new Signal(),
		cameraRemoved: new Signal(),

		helperAdded: new Signal(),
		helperRemoved: new Signal(),

		materialAdded: new Signal(),
		materialChanged: new Signal(),
		materialRemoved: new Signal(),

		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		windowResize: new Signal(),

		showHelpersChanged: new Signal(),
		refreshSidebarObject3D: new Signal(),
		refreshSidebarEnvironment: new Signal(),
		historyChanged: new Signal(),

		viewportCameraChanged: new Signal(),
		viewportShadingChanged: new Signal(),

		intersectionsDetected: new Signal(),

		pathTracerUpdated: new Signal(),

	};

	this.config = new Config();
	this.history = new _History( this );
	this.selector = new Selector( this );
	this.storage = new _Storage();
	this.strings = new Strings( this.config );

	this.loader = new Loader( this );

	this.camera = _DEFAULT_CAMERA.clone();

	// Add audio listener for spatial audio support
	this.audioListener = new THREE.AudioListener();
	this.camera.add( this.audioListener );

	this.scene = new THREE.Scene();
	this.scene.name = 'Scene';

	this.sceneHelpers = new THREE.Scene();
	this.sceneHelpers.add( new THREE.HemisphereLight( 0xffffff, 0x888888, 2 ) );

	this.object = {};
	this.geometries = {};
	this.materials = {};
	this.textures = {};
	this.scripts = {};

	// Interaction editor reference (set externally by main.js)
	this.interactionEditor = null;

	this.materialsRefCounter = new Map(); // tracks how often is a material used by a 3D object

	this.mixer = new THREE.AnimationMixer( this.scene );

	this.selected = null;
	this.helpers = {};

	this.cameras = {};

	this.viewportCamera = this.camera;
	this.viewportShading = 'default';

	this.addCamera( this.camera );

}

Editor.prototype = {

	setScene: function ( scene ) {

		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;

		this.scene.background = scene.background;
		this.scene.environment = scene.environment;
		this.scene.fog = scene.fog;
		this.scene.backgroundBlurriness = scene.backgroundBlurriness;
		this.scene.backgroundIntensity = scene.backgroundIntensity;

		this.scene.userData = JSON.parse( JSON.stringify( scene.userData ) );

		// avoid render per object

		this.signals.sceneGraphChanged.active = false;

		while ( scene.children.length > 0 ) {

			this.addObject( scene.children[ 0 ] );

		}

		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

	},

	//

	addObject: function ( object, parent, index ) {

		var scope = this;

		object.traverse( function ( child ) {

			if ( child.geometry !== undefined ) scope.addGeometry( child.geometry );
			if ( child.material !== undefined ) scope.addMaterial( child.material );

			scope.addCamera( child );
			scope.addHelper( child );

		} );

		if ( parent === undefined ) {

			this.scene.add( object );

		} else {

			parent.children.splice( index, 0, object );
			object.parent = parent;

		}

		this.signals.objectAdded.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},

	nameObject: function ( object, name ) {

		object.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	removeObject: function ( object ) {

		if ( object.parent === null ) return; // avoid deleting the camera or scene

		var scope = this;

		object.traverse( function ( child ) {

			scope.removeCamera( child );
			scope.removeHelper( child );

			if ( child.material !== undefined ) scope.removeMaterial( child.material );

		} );

		object.parent.remove( object );

		this.signals.objectRemoved.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},

	addGeometry: function ( geometry ) {

		this.geometries[ geometry.uuid ] = geometry;

	},

	setGeometryName: function ( geometry, name ) {

		geometry.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.addMaterialToRefCounter( material[ i ] );

			}

		} else {

			this.addMaterialToRefCounter( material );

		}

		this.signals.materialAdded.dispatch();

	},

	addMaterialToRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );

		if ( count === undefined ) {

			materialsRefCounter.set( material, 1 );
			this.materials[ material.uuid ] = material;

		} else {

			count ++;
			materialsRefCounter.set( material, count );

		}

	},

	removeMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.removeMaterialFromRefCounter( material[ i ] );

			}

		} else {

			this.removeMaterialFromRefCounter( material );

		}

		this.signals.materialRemoved.dispatch();

	},

	removeMaterialFromRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );
		count --;

		if ( count === 0 ) {

			materialsRefCounter.delete( material );
			delete this.materials[ material.uuid ];

		} else {

			materialsRefCounter.set( material, count );

		}

	},

	getMaterialById: function ( id ) {

		var material;
		var materials = Object.values( this.materials );

		for ( var i = 0; i < materials.length; i ++ ) {

			if ( materials[ i ].id === id ) {

				material = materials[ i ];
				break;

			}

		}

		return material;

	},

	setMaterialName: function ( material, name ) {

		material.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addTexture: function ( texture ) {

		this.textures[ texture.uuid ] = texture;

	},

	//

	addCamera: function ( camera ) {

		if ( camera.isCamera ) {

			this.cameras[ camera.uuid ] = camera;

			this.signals.cameraAdded.dispatch( camera );

		}

	},

	removeCamera: function ( camera ) {

		if ( this.cameras[ camera.uuid ] !== undefined ) {

			delete this.cameras[ camera.uuid ];

			this.signals.cameraRemoved.dispatch( camera );

		}

	},

	//

	addHelper: function () {

		var geometry = new THREE.SphereGeometry( 2, 4, 2 );
		var material = new THREE.MeshBasicMaterial( { color: 0xff0000, visible: false } );

		return function ( object, helper ) {

			if ( helper === undefined ) {

				if ( object.isCamera ) {

					helper = new THREE.CameraHelper( object );

				} else if ( object.isPointLight ) {

					helper = new THREE.PointLightHelper( object, 1 );

				} else if ( object.isDirectionalLight ) {

					helper = new THREE.DirectionalLightHelper( object, 1 );

				} else if ( object.isSpotLight ) {

					helper = new THREE.SpotLightHelper( object );

				} else if ( object.isHemisphereLight ) {

					helper = new THREE.HemisphereLightHelper( object, 1 );

				} else if ( object.isSkinnedMesh ) {

					helper = new THREE.SkeletonHelper( object.skeleton.bones[ 0 ] );

				} else if ( object.isBone === true && object.parent && object.parent.isBone !== true ) {

					helper = new THREE.SkeletonHelper( object );

				} else {

					// no helper for this object type
					return;

				}

				const picker = new THREE.Mesh( geometry, material );
				picker.name = 'picker';
				picker.userData.object = object;
				helper.add( picker );

			}

			this.sceneHelpers.add( helper );
			this.helpers[ object.id ] = helper;

			this.signals.helperAdded.dispatch( helper );

		};

	}(),

	removeHelper: function ( object ) {

		if ( this.helpers[ object.id ] !== undefined ) {

			var helper = this.helpers[ object.id ];
			helper.parent.remove( helper );
			helper.dispose();

			delete this.helpers[ object.id ];

			this.signals.helperRemoved.dispatch( helper );

		}

	},

	//

	addScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) {

			this.scripts[ object.uuid ] = [];

		}

		this.scripts[ object.uuid ].push( script );

		this.signals.scriptAdded.dispatch( script );

	},

	removeScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) return;

		var index = this.scripts[ object.uuid ].indexOf( script );

		if ( index !== - 1 ) {

			this.scripts[ object.uuid ].splice( index, 1 );

		}

		this.signals.scriptRemoved.dispatch( script );

	},

	getObjectMaterial: function ( object, slot ) {

		var material = object.material;

		if ( Array.isArray( material ) && slot !== undefined ) {

			material = material[ slot ];

		}

		return material;

	},

	setObjectMaterial: function ( object, slot, newMaterial ) {

		if ( Array.isArray( object.material ) && slot !== undefined ) {

			object.material[ slot ] = newMaterial;

		} else {

			object.material = newMaterial;

		}

	},

	setViewportCamera: function ( uuid ) {

		this.viewportCamera = this.cameras[ uuid ];
		this.signals.viewportCameraChanged.dispatch();

	},

	setViewportShading: function ( value ) {

		this.viewportShading = value;
		this.signals.viewportShadingChanged.dispatch();

	},

	//

	select: function ( object ) {

		this.selector.select( object );

	},

	selectById: function ( id ) {

		if ( id === this.camera.id ) {

			this.select( this.camera );
			return;

		}

		this.select( this.scene.getObjectById( id ) );

	},

	selectByUuid: function ( uuid ) {

		var scope = this;

		this.scene.traverse( function ( child ) {

			if ( child.uuid === uuid ) {

				scope.select( child );

			}

		} );

	},

	deselect: function () {

		this.selector.deselect();

	},

	focus: function ( object ) {

		if ( object !== undefined ) {

			this.signals.objectFocused.dispatch( object );

		}

	},

	focusById: function ( id ) {

		this.focus( this.scene.getObjectById( id ) );

	},

	clear: function () {

		this.history.clear();
		this.storage.clear();

		this.camera.copy( _DEFAULT_CAMERA );
		this.signals.cameraResetted.dispatch();

		this.scene.name = 'Scene';
		this.scene.userData = {};
		this.scene.background = null;
		this.scene.environment = null;
		this.scene.fog = null;

		var objects = this.scene.children;

		this.signals.sceneGraphChanged.active = false;

		while ( objects.length > 0 ) {

			this.removeObject( objects[ 0 ] );

		}

		this.signals.sceneGraphChanged.active = true;

		this.geometries = {};
		this.materials = {};
		this.textures = {};
		this.scripts = {};

		this.materialsRefCounter.clear();

		this.animations = {};
		this.mixer.stopAllAction();

		this.deselect();

		this.signals.editorCleared.dispatch();

	},

	createDefaultInteractions: function () {

		// Only create default interactions if we have an interaction graph
		if (!this.interactionEditor ||
			!this.interactionEditor.interactionEditor ||
			!this.interactionEditor.interactionEditor.interactionGraph) {
			return;
		}

		const interactionGraph = this.interactionEditor.interactionEditor.interactionGraph;

		// Find the default cube (BoxGeometry mesh)
		let cubeObject = null;
		this.scene.traverse(function (child) {
			if (child.isMesh && child.geometry && child.geometry.type === 'BoxGeometry') {
				cubeObject = child;
			}
		});

		if (!cubeObject) return; // No cube found

		try {
			// Ensure canvas is properly sized first
			if (this.interactionEditor.interactionEditor.resize) {
				this.interactionEditor.interactionEditor.resize();
			}

			// Calculate center position for the pair of nodes
			const canvas = interactionGraph.getCanvasViewport();

			// Debug logging to understand viewport values
			console.log('Canvas viewport values:', {
				viewportX: canvas.viewportX,
				viewportY: canvas.viewportY,
				width: canvas.width,
				height: canvas.height,
				zoom: canvas.zoom
			});

			const centerX = (-canvas.viewportX / canvas.zoom) + (canvas.width / canvas.zoom / 2);
			const centerY = (-canvas.viewportY / canvas.zoom) + (canvas.height / canvas.zoom / 2);

			console.log('Calculated center position:', { centerX, centerY });

			// Position nodes as a centered pair (SpinNode on left, ObjectRotationNode on right)
			const spacing = 350; // Same spacing as smart positioning uses
			const nodeHeight = 80; // Default node height from PatchNode
			const spinX = centerX - spacing / 2 - 75; // Offset left by half spacing + node width/2
			const rotationX = centerX + spacing / 2 - 75; // Offset right by half spacing + node width/2
			const adjustedY = centerY - nodeHeight / 2; // Center nodes by offsetting by half their height

			console.log('Final node positions:', { spinX, rotationX, y: adjustedY });

			// Create and add first node (SpinNode)
			const spinNode = new SpinNode(spinX, adjustedY);
			spinNode.setInputValue('speed', 5); // 5 RPM
			interactionGraph.addNode(spinNode);

			// Create and add second node (ObjectRotationNode)
			const rotationNode = new ObjectRotationNode(cubeObject, rotationX, adjustedY, this);
			interactionGraph.addNode(rotationNode);

			// Connect SpinNode rotation output to ObjectRotationNode X and Y inputs
			interactionGraph.addConnection(spinNode.id, 0, rotationNode.id, 0); // Output 0 (rotation) -> Input 0 (X)
			interactionGraph.addConnection(spinNode.id, 0, rotationNode.id, 1); // Output 0 (rotation) -> Input 1 (Y)

		} catch (error) {
			console.warn('Failed to create default spinning cube interactions:', error);
		}

	},

	//

	fromJSON: async function ( json ) {

		var loader = new THREE.ObjectLoader();
		var camera = await loader.parseAsync( json.camera );

		const existingUuid = this.camera.uuid;
		const incomingUuid = camera.uuid;

		// copy all properties, including uuid
		this.camera.copy( camera );
		this.camera.uuid = incomingUuid;

		delete this.cameras[ existingUuid ]; // remove old entry [existingUuid, this.camera]
		this.cameras[ incomingUuid ] = this.camera; // add new entry [incomingUuid, this.camera]

		this.signals.cameraResetted.dispatch();

		this.history.fromJSON( json.history );
		this.scripts = json.scripts;

		this.setScene( await loader.parseAsync( json.scene ) );

		// Restore video textures after scene loading
		this.restoreVideoTextures();

		// Restore data URL textures (for Sketchfab models and other imported assets)
		this.restoreDataUrlTextures();

		// Restore interaction graph if available
		console.log('Editor.fromJSON: Checking interaction graph restore...', {
			hasInteractionGraphData: !!json.interactionGraph,
			hasInteractionEditor: !!this.interactionEditor,
			hasNestedEditor: !!(this.interactionEditor && this.interactionEditor.interactionEditor)
		});

		if ( json.interactionGraph && this.interactionEditor && this.interactionEditor.interactionEditor ) {
			const graph = this.interactionEditor.interactionEditor.getInteractionGraph();
			console.log('Editor.fromJSON: Found InteractionGraph, restoring...', graph);
			if ( graph ) {
				await graph.deserialize( json.interactionGraph );
				console.log('Editor.fromJSON: InteractionGraph restore completed');
			}
		} else {
			console.warn('Editor.fromJSON: Cannot restore interaction graph - missing references:', {
				hasData: !!json.interactionGraph,
				interactionEditor: this.interactionEditor,
				nestedEditor: this.interactionEditor?.interactionEditor
			});
		}

		if ( json.environment === 'Room' ||
			 json.environment === 'ModelViewer' /* DEPRECATED */ ) {

			this.signals.sceneEnvironmentChanged.dispatch( json.environment );
			this.signals.refreshSidebarEnvironment.dispatch();

		}

	},

	/**
	 * Media texture serialization utilities
	 */
	mediaSerializationUtils: {

		/**
		 * Check if texture needs custom serialization
		 * @param {THREE.Texture} texture - The texture to check
		 * @returns {boolean} True if needs custom serialization
		 */
		needsCustomSerialization: function( texture ) {
			return texture.isVideoTexture ||
				   (texture.image && texture.image instanceof HTMLImageElement);
		},

		/**
		 * Create safe texture JSON representation
		 * @param {THREE.Texture} texture - The texture to serialize
		 * @returns {Object} Safe JSON representation
		 */
		createSafeTextureJSON: function( texture ) {
			// Check if texture has a data URL image (from Sketchfab or other sources)
			const hasDataUrl = texture.image && texture.image.src &&
				(texture.image.src.startsWith('data:') || texture.image.src.startsWith('blob:'));

			const textureJSON = {
				metadata: {
					version: 4.6,
					type: 'Texture',
					generator: 'Texture.toJSON'
				},
				uuid: texture.uuid,
				name: texture.name || '',
				image: hasDataUrl && texture.image.src.startsWith('data:') ? texture.image.src : null,
				mapping: texture.mapping,
				channel: texture.channel,
				repeat: [ texture.repeat.x, texture.repeat.y ],
				offset: [ texture.offset.x, texture.offset.y ],
				center: [ texture.center.x, texture.center.y ],
				rotation: texture.rotation,
				wrap: [ texture.wrapS, texture.wrapT ],
				format: texture.format,
				internalFormat: texture.internalFormat,
				type: texture.type,
				colorSpace: texture.colorSpace,
				minFilter: texture.minFilter,
				magFilter: texture.magFilter,
				anisotropy: texture.anisotropy,
				flipY: texture.flipY,
				generateMipmaps: texture.generateMipmaps,
				premultiplyAlpha: texture.premultiplyAlpha,
				unpackAlignment: texture.unpackAlignment,
				compareFunction: texture.compareFunction,
				// Media-specific flags
				isVideoTexture: texture.isVideoTexture || false,
				isImageTexture: (texture.image && texture.image instanceof HTMLImageElement) || false
			};

			return textureJSON;
		},

		/**
		 * Create safe userData for media objects
		 * @param {Object} userData - Original user data
		 * @param {string} mediaType - 'video' or 'image'
		 * @returns {Object} Safe user data
		 */
		createSafeUserData: function( userData, mediaType ) {
			const safeUserData = Object.assign( {}, userData );
			safeUserData.mediaSource = null; // Remove non-serializable texture

			// Preserve existing mediaRestoreInfo or create fallback
			if ( !safeUserData.mediaRestoreInfo && userData.mediaSource ) {
				if ( mediaType === 'video' ) {
					safeUserData.mediaRestoreInfo = {
						hasVideoTexture: true,
						videoSrc: userData.mediaSource.image?.src || null,
						textureUuid: userData.mediaSource.uuid
					};
				} else if ( mediaType === 'image' ) {
					safeUserData.mediaRestoreInfo = {
						hasImageTexture: true,
						imageSrc: userData.mediaSource.image?.src || null,
						textureUuid: userData.mediaSource.uuid
					};
				}
			}

			return safeUserData;
		}

	},

	prepareSceneForSerialization: function() {

		const originalToJSONMethods = [];
		const originalUserData = [];
		const mediaUtils = this.mediaSerializationUtils;

		// All texture properties that can exist on a material
		const textureProperties = [
			'map', 'normalMap', 'roughnessMap', 'metalnessMap',
			'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap',
			'alphaMap', 'lightMap', 'specularMap', 'envMap'
		];

		this.scene.traverse( function( object ) {

			// Handle all material textures (including Sketchfab PBR materials)
			if ( object.material ) {
				const materials = Array.isArray( object.material ) ? object.material : [ object.material ];

				materials.forEach( function( material ) {
					textureProperties.forEach( function( prop ) {
						const texture = material[ prop ];

						// Check if texture exists and has a data URL image
						if ( texture && texture.image && texture.image.src &&
							texture.image.src.startsWith( 'data:' ) ) {

							// Store original toJSON method
							originalToJSONMethods.push({
								texture: texture,
								originalToJSON: texture.toJSON
							});

							// Override with safe serialization that preserves data URLs
							texture.toJSON = function( meta ) {
								return mediaUtils.createSafeTextureJSON( this );
							};
						}
						// Also handle video/image textures
						else if ( texture && mediaUtils.needsCustomSerialization( texture ) ) {
							originalToJSONMethods.push({
								texture: texture,
								originalToJSON: texture.toJSON
							});

							texture.toJSON = function( meta ) {
								return mediaUtils.createSafeTextureJSON( this );
							};
						}
					} );
				} );
			}

			// Handle media plane objects with mediaSource
			if ( object.userData?.mediaSource ) {
				const mediaSource = object.userData.mediaSource;
				const isVideo = mediaSource.isVideoTexture;
				const isImage = mediaSource.image instanceof HTMLImageElement;

				if ( isVideo || isImage ) {
					// Store original userData
					originalUserData.push({
						object: object,
						originalUserData: object.userData
					});

					// Replace with safe userData
					const mediaType = isVideo ? 'video' : 'image';
					object.userData = mediaUtils.createSafeUserData( object.userData, mediaType );
				}
			}

		} );

		// Serialize scene with safe representations
		const sceneData = this.scene.toJSON();

		// Restore original toJSON methods
		originalToJSONMethods.forEach( function( data ) {
			data.texture.toJSON = data.originalToJSON;
		} );

		// Restore original userData
		originalUserData.forEach( function( data ) {
			data.object.userData = data.originalUserData;
		} );

		return sceneData;

	},

	restoreVideoTextures: function() {

		console.log('🎬 RestoreVideoTextures: Starting video texture restoration...');

		let foundMediaPlanes = 0;
		let restoredVideos = 0;

		// Find objects that should have video textures based on userData
		this.scene.traverse( function( object ) {

			if ( object.userData && object.userData.isMediaPlane && object.userData.mediaType === 'video' ) {
				foundMediaPlanes++;
				console.log('🎬 Found media plane:', object.name, {
					hasRestoreInfo: !!object.userData.mediaRestoreInfo,
					mediaType: object.userData.mediaType,
					userData: object.userData
				});

				// Check if we have stored video metadata and the object needs restoration
				if ( object.userData.mediaRestoreInfo && object.userData.mediaRestoreInfo.hasVideoTexture ) {

					const videoSrc = object.userData.mediaRestoreInfo.videoSrc;
					console.log('🎬 Attempting to restore video from:', videoSrc);

					if ( videoSrc && object.material ) {

						// Create video element
						const video = document.createElement( 'video' );
						video.crossOrigin = 'anonymous';
						video.autoplay = object.userData.autoplay !== false;
						video.loop = object.userData.loop !== false;
						video.muted = object.userData.muted !== false;
						video.playsInline = true;
						video.preload = 'metadata';

						// Hide video element
						video.style.position = 'absolute';
						video.style.width = '1px';
						video.style.height = '1px';
						video.style.left = '-9999px';
						video.style.opacity = '0';
						video.style.pointerEvents = 'none';
						document.body.appendChild( video );

						video.src = videoSrc;
						video.load();

						video.onloadeddata = function() {
							console.log('🎬 Video loaded successfully, creating texture...');

							// Create new video texture
							const texture = new THREE.VideoTexture( video );
							texture.minFilter = THREE.LinearFilter;
							texture.magFilter = THREE.LinearFilter;
							texture.format = THREE.RGBAFormat;
							texture.generateMipmaps = false;
							texture.wrapS = THREE.ClampToEdgeWrapping;
							texture.wrapT = THREE.ClampToEdgeWrapping;
							texture.needsUpdate = true;

							// Apply texture to material
							object.material.map = texture;
							object.material.needsUpdate = true;

							// Update userData
							object.userData.mediaSource = texture;

							console.log('🎬 Video texture applied to material:', object.name);
							restoredVideos++;

							// Trigger UI update for this object if it's currently selected
							if ( this.selected === object ) {
								this.signals.objectChanged.dispatch( object );
							}

							// Start playing if autoplay is enabled
							if ( object.userData.autoplay !== false ) {
								console.log('🎬 Starting video playback...');
								setTimeout(() => {
									video.play().then(() => {
										console.log('🎬 Video playback started successfully');
									}).catch( e => {
										console.warn( '🎬 Video autoplay failed during restore:', e );
										video.muted = true;
										video.play().then(() => {
											console.log('🎬 Video playback started (muted)');
										}).catch( e2 => {
											console.warn( '🎬 Video play failed during restore:', e2 );
										});
									});
								}, 100);
							}

						};

						video.onerror = function() {
							console.error( '🎬 Failed to restore video from source:', videoSrc );
						};

					}

				}

			}

		} );

		console.log(`🎬 RestoreVideoTextures: Complete. Found ${foundMediaPlanes} media planes, restored ${restoredVideos} videos`);

	},

	restoreDataUrlTextures: function() {

		console.log('🖼️ RestoreDataUrlTextures: Starting data URL texture restoration...');

		let texturesRestored = 0;
		const textureProperties = [
			'map', 'normalMap', 'roughnessMap', 'metalnessMap',
			'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap',
			'alphaMap', 'lightMap', 'specularMap'
		];

		this.scene.traverse( function( object ) {

			if ( object.material ) {
				const materials = Array.isArray( object.material ) ? object.material : [ object.material ];

				materials.forEach( function( material ) {
					textureProperties.forEach( function( prop ) {
						const texture = material[ prop ];

						// Check if texture has image data URL that needs restoration
						if ( texture && texture.image && typeof texture.image === 'string' &&
							texture.image.startsWith( 'data:' ) ) {

							console.log(`🖼️ Restoring ${prop} texture for ${object.name || 'unnamed'}`);

							// Create new image element
							const img = new Image();
							img.crossOrigin = 'anonymous';

							img.onload = function() {
								// Replace string with actual image element
								texture.image = img;
								texture.needsUpdate = true;
								material.needsUpdate = true;
								console.log(`🖼️ Texture ${prop} restored successfully`);
							};

							img.onerror = function() {
								console.error(`🖼️ Failed to restore ${prop} texture`);
							};

							// Set source to trigger loading
							img.src = texture.image;
							texturesRestored++;
						}
					} );
				} );
			}

		} );

		console.log(`🖼️ RestoreDataUrlTextures: Complete. Restored ${texturesRestored} textures`);

	},

	toJSON: function () {

		// scripts clean up

		var scene = this.scene;
		var scripts = this.scripts;

		for ( var key in scripts ) {

			var script = scripts[ key ];

			if ( script.length === 0 || scene.getObjectByProperty( 'uuid', key ) === undefined ) {

				delete scripts[ key ];

			}

		}

		// honor neutral environment

		let environment = null;

		if ( this.scene.environment !== null && this.scene.environment.isRenderTargetTexture === true ) {

			environment = 'Room';

		}

		//

		// Serialize interaction graph and compile behaviors if available
		var interactionGraph = null;
		var compiledBehaviors = null;
		if ( this.interactionEditor && this.interactionEditor.interactionEditor ) {
			const graph = this.interactionEditor.interactionEditor.getInteractionGraph();
			if ( graph ) {
				interactionGraph = graph.serialize();

				// Compile behaviors for runtime
				const compiler = new PatchCompiler();
				const validationErrors = compiler.validateGraph(interactionGraph);

				if (validationErrors.length === 0) {
					try {
						compiledBehaviors = compiler.compile(interactionGraph);
					} catch (error) {
						console.warn('Failed to compile behaviors:', error);
						compiledBehaviors = {
							behaviors: [],
							errors: [{ message: 'Compilation failed', error: error.message }],
							metadata: { compiledAt: new Date().toISOString() }
						};
					}
				} else {
					console.warn('Graph validation failed:', validationErrors);
					compiledBehaviors = {
						behaviors: [],
						errors: validationErrors.map(err => ({ message: err, error: 'Validation error' })),
						metadata: { compiledAt: new Date().toISOString() }
					};
				}
			}
		}

		// Prepare scene for serialization by handling video textures
		const sceneData = this.prepareSceneForSerialization();

		return {

			metadata: {},
			project: {
				shadows: this.config.getKey( 'project/renderer/shadows' ),
				shadowType: this.config.getKey( 'project/renderer/shadowType' ),
				toneMapping: this.config.getKey( 'project/renderer/toneMapping' ),
				toneMappingExposure: this.config.getKey( 'project/renderer/toneMappingExposure' )
			},
			camera: this.viewportCamera.toJSON(),
			scene: sceneData,
			scripts: this.scripts,
			history: this.history.toJSON(),
			environment: environment,
			interactionGraph: interactionGraph,
			compiledBehaviors: compiledBehaviors

		};

	},

	objectByUuid: function ( uuid ) {

		return this.scene.getObjectByProperty( 'uuid', uuid, true );

	},

	execute: function ( cmd, optionalName ) {

		this.history.execute( cmd, optionalName );

	},

	undo: function () {

		this.history.undo();

	},

	redo: function () {

		this.history.redo();

	},

	utils: {

		save: save,
		saveArrayBuffer: saveArrayBuffer,
		saveString: saveString,
		formatNumber: formatNumber

	}

};

const link = document.createElement( 'a' );

function save( blob, filename ) {

	if ( link.href ) {

		URL.revokeObjectURL( link.href );

	}

	link.href = URL.createObjectURL( blob );
	link.download = filename || 'data.json';
	link.dispatchEvent( new MouseEvent( 'click' ) );

}

function saveArrayBuffer( buffer, filename ) {

	save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );

}

function saveString( text, filename ) {

	save( new Blob( [ text ], { type: 'text/plain' } ), filename );

}

function formatNumber( number ) {

	return new Intl.NumberFormat( 'en-us', { useGrouping: true } ).format( number );

}

export { Editor };
