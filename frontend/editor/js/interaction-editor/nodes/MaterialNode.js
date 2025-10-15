/**
 * MaterialNode - Controls material properties of Three.js objects
 * Supports color, emissive, and opacity properties
 * Can be connected to pulse/animation nodes for dynamic effects
 */

import { PatchNode } from '../PatchNode.js';

export class MaterialNode extends PatchNode {
    constructor(sceneObject, x = 0, y = 0) {
        super('Material', x, y);

        this.sceneObject = sceneObject;
        this.objectName = sceneObject ? (sceneObject.name || 'Unnamed Object') : 'No Object';

        // Color inputs (RGB 0-255)
        this.addInput('color.r', 'number', 255);
        this.addInput('color.g', 'number', 255);
        this.addInput('color.b', 'number', 255);

        // Emissive color inputs (RGB 0-255) - for glow effect
        this.addInput('emissive.r', 'number', 0);
        this.addInput('emissive.g', 'number', 0);
        this.addInput('emissive.b', 'number', 0);

        // Emissive intensity (0-1 range, but can go higher for strong glow)
        this.addInput('emissiveIntensity', 'number', 1);

        // Opacity (0-1)
        this.addInput('opacity', 'number', 1);

        // Outputs - current material state
        this.addOutput('color', 'color');
        this.addOutput('emissive', 'color');
        this.addOutput('emissiveIntensity', 'number');
        this.addOutput('opacity', 'number');

        // Store initial material state
        this.storeInitialState();

        // Initial process
        this.process();
    }

    storeInitialState() {
        if (!this.sceneObject || !this.sceneObject.material) return;

        const material = this.sceneObject.material;

        // Store initial color
        if (material.color) {
            this.setProperty('initialColor', {
                r: Math.round(material.color.r * 255),
                g: Math.round(material.color.g * 255),
                b: Math.round(material.color.b * 255)
            });
        }

        // Store initial emissive
        if (material.emissive) {
            this.setProperty('initialEmissive', {
                r: Math.round(material.emissive.r * 255),
                g: Math.round(material.emissive.g * 255),
                b: Math.round(material.emissive.b * 255)
            });
        }

        // Store initial emissive intensity
        if (material.emissiveIntensity !== undefined) {
            this.setProperty('initialEmissiveIntensity', material.emissiveIntensity);
        }

        // Store initial opacity
        if (material.opacity !== undefined) {
            this.setProperty('initialOpacity', material.opacity);
        }
    }

    process() {
        if (!this.sceneObject || !this.sceneObject.material) return;

        const material = this.sceneObject.material;

        // Get color input values (0-255) and convert to 0-1 range for Three.js
        const colorR = this.getInputValue('color.r') / 255;
        const colorG = this.getInputValue('color.g') / 255;
        const colorB = this.getInputValue('color.b') / 255;

        // Get emissive input values (0-255) and convert to 0-1 range
        const emissiveR = this.getInputValue('emissive.r') / 255;
        const emissiveG = this.getInputValue('emissive.g') / 255;
        const emissiveB = this.getInputValue('emissive.b') / 255;

        // Get emissive intensity
        const emissiveIntensity = this.getInputValue('emissiveIntensity');

        // Get opacity
        const opacity = this.getInputValue('opacity');

        // Apply to material
        if (material.color) {
            material.color.setRGB(colorR, colorG, colorB);
        }

        if (material.emissive) {
            material.emissive.setRGB(emissiveR, emissiveG, emissiveB);
        }

        if (material.emissiveIntensity !== undefined) {
            material.emissiveIntensity = emissiveIntensity;
        }

        if (material.opacity !== undefined) {
            material.opacity = opacity;
            // Enable transparency if opacity < 1
            if (opacity < 1 && !material.transparent) {
                material.transparent = true;
            }
        }

        // Mark material as needing update
        material.needsUpdate = true;

        // Update outputs
        this.setOutputValue('color', { r: colorR * 255, g: colorG * 255, b: colorB * 255 });
        this.setOutputValue('emissive', { r: emissiveR * 255, g: emissiveG * 255, b: emissiveB * 255 });
        this.setOutputValue('emissiveIntensity', emissiveIntensity);
        this.setOutputValue('opacity', opacity);

        // Notify Three.js that object has changed
        if (this.sceneObject.dispatchEvent) {
            this.sceneObject.dispatchEvent({ type: 'change' });
        }
    }

    // Method to sync node state from material changes
    syncFromMaterial() {
        if (!this.sceneObject || !this.sceneObject.material) return;

        const material = this.sceneObject.material;

        // Update input values based on current material state
        if (material.color) {
            this.setInputValue('color.r', Math.round(material.color.r * 255));
            this.setInputValue('color.g', Math.round(material.color.g * 255));
            this.setInputValue('color.b', Math.round(material.color.b * 255));
        }

        if (material.emissive) {
            this.setInputValue('emissive.r', Math.round(material.emissive.r * 255));
            this.setInputValue('emissive.g', Math.round(material.emissive.g * 255));
            this.setInputValue('emissive.b', Math.round(material.emissive.b * 255));
        }

        if (material.emissiveIntensity !== undefined) {
            this.setInputValue('emissiveIntensity', material.emissiveIntensity);
        }

        if (material.opacity !== undefined) {
            this.setInputValue('opacity', material.opacity);
        }
    }

    // Get object reference
    getSceneObject() {
        return this.sceneObject;
    }

    // Set new scene object reference
    setSceneObject(sceneObject) {
        this.sceneObject = sceneObject;
        this.objectName = sceneObject ? (sceneObject.name || 'Unnamed Object') : 'No Object';
        this.storeInitialState();
        this.syncFromMaterial();
    }

    // Reset material to initial state
    resetToInitial() {
        if (!this.sceneObject || !this.sceneObject.material) return;

        const material = this.sceneObject.material;
        const initialColor = this.getProperty('initialColor');
        const initialEmissive = this.getProperty('initialEmissive');
        const initialEmissiveIntensity = this.getProperty('initialEmissiveIntensity');
        const initialOpacity = this.getProperty('initialOpacity');

        if (initialColor && material.color) {
            material.color.setRGB(
                initialColor.r / 255,
                initialColor.g / 255,
                initialColor.b / 255
            );
        }

        if (initialEmissive && material.emissive) {
            material.emissive.setRGB(
                initialEmissive.r / 255,
                initialEmissive.g / 255,
                initialEmissive.b / 255
            );
        }

        if (initialEmissiveIntensity !== undefined && material.emissiveIntensity !== undefined) {
            material.emissiveIntensity = initialEmissiveIntensity;
        }

        if (initialOpacity !== undefined && material.opacity !== undefined) {
            material.opacity = initialOpacity;
        }

        material.needsUpdate = true;
        this.syncFromMaterial();
    }

    // Enhanced serialization
    serialize() {
        const baseData = super.serialize();
        return {
            ...baseData,
            type: 'Material',
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
        return `${this.objectName} Material`;
    }

    // Custom size for material nodes
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: Math.max(180, this.objectName.length * 8 + 60),
            height: 140
        };
    }
}
