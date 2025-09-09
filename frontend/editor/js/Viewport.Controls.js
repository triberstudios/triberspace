import { UIPanel, UISelect, UIDiv, UISpan, UIText } from './libs/ui.js';

function ViewportControls( editor ) {

	const signals = editor.signals;

	const container = new UIPanel();
	container.setPosition( 'absolute' );
	container.setRight( '10px' );
	container.setTop( '10px' );
	container.setClass( 'viewport-controls' );

	// Create menu-style dropdown component
	function createBlenderDropdown( iconHTML, text, options, defaultValue, onChange ) {
		const dropdown = new UIDiv();
		dropdown.setClass( 'blender-dropdown' );
		
		const button = new UIDiv();
		button.setClass( 'blender-dropdown-button' );
		
		const icon = new UISpan();
		icon.dom.innerHTML = iconHTML;
		icon.setClass( 'dropdown-icon' );
		button.add( icon );
		
		const label = new UIText( text );
		label.setClass( 'dropdown-label' );
		button.add( label );
		
		const arrow = new UISpan();
		arrow.dom.innerHTML = '<i class="ph ph-caret-down"></i>';
		arrow.setClass( 'dropdown-arrow' );
		button.add( arrow );
		
		dropdown.add( button );
		
		// Create options panel
		const optionsPanel = new UIDiv();
		optionsPanel.setClass( 'options' );
		
		// Create options from the options object
		let currentValue = defaultValue;
		for ( const key in options ) {
			const option = new UIDiv();
			option.setClass( 'option' );
			option.setTextContent( options[ key ] );
			option.dom.addEventListener( 'click', function() {
				currentValue = key;
				label.setValue( options[ key ] );
				optionsPanel.dom.classList.remove( 'open' );
				if ( onChange ) onChange( key );
			} );
			optionsPanel.add( option );
		}
		
		// Click handler for button to toggle dropdown
		button.dom.addEventListener( 'click', function() {
			optionsPanel.dom.classList.toggle( 'open' );
		} );
		
		// Close dropdown when clicking outside
		document.addEventListener( 'click', function( event ) {
			if ( !dropdown.dom.contains( event.target ) ) {
				optionsPanel.dom.classList.remove( 'open' );
			}
		} );
		
		dropdown.add( optionsPanel );
		
		// Set initial value
		if ( defaultValue && options[ defaultValue ] ) {
			label.setValue( options[ defaultValue ] );
		}
		
		// Mock select interface for compatibility
		const mockSelect = {
			getValue: function() { return currentValue; },
			setValue: function( value ) { 
				currentValue = value;
				if ( options[ value ] ) {
					label.setValue( options[ value ] );
				}
			},
			setOptions: function( newOptions ) {
				options = newOptions;
				// Clear existing options
				while ( optionsPanel.dom.firstChild ) {
					optionsPanel.dom.removeChild( optionsPanel.dom.firstChild );
				}
				// Add new options
				for ( const key in newOptions ) {
					const option = new UIDiv();
					option.setClass( 'option' );
					option.setTextContent( newOptions[ key ] );
					option.dom.addEventListener( 'click', function() {
						currentValue = key;
						label.setValue( newOptions[ key ] );
						optionsPanel.dom.classList.remove( 'open' );
						if ( onChange ) onChange( key );
					} );
					optionsPanel.add( option );
				}
			}
		};
		
		return { dropdown, select: mockSelect, label };
	}

	// Camera dropdown (hidden for now)
	const cameraComponent = createBlenderDropdown(
		'<i class="ph ph-camera"></i>',
		'Camera',
		{},
		'',
		function( value ) {
			editor.setViewportCamera( value );
		}
	);
	cameraComponent.dropdown.setDisplay( 'none' );
	container.add( cameraComponent.dropdown );

	signals.cameraAdded.add( update );
	signals.cameraRemoved.add( update );
	signals.objectChanged.add( function ( object ) {

		if ( object.isCamera ) {

			update();

		}

	} );

	// Shading dropdown
	const shadingComponent = createBlenderDropdown(
		'<i class="ph ph-camera"></i>',
		'Solid',
		{ 'realistic': 'Realistic', 'solid': 'Solid', 'normals': 'Normals', 'wireframe': 'Wireframe' },
		'solid',
		function( value ) {
			editor.setViewportShading( value );
		}
	);
	container.add( shadingComponent.dropdown );

	// Transform space dropdown
	const transformSpaceComponent = createBlenderDropdown(
		'<i class="ph ph-arrows-out-cardinal"></i>',
		'Local',
		{ 'local': 'Local', 'world': 'World' },
		'local',
		function( value ) {
			// TODO: Connect to transform controls
			console.log( 'Transform space:', value );
		}
	);
	container.add( transformSpaceComponent.dropdown );
	
	// Keyboard shortcut (L key) to toggle transform space
	document.addEventListener( 'keydown', function( event ) {
		if ( event.key === 'l' || event.key === 'L' ) {
			if ( !document.querySelector( 'input:focus, textarea:focus' ) ) {
				event.preventDefault();
				const currentValue = transformSpaceComponent.select.getValue();
				const newValue = currentValue === 'local' ? 'world' : 'local';
				transformSpaceComponent.select.setValue( newValue );
				// Trigger the change callback manually since we don't have a real DOM select
				if ( newValue === 'local' ) {
					console.log( 'Transform space: local' );
				} else {
					console.log( 'Transform space: world' );
				}
			}
		}
	} );

	signals.editorCleared.add( function () {

		editor.setViewportCamera( editor.camera.uuid );

		shadingComponent.select.setValue( 'solid' );
		editor.setViewportShading( shadingComponent.select.getValue() );

	} );

	signals.cameraResetted.add( update );

	update();

	//

	function update() {

		const options = {};
		const cameras = editor.cameras;

		for ( const key in cameras ) {
			const camera = cameras[ key ];
			options[ camera.uuid ] = camera.name;
		}

		cameraComponent.select.setOptions( options );

		const selectedCamera = ( editor.viewportCamera.uuid in options )
			? editor.viewportCamera
			: editor.camera;

		cameraComponent.select.setValue( selectedCamera.uuid );
		cameraComponent.label.setValue( selectedCamera.name );
		editor.setViewportCamera( selectedCamera.uuid );

	}

	return container;

}

export { ViewportControls };
