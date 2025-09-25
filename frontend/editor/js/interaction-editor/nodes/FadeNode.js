/**
 * FadeNode - TouchDesigner-style behavior node for opacity transitions
 * Direct, clear purpose: makes something fade in and out
 * Outputs single opacity value
 */

import { PatchNode } from '../PatchNode.js';

export class FadeNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Fade', x, y);

        // TouchDesigner-style: simple, direct inputs
        this.addInput('speed', 'number', 40); // BPM (fades per minute)
        this.addInput('min', 'number', 0.0); // Minimum opacity
        this.addInput('max', 'number', 1.0); // Maximum opacity

        // Single, clear output - just opacity value
        this.addOutput('opacity', 'number');

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
        const minOpacity = this.getInputValue('min');
        const maxOpacity = this.getInputValue('max');

        // Convert BPM to cycles per second
        const cyclesPerSecond = speed / 60;

        // Calculate current phase (0 to 1 over one complete cycle)
        const phase = (elapsedSeconds * cyclesPerSecond) % 1;

        // Use smooth sine wave for fading effect
        const fadePhase = (Math.sin(phase * 2 * Math.PI - Math.PI / 2) + 1) / 2;

        // Map to opacity range: min to max
        const opacityValue = minOpacity + fadePhase * (maxOpacity - minOpacity);

        // Clamp to valid opacity range [0, 1]
        const clampedOpacity = Math.max(0, Math.min(1, opacityValue));

        // Update output
        this.setOutputValue('opacity', clampedOpacity);
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
            type: 'Fade',
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
        const min = Math.round(this.getInputValue('min') * 100);
        const max = Math.round(this.getInputValue('max') * 100);
        return `Fade (${speed} bpm, ${min}%-${max}%)`;
    }

    // Custom bounds
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: 160,
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