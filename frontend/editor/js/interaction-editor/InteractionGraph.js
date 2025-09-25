/**
 * InteractionGraph - Central coordinator between patch editor and 3D scene
 * Manages bidirectional binding between patch nodes and Three.js objects
 */

import { AddInteractionNodeCommand } from '../commands/AddInteractionNodeCommand.js';

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
        if (this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged) {
            const saveInteractionGraphState = () => {
                if (this.editor.storage) {
                    this.editor.storage.set(this.editor.toJSON());
                }
            };

            this.editor.signals.interactionGraphChanged.add(saveInteractionGraphState);
        } else {
            console.warn('InteractionGraph: Cannot set up auto-save - editor or signals not available');
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

        // Find a good position for the new node using smart positioning
        const tempNode = { type: 'ObjectProperty', propertyType };
        const position = this.findSmartPosition(tempNode);

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
                // Use command system for undoable property node creation
                if (this.editor && this.editor.history) {
                    const command = new AddInteractionNodeCommand(this.editor, node);
                    this.editor.history.execute(command);
                } else {
                    // Fallback to direct addition if no editor/history available
                    this.addNode(node);
                }
                console.log(`Created ${propertyType} patch for object: ${object.name}`);
            }
        }).catch(error => {
            console.error(`Failed to create ${propertyType} patch:`, error);
        });

        return nodePromise;
    }

    // Get canvas viewport information for positioning calculations
    getCanvasViewport() {
        // Try to get canvas bounds from the CustomInteractionEditor
        // Path: editor.interactionEditor (InteractionEditorWindow) -> interactionEditor (CustomInteractionEditor) -> canvas (PatchCanvas)
        if (this.editor && this.editor.interactionEditor && this.editor.interactionEditor.interactionEditor && this.editor.interactionEditor.interactionEditor.canvas) {
            const canvas = this.editor.interactionEditor.interactionEditor.canvas;

            if (canvas.getViewportBounds) {
                // Use the dedicated viewport bounds method for accurate positioning
                return canvas.getViewportBounds();
            } else if (canvas.container) {
                const rect = canvas.container.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    viewportX: canvas.viewport ? canvas.viewport.x : 0,
                    viewportY: canvas.viewport ? canvas.viewport.y : 0,
                    zoom: canvas.viewport ? canvas.viewport.zoom : 1
                };
            }
        }

        // Fallback to default canvas size
        return { width: 800, height: 600, viewportX: 0, viewportY: 0, zoom: 1 };
    }

    // Smart positioning algorithm based on node types and relationships
    findSmartPosition(newNode) {
        const canvas = this.getCanvasViewport();

        // If empty canvas, place at center of current view
        if (this.nodes.size === 0) {
            const centerX = (-canvas.viewportX / canvas.zoom) + (canvas.width / canvas.zoom / 2) - 75;
            const centerY = (-canvas.viewportY / canvas.zoom) + (canvas.height / canvas.zoom / 2) - 25;
            return { x: centerX, y: centerY };
        }

        // Analyze existing nodes
        const allNodes = Array.from(this.nodes.values());
        const propertyNodes = allNodes.filter(n => n.type === 'ObjectProperty');
        const nonPropertyNodes = allNodes.filter(n => n.type !== 'ObjectProperty');

        const isPropertyNode = newNode && (newNode.type === 'ObjectProperty');

        if (isPropertyNode && nonPropertyNodes.length > 0) {
            // Property node: place to RIGHT of non-property nodes
            const rightmostNode = nonPropertyNodes.reduce((max, node) =>
                node.position.x > max.position.x ? node : max);
            const x = rightmostNode.position.x + 350; // Increased spacing for easier connections
            const y = this.findBestY(x, rightmostNode.position.y);
            return { x, y };
        } else if (!isPropertyNode && propertyNodes.length > 0) {
            // Non-property node: place to LEFT of property nodes
            const leftmostNode = propertyNodes.reduce((min, node) =>
                node.position.x < min.position.x ? node : min);
            const x = leftmostNode.position.x - 350; // Increased spacing for easier connections
            const y = this.findBestY(x, leftmostNode.position.y);
            return { x, y };
        }

        // Fallback: intelligent grid placement around center
        return this.findGridPosition();
    }

    // Find best Y position to avoid overlaps at given X coordinate
    findBestY(targetX, preferredY = null) {
        const nodeSpacing = 150; // Minimum vertical spacing
        const tolerance = 50; // X tolerance for considering nodes in same column

        // Find nodes near this X position
        const nearbyNodes = Array.from(this.nodes.values())
            .filter(node => Math.abs(node.position.x - targetX) < tolerance)
            .sort((a, b) => a.position.y - b.position.y);

        // If no nearby nodes, use preferred Y or default
        if (nearbyNodes.length === 0) {
            return preferredY || 100;
        }

        // If preferred Y is available (no conflicts), use it
        if (preferredY !== null) {
            const hasConflict = nearbyNodes.some(node =>
                Math.abs(node.position.y - preferredY) < nodeSpacing);
            if (!hasConflict) {
                return preferredY;
            }
        }

        // Find gaps between nodes or place at end
        let bestY = nearbyNodes[0].position.y - nodeSpacing;
        if (bestY < 50) { // Don't go too high
            // Look for gaps between nodes
            for (let i = 0; i < nearbyNodes.length - 1; i++) {
                const gap = nearbyNodes[i + 1].position.y - nearbyNodes[i].position.y;
                if (gap >= nodeSpacing * 2) {
                    bestY = nearbyNodes[i].position.y + nodeSpacing;
                    break;
                }
            }
            // If no gaps found, place after last node
            if (bestY < 50) {
                bestY = nearbyNodes[nearbyNodes.length - 1].position.y + nodeSpacing;
            }
        }

        return Math.max(bestY, 50); // Ensure minimum Y position
    }

    // Fallback grid positioning for when smart positioning doesn't apply
    findGridPosition() {
        const canvas = this.getCanvasViewport();
        const gridSpacing = 160;
        const maxColumns = 4;

        // Position relative to current viewport center
        const baseX = (-canvas.viewportX / canvas.zoom) + 100;
        const baseY = (-canvas.viewportY / canvas.zoom) + 100;

        const nodeCount = this.nodes.size;
        const column = nodeCount % maxColumns;
        const row = Math.floor(nodeCount / maxColumns);

        return {
            x: baseX + (column * gridSpacing),
            y: baseY + (row * 140)
        };
    }

    // Legacy method - now redirects to smart positioning
    findAvailablePosition(newNode = null) {
        return this.findSmartPosition(newNode);
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
        if (!data) {
            console.warn('InteractionGraph: No data provided for deserialization');
            return;
        }

        // Clear existing state
        this.nodes.clear();
        this.connections.length = 0;
        this.sceneObjectMap.clear();

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

                    // Restore the original node ID and properties
                    if (node.deserialize) {
                        node.deserialize(nodeData);
                    }

                    this.addNode(node);
                }
            });
        }

        // Restore connections after all nodes are created
        if (data.connections) {
            data.connections.forEach(connectionData => {
                const fromNode = this.nodes.get(connectionData.fromNodeId);
                const toNode = this.nodes.get(connectionData.toNodeId);

                if (fromNode && toNode) {
                    try {
                        this.addConnection(
                            connectionData.fromNodeId,
                            connectionData.fromOutputIndex,
                            connectionData.toNodeId,
                            connectionData.toInputIndex
                        );
                    } catch (error) {
                        console.warn('InteractionGraph: Failed to restore connection:', error);
                    }
                } else {
                    console.warn('InteractionGraph: Connection restoration failed - missing nodes:', {
                        from: connectionData.fromNodeId,
                        to: connectionData.toNodeId
                    });
                }
            });
        }

        // Update PatchNode counter to prevent ID conflicts with future nodes
        this.updatePatchNodeCounter();
    }

    updatePatchNodeCounter() {
        import('./PatchNode.js').then(({ PatchNode }) => {
            let highestNodeNumber = 0;

            this.nodes.forEach(node => {
                if (node.id && node.id.startsWith('node_')) {
                    const nodeNumber = parseInt(node.id.split('_')[1], 10);
                    if (!isNaN(nodeNumber) && nodeNumber > highestNodeNumber) {
                        highestNodeNumber = nodeNumber;
                    }
                }
            });

            if (highestNodeNumber > 0) {
                PatchNode.nodeCounter = highestNodeNumber;
            }
        }).catch(error => {
            console.warn('InteractionGraph: Failed to update node counter:', error);
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