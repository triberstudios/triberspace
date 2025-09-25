import { Command } from '../Command.js';

class RemoveInteractionNodeCommand extends Command {

	/**
	 * @param {Editor} editor
	 * @param {Object} node The interaction node to remove
	 * @constructor
	 */
	constructor( editor, node ) {

		super( editor );

		this.type = 'RemoveInteractionNodeCommand';

		this.node = node;

		if ( node !== null ) {

			this.name = editor.strings.getKey( 'command/RemoveInteractionNode' ) + ': ' + (node.type || 'Node');

		}

	}

	execute() {

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Remove the node from the interaction graph
			interactionGraph.removeNode( this.node.id );

			// Emit the interaction graph changed signal
			this.editor.signals.interactionGraphChanged.dispatch();
		}

	}

	undo() {

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Add the node back to the interaction graph
			interactionGraph.addNode( this.node );

			// Emit the interaction graph changed signal
			this.editor.signals.interactionGraphChanged.dispatch();
		}

	}

	toJSON() {

		const output = super.toJSON( this );

		// Serialize the node data
		if ( this.node && this.node.serialize ) {
			output.node = this.node.serialize();
		} else {
			// Fallback serialization for nodes without serialize method
			output.node = {
				id: this.node.id,
				type: this.node.type,
				position: this.node.position,
				// Add other essential properties as needed
			};
		}

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		// Deserialize the node data
		// This will need to be implemented based on how nodes are constructed
		// For now, we'll store the serialized data and reconstruct on execute
		this.nodeData = json.node;

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

export { RemoveInteractionNodeCommand };