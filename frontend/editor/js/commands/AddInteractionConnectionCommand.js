import { Command } from '../Command.js';

class AddInteractionConnectionCommand extends Command {

	/**
	 * @param {Editor} editor
	 * @param {Object} connectionData Connection data {fromNodeId, fromOutputIndex, toNodeId, toInputIndex}
	 * @constructor
	 */
	constructor( editor, connectionData ) {

		super( editor );

		this.type = 'AddInteractionConnectionCommand';
		this.name = editor.strings.getKey( 'command/AddInteractionConnection' ) + ': Connection';

		this.connectionData = {
			fromNodeId: connectionData.fromNodeId,
			fromOutputIndex: connectionData.fromOutputIndex,
			toNodeId: connectionData.toNodeId,
			toInputIndex: connectionData.toInputIndex
		};

		// Generate connection ID
		this.connectionId = `${connectionData.fromNodeId}-${connectionData.fromOutputIndex}-${connectionData.toNodeId}-${connectionData.toInputIndex}`;

	}

	execute() {

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Add the connection to the interaction graph
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

	undo() {

		// Get the interaction graph from the editor
		const interactionGraph = this.getInteractionGraph();

		if ( interactionGraph ) {
			// Remove the connection from the interaction graph
			interactionGraph.removeConnection( this.connectionId );

			// Emit the interaction graph changed signal
			this.editor.signals.interactionGraphChanged.dispatch();
		}

	}

	toJSON() {

		const output = super.toJSON( this );

		// Serialize the connection data
		output.connectionData = this.connectionData;
		output.connectionId = this.connectionId;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		// Deserialize the connection data
		this.connectionData = json.connectionData;
		this.connectionId = json.connectionId;

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

export { AddInteractionConnectionCommand };