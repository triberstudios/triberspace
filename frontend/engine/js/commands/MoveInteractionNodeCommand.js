import { Command } from '../Command.js';

class MoveInteractionNodeCommand extends Command {

	/**
	 * @param {Editor} editor
	 * @param {Object} node The interaction node to move
	 * @param {Object} newPosition New position {x, y}
	 * @param {Object} optionalOldPosition Optional old position {x, y}
	 * @constructor
	 */
	constructor( editor, node, newPosition = null, optionalOldPosition = null ) {

		super( editor );

		this.type = 'MoveInteractionNodeCommand';
		this.name = editor.strings.getKey( 'command/MoveInteractionNode' ) + ': ' + (node.type || 'Node');
		this.updatable = true; // Allow batching drag operations

		this.node = node;

		if ( node !== null && newPosition !== null ) {

			this.oldPosition = {
				x: node.position.x,
				y: node.position.y
			};
			this.newPosition = {
				x: newPosition.x,
				y: newPosition.y
			};

		}

		if ( optionalOldPosition !== null ) {

			this.oldPosition = {
				x: optionalOldPosition.x,
				y: optionalOldPosition.y
			};

		}

	}

	execute() {

		// Update node position
		this.node.position.x = this.newPosition.x;
		this.node.position.y = this.newPosition.y;

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Emit the interaction graph changed signal for rendering
			this.editor.signals.interactionGraphChanged.dispatch();
		}

	}

	undo() {

		// Restore old position
		this.node.position.x = this.oldPosition.x;
		this.node.position.y = this.oldPosition.y;

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Emit the interaction graph changed signal for rendering
			this.editor.signals.interactionGraphChanged.dispatch();
		}

	}

	update( command ) {

		// Update the new position for smooth drag operations
		this.newPosition.x = command.newPosition.x;
		this.newPosition.y = command.newPosition.y;

	}

	toJSON() {

		const output = super.toJSON( this );

		// Serialize the node and position data
		output.nodeId = this.node.id;
		output.oldPosition = this.oldPosition;
		output.newPosition = this.newPosition;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		// Note: Node restoration from serialized data would require
		// access to the interaction graph to get the node by ID
		this.nodeId = json.nodeId;
		this.oldPosition = json.oldPosition;
		this.newPosition = json.newPosition;

	}

	// Helper method to get the interaction graph
	getInteractionGraph() {

		if ( this.editor && this.editor.interactionEditor &&
			 this.editor.interactionEditor.interactionEditor &&
			 this.editor.interactionEditor.interactionEditor.interactionGraph ) {

			return this.editor.interactionEditor.interactionEditor.interactionGraph;
		}

		return null;
	}

}

export { MoveInteractionNodeCommand };