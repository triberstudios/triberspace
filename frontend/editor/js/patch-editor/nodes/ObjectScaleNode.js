/**
 * ObjectScaleNode - Represents scale property of a specific 3D object
 * Meta Spark AR style - only handles scale, not the entire object
 */

import { PatchNode } from '../PatchNode.js';

export class ObjectScaleNode extends PatchNode {
    constructor(sceneObject, x = 0, y = 0, editor = null) {
        const objectName = sceneObject ? (sceneObject.name || 'Object') : 'Object';
        super(`${objectName} Scale`, x, y);

        this.sceneObject = sceneObject;
        this.objectName = objectName;
        this.editor = editor;

        // Inputs for scale control
        this.addInput('x', 'number', sceneObject ? sceneObject.scale.x : 1);
        this.addInput('y', 'number', sceneObject ? sceneObject.scale.y : 1);
        this.addInput('z', 'number', sceneObject ? sceneObject.scale.z : 1);

        // Outputs for scale values
        this.addOutput('scale', 'vector3');
        this.addOutput('x', 'number');
        this.addOutput('y', 'number');
        this.addOutput('z', 'number');

        // Store initial scale
        if (sceneObject) {
            this.setProperty('initialScale', {
                x: sceneObject.scale.x,
                y: sceneObject.scale.y,
                z: sceneObject.scale.z
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
        this.sceneObject.scale.set(x, y, z);

        // Update Three.js transform matrices
        this.sceneObject.updateMatrix();
        this.sceneObject.updateMatrixWorld();

        // Update outputs
        this.setOutputValue('scale', { x, y, z });
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
                this.sceneObject.scale.x = newValue;
                break;
            case 'y':
                this.sceneObject.scale.y = newValue;
                break;
            case 'z':
                this.sceneObject.scale.z = newValue;
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

    // Sync from object changes (when object is scaled manually)
    syncFromObject() {
        if (!this.sceneObject) return;

        this.setInputValue('x', this.sceneObject.scale.x);
        this.setInputValue('y', this.sceneObject.scale.y);
        this.setInputValue('z', this.sceneObject.scale.z);
    }

    // Get object reference
    getSceneObject() {
        return this.sceneObject;
    }

    // Reset to initial scale
    resetToInitial() {
        const initialScale = this.getProperty('initialScale');
        if (initialScale && this.sceneObject) {
            this.sceneObject.scale.set(initialScale.x, initialScale.y, initialScale.z);
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
            propertyType: 'scale',
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
        return `${this.objectName} Scale`;
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