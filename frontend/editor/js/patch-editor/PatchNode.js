/**
 * PatchNode - Base class for all patch editor nodes
 * Provides common functionality for inputs, outputs, and properties
 */

export class PatchNode {
    static nodeCounter = 0;

    constructor(type, x = 0, y = 0) {
        this.id = `node_${++PatchNode.nodeCounter}`;
        this.type = type;
        this.position = { x, y };
        this.inputs = [];
        this.outputs = [];
        this.properties = new Map();
        this.size = { width: 120, height: 80 };
    }

    addInput(name, dataType = 'number', defaultValue = 0) {
        const input = {
            name,
            dataType,
            value: defaultValue,
            connection: null
        };
        this.inputs.push(input);
        return input;
    }

    addOutput(name, dataType = 'number') {
        const output = {
            name,
            dataType,
            value: 0,
            connections: []
        };
        this.outputs.push(output);
        return output;
    }

    setProperty(name, value) {
        this.properties.set(name, value);
    }

    getProperty(name, defaultValue = null) {
        return this.properties.get(name) || defaultValue;
    }

    getInputValue(inputName) {
        const input = this.inputs.find(i => i.name === inputName);
        if (!input) return 0;

        // If connected, get value from connection
        if (input.connection) {
            return input.connection.getValue();
        }

        // Otherwise return default value
        return input.value;
    }

    setOutputValue(outputName, value) {
        const output = this.outputs.find(o => o.name === outputName);
        if (output) {
            output.value = value;
            // Propagate to connected nodes
            this.propagateValue(output);
        }
    }

    propagateValue(output) {
        output.connections.forEach(connection => {
            connection.setValue(output.value);
        });
    }

    // Override in subclasses to implement node-specific logic
    process() {
        // Base implementation does nothing
    }

    // Called when inputs change
    onInputChanged() {
        this.process();
    }

    // Get node bounds for hit testing
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.size.width,
            height: this.size.height
        };
    }

    // Serialize node state
    serialize() {
        return {
            id: this.id,
            type: this.type,
            position: { ...this.position },
            properties: Object.fromEntries(this.properties)
        };
    }

    // Restore node state
    deserialize(data) {
        this.id = data.id;
        this.position = { ...data.position };
        this.properties = new Map(Object.entries(data.properties || {}));
    }
}