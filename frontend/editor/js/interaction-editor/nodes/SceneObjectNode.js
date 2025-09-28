/**
 * SceneObjectNode - Represents Three.js scene objects in patch editor
 * Provides transform and material properties as inputs/outputs
 */

import { PatchNode } from '../PatchNode.js';

export class SceneObjectNode extends PatchNode {
    constructor(sceneObject, x = 0, y = 0) {
        super('SceneObject', x, y);

        this.sceneObject = sceneObject;
        this.objectName = sceneObject ? (sceneObject.name || 'Unnamed Object') : 'No Object';

        // Set up inputs for transform properties
        this.addInput('position.x', 'number', 0);
        this.addInput('position.y', 'number', 0);
        this.addInput('position.z', 'number', 0);
        this.addInput('rotation.x', 'number', 0);
        this.addInput('rotation.y', 'number', 0);
        this.addInput('rotation.z', 'number', 0);
        this.addInput('scale.x', 'number', 1);
        this.addInput('scale.y', 'number', 1);
        this.addInput('scale.z', 'number', 1);
        this.addInput('visible', 'boolean', true);

        // Set up outputs for transform properties
        this.addOutput('position', 'vector3');
        this.addOutput('position.x', 'number');
        this.addOutput('position.y', 'number');
        this.addOutput('position.z', 'number');
        this.addOutput('rotation', 'vector3');
        this.addOutput('rotation.x', 'number');
        this.addOutput('rotation.y', 'number');
        this.addOutput('rotation.z', 'number');
        this.addOutput('scale', 'vector3');
        this.addOutput('scale.x', 'number');
        this.addOutput('scale.y', 'number');
        this.addOutput('scale.z', 'number');
        this.addOutput('object', 'object');
        this.addOutput('visible', 'boolean');

        // Store initial state
        this.storeInitialState();

        // Initial process
        this.process();
    }

    storeInitialState() {
        if (!this.sceneObject) return;

        this.setProperty('initialPosition', {
            x: this.sceneObject.position.x,
            y: this.sceneObject.position.y,
            z: this.sceneObject.position.z
        });

        this.setProperty('initialRotation', {
            x: this.sceneObject.rotation.x,
            y: this.sceneObject.rotation.y,
            z: this.sceneObject.rotation.z
        });

        this.setProperty('initialScale', {
            x: this.sceneObject.scale.x,
            y: this.sceneObject.scale.y,
            z: this.sceneObject.scale.z
        });

        this.setProperty('initialVisible', this.sceneObject.visible);
    }

    process() {
        if (!this.sceneObject) return;

        // Get input values or use current object values as defaults
        const posX = this.getInputValue('position.x') ?? this.sceneObject.position.x;
        const posY = this.getInputValue('position.y') ?? this.sceneObject.position.y;
        const posZ = this.getInputValue('position.z') ?? this.sceneObject.position.z;

        const rotX = this.getInputValue('rotation.x') ?? this.sceneObject.rotation.x;
        const rotY = this.getInputValue('rotation.y') ?? this.sceneObject.rotation.y;
        const rotZ = this.getInputValue('rotation.z') ?? this.sceneObject.rotation.z;

        const scaleX = this.getInputValue('scale.x') ?? this.sceneObject.scale.x;
        const scaleY = this.getInputValue('scale.y') ?? this.sceneObject.scale.y;
        const scaleZ = this.getInputValue('scale.z') ?? this.sceneObject.scale.z;

        const visible = this.getInputValue('visible') ?? this.sceneObject.visible;

        // Apply transform values to Three.js object
        this.sceneObject.position.set(posX, posY, posZ);
        this.sceneObject.rotation.set(rotX, rotY, rotZ);
        this.sceneObject.scale.set(scaleX, scaleY, scaleZ);
        this.sceneObject.visible = visible;

        // Update outputs with current values
        this.setOutputValue('position', { x: posX, y: posY, z: posZ });
        this.setOutputValue('position.x', posX);
        this.setOutputValue('position.y', posY);
        this.setOutputValue('position.z', posZ);

        this.setOutputValue('rotation', { x: rotX, y: rotY, z: rotZ });
        this.setOutputValue('rotation.x', rotX);
        this.setOutputValue('rotation.y', rotY);
        this.setOutputValue('rotation.z', rotZ);

        this.setOutputValue('scale', { x: scaleX, y: scaleY, z: scaleZ });
        this.setOutputValue('scale.x', scaleX);
        this.setOutputValue('scale.y', scaleY);
        this.setOutputValue('scale.z', scaleZ);

        this.setOutputValue('object', this.sceneObject);
        this.setOutputValue('visible', visible);

        // Notify any connected systems that object has changed
        if (this.sceneObject.dispatchEvent) {
            this.sceneObject.dispatchEvent({ type: 'change' });
        }
    }

    // Method to sync node state from object changes
    syncFromObject() {
        if (!this.sceneObject) return;

        // Update input values based on current object state using the new setInputValue method
        this.setInputValue('position.x', this.sceneObject.position.x);
        this.setInputValue('position.y', this.sceneObject.position.y);
        this.setInputValue('position.z', this.sceneObject.position.z);

        this.setInputValue('rotation.x', this.sceneObject.rotation.x);
        this.setInputValue('rotation.y', this.sceneObject.rotation.y);
        this.setInputValue('rotation.z', this.sceneObject.rotation.z);

        this.setInputValue('scale.x', this.sceneObject.scale.x);
        this.setInputValue('scale.y', this.sceneObject.scale.y);
        this.setInputValue('scale.z', this.sceneObject.scale.z);

        this.setInputValue('visible', this.sceneObject.visible);
    }

    // Override onOutputChanged for immediate scene updates
    onOutputChanged(outputName, newValue, oldValue) {
        if (!this.sceneObject) return;

        // Apply changes immediately to the Three.js object for real-time updates
        switch (outputName) {
            case 'position.x':
                this.sceneObject.position.x = newValue;
                break;
            case 'position.y':
                this.sceneObject.position.y = newValue;
                break;
            case 'position.z':
                this.sceneObject.position.z = newValue;
                break;
            case 'rotation.x':
                this.sceneObject.rotation.x = newValue;
                break;
            case 'rotation.y':
                this.sceneObject.rotation.y = newValue;
                break;
            case 'rotation.z':
                this.sceneObject.rotation.z = newValue;
                break;
            case 'scale.x':
                this.sceneObject.scale.x = newValue;
                break;
            case 'scale.y':
                this.sceneObject.scale.y = newValue;
                break;
            case 'scale.z':
                this.sceneObject.scale.z = newValue;
                break;
            case 'visible':
                this.sceneObject.visible = newValue;
                break;
        }

        // Notify Three.js that the object has changed
        if (this.sceneObject.dispatchEvent) {
            this.sceneObject.dispatchEvent({ type: 'change' });
        }
    }

    // Get object reference (for external binding)
    getSceneObject() {
        return this.sceneObject;
    }

    // Set new scene object reference
    setSceneObject(sceneObject) {
        this.sceneObject = sceneObject;
        this.objectName = sceneObject ? (sceneObject.name || 'Unnamed Object') : 'No Object';
        this.storeInitialState();
        this.syncFromObject();
    }

    // Reset object to initial state
    resetToInitial() {
        if (!this.sceneObject) return;

        const initialPos = this.getProperty('initialPosition');
        const initialRot = this.getProperty('initialRotation');
        const initialScale = this.getProperty('initialScale');
        const initialVisible = this.getProperty('initialVisible');

        if (initialPos) {
            this.sceneObject.position.set(initialPos.x, initialPos.y, initialPos.z);
        }
        if (initialRot) {
            this.sceneObject.rotation.set(initialRot.x, initialRot.y, initialRot.z);
        }
        if (initialScale) {
            this.sceneObject.scale.set(initialScale.x, initialScale.y, initialScale.z);
        }
        if (initialVisible !== undefined) {
            this.sceneObject.visible = initialVisible;
        }

        this.syncFromObject();
    }

    // Enhanced serialization including object reference
    serialize() {
        const baseData = super.serialize();
        return {
            ...baseData,
            objectUuid: this.sceneObject ? this.sceneObject.uuid : null,
            objectName: this.objectName
        };
    }

    // Enhanced deserialization
    deserialize(data) {
        super.deserialize(data);
        this.objectName = data.objectName || 'Unnamed Object';
        // Note: Scene object will need to be relinked by InteractionGraph based on UUID
    }

    // Get display name for UI
    getDisplayName() {
        return `${this.objectName} (${this.type})`;
    }

    // Custom size for scene object nodes (wider to accommodate object name)
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: Math.max(160, this.objectName.length * 8 + 40), // Dynamic width based on name
            height: 120 // Taller to accommodate more inputs/outputs
        };
    }
}