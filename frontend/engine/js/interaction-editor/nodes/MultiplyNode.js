/**
 * MultiplyNode - Multiplies two values together
 * Basic math operation node
 */

import { PatchNode } from '../PatchNode.js';

export class MultiplyNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Multiply', x, y);

        // Inputs
        this.addInput('a', 'number', 1);
        this.addInput('b', 'number', 1);

        // Outputs
        this.addOutput('result', 'number');

        // Initial process
        this.process();
    }

    process() {
        // Get input values
        const a = this.getInputValue('a');
        const b = this.getInputValue('b');

        // Calculate result
        const result = a * b;

        // Update output
        this.setOutputValue('result', result);
    }

    // Custom size for multiply node
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: 80,
            height: 60
        };
    }
}