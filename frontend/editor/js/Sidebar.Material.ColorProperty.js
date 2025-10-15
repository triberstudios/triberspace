import { UIColor, UINumber, UIRow, UIText, UIButton } from './libs/ui.js';
import { SetMaterialColorCommand } from './commands/SetMaterialColorCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';

// Helper function to create property patch button
function createPropertyPatchButton( editor, propertyType ) {
	const button = new UIButton( '' ).setWidth( '20px' ).setMarginLeft( '5px' );
	button.setClass( 'Button property-patch-button' );

	button.onClick( function() {
		const object = editor.selected;

		if ( !object || !editor.patchEditor ) {
			return;
		}

		// Check if a patch already exists
		const interactionGraph = editor.patchEditor.getInteractionGraph();
		if ( !interactionGraph || !interactionGraph.nodes ) {
			return;
		}

		const existingNode = Array.from( interactionGraph.nodes.values() ).find( node =>
			node.sceneObject === object &&
			node.type === 'ObjectProperty' &&
			node.propertyType === propertyType
		);

		if ( existingNode ) {
			// Focus on existing patch
			if ( editor.patchEditor.canvas ) {
				editor.patchEditor.canvas.focusOnNode( existingNode.id );
			}
		} else {
			// Create new patch
			editor.patchEditor.createPropertyPatch( object, propertyType );
		}
	});

	return button;
}

function SidebarMaterialColorProperty( editor, property, name ) {

	const signals = editor.signals;

	const container = new UIRow();
	container.add( new UIText( name ).setClass( 'Label' ) );

	// Add property patch button for the first color property (main color)
	if ( property === 'color' ) {
		const materialArrow = createPropertyPatchButton( editor, 'material' );
		container.add( materialArrow );
	}

	const color = new UIColor().onInput( onChange );
	container.add( color );

	let intensity;

	if ( property === 'emissive' ) {

		intensity = new UINumber( 1 ).setWidth( '30px' ).setRange( 0, Infinity ).onChange( onChange );
		container.add( intensity );

	}

	let object = null;
	let materialSlot = null;
	let material = null;

	function onChange() {

		if ( material[ property ].getHex() !== color.getHexValue() ) {

			editor.execute( new SetMaterialColorCommand( editor, object, property, color.getHexValue(), materialSlot ) );

		}

		if ( intensity !== undefined ) {

			if ( material[ `${ property }Intensity` ] !== intensity.getValue() ) {

				editor.execute( new SetMaterialValueCommand( editor, object, `${ property }Intensity`, intensity.getValue(), materialSlot ) );

			}

		}

	}

	function update( currentObject, currentMaterialSlot = 0 ) {

		object = currentObject;
		materialSlot = currentMaterialSlot;

		if ( object === null ) return;
		if ( object.material === undefined ) return;

		material = editor.getObjectMaterial( object, materialSlot );

		if ( property in material ) {

			color.setHexValue( material[ property ].getHexString() );

			if ( intensity !== undefined ) {

				intensity.setValue( material[ `${ property }Intensity` ] );

			}

			container.setDisplay( '' );

		} else {

			container.setDisplay( 'none' );

		}

	}

	//

	signals.objectSelected.add( update );
	signals.materialChanged.add( update );

	return container;

}

export { SidebarMaterialColorProperty };
