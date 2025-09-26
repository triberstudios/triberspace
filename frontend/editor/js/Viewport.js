import * as THREE from 'three';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { UIPanel } from './libs/ui.js';

import { EditorControls } from './EditorControls.js';

import { ViewportControls } from './Viewport.Controls.js';
import { ViewportInfo } from './Viewport.Info.js';

import { ViewHelper } from './Viewport.ViewHelper.js';
import { XR } from './Viewport.XR.js';
import { InfiniteGridHelper } from './InfiniteGridHelper.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ViewportPathtracer } from './Viewport.Pathtracer.js';

function Viewport( editor ) {

	const selector = editor.selector;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new ViewportControls( editor ) );
	container.add( new ViewportInfo( editor ) );

	//

	let renderer = null;
	let pmremGenerator = null;
	let pathtracer = null;

	const camera = editor.camera;
	const scene = editor.scene;
	const sceneHelpers = editor.sceneHelpers;

	// helpers

	// Lighter colors for better visibility
	const GRID_COLORS_LIGHT = [ 0xcccccc, 0xaaaaaa ];
	const GRID_COLORS_DARK = [ 0x888888, 0xaaaaaa ];

	// Create infinite grid with fading
	const grid = new InfiniteGridHelper(1, 5, GRID_COLORS_LIGHT[0], GRID_COLORS_LIGHT[1]);

	const viewHelper = new ViewHelper( camera, container );

	//

	const box = new THREE.Box3();

	const selectionBox = new THREE.Box3Helper( box );
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	sceneHelpers.add( selectionBox );

	let objectPositionOnDown = null;
	let objectRotationOnDown = null;
	let objectScaleOnDown = null;

	let transformControls;

	//

	let xr; // Will be initialized after transformControls

	// events

	function updateAspectRatio() {

		for ( const uuid in editor.cameras ) {

			const camera = editor.cameras[ uuid ];

			const aspect = container.dom.offsetWidth / container.dom.offsetHeight;

			if ( camera.isPerspectiveCamera ) {

				camera.aspect = aspect;

			} else {

				camera.left = - aspect;
				camera.right = aspect;

			}

			camera.updateProjectionMatrix();

			const cameraHelper = editor.helpers[ camera.id ];
			if ( cameraHelper ) cameraHelper.update();

		}

	}

	const onDownPosition = new THREE.Vector2();
	const onUpPosition = new THREE.Vector2();
	const onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition( dom, x, y ) {

		const rect = dom.getBoundingClientRect();
		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}

	function handleClick() {

		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

			const intersects = selector.getPointerIntersects( onUpPosition, camera );
			signals.intersectionsDetected.dispatch( intersects );

			render();

		}

	}

	function onMouseDown( event ) {

		// event.preventDefault();

		if ( event.target !== renderer.domElement ) return;

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'mouseup', onMouseUp );

	}

	function onMouseUp( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'mouseup', onMouseUp );

	}

	function onTouchStart( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd );

	}

	function onTouchEnd( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd );

	}

	function onDoubleClick( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDoubleClickPosition.fromArray( array );

		const intersects = selector.getPointerIntersects( onDoubleClickPosition, camera );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];

			signals.objectFocused.dispatch( intersect.object );

		}

	}

	container.dom.addEventListener( 'mousedown', onMouseDown );
	container.dom.addEventListener( 'touchstart', onTouchStart, { passive: false } );
	container.dom.addEventListener( 'dblclick', onDoubleClick );

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.

	const controls = new EditorControls( camera );
	controls.addEventListener( 'change', function () {

		signals.cameraChanged.dispatch( camera );
		signals.refreshSidebarObject3D.dispatch( camera );

	} );
	viewHelper.center = controls.center;

	// signals

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );
		pathtracer.reset();

		initPT();
		render();

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );

		render();

	} );

	signals.snapChanged.add( function ( dist ) {

		transformControls.setTranslationSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );

		render();

	} );

	signals.rendererUpdated.add( function () {

		scene.traverse( function ( child ) {

			if ( child.material !== undefined ) {

				child.material.needsUpdate = true;

			}

		} );

		render();

	} );

	signals.rendererCreated.add( function ( newRenderer ) {

		if ( renderer !== null ) {

			renderer.setAnimationLoop( null );
			renderer.dispose();
			pmremGenerator.dispose();

			container.dom.removeChild( renderer.domElement );

		}

		controls.connect( newRenderer.domElement );

		// Initialize TransformControls with proper domElement
		if ( !transformControls ) {
			transformControls = new TransformControls( camera, newRenderer.domElement );
			
			transformControls.addEventListener( 'axis-changed', function () {
				if ( editor.viewportShading !== 'realistic' ) render();
			} );
			
			transformControls.addEventListener( 'objectChange', function () {
				signals.objectChanged.dispatch( transformControls.object );
			} );
			
			transformControls.addEventListener( 'mouseDown', function () {
				const object = transformControls.object;
				objectPositionOnDown = object.position.clone();
				objectRotationOnDown = object.rotation.clone();
				objectScaleOnDown = object.scale.clone();
				controls.enabled = false;
			} );
			
			transformControls.addEventListener( 'mouseUp', function () {
				const object = transformControls.object;
				if ( object !== undefined ) {
					switch ( transformControls.getMode() ) {
						case 'translate':
							if ( ! objectPositionOnDown.equals( object.position ) ) {
								editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );
							}
							break;
						case 'rotate':
							if ( ! objectRotationOnDown.equals( object.rotation ) ) {
								editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );
							}
							break;
						case 'scale':
							if ( ! objectScaleOnDown.equals( object.scale ) ) {
								editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );
							}
							break;
					}
				}
				controls.enabled = true;
			} );
			
			sceneHelpers.add( transformControls );
			
			// Initialize XR now that transformControls exists
			xr = new XR( editor, transformControls ); // eslint-disable-line no-unused-vars
		}

		renderer = newRenderer;

		renderer.setAnimationLoop( animate );
		renderer.setClearColor( 0xaaaaaa );

		if ( window.matchMedia ) {

			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
			mediaQuery.addEventListener( 'change', function ( event ) {

				renderer.setClearColor( event.matches ? 0x333333 : 0x808080 );
				grid.updateColors(
					event.matches ? GRID_COLORS_DARK[ 0 ] : GRID_COLORS_LIGHT[ 0 ],
					event.matches ? GRID_COLORS_DARK[ 1 ] : GRID_COLORS_LIGHT[ 1 ]
				);

				render();

			} );

			renderer.setClearColor( mediaQuery.matches ? 0x333333 : 0x808080 );
			grid.updateColors(
				mediaQuery.matches ? GRID_COLORS_DARK[ 0 ] : GRID_COLORS_LIGHT[ 0 ],
				mediaQuery.matches ? GRID_COLORS_DARK[ 1 ] : GRID_COLORS_LIGHT[ 1 ]
			);

		}

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		pmremGenerator = new THREE.PMREMGenerator( renderer );
		pmremGenerator.compileEquirectangularShader();

		pathtracer = new ViewportPathtracer( renderer );

		container.dom.appendChild( renderer.domElement );

		render();

	} );

	signals.rendererDetectKTX2Support.add( function ( ktx2Loader ) {

		ktx2Loader.detectSupport( renderer );

	} );

	signals.sceneGraphChanged.add( function () {

		initPT();
		render();

	} );

	signals.cameraChanged.add( function () {

		pathtracer.reset();

		render();

	} );

	signals.objectSelected.add( function ( object ) {

		selectionBox.visible = false;
		transformControls.detach();

		if ( object !== null && object !== scene && object !== camera ) {

			box.setFromObject( object, true );

			if ( box.isEmpty() === false ) {

				selectionBox.visible = true;

			}

			transformControls.attach( object );

		}

		render();

	} );

	signals.objectFocused.add( function ( object ) {

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			box.setFromObject( object, true );

		}

		initPT();
		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( editor.selected === object ) {

			box.setFromObject( object, true );

		}

		if ( object.isPerspectiveCamera ) {

			object.updateProjectionMatrix();

		}

		const helper = editor.helpers[ object.id ];

		if ( helper !== undefined && helper.isSkeletonHelper !== true ) {

			helper.update();

		}

		initPT();
		render();

	} );

	signals.objectRemoved.add( function ( object ) {

		controls.enabled = true; // see #14180

		if ( object === transformControls.object ) {

			transformControls.detach();

		}

	} );

	signals.materialChanged.add( function () {

		updatePTMaterials();
		render();

	} );

	// background

	signals.sceneBackgroundChanged.add( function ( backgroundType, backgroundColor, backgroundTexture, backgroundEquirectangularTexture, backgroundColorSpace, backgroundBlurriness, backgroundIntensity, backgroundRotation ) {

		scene.background = null;

		switch ( backgroundType ) {

			case 'Color':

				scene.background = new THREE.Color( backgroundColor );

				break;

			case 'Texture':

				if ( backgroundTexture ) {

					backgroundTexture.colorSpace = backgroundColorSpace;
					backgroundTexture.needsUpdate = true;

					scene.background = backgroundTexture;

				}

				break;

			case 'Equirectangular':

				if ( backgroundEquirectangularTexture ) {

					backgroundEquirectangularTexture.mapping = THREE.EquirectangularReflectionMapping;
					backgroundEquirectangularTexture.colorSpace = backgroundColorSpace;
					backgroundEquirectangularTexture.needsUpdate = true;

					scene.background = backgroundEquirectangularTexture;
					scene.backgroundBlurriness = backgroundBlurriness;
					scene.backgroundIntensity = backgroundIntensity;
					scene.backgroundRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					if ( useBackgroundAsEnvironment ) {

						scene.environment = scene.background;
						scene.environmentRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					}


				}

				break;

		}

		updatePTBackground();
		render();

	} );

	// environment

	let useBackgroundAsEnvironment = false;

	signals.sceneEnvironmentChanged.add( function ( environmentType, environmentEquirectangularTexture ) {

		scene.environment = null;

		useBackgroundAsEnvironment = false;

		switch ( environmentType ) {


			case 'Background':

				useBackgroundAsEnvironment = true;

				if ( scene.background !== null && scene.background.isTexture ) {

					scene.environment = scene.background;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;
					scene.environmentRotation.y = scene.backgroundRotation.y;

				}

				break;

			case 'Equirectangular':

				if ( environmentEquirectangularTexture ) {

					scene.environment = environmentEquirectangularTexture;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;

				}

				break;

			case 'Room':

				scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

				break;

		}

		updatePTEnvironment();
		render();

	} );

	// fog

	signals.sceneFogChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'None':
				scene.fog = null;
				break;
			case 'Fog':
				scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
				break;
			case 'FogExp2':
				scene.fog = new THREE.FogExp2( fogColor, fogDensity );
				break;

		}

		render();

	} );

	signals.sceneFogSettingsChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'Fog':
				scene.fog.color.setHex( fogColor );
				scene.fog.near = fogNear;
				scene.fog.far = fogFar;
				break;
			case 'FogExp2':
				scene.fog.color.setHex( fogColor );
				scene.fog.density = fogDensity;
				break;

		}

		render();

	} );

	signals.viewportCameraChanged.add( function () {

		const viewportCamera = editor.viewportCamera;

		if ( viewportCamera.isPerspectiveCamera || viewportCamera.isOrthographicCamera ) {

			updateAspectRatio();

		}

		// disable EditorControls when setting a user camera

		controls.enabled = ( viewportCamera === editor.camera );

		initPT();
		render();

	} );

	signals.viewportShadingChanged.add( function () {

		const viewportShading = editor.viewportShading;

		switch ( viewportShading ) {

			case 'realistic':
				pathtracer.init( scene, editor.viewportCamera );
				break;

			case 'solid':
				scene.overrideMaterial = null;
				break;

			case 'normals':
				scene.overrideMaterial = new THREE.MeshNormalMaterial();
				break;

			case 'wireframe':
				scene.overrideMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );
				break;

		}

		render();

	} );

	//

	signals.windowResize.add( function () {

		updateAspectRatio();

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );
		pathtracer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		render();

	} );

	signals.showHelpersChanged.add( function ( appearanceStates ) {

		grid.visible = appearanceStates.gridHelper;

		sceneHelpers.traverse( function ( object ) {

			switch ( object.type ) {

				case 'CameraHelper':

				{

					object.visible = appearanceStates.cameraHelpers;
					break;

				}

				case 'PointLightHelper':
				case 'DirectionalLightHelper':
				case 'SpotLightHelper':
				case 'HemisphereLightHelper':

				{

					object.visible = appearanceStates.lightHelpers;
					break;

				}

				case 'SkeletonHelper':

				{

					object.visible = appearanceStates.skeletonHelpers;
					break;

				}

				default:

				{

					// not a helper, skip.

				}

			}

		} );


		render();

	} );

	signals.cameraResetted.add( updateAspectRatio );

	// animations

	let prevActionsInUse = 0;

	const clock = new THREE.Clock(); // only used for animations

	function animate() {

		const mixer = editor.mixer;
		const delta = clock.getDelta();

		let needsUpdate = false;

		// Animations

		const actions = mixer.stats.actions;

		if ( actions.inUse > 0 || prevActionsInUse > 0 ) {

			prevActionsInUse = actions.inUse;

			mixer.update( delta );
			needsUpdate = true;

			if ( editor.selected !== null ) {

				editor.selected.updateWorldMatrix( false, true ); // avoid frame late effect for certain skinned meshes (e.g. Michelle.glb)
				selectionBox.box.setFromObject( editor.selected, true ); // selection box should reflect current animation state

			}

		}

		// Interaction Graph - evaluate nodes for animations

		if ( editor.patchEditor && editor.patchEditor.interactionGraph ) {

			const hadAnimationBefore = editor.patchEditor.interactionGraph.hasActiveAnimations;
			editor.patchEditor.interactionGraph.evaluate();

			// Mark as needing update if we have active animations
			if ( editor.patchEditor.interactionGraph.hasActiveAnimations ) {
				needsUpdate = true;
			}

		}

		// View Helper

		if ( viewHelper.animating === true ) {

			viewHelper.update( delta );
			needsUpdate = true;

		}

		if ( renderer.xr.isPresenting === true ) {

			needsUpdate = true;

		}

		if ( needsUpdate === true ) render();

		updatePT();

	}

	function initPT() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.init( scene, editor.viewportCamera );

		}

	}

	function updatePTBackground() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.setBackground( scene.background, scene.backgroundBlurriness );

		}

	}

	function updatePTEnvironment() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.setEnvironment( scene.environment );

		}

	}

	function updatePTMaterials() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.updateMaterials();

		}

	}

	function updatePT() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.update();
			editor.signals.pathTracerUpdated.dispatch( pathtracer.getSamples() );

		}

	}

	//

	let startTime = 0;
	let endTime = 0;

	function render() {

		startTime = performance.now();

		renderer.setViewport( 0, 0, container.dom.offsetWidth, container.dom.offsetHeight );
		renderer.render( scene, editor.viewportCamera );

		if ( camera === editor.viewportCamera ) {

			renderer.autoClear = false;
			if ( grid.visible === true ) renderer.render( grid, camera );
			if ( sceneHelpers.visible === true ) renderer.render( sceneHelpers, camera );
			if ( renderer.xr.isPresenting !== true ) viewHelper.render( renderer );
			renderer.autoClear = true;

		}

		endTime = performance.now();
		editor.signals.sceneRendered.dispatch( endTime - startTime );

	}

	// Floating chat input system
	let isExpanded = true; // Default to open state
	let isManualToggle = false; // Flag to prevent observer from overriding manual toggles
	
	// Main container - always centered
	const floatingChatContainer = document.createElement('div');
	floatingChatContainer.style.cssText = `
		position: absolute;
		bottom: 30px;
		left: 50%;
		transform: translateX(-50%);
		width: 480px;
		height: 48px;
		border-radius: 24px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(8px);
		transition: all 0.3s ease;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		overflow: visible;
	`;

	// Toggle button (left) - shows sparkle when closed, X when open
	const toggleButton = document.createElement('button');
	toggleButton.innerHTML = '<i class="ph ph-x"></i>'; // Start with X since we're expanded
	toggleButton.style.cssText = `
		position: absolute;
		width: 40px;
		height: 40px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.1);
		color: #f8f8f2;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		transition: all 0.2s ease;
		top: 50%;
		left: 24px;
		transform: translate(-50%, -50%);
		z-index: 101;
	`;

	// Text input (center) - hidden when collapsed
	const textInput = document.createElement('input');
	textInput.type = 'text';
	textInput.placeholder = 'Ask AI to create or modify objects...';
	textInput.style.cssText = `
		width: 100%;
		border: none;
		background: transparent;
		color: #f8f8f2;
		font-size: 14px;
		outline: none;
		padding: 0 60px 0 56px;
		opacity: 1;
		transition: opacity 0.3s ease;
		box-sizing: border-box;
	`;

	// Send button (right) - hidden when collapsed
	const sendButton = document.createElement('button');
	sendButton.innerHTML = '<i class="ph ph-paper-plane-tilt"></i>';
	sendButton.style.cssText = `
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: #f8f8f2;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		margin-right: 8px;
		flex-shrink: 0;
		opacity: 1;
		transition: all 0.2s ease;
	`;

	// Send button hover effects
	sendButton.addEventListener('mouseenter', () => {
		if (isExpanded) {
			sendButton.style.background = 'rgba(255, 255, 255, 0.1)';
		}
	});
	sendButton.addEventListener('mouseleave', () => {
		sendButton.style.background = 'transparent';
	});

	// Assemble container
	floatingChatContainer.appendChild(toggleButton);
	floatingChatContainer.appendChild(textInput);
	floatingChatContainer.appendChild(sendButton);

	// Toggle function
	function toggleChatInput() {
		isManualToggle = true; // Set flag to prevent observer interference
		isExpanded = !isExpanded;
		
		if (isExpanded) {
			// Expand
			floatingChatContainer.style.width = '480px';
			floatingChatContainer.style.height = '48px';
			floatingChatContainer.style.borderRadius = '24px';
			floatingChatContainer.style.background = 'rgba(0, 0, 0, 0.5)';
			toggleButton.innerHTML = '<i class="ph ph-x"></i>';
			toggleButton.style.left = '24px';
			toggleButton.style.transform = 'translate(-50%, -50%)';
			textInput.style.opacity = '1';
			sendButton.style.opacity = '1';
			setTimeout(() => textInput.focus(), 300);
		} else {
			// Collapse
			floatingChatContainer.style.width = '48px';
			floatingChatContainer.style.height = '48px';
			floatingChatContainer.style.borderRadius = '50px';
			floatingChatContainer.style.background = 'rgba(0, 0, 0, 0.5)';
			toggleButton.innerHTML = '<i class="ph ph-sparkle" style="color: #FCFDE8 !important; font-size: 22px; display: inline-block;"></i>';
			toggleButton.style.left = '50%';
			toggleButton.style.transform = 'translate(-50%, -50%)';
			textInput.style.opacity = '0';
			sendButton.style.opacity = '0';
			textInput.value = '';
			textInput.blur();
		}
		
		// Reset flag after animation completes
		setTimeout(() => {
			isManualToggle = false;
		}, 350);
	}

	// Input focus/blur effects
	textInput.addEventListener('focus', () => {
		floatingChatContainer.style.background = 'rgba(0, 0, 0, 0.7)';
		floatingChatContainer.style.borderColor = 'rgba(255, 255, 255, 0.2)';
		floatingChatContainer.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.1)';
	});

	textInput.addEventListener('blur', () => {
		floatingChatContainer.style.background = 'rgba(0, 0, 0, 0.5)';
		floatingChatContainer.style.borderColor = 'rgba(255, 255, 255, 0.1)';
		floatingChatContainer.style.boxShadow = 'none';
	});

	// Send message function
	function sendMessage() {
		if (textInput.value.trim()) {
			const message = textInput.value.trim();

			// Switch to chat tab first
			const sidebar = document.getElementById('sidebar');
			const chatTab = sidebar.querySelector('#ai'); // Tab has id="ai"
			if (chatTab) {
				console.log('Found AI tab, clicking it');
				chatTab.click();
			} else {
				console.warn('AI tab not found');
			}

			// Wait for tab to switch, then send message to AI
			setTimeout(() => {
				// Try the direct method first
				const aiPanel = document.getElementById('ai-panel');
				if (aiPanel && aiPanel.processMessage) {
					console.log('Sending message via direct method:', message);
					aiPanel.processMessage(message);
				} else {
					// Use the reliable fallback method
					console.log('Using fallback method to send message:', message);
					const chatInput = document.querySelector('#ai-panel input[type="text"]');
					const sendButton = document.querySelector('#ai-panel .ph-paper-plane-tilt')?.parentElement; // Find button containing the icon

					if (chatInput && sendButton) {
						chatInput.value = message;
						chatInput.focus();
						// Trigger the send button click
						sendButton.click();
					} else {
						console.warn('Could not find AI panel input or send button');
					}
				}

				textInput.value = '';
				// Don't auto-close the floating input - let user control the state
			}, 150); // Slightly longer delay to ensure panel is ready
		}
	}

	// Event listeners
	toggleButton.addEventListener('click', function(event) {
		event.preventDefault();
		event.stopPropagation();
		console.log('Toggle button clicked, isExpanded:', isExpanded);
		toggleChatInput();
	});
	sendButton.addEventListener('click', sendMessage);
	textInput.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			sendMessage();
		} else if (event.key === 'Escape') {
			toggleChatInput();
		}
	});

	// Hide floating input when chat tab is active with smooth fade
	let lastTabState = null;
	let updateFloatingInputDebounceTimer = null;

	function updateFloatingInputVisibility() {
		// Don't interfere if user is manually toggling
		if (isManualToggle) {
			return;
		}

		const sidebar = document.getElementById('sidebar');
		const activeTab = sidebar?.querySelector('.Tab.selected');
		const isChatActive = activeTab?.textContent === 'Chat';

		// Only update if state actually changed
		if (lastTabState === isChatActive) {
			return;
		}
		lastTabState = isChatActive;

		if (isChatActive) {
			// Fade out and hide the floating input
			floatingChatContainer.style.opacity = '0';
			floatingChatContainer.style.pointerEvents = 'none';
			setTimeout(() => {
				floatingChatContainer.style.display = 'none';
			}, 300); // Wait for fade animation
		} else {
			// Show and fade in the floating input
			floatingChatContainer.style.display = 'flex';
			floatingChatContainer.style.pointerEvents = 'auto';
			// Small delay to ensure display change is processed
			setTimeout(() => {
				floatingChatContainer.style.opacity = '1';
			}, 10);
		}
	}

	// Debounced version to prevent excessive calls
	function debouncedUpdateFloatingInputVisibility() {
		if (updateFloatingInputDebounceTimer) {
			clearTimeout(updateFloatingInputDebounceTimer);
		}
		updateFloatingInputDebounceTimer = setTimeout(updateFloatingInputVisibility, 100);
	}

	// Monitor tab changes - only observe sidebar instead of entire document
	const observer = new MutationObserver(debouncedUpdateFloatingInputVisibility);
	const sidebar = document.getElementById('sidebar');
	if (sidebar) {
		observer.observe(sidebar, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
	}
	
	// Initial visibility check
	setTimeout(updateFloatingInputVisibility, 100);

	container.dom.appendChild(floatingChatContainer);

	return container;

}

// Function no longer needed with InfiniteGrid
// updateGridColors was used for the old GridHelper implementation

export { Viewport };
