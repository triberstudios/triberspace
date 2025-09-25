/**
 * ObjectRotationNode - Represents rotation property of a specific 3D object
 * Meta Spark AR style - only handles rotation, not the entire object
 */

import { PatchNode } from '../PatchNode.js';

export class ObjectRotationNode extends PatchNode {
    constructor(sceneObject, x = 0, y = 0, editor = null) {
        const objectName = sceneObject ? (sceneObject.name || 'Object') : 'Object';
        super(`${objectName} Rotation`, x, y);

        this.sceneObject = sceneObject;
        this.objectName = objectName;
        this.editor = editor;

        // Inputs for rotation control
        this.addInput('x', 'number', sceneObject ? sceneObject.rotation.x : 0);
        this.addInput('y', 'number', sceneObject ? sceneObject.rotation.y : 0);
        this.addInput('z', 'number', sceneObject ? sceneObject.rotation.z : 0);

        // Outputs for rotation values
        this.addOutput('rotation', 'vector3');
        this.addOutput('x', 'number');
        this.addOutput('y', 'number');
        this.addOutput('z', 'number');

        // Store initial rotation
        if (sceneObject) {
            this.setProperty('initialRotation', {
                x: sceneObject.rotation.x,
                y: sceneObject.rotation.y,
                z: sceneObject.rotation.z
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
        this.sceneObject.rotation.set(x, y, z);

        // Update Three.js transform matrices
        this.sceneObject.updateMatrix();
        this.sceneObject.updateMatrixWorld();

        // Update outputs
        this.setOutputValue('rotation', { x, y, z });
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
                this.sceneObject.rotation.x = newValue;
                break;
            case 'y':
                this.sceneObject.rotation.y = newValue;
                break;
            case 'z':
                this.sceneObject.rotation.z = newValue;
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

    // Sync from object changes (when object is rotated manually)
    syncFromObject() {
        if (!this.sceneObject) return;

        this.setInputValue('x', this.sceneObject.rotation.x);
        this.setInputValue('y', this.sceneObject.rotation.y);
        this.setInputValue('z', this.sceneObject.rotation.z);
    }

    // Get object reference
    getSceneObject() {
        return this.sceneObject;
    }

    // Reset to initial rotation
    resetToInitial() {
        const initialRot = this.getProperty('initialRotation');
        if (initialRot && this.sceneObject) {
            this.sceneObject.rotation.set(initialRot.x, initialRot.y, initialRot.z);
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
            propertyType: 'rotation',
            objectUuid: this.sceneObject ? this.sceneObject.uuid : null,
            objectName: this.objectName
        };
    }

    // Enhanced deserialization
    deserialize(data) {
        super.deserialize(data);
        this.objectName = data.objectName || 'Object';
        // Sync with current object state to show fresh values instead of stale cached ones
        this.syncFromObject();
    }

    // Get display name for UI
    getDisplayName() {
        return `${this.objectName} Rotation`;
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