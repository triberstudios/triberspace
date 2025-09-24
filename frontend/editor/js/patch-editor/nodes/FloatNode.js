/**
 * FloatNode - TouchDesigner-style behavior node for gentle bobbing motion
 * Direct, clear purpose: makes something float up and down
 * Outputs single position offset value
 */

import { PatchNode } from '../PatchNode.js';

export class FloatNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Float', x, y);

        // TouchDesigner-style: simple, direct inputs
        this.addInput('speed', 'number', 30); // BPM (bobs per minute)
        this.addInput('height', 'number', 1.0); // Height range in units

        // Single, clear output - just position offset
        this.addOutput('position', 'number');

        // Internal state
        this.startTime = Date.now();

        // Start processing immediately
        this.process();

        // Set up continuous update loop
        this.setupUpdateLoop();
    }

    process() {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - this.startTime) / 1000;

        // Get input values
        const speed = this.getInputValue('speed'); // BPM
        const height = this.getInputValue('height'); // Height range

        // Convert BPM to cycles per second
        const cyclesPerSecond = speed / 60;

        // Calculate current phase (0 to 1 over one complete cycle)
        const phase = (elapsedSeconds * cyclesPerSecond) % 1;

        // Use smooth sine wave for floating effect
        const floatPhase = Math.sin(phase * 2 * Math.PI);

        // Map to position range: -height/2 to +height/2
        const positionValue = floatPhase * height * 0.5;

        // Update output
        this.setOutputValue('position', positionValue);
    }

    setupUpdateLoop() {
        // Update at 60fps for smooth animation
        this.updateInterval = setInterval(() => {
            this.process();
        }, 1000 / 60);
    }

    // Override onInputChanged to restart timing when speed changes
    onInputChanged(inputName, newValue, oldValue) {
        if (inputName === 'speed') {
            // Reset start time to avoid jumps when changing speed
            this.startTime = Date.now();
        }
        this.process();
    }

    // Handle when connections are removed
    onConnectionRemoved() {
        this.process();
    }

    // Enhanced serialization
    serialize() {
        const baseData = super.serialize();
        return {
            ...baseData,
            type: 'Float',
            startTime: this.startTime
        };
    }

    // Enhanced deserialization
    deserialize(data) {
        super.deserialize(data);
        if (data.startTime) {
            this.startTime = data.startTime;
        }
        this.setupUpdateLoop();
    }

    // Get display name for UI
    getDisplayName() {
        const speed = this.getInputValue('speed');
        const height = this.getInputValue('height');
        return `Float (${speed} bpm, ${height} units)`;
    }

    // Custom bounds
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: 140,
            height: 80
        };
    }

    // Cleanup when node is destroyed
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        super.destroy && super.destroy();
    }
}