/**
 * PositionNode - 3D position control for Three.js objects
 * Meta Spark AR-style Position patch
 */

import { PatchNode } from '../PatchNode.js';

export class PositionNode extends PatchNode {
    constructor(x = 0, y = 0) {
        super('Position', x, y);

        // Inputs
        this.addInput('x', 'number', 0);
        this.addInput('y', 'number', 0);
        this.addInput('z', 'number', 0);

        // Outputs
        this.addOutput('position', 'vector3');
        this.addOutput('x', 'number');
        this.addOutput('y', 'number');
        this.addOutput('z', 'number');

        // Properties
        this.setProperty('defaultX', 0);
        this.setProperty('defaultY', 0);
        this.setProperty('defaultZ', 0);

        // Initial process
        this.process();
    }

    process() {
        // Get input values
        const x = this.getInputValue('x') || this.getProperty('defaultX', 0);
        const y = this.getInputValue('y') || this.getProperty('defaultY', 0);
        const z = this.getInputValue('z') || this.getProperty('defaultZ', 0);

        // Create position vector
        const position = { x, y, z };

        // Update outputs
        this.setOutputValue('position', position);
        this.setOutputValue('x', x);
        this.setOutputValue('y', y);
        this.setOutputValue('z', z);

        // Update connected Three.js objects
        this.updateThreeJSObjects(position);
    }

    updateThreeJSObjects(position) {
        // Get connected Three.js objects from editor
        const connectedObjects = this.getProperty('connectedObjects', []);

        connectedObjects.forEach(object => {
            if (object && object.position) {
                object.position.set(position.x, position.y, position.z);
            }
        });
    }

    connectToThreeJSObject(object) {
        const connectedObjects = this.getProperty('connectedObjects', []);
        if (!connectedObjects.includes(object)) {
            connectedObjects.push(object);
            this.setProperty('connectedObjects', connectedObjects);
        }
    }

    disconnectFromThreeJSObject(object) {
        const connectedObjects = this.getProperty('connectedObjects', []);
        const index = connectedObjects.indexOf(object);
        if (index > -1) {
            connectedObjects.splice(index, 1);
            this.setProperty('connectedObjects', connectedObjects);
        }
    }

    setDefaultPosition(x, y, z) {
        this.setProperty('defaultX', x);
        this.setProperty('defaultY', y);
        this.setProperty('defaultZ', z);
        this.process(); // Reprocess with new defaults
    }
}