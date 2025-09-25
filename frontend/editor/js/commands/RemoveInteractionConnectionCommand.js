import { Command } from '../Command.js';

class RemoveInteractionConnectionCommand extends Command {

	/**
	 * @param {Editor} editor
	 * @param {string} connectionId The connection ID to remove
	 * @param {Object} connectionData Connection data for restoration {fromNodeId, fromOutputIndex, toNodeId, toInputIndex}
	 * @constructor
	 */
	constructor( editor, connectionId, connectionData ) {

		super( editor );

		this.type = 'RemoveInteractionConnectionCommand';
		this.name = editor.strings.getKey( 'command/RemoveInteractionConnection' ) + ': Connection';

		this.connectionId = connectionId;
		this.connectionData = {
			fromNodeId: connectionData.fromNodeId,
			fromOutputIndex: connectionData.fromOutputIndex,
			toNodeId: connectionData.toNodeId,
			toInputIndex: connectionData.toInputIndex
		};

	}

	execute() {

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Remove the connection from the interaction graph
			interactionGraph.removeConnection( this.connectionId );

			// Emit the interaction graph changed signal
			this.editor.signals.interactionGraphChanged.dispatch();
		}

	}

	undo() {

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Restore the connection to the interaction graph
			interactionGraph.addConnection(
				this.connectionData.fromNodeId,
				this.connectionData.fromOutputIndex,
				this.connectionData.toNodeId,
				this.connectionData.toInputIndex
			);

			// Emit the interaction graph changed signal
			this.editor.signals.interactionGraphChanged.dispatch();
		}

	}

	toJSON() {

		const output = super.toJSON( this );

		// Serialize the connection data
		output.connectionId = this.connectionId;
		output.connectionData = this.connectionData;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		// Deserialize the connection data
		this.connectionId = json.connectionId;
		this.connectionData = json.connectionData;

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

export { RemoveInteractionConnectionCommand };