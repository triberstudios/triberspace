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
    private compiledFunctions: Map<string, Function>; // Cache for compiled functions
    private behaviorStartTimes: Map<string, number>; // Track when each behavior started

    constructor(compiledBehaviors: CompiledBehaviors, objectMap: Map<string, THREE.Object3D>) {
        this.objectMap = objectMap;
        this.behaviorSets = compiledBehaviors.behaviors;
        this.startTime = performance.now();
        this.compiledFunctions = new Map();
        this.behaviorStartTimes = new Map();

        // console.log(`⚡ BehaviorExecutor: Initialized with ${this.behaviorSets.length} behavior sets for ${objectMap.size} objects`);
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
                if (behaviorSet.updateFunction?.code) {
                    const compiledFunction = this.getCompiledFunction(behaviorSet);
                    if (compiledFunction) {
                        // Initialize behavior start time if needed
                        const behaviorKey = `${behaviorSet.objectUuid}_${behaviorSet.objectName}`;
                        if (!this.behaviorStartTimes.has(behaviorKey)) {
                            this.behaviorStartTimes.set(behaviorKey, currentTime);
                        }

                        // Calculate elapsed time since behavior started
                        const behaviorStartTime = this.behaviorStartTimes.get(behaviorKey)!;
                        const elapsedTime = currentTime - behaviorStartTime;

                        // Check if object has proper rotation property
                        if (!object.rotation) {
                            console.warn(`⚡ BehaviorExecutor: Object ${behaviorSet.objectName} has no rotation property`);
                            return;
                        }

                        // Initialize behavior start time (one time only)
                        const initKey = behaviorKey + '_init';
                        if (!this.behaviorStartTimes.has(initKey)) {
                            this.behaviorStartTimes.set(initKey, currentTime);
                        }

                        compiledFunction(object, deltaTime, elapsedTime);
                    } else {
                        // Function compilation failed - fallback to manual
                        // console.warn(`⚡ BehaviorExecutor: Function compilation failed for ${behaviorSet.objectName}, using manual fallback`);
                        this.executeManualBehaviors(object, behaviorSet.behaviors, currentTime);
                    }
                } else {
                    // No update function - fallback to manual
                    // console.warn(`⚡ BehaviorExecutor: No update function for ${behaviorSet.objectName}, using manual fallback`);
                    this.executeManualBehaviors(object, behaviorSet.behaviors, currentTime);
                }
            } catch (error) {
                console.warn(`⚡ BehaviorExecutor: Failed to execute behavior for ${behaviorSet.objectName}:`, error);

                // Fallback to manual execution
                this.executeManualBehaviors(object, behaviorSet.behaviors, currentTime);
            }
        }
    }

    // Get or compile function from code string
    private getCompiledFunction(behaviorSet: BehaviorSet): Function | null {
        const functionId = behaviorSet.objectUuid;

        // Check if already compiled and cached
        if (this.compiledFunctions.has(functionId)) {
            return this.compiledFunctions.get(functionId)!;
        }

        // Compile function from code string
        try {
            const functionCode = behaviorSet.updateFunction.code;

            // Extract the function body from the code string
            // The code contains: "function updateBehavior(object, deltaTime, elapsedTime) { ... }"
            // We need to create: new Function('object', 'deltaTime', 'elapsedTime', '...')
            const functionBodyMatch = functionCode.match(/function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*)\}/);
            if (!functionBodyMatch) {
                console.error(`⚡ BehaviorExecutor: Cannot parse function code for ${behaviorSet.objectName}`);
                return null;
            }

            const functionBody = functionBodyMatch[1];
            const compiledFunction = new Function('object', 'deltaTime', 'elapsedTime', functionBody);

            // Cache the compiled function
            this.compiledFunctions.set(functionId, compiledFunction);
            return compiledFunction;

        } catch (error) {
            console.error(`⚡ BehaviorExecutor: Failed to compile function for ${behaviorSet.objectName}:`, error);
            return null;
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
                    default:
                        console.warn(`⚡ BehaviorExecutor: Unknown behavior type: ${behavior.type}`);
                }
            } catch (error) {
                console.warn(`⚡ BehaviorExecutor: Failed to execute ${behavior.type} behavior:`, error);
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
        this.compiledFunctions.clear();
        this.behaviorStartTimes.clear();
    }
}