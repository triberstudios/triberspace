/**
 * TimeNode - Provides time-based values for animation
 * Similar to Clock but with more time options
 */

import { PatchNode } from '../PatchNode.js';

export class TimeNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Time', x, y);

        // No inputs - time is generated internally

        // Outputs
        this.addOutput('time', 'number');
        this.addOutput('deltaTime', 'number');
        this.addOutput('sin', 'number');
        this.addOutput('cos', 'number');

        // Properties
        this.setProperty('speed', 1.0);
        this.setProperty('startTime', performance.now() / 1000);
        this.setProperty('lastTime', performance.now() / 1000);

        // Start the time update loop
        this.startTimeLoop();

        // Initial process
        this.process();
    }

    startTimeLoop() {
        const updateTime = () => {
            this.process();
            requestAnimationFrame(updateTime);
        };
        requestAnimationFrame(updateTime);
    }

    process() {
        const currentTime = performance.now() / 1000;
        const startTime = this.getProperty('startTime');
        const lastTime = this.getProperty('lastTime');
        const speed = this.getProperty('speed');

        const elapsedTime = (currentTime - startTime) * speed;
        const deltaTime = currentTime - lastTime;

        // Update outputs
        this.setOutputValue('time', elapsedTime);
        this.setOutputValue('deltaTime', deltaTime);
        this.setOutputValue('sin', Math.sin(elapsedTime));
        this.setOutputValue('cos', Math.cos(elapsedTime));

        // Update last time
        this.setProperty('lastTime', currentTime);
    }

    setSpeed(speed) {
        this.setProperty('speed', speed);
    }

    reset() {
        this.setProperty('startTime', performance.now() / 1000);
        this.setProperty('lastTime', performance.now() / 1000);
    }

    // Custom size for time node
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: 100,
            height: 100
        };
    }
}