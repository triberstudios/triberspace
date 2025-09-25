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
        this.instanceId = Math.random().toString(36).substr(2, 9);
        console.log(`InteractionGraph.constructor: Created new instance ${this.instanceId}`);

        // Bind to editor signals for scene synchronization
        this.setupSceneBindings();

        // Set up auto-save listener for interaction graph changes
        this.setupAutoSaveListener();

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

    setupAutoSaveListener() {
        // Set up the auto-save listener to save when interaction graph changes
        if (this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged) {
            console.log(`InteractionGraph.setupAutoSaveListener [${this.instanceId}]: Setting up auto-save listener`);

            // Create the save function that matches the main.js pattern
            const saveInteractionGraphState = () => {
                console.log(`InteractionGraph.saveInteractionGraphState [${this.instanceId}]: Auto-save triggered`);

                // Call editor's storage save (same as main.js saveState function)
                if (this.editor.storage) {
                    this.editor.storage.set(this.editor.toJSON());
                }
            };

            // Add the listener
            this.editor.signals.interactionGraphChanged.add(saveInteractionGraphState);
            console.log(`InteractionGraph.setupAutoSaveListener [${this.instanceId}]: Auto-save listener added successfully`);
        } else {
            console.warn(`InteractionGraph.setupAutoSaveListener [${this.instanceId}]: Cannot set up auto-save - editor or signals not available`);
        }
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
        console.log(`InteractionGraph.addConnection [${this.instanceId || 'unknown'}]: Added connection ${connection.id}. Total connections: ${this.connections.length}`);
        console.log(`InteractionGraph.addConnection [${this.instanceId || 'unknown'}]: Connection details:`, connection);

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
            console.log('InteractionGraph.addConnection: Dispatching interactionGraphChanged signal for auto-save');
            console.log('InteractionGraph.addConnection: Signal has', this.editor.signals.interactionGraphChanged._listeners?.length || 0, 'listeners');
            this.editor.signals.interactionGraphChanged.dispatch();
            console.log('InteractionGraph.addConnection: Signal dispatched successfully');
        } else {
            console.warn('InteractionGraph.addConnection: Cannot dispatch interactionGraphChanged signal:', {
                hasEditor: !!this.editor,
                hasSignals: !!(this.editor && this.editor.signals),
                hasInteractionGraphChanged: !!(this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged)
            });
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
        console.log(`InteractionGraph.serialize [${this.instanceId}]: Called from:`, new Error().stack.split('\n')[2]);
        const nodesData = {};
        this.nodes.forEach((node, id) => {
            if (node.serialize) {
                nodesData[id] = node.serialize();
            }
        });

        console.log(`InteractionGraph.serialize [${this.instanceId || 'unknown'}]: Saving ${this.nodes.size} nodes and ${this.connections.length} connections`);
        console.log(`InteractionGraph.serialize [${this.instanceId || 'unknown'}]: Connection details:`, this.connections);

        return {
            nodes: nodesData,
            connections: [...this.connections],
            metadata: {
                version: '1.0',
                timestamp: Date.now()
            }
        };
    }

    // Node factory for creating nodes from serialized data
    async createNodeFromData(nodeData) {
        if (!nodeData || !nodeData.type) {
            console.warn('InteractionGraph: Invalid node data for restoration:', nodeData);
            return null;
        }

        try {
            switch (nodeData.type) {
                case 'Clock':
                    const { ClockNode } = await import('./nodes/ClockNode.js');
                    return new ClockNode(nodeData.position.x, nodeData.position.y);

                case 'Position':
                    const { PositionNode } = await import('./nodes/PositionNode.js');
                    return new PositionNode(nodeData.position.x, nodeData.position.y);

                case 'Time':
                    const { TimeNode } = await import('./nodes/TimeNode.js');
                    return new TimeNode(nodeData.position.x, nodeData.position.y);

                case 'Multiply':
                    const { MultiplyNode } = await import('./nodes/MultiplyNode.js');
                    return new MultiplyNode(nodeData.position.x, nodeData.position.y);

                case 'Spin':
                    const { SpinNode } = await import('./nodes/SpinNode.js');
                    return new SpinNode(nodeData.position.x, nodeData.position.y);

                case 'Pulse':
                    const { PulseNode } = await import('./nodes/PulseNode.js');
                    return new PulseNode(nodeData.position.x, nodeData.position.y);

                case 'SceneObject':
                    const { SceneObjectNode } = await import('./nodes/SceneObjectNode.js');
                    // Try to find the scene object by UUID if available
                    let sceneObject = null;
                    if (nodeData.objectUuid && this.editor && this.editor.scene) {
                        sceneObject = this.editor.scene.getObjectByProperty('uuid', nodeData.objectUuid, true);
                    }
                    return new SceneObjectNode(sceneObject, nodeData.position.x, nodeData.position.y);

                case 'ObjectProperty':
                    // Property-specific nodes for Meta Spark AR style patches
                    const propertyType = nodeData.propertyType;
                    let sceneObj = null;

                    // Try to find the scene object by UUID if available
                    if (nodeData.objectUuid && this.editor && this.editor.scene) {
                        sceneObj = this.editor.scene.getObjectByProperty('uuid', nodeData.objectUuid, true);
                    }

                    switch (propertyType) {
                        case 'position':
                            const { ObjectPositionNode } = await import('./nodes/ObjectPositionNode.js');
                            const posNode = new ObjectPositionNode(sceneObj, nodeData.position.x, nodeData.position.y, this.editor);
                            posNode.type = 'ObjectProperty';
                            posNode.propertyType = 'position';
                            return posNode;

                        case 'rotation':
                            const { ObjectRotationNode } = await import('./nodes/ObjectRotationNode.js');
                            const rotNode = new ObjectRotationNode(sceneObj, nodeData.position.x, nodeData.position.y, this.editor);
                            rotNode.type = 'ObjectProperty';
                            rotNode.propertyType = 'rotation';
                            return rotNode;

                        case 'scale':
                            const { ObjectScaleNode } = await import('./nodes/ObjectScaleNode.js');
                            const scaleNode = new ObjectScaleNode(sceneObj, nodeData.position.x, nodeData.position.y, this.editor);
                            scaleNode.type = 'ObjectProperty';
                            scaleNode.propertyType = 'scale';
                            return scaleNode;

                        default:
                            console.warn(`InteractionGraph: Unknown property type: ${propertyType}`);
                            return null;
                    }

                default:
                    console.warn(`InteractionGraph: Unknown node type: ${nodeData.type}`);
                    return null;
            }
        } catch (error) {
            console.error(`InteractionGraph: Failed to create node of type ${nodeData.type}:`, error);
            return null;
        }
    }

    async deserialize(data) {
        console.log('InteractionGraph.deserialize: Starting with data:', data);
        if (!data) {
            console.warn('InteractionGraph.deserialize: No data provided');
            return;
        }

        // Clear existing state
        this.nodes.clear();
        this.connections.length = 0;
        this.sceneObjectMap.clear();
        console.log('InteractionGraph.deserialize: Cleared existing state');

        // Restore nodes first (must complete before connections)
        if (data.nodes) {
            const nodePromises = [];
            const nodeDataArray = Object.values(data.nodes);

            for (const nodeData of nodeDataArray) {
                const nodePromise = this.createNodeFromData(nodeData);
                if (nodePromise) {
                    nodePromises.push(nodePromise);
                }
            }

            // Wait for all nodes to be created
            const createdNodes = await Promise.all(nodePromises);

            // Add all successfully created nodes to the graph and restore their data
            createdNodes.forEach((node, index) => {
                if (node) {
                    const nodeData = nodeDataArray[index];
                    const originalId = node.id;

                    // Restore the original node ID and properties
                    if (node.deserialize) {
                        node.deserialize(nodeData);
                    }

                    this.addNode(node);
                    console.log(`InteractionGraph.deserialize: Restored node ${originalId} -> ${node.id} (type: ${node.type})`);

                    // Debug: Verify the node is findable in the map
                    const testFind = this.nodes.get(node.id);
                    console.log(`InteractionGraph.deserialize: Node ${node.id} findable in map:`, !!testFind);
                }
            });

            // Debug: Show all available node IDs after restoration
            console.log(`InteractionGraph.deserialize: All available node IDs:`, Array.from(this.nodes.keys()));
        }

        // Restore connections after all nodes are created
        if (data.connections) {
            console.log(`InteractionGraph.deserialize: Restoring ${data.connections.length} connections...`);
            let successfulConnections = 0;
            let failedConnections = 0;

            data.connections.forEach((connectionData, index) => {
                console.log(`InteractionGraph.deserialize: Connection ${index + 1}:`, connectionData);

                // Validate that both nodes exist before creating connection
                const fromNode = this.nodes.get(connectionData.fromNodeId);
                const toNode = this.nodes.get(connectionData.toNodeId);

                if (fromNode && toNode) {
                    console.log(`InteractionGraph.deserialize: Found both nodes for connection - from: ${fromNode.id} (${fromNode.type}), to: ${toNode.id} (${toNode.type})`);

                    try {
                        this.addConnection(
                            connectionData.fromNodeId,
                            connectionData.fromOutputIndex,
                            connectionData.toNodeId,
                            connectionData.toInputIndex
                        );
                        successfulConnections++;
                        console.log(`InteractionGraph.deserialize: Connection ${index + 1} restored successfully`);
                    } catch (error) {
                        failedConnections++;
                        console.error(`InteractionGraph.deserialize: Connection ${index + 1} failed:`, error);
                    }
                } else {
                    failedConnections++;
                    console.warn(`InteractionGraph.deserialize: Connection ${index + 1} failed - Missing nodes:`, {
                        fromNodeId: connectionData.fromNodeId,
                        toNodeId: connectionData.toNodeId,
                        fromNodeExists: !!fromNode,
                        toNodeExists: !!toNode,
                        availableNodes: Array.from(this.nodes.keys())
                    });
                }
            });

            console.log(`InteractionGraph.deserialize: Connection restoration complete - ${successfulConnections} successful, ${failedConnections} failed`);
        }

        console.log(`InteractionGraph: Restored ${this.nodes.size} nodes and ${this.connections.length} connections`);

        // Update PatchNode counter to prevent ID conflicts with future nodes
        this.updatePatchNodeCounter();
    }

    // Update PatchNode counter to prevent ID conflicts
    updatePatchNodeCounter() {
        // Import PatchNode to access its static counter
        import('./PatchNode.js').then(({ PatchNode }) => {
            // Find the highest node ID number from existing nodes
            let highestNodeNumber = 0;

            this.nodes.forEach(node => {
                if (node.id && node.id.startsWith('node_')) {
                    const nodeNumber = parseInt(node.id.split('_')[1], 10);
                    if (!isNaN(nodeNumber) && nodeNumber > highestNodeNumber) {
                        highestNodeNumber = nodeNumber;
                    }
                }
            });

            // Update the static counter to be higher than any existing node
            if (highestNodeNumber > 0) {
                PatchNode.nodeCounter = highestNodeNumber;
                console.log(`InteractionGraph.updatePatchNodeCounter: Updated PatchNode.nodeCounter to ${PatchNode.nodeCounter}`);
            }
        }).catch(error => {
            console.warn('InteractionGraph.updatePatchNodeCounter: Failed to update node counter:', error);
        });
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