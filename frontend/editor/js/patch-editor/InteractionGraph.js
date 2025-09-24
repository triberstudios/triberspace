/**
 * InteractionGraph - Central coordinator between patch editor and 3D scene
 * Manages bidirectional binding between patch nodes and Three.js objects
 */

export class InteractionGraph {
    constructor(editor) {
        this.editor = editor;
        this.nodes = new Map();
        this.connections = [];
        this.sceneObjectMap = new Map(); // Maps Three.js objects to patch nodes
        this.evaluationQueue = [];
        this.isEvaluating = false;

        // Bind to editor signals for scene synchronization
        this.setupSceneBindings();

        // Start evaluation loop
        this.startEvaluationLoop();
    }

    setupSceneBindings() {
        const signals = this.editor.signals;

        // Listen for object selection to create/highlight corresponding nodes
        signals.objectSelected.add((object) => {
            this.onObjectSelected(object);
        });

        // Listen for object changes to update connected patch nodes
        signals.objectChanged.add((object) => {
            this.onObjectChanged(object);
        });

        // Listen for object additions to potentially create patch nodes
        signals.objectAdded.add((object) => {
            this.onObjectAdded(object);
        });

        // Listen for object removal to clean up patch nodes
        signals.objectRemoved.add((object) => {
            this.onObjectRemoved(object);
        });
    }

    // Scene event handlers
    onObjectSelected(object) {
        if (!object) return;

        // In the new paradigm, we don't auto-create nodes on selection
        // Property nodes are only created when connections are made
        // Just emit selection event for UI highlighting
        this.emit('objectSelected', object);
    }

    onObjectChanged(object) {
        const objectNode = this.sceneObjectMap.get(object);
        if (objectNode) {
            // Update node properties from object state
            this.updateNodeFromObject(objectNode, object);
        }
    }

    onObjectAdded(object) {
        // Optionally auto-create patch nodes for new objects
        // For now, we'll create them on-demand when selected
    }

    onObjectRemoved(object) {
        const objectNode = this.sceneObjectMap.get(object);
        if (objectNode) {
            this.removeNode(objectNode.id);
            this.sceneObjectMap.delete(object);
        }
    }

    // Node management
    addNode(node) {
        this.nodes.set(node.id, node);

        // If this is a scene object node, map it and set up change tracking
        if (node.sceneObject) {
            this.sceneObjectMap.set(node.sceneObject, node);
            // Set up property watchers for real-time updates
            this.setupObjectChangeTrackingForNode(node.sceneObject, node);
        }

        // Queue for evaluation
        this.queueEvaluation(node);

        // Emit event for UI update
        this.emit('nodeAdded', node);

        // Dispatch editor signal for autosave
        if (this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged) {
            this.editor.signals.interactionGraphChanged.dispatch();
        }
    }

    // Set up change tracking for a specific node-object pair
    setupObjectChangeTrackingForNode(object, node) {
        if (!object._patchProxySetup) {
            const trackedProperties = ['position', 'rotation', 'scale', 'visible'];

            trackedProperties.forEach(property => {
                if (object[property]) {
                    this.createPropertyWatcher(object, property, node);
                }
            });
            object._patchProxySetup = true;
        }
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // Remove connections
        this.connections = this.connections.filter(conn =>
            conn.fromNodeId !== nodeId && conn.toNodeId !== nodeId
        );

        // Remove from scene mapping if applicable
        if (node.sceneObject) {
            this.sceneObjectMap.delete(node.sceneObject);
        }

        // Remove from nodes
        this.nodes.delete(nodeId);

        // Emit event for UI update
        this.emit('nodeRemoved', nodeId);

        // Dispatch editor signal for autosave
        if (this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged) {
            this.editor.signals.interactionGraphChanged.dispatch();
        }
    }

    addConnection(fromNodeId, fromOutputIndex, toNodeId, toInputIndex) {
        const connection = {
            id: `${fromNodeId}-${fromOutputIndex}-${toNodeId}-${toInputIndex}`,
            fromNodeId,
            fromOutputIndex,
            toNodeId,
            toInputIndex
        };

        this.connections.push(connection);

        // Connect the nodes
        const fromNode = this.nodes.get(fromNodeId);
        const toNode = this.nodes.get(toNodeId);

        if (fromNode && toNode) {
            const output = fromNode.outputs[fromOutputIndex];
            const input = toNode.inputs[toInputIndex];

            if (output && input) {
                // Create connection object with real-time propagation
                const connectionObj = {
                    getValue: () => output.value,
                    setValue: (value) => {
                        const oldValue = input.value;
                        input.value = value;

                        // Use immediate evaluation for real-time updates
                        if (oldValue !== value) {
                            this.evaluateImmediately(toNode);
                        }
                    }
                };

                output.connections.push(connectionObj);
                input.connection = connectionObj;

                // Initial value propagation
                connectionObj.setValue(output.value);
            }
        }

        // Emit event for UI update
        this.emit('connectionAdded', connection);

        // Dispatch editor signal for autosave
        if (this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged) {
            this.editor.signals.interactionGraphChanged.dispatch();
        }

        return connection;
    }

    removeConnection(connectionId) {
        const connectionIndex = this.connections.findIndex(conn => conn.id === connectionId);
        if (connectionIndex === -1) return;

        const connection = this.connections[connectionIndex];
        const fromNode = this.nodes.get(connection.fromNodeId);
        const toNode = this.nodes.get(connection.toNodeId);

        if (fromNode && toNode) {
            const output = fromNode.outputs[connection.fromOutputIndex];
            const input = toNode.inputs[connection.toInputIndex];

            if (output && input) {
                // Remove connection from output
                output.connections = output.connections.filter(conn =>
                    conn !== input.connection
                );

                // Clear input connection
                input.connection = null;
                input.value = input.defaultValue || 0;

                // Trigger reprocessing of the target node after connection removal
                if (toNode.onConnectionRemoved) {
                    toNode.onConnectionRemoved();
                } else if (toNode.process) {
                    toNode.process();
                }
            }
        }

        this.connections.splice(connectionIndex, 1);

        // Emit event for UI update
        this.emit('connectionRemoved', connectionId);

        // Dispatch editor signal for autosave
        if (this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged) {
            this.editor.signals.interactionGraphChanged.dispatch();
        }
    }

    // Evaluation system
    queueEvaluation(node) {
        if (!this.evaluationQueue.includes(node)) {
            this.evaluationQueue.push(node);
            // Mark when this node was queued for debugging
            node._queuedAt = performance.now();
        }
    }

    // Force immediate evaluation for real-time updates
    evaluateImmediately(node) {
        if (node && node.process) {
            node.process();
            this.propagateNodeChanges(node);
        }
    }

    // Propagate changes to connected nodes and scene objects
    propagateNodeChanges(node) {
        // Queue evaluation for connected nodes
        this.connections.forEach(connection => {
            if (connection.fromNodeId === node.id) {
                const toNode = this.nodes.get(connection.toNodeId);
                if (toNode) {
                    this.queueEvaluation(toNode);
                }
            }
        });

        // Special handling for SceneObjectNode changes
        if (node.type === 'SceneObject' && node.sceneObject) {
            // Signal the editor that the object has changed
            if (this.editor && this.editor.signals && this.editor.signals.objectChanged) {
                this.editor.signals.objectChanged.dispatch(node.sceneObject);
            }
        }
    }

    startEvaluationLoop() {
        const evaluate = () => {
            if (this.evaluationQueue.length > 0 && !this.isEvaluating) {
                this.isEvaluating = true;

                // Process all queued nodes with performance tracking
                const nodesToEvaluate = [...this.evaluationQueue];
                this.evaluationQueue.length = 0;

                const startTime = performance.now();
                let processedCount = 0;

                nodesToEvaluate.forEach(node => {
                    if (node.process) {
                        try {
                            node.process();
                            this.propagateNodeChanges(node);
                            processedCount++;
                        } catch (error) {
                            console.error('Error processing node:', node.id, error);
                        }
                    }
                });

                const endTime = performance.now();
                const duration = endTime - startTime;

                // Log performance if processing takes too long
                if (duration > 16) { // More than one frame (60fps)
                    console.warn(`Slow evaluation: ${processedCount} nodes processed in ${duration.toFixed(2)}ms`);
                }

                this.isEvaluating = false;
            }

            requestAnimationFrame(evaluate);
        };

        requestAnimationFrame(evaluate);
    }

    // Real-time change detection for scene objects
    setupObjectChangeTracking() {
        const trackedProperties = ['position', 'rotation', 'scale', 'visible'];

        this.sceneObjectMap.forEach((node, object) => {
            if (!object._patchProxySetup) {
                // Create property watchers for real-time updates
                trackedProperties.forEach(property => {
                    if (object[property]) {
                        this.createPropertyWatcher(object, property, node);
                    }
                });
                object._patchProxySetup = true;
            }
        });
    }

    createPropertyWatcher(object, property, node) {
        const originalObject = object[property];
        const properties = ['x', 'y', 'z'];

        // Watch for changes to vector properties
        properties.forEach(prop => {
            if (originalObject[prop] !== undefined) {
                let currentValue = originalObject[prop];

                Object.defineProperty(originalObject, `_${prop}`, {
                    value: currentValue,
                    writable: true
                });

                Object.defineProperty(originalObject, prop, {
                    get() {
                        return this[`_${prop}`];
                    },
                    set(newValue) {
                        if (this[`_${prop}`] !== newValue) {
                            this[`_${prop}`] = newValue;
                            // Queue node for evaluation when object changes
                            if (node && node.syncFromObject) {
                                node.syncFromObject();
                            }
                        }
                    },
                    enumerable: true,
                    configurable: true
                });
            }
        });

        // Watch for visibility changes
        if (property === 'visible') {
            let currentValue = object.visible;
            Object.defineProperty(object, '_visible', {
                value: currentValue,
                writable: true
            });

            Object.defineProperty(object, 'visible', {
                get() {
                    return this._visible;
                },
                set(newValue) {
                    if (this._visible !== newValue) {
                        this._visible = newValue;
                        if (node && node.syncFromObject) {
                            node.syncFromObject();
                        }
                    }
                },
                enumerable: true,
                configurable: true
            });
        }
    }

    // Factory methods
    createSceneObjectNode(object) {
        // Import SceneObjectNode dynamically to avoid circular dependencies
        return import('./nodes/SceneObjectNode.js').then(({ SceneObjectNode }) => {
            // Find a good position for the new node (avoid overlaps)
            const position = this.findAvailablePosition();
            const node = new SceneObjectNode(object, position.x, position.y);
            return node;
        });
    }

    // Create property-specific patch node (Meta Spark AR style)
    createPropertyPatch(object, propertyType) {
        if (!object || !propertyType) {
            console.warn('Invalid object or property type for patch creation');
            return;
        }

        // Check if a property patch for this object already exists
        const existingNode = Array.from(this.nodes.values()).find(node =>
            node.sceneObject === object &&
            node.type === 'ObjectProperty' &&
            node.propertyType === propertyType
        );

        if (existingNode) {
            console.log(`Property patch for ${object.name} ${propertyType} already exists`);
            return existingNode;
        }

        // Find a good position for the new node
        const position = this.findAvailablePosition();

        // Import the appropriate property node class dynamically
        let nodePromise;
        switch (propertyType) {
            case 'position':
                nodePromise = import('./nodes/ObjectPositionNode.js').then(({ ObjectPositionNode }) => {
                    const node = new ObjectPositionNode(object, position.x, position.y, this.editor);
                    node.type = 'ObjectProperty';
                    node.propertyType = 'position';
                    return node;
                });
                break;
            case 'rotation':
                nodePromise = import('./nodes/ObjectRotationNode.js').then(({ ObjectRotationNode }) => {
                    const node = new ObjectRotationNode(object, position.x, position.y, this.editor);
                    node.type = 'ObjectProperty';
                    node.propertyType = 'rotation';
                    return node;
                });
                break;
            case 'scale':
                nodePromise = import('./nodes/ObjectScaleNode.js').then(({ ObjectScaleNode }) => {
                    const node = new ObjectScaleNode(object, position.x, position.y, this.editor);
                    node.type = 'ObjectProperty';
                    node.propertyType = 'scale';
                    return node;
                });
                break;
            default:
                console.warn(`Unsupported property type: ${propertyType}`);
                return;
        }

        // Add the node to the graph when the import resolves
        nodePromise.then(node => {
            if (node) {
                this.addNode(node);
                console.log(`Created ${propertyType} patch for object: ${object.name}`);
            }
        }).catch(error => {
            console.error(`Failed to create ${propertyType} patch:`, error);
        });

        return nodePromise;
    }

    // Find an available position for new nodes to avoid overlaps
    findAvailablePosition() {
        const gridSize = 160; // Base grid spacing
        const maxColumns = 5;
        let x = 100;
        let y = 100;
        let column = 0;

        // Simple grid layout to avoid overlaps
        const nodeCount = this.nodes.size;
        column = nodeCount % maxColumns;
        const row = Math.floor(nodeCount / maxColumns);

        x = 100 + (column * gridSize);
        y = 100 + (row * 140);

        return { x, y };
    }

    updateNodeFromObject(node, object) {
        // Update node properties based on object state
        if (node.type === 'SceneObject' && object) {
            node.objectName = object.name || 'Unnamed Object';

            // Use SceneObjectNode's sync method if available
            if (node.syncFromObject) {
                node.syncFromObject();
            }
        }
    }

    // Serialization for persistence
    serialize() {
        const nodesData = {};
        this.nodes.forEach((node, id) => {
            if (node.serialize) {
                nodesData[id] = node.serialize();
            }
        });

        return {
            nodes: nodesData,
            connections: [...this.connections],
            metadata: {
                version: '1.0',
                timestamp: Date.now()
            }
        };
    }

    deserialize(data) {
        if (!data) return;

        // Clear existing state
        this.nodes.clear();
        this.connections.length = 0;
        this.sceneObjectMap.clear();

        // Restore connections
        this.connections = [...(data.connections || [])];

        // Note: Node restoration will be handled by the patch editor
        // since it needs to instantiate the specific node types
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners) {
            this.eventListeners = new Map();
        }

        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }

        this.eventListeners.get(event).push(callback);
    }

    emit(event, ...args) {
        if (this.eventListeners && this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(...args));
        }
    }

    // Cleanup
    destroy() {
        // Clear evaluation queue
        this.evaluationQueue.length = 0;

        // Clear all data
        this.nodes.clear();
        this.connections.length = 0;
        this.sceneObjectMap.clear();

        // Clear event listeners
        if (this.eventListeners) {
            this.eventListeners.clear();
        }
    }
}