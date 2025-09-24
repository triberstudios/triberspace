/**
 * SpinNode - TouchDesigner-style behavior node for continuous rotation
 * Direct, clear purpose: makes something spin continuously
 * Outputs single rotation value for specific axis
 */

import { PatchNode } from '../PatchNode.js';

export class SpinNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Spin', x, y);

        // TouchDesigner-style: simple, direct inputs
        this.addInput('speed', 'number', 60); // RPM
        this.addInput('clockwise', 'boolean', true); // Direction as boolean

        // Single, clear output - just rotation value
        this.addOutput('rotation', 'number');

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
        const speed = this.getInputValue('speed'); // RPM
        const clockwise = this.getInputValue('clockwise');

        // Convert RPM to radians per second
        const radiansPerSecond = (speed / 60) * 2 * Math.PI;

        // Apply direction
        const direction = clockwise ? 1 : -1;

        // Calculate current rotation based on elapsed time
        const rotation = elapsedSeconds * radiansPerSecond * direction;

        // Update output
        this.setOutputValue('rotation', rotation);
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
            type: 'Spin',
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
        const direction = this.getInputValue('clockwise') ? 'CW' : 'CCW';
        return `Spin (${speed} rpm ${direction})`;
    }

    // Custom bounds
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: 150,
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