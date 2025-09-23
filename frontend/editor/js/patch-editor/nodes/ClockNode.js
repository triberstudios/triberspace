/**
 * ClockNode - Outputs time-based values for animations
 * Meta Spark AR-style Clock patch
 */

import { PatchNode } from '../PatchNode.js';

export class ClockNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Clock', x, y);

        // Outputs
        this.addOutput('time', 'number');
        this.addOutput('seconds', 'number');
        this.addOutput('milliseconds', 'number');

        // Internal state
        this.startTime = Date.now();
        this.isRunning = true;

        // Start the clock
        this.startClock();
    }

    startClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }

        this.clockInterval = setInterval(() => {
            if (this.isRunning) {
                this.process();
            }
        }, 16); // ~60fps updates
    }

    process() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;

        const seconds = elapsed / 1000;
        const milliseconds = elapsed;

        // Update output values
        this.setOutputValue('time', seconds);
        this.setOutputValue('seconds', Math.floor(seconds));
        this.setOutputValue('milliseconds', milliseconds);
    }

    play() {
        this.isRunning = true;
    }

    pause() {
        this.isRunning = false;
    }

    reset() {
        this.startTime = Date.now();
    }

    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    }

    serialize() {
        const base = super.serialize();
        return {
            ...base,
            isRunning: this.isRunning
        };
    }

    deserialize(data) {
        super.deserialize(data);
        this.isRunning = data.isRunning !== false;
        if (this.isRunning) {
            this.startClock();
        }
    }
}