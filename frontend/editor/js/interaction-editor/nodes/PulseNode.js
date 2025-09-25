/**
 * PulseNode - TouchDesigner-style behavior node for rhythmic scaling
 * Direct, clear purpose: makes something pulse/breathe in size
 * Outputs single scale value
 */

import { PatchNode } from '../PatchNode.js';

export class PulseNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Pulse', x, y);

        // TouchDesigner-style: simple, direct inputs
        this.addInput('speed', 'number', 20); // BPM (beats per minute)
        this.addInput('amount', 'number', 0.2); // Scale variation amount

        // Single, clear output - just scale multiplier
        this.addOutput('scale', 'number');

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
        const amount = this.getInputValue('amount'); // Scale variation

        // Convert BPM to cycles per second
        const cyclesPerSecond = speed / 60;

        // Calculate current phase (0 to 1 over one complete cycle)
        const phase = (elapsedSeconds * cyclesPerSecond) % 1;

        // Use smooth sine wave for pulsing effect
        const pulsePhase = (Math.sin(phase * 2 * Math.PI - Math.PI / 2) + 1) / 2;

        // Map to scale range: 1.0 + (-amount to +amount)
        const scaleValue = 1.0 + (pulsePhase - 0.5) * amount * 2;

        // Update output
        this.setOutputValue('scale', scaleValue);
    }

    setupUpdateLoop() {
        // Update at 60fps for smooth animation
        this.updateInterval = setInterval(() => {
            this.process();
        }, 1000 / 60);
    }

    // Override onInputChanged to restart timing when parameters change
    onInputChanged(inputName, newValue, oldValue) {
        if (inputName === 'speed') {
            // Reset start time to avoid phase jumps when changing speed
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
            type: 'Pulse',
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
        const amount = Math.round(this.getInputValue('amount') * 100);
        return `Pulse (${speed} bpm, ${amount}%)`;
    }

    // Custom bounds for pulse nodes
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: 140,
            height: 100
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