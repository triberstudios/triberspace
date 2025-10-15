import { Command } from '../Command.js';

/**
 * PlaceOnSurfaceCommand - Undoable command for surface placement
 * Stores both position and rotation changes
 */
class PlaceOnSurfaceCommand extends Command {

	constructor( editor, object, newPosition, newRotation, oldPosition, oldRotation ) {

		super( editor );

		this.type = 'PlaceOnSurfaceCommand';
		this.name = 'Place on Surface';

		this.object = object;
		this.newPosition = newPosition.clone();
		this.newRotation = newRotation.clone();
		this.oldPosition = oldPosition.clone();
		this.oldRotation = oldRotation.clone();

	}

	execute() {

		this.object.position.copy( this.newPosition );
		this.object.rotation.copy( this.newRotation );
		this.object.updateMatrixWorld( true );
		this.editor.signals.objectChanged.dispatch( this.object );

	}

	undo() {

		this.object.position.copy( this.oldPosition );
		this.object.rotation.copy( this.oldRotation );
		this.object.updateMatrixWorld( true );
		this.editor.signals.objectChanged.dispatch( this.object );

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.oldPosition = this.oldPosition.toArray();
		output.oldRotation = this.oldRotation.toArray();
		output.newPosition = this.newPosition.toArray();
		output.newRotation = this.newRotation.toArray();

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.oldPosition.fromArray( json.oldPosition );
		this.oldRotation.fromArray( json.oldRotation );
		this.newPosition.fromArray( json.newPosition );
		this.newRotation.fromArray( json.newRotation );

	}

}

export { PlaceOnSurfaceCommand };
