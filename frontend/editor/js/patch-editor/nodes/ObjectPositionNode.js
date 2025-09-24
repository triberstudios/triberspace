/**
 * ObjectPositionNode - Represents position property of a specific 3D object
 * Meta Spark AR style - only handles position, not the entire object
 */

import { PatchNode } from '../PatchNode.js';

export class ObjectPositionNode extends PatchNode {
    constructor(sceneObject, x = 0, y = 0, editor = null) {
        const objectName = sceneObject ? (sceneObject.name || 'Object') : 'Object';
        super(`${objectName} Position`, x, y);

        this.sceneObject = sceneObject;
        this.objectName = objectName;
        this.editor = editor;

        // Inputs for position control
        this.addInput('x', 'number', sceneObject ? sceneObject.position.x : 0);
        this.addInput('y', 'number', sceneObject ? sceneObject.position.y : 0);
        this.addInput('z', 'number', sceneObject ? sceneObject.position.z : 0);

        // Outputs for position values
        this.addOutput('position', 'vector3');
        this.addOutput('x', 'number');
        this.addOutput('y', 'number');
        this.addOutput('z', 'number');

        // Store initial position
        if (sceneObject) {
            this.setProperty('initialPosition', {
                x: sceneObject.position.x,
                y: sceneObject.position.y,
                z: sceneObject.position.z
            });
        }

        // Initial process
        this.process();
    }

    process() {
        if (!this.sceneObject) return;

        // Get input values or use current object values as defaults
        const x = this.getInputValue('x');
        const y = this.getInputValue('y');
        const z = this.getInputValue('z');

        // Apply to Three.js object immediately
        this.sceneObject.position.set(x, y, z);

        // Update Three.js transform matrices
        this.sceneObject.updateMatrix();
        this.sceneObject.updateMatrixWorld();

        // Update outputs
        this.setOutputValue('position', { x, y, z });
        this.setOutputValue('x', x);
        this.setOutputValue('y', y);
        this.setOutputValue('z', z);

        // Notify editor using proper signals for real-time updates
        if (this.editor && this.editor.signals) {
            this.editor.signals.objectChanged.dispatch(this.sceneObject);
            this.editor.signals.sceneGraphChanged.dispatch();
        }
    }

    // Override onOutputChanged for immediate scene updates
    onOutputChanged(outputName, newValue, oldValue) {
        if (!this.sceneObject) return;

        // Apply changes immediately to the Three.js object
        switch (outputName) {
            case 'x':
                this.sceneObject.position.setX(newValue);
                break;
            case 'y':
                this.sceneObject.position.setY(newValue);
                break;
            case 'z':
                this.sceneObject.position.setZ(newValue);
                break;
        }

        // Update Three.js transform matrices
        this.sceneObject.updateMatrix();
        this.sceneObject.updateMatrixWorld();

        // Notify editor using proper signals for real-time updates
        if (this.editor && this.editor.signals) {
            this.editor.signals.objectChanged.dispatch(this.sceneObject);
            this.editor.signals.sceneGraphChanged.dispatch();
        }
    }

    // Sync from object changes (when object is moved manually)
    syncFromObject() {
        if (!this.sceneObject) return;

        this.setInputValue('x', this.sceneObject.position.x);
        this.setInputValue('y', this.sceneObject.position.y);
        this.setInputValue('z', this.sceneObject.position.z);
    }

    // Get object reference
    getSceneObject() {
        return this.sceneObject;
    }

    // Reset to initial position
    resetToInitial() {
        const initialPos = this.getProperty('initialPosition');
        if (initialPos && this.sceneObject) {
            this.sceneObject.position.set(initialPos.x, initialPos.y, initialPos.z);
            this.syncFromObject();
        }
    }

    // Handle when connections are removed - ensure we process with current input values
    onConnectionRemoved() {
        // Force reprocess with current input values (which should be defaults now)
        this.process();
    }

    // Enhanced serialization
    serialize() {
        const baseData = super.serialize();
        return {
            ...baseData,
            type: 'ObjectProperty',
            propertyType: 'position',
            objectUuid: this.sceneObject ? this.sceneObject.uuid : null,
            objectName: this.objectName
        };
    }

    // Enhanced deserialization
    deserialize(data) {
        super.deserialize(data);
        this.objectName = data.objectName || 'Object';
    }

    // Get display name for UI
    getDisplayName() {
        return `${this.objectName} Position`;
    }

    // Custom size for property nodes
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: Math.max(140, this.objectName.length * 8 + 80),
            height: 80
        };
    }
}