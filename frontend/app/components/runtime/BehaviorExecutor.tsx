import * as THREE from 'three';

interface CompiledBehavior {
    type: 'spin' | 'pulse';
    nodeId: string;
    objectUuid: string;
    axis?: string;
    speed: number;
    direction?: number;
    amount?: number;
    targetProperty?: string;
    startTime: number;
}

interface BehaviorSet {
    objectUuid: string;
    objectName: string;
    behaviors: CompiledBehavior[];
    updateFunction: {
        code: string;
        execute: Function;
    };
}

interface CompiledBehaviors {
    behaviors: BehaviorSet[];
    errors: Array<any>;
    metadata: any;
}

export class BehaviorExecutor {
    private objectMap: Map<string, THREE.Object3D>;
    private behaviorSets: BehaviorSet[];
    private startTime: number;

    constructor(compiledBehaviors: CompiledBehaviors, objectMap: Map<string, THREE.Object3D>) {
        this.objectMap = objectMap;
        this.behaviorSets = compiledBehaviors.behaviors;
        this.startTime = performance.now();

        console.log(`BehaviorExecutor initialized with ${this.behaviorSets.length} behavior sets`);

        // Log behavior details for debugging
        this.behaviorSets.forEach(behaviorSet => {
            const object = this.objectMap.get(behaviorSet.objectUuid);
            console.log(`- ${behaviorSet.objectName} (${object ? 'found' : 'missing'}): ${behaviorSet.behaviors.length} behaviors`);
            behaviorSet.behaviors.forEach(behavior => {
                console.log(`  - ${behavior.type}: ${behavior.speed} ${behavior.type === 'spin' ? 'RPM' : 'BPM'}`);
            });
        });
    }

    update(deltaTime: number) {
        const currentTime = performance.now();

        for (const behaviorSet of this.behaviorSets) {
            const object = this.objectMap.get(behaviorSet.objectUuid);

            if (!object) {
                // Object not found - skip
                continue;
            }

            try {
                // Execute the compiled behavior function
                behaviorSet.updateFunction.execute(object, deltaTime);
            } catch (error) {
                console.warn(`Failed to execute behavior for ${behaviorSet.objectName}:`, error);

                // Fallback to manual execution
                this.executeManualBehaviors(object, behaviorSet.behaviors, currentTime);
            }
        }
    }

    // Fallback manual behavior execution
    private executeManualBehaviors(object: THREE.Object3D, behaviors: CompiledBehavior[], currentTime: number) {
        for (const behavior of behaviors) {
            try {
                switch (behavior.type) {
                    case 'spin':
                        this.executeSpin(object, behavior, currentTime);
                        break;
                    case 'pulse':
                        this.executePulse(object, behavior, currentTime);
                        break;
                }
            } catch (error) {
                console.warn(`Failed to execute ${behavior.type} behavior:`, error);
            }
        }
    }

    private executeSpin(object: THREE.Object3D, behavior: CompiledBehavior, currentTime: number) {
        const elapsedSeconds = (currentTime - behavior.startTime) / 1000;
        const radiansPerSecond = (behavior.speed / 60) * 2 * Math.PI;
        const direction = behavior.direction || 1;
        const rotationRadians = elapsedSeconds * radiansPerSecond * direction;

        const axis = behavior.axis || 'y';

        switch (axis) {
            case 'x':
                object.rotation.x = rotationRadians;
                break;
            case 'y':
                object.rotation.y = rotationRadians;
                break;
            case 'z':
                object.rotation.z = rotationRadians;
                break;
        }
    }

    private executePulse(object: THREE.Object3D, behavior: CompiledBehavior, currentTime: number) {
        const elapsedSeconds = (currentTime - behavior.startTime) / 1000;
        const cyclesPerSecond = behavior.speed / 60;
        const phase = (elapsedSeconds * cyclesPerSecond) % 1;
        const pulsePhase = (Math.sin(phase * 2 * Math.PI - Math.PI / 2) + 1) / 2;
        const amount = behavior.amount || 0.2;
        const scaleValue = 1.0 + (pulsePhase - 0.5) * amount * 2;

        // Apply scale based on target property
        const targetProperty = behavior.targetProperty || 'scale';

        if (targetProperty === 'scale') {
            // Uniform scaling
            object.scale.setScalar(scaleValue);
        } else if (targetProperty.startsWith('scale.')) {
            // Specific axis scaling
            const axis = targetProperty.split('.')[1];
            switch (axis) {
                case 'x':
                    object.scale.x = scaleValue;
                    break;
                case 'y':
                    object.scale.y = scaleValue;
                    break;
                case 'z':
                    object.scale.z = scaleValue;
                    break;
            }
        }
    }

    // Get execution statistics
    getStats() {
        return {
            totalBehaviorSets: this.behaviorSets.length,
            totalBehaviors: this.behaviorSets.reduce((sum, set) => sum + set.behaviors.length, 0),
            mappedObjects: this.behaviorSets.filter(set => this.objectMap.has(set.objectUuid)).length,
            unmappedObjects: this.behaviorSets.filter(set => !this.objectMap.has(set.objectUuid)).length
        };
    }

    // Update object map if scene changes
    updateObjectMap(newObjectMap: Map<string, THREE.Object3D>) {
        this.objectMap = newObjectMap;
    }

    // Stop all behaviors
    destroy() {
        this.behaviorSets = [];
        this.objectMap.clear();
    }
}