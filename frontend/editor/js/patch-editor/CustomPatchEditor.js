/**
 * Custom Patch Editor - Main controller for Meta Spark AR-style node editor
 * Pure vanilla JavaScript implementation for Three.js integration
 */

import { PatchCanvas } from './PatchCanvas.js';
import { ClockNode } from './nodes/ClockNode.js';
import { PositionNode } from './nodes/PositionNode.js';
import { InteractionGraph } from './InteractionGraph.js';

export class CustomPatchEditor {
    constructor(container, editor = null) {
        this.container = container;
        this.editor = editor;
        this.canvas = new PatchCanvas(container);
        this.nodes = new Map();
        this.connections = [];
        this.selectedNodes = new Set();
        this.selectedConnections = new Set();
        this.isInitialized = false;

        // Create interaction graph if editor is provided
        if (this.editor) {
            this.interactionGraph = new InteractionGraph(this.editor);
            this.setupGraphBindings();
        }

        this.init();
    }

    setupGraphBindings() {
        if (!this.interactionGraph) return;

        // Listen for graph events to update UI
        this.interactionGraph.on('nodeAdded', (node) => {
            // Add to our local nodes map so dragging works
            this.nodes.set(node.id, node);
            this.canvas.addNode(node);
            this.canvas.render();
        });

        this.interactionGraph.on('nodeRemoved', (nodeId) => {
            // Remove from our local nodes map
            this.nodes.delete(nodeId);
            this.canvas.removeNode(nodeId);
            this.canvas.render();
        });

        this.interactionGraph.on('connectionAdded', (connection) => {
            this.canvas.addConnection(
                connection.fromNodeId,
                connection.fromOutputIndex,
                connection.toNodeId,
                connection.toInputIndex
            );
            this.canvas.render();
        });

        this.interactionGraph.on('connectionRemoved', (connectionId) => {
            this.canvas.removeConnection(connectionId);
            this.canvas.render();
        });

        this.interactionGraph.on('nodeSelected', (nodeId) => {
            this.selectNode(nodeId);
        });
    }

    init() {
        console.log('Initializing Custom Patch Editor');

        // Initialize canvas
        this.canvas.init();

        // Set up event listeners
        this.setupEventListeners();

        this.isInitialized = true;
        console.log('Custom Patch Editor initialized successfully');
    }

    addTestNodes() {
        // Add a clock node
        const clockNode = new ClockNode(100, 100);
        this.addNode(clockNode);

        // Add a position node
        const positionNode = new PositionNode(300, 150);
        this.addNode(positionNode);

        // Add a test connection between clock and position
        this.canvas.addConnection(clockNode.id, 0, positionNode.id, 0);

        // Render the nodes
        this.canvas.render();
    }

    addNode(node) {
        this.nodes.set(node.id, node);

        // Add to interaction graph if available
        if (this.interactionGraph) {
            this.interactionGraph.addNode(node);
        } else {
            // Fallback to direct canvas add if no graph
            this.canvas.addNode(node);
        }
    }

    removeNode(nodeId) {
        if (this.nodes.has(nodeId)) {
            this.nodes.delete(nodeId);

            // Remove from interaction graph if available
            if (this.interactionGraph) {
                this.interactionGraph.removeNode(nodeId);
            } else {
                // Fallback to direct canvas removal if no graph
                this.canvas.removeNode(nodeId);
                this.canvas.render();
            }
        }
    }

    setupEventListeners() {
        // Canvas mouse events
        this.canvas.on('nodeClick', (nodeId) => {
            this.selectNode(nodeId);
        });

        this.canvas.on('connectionClick', (connectionId) => {
            console.log('CustomPatchEditor received connectionClick:', connectionId);
            this.selectConnection(connectionId);
        });

        this.canvas.on('connectionComplete', (connectionData) => {
            this.createConnection(connectionData);
        });

        this.canvas.on('nodeDrag', (nodeId, delta) => {
            const node = this.nodes.get(nodeId);
            if (node) {
                node.position.x += delta.x;
                node.position.y += delta.y;
                this.canvas.render();
            }
        });

        this.canvas.on('emptySpaceClick', () => {
            this.clearSelection();
        });

        // Keyboard shortcuts - use capture phase to run before other handlers
        document.addEventListener('keydown', (e) => {
            console.log('PatchEditor key pressed:', e.key, 'Code:', e.code); // Debug any key press
            if (e.key === 'Delete' || e.key === 'Backspace') { // Also try Backspace
                console.log('PatchEditor Delete/Backspace key pressed. Selected nodes:', this.selectedNodes.size, 'Selected connections:', this.selectedConnections.size);
                if (this.selectedNodes.size > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteSelectedNodes();
                } else if (this.selectedConnections.size > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteSelectedConnections();
                }
            }
        }, { capture: true }); // Use capture phase to run first
    }

    selectNode(nodeId) {
        this.selectedNodes.clear();
        this.selectedConnections.clear();
        this.selectedNodes.add(nodeId);
        this.canvas.setSelectedNodes(this.selectedNodes);
        this.canvas.setSelectedConnections(this.selectedConnections);
        this.canvas.render();
    }

    selectConnection(connectionId) {
        console.log('Selecting connection:', connectionId);
        this.selectedNodes.clear();
        this.selectedConnections.clear();
        this.selectedConnections.add(connectionId);
        console.log('Selected connections after add:', Array.from(this.selectedConnections));
        this.canvas.setSelectedNodes(this.selectedNodes);
        this.canvas.setSelectedConnections(this.selectedConnections);
        this.canvas.render();
    }

    clearSelection() {
        this.selectedNodes.clear();
        this.selectedConnections.clear();
        this.canvas.setSelectedNodes(this.selectedNodes);
        this.canvas.setSelectedConnections(this.selectedConnections);
        this.canvas.render();
    }

    createConnection(connectionData) {
        // Prevent duplicate connections
        const connectionId = `${connectionData.fromNodeId}-${connectionData.fromOutputIndex}-${connectionData.toNodeId}-${connectionData.toInputIndex}`;

        // Check if connection already exists
        const existingConnection = this.canvas.connections.find(conn => conn.id === connectionId);
        if (existingConnection) {
            return;
        }

        // Create the connection through interaction graph if available
        if (this.interactionGraph) {
            this.interactionGraph.addConnection(
                connectionData.fromNodeId,
                connectionData.fromOutputIndex,
                connectionData.toNodeId,
                connectionData.toInputIndex
            );
        } else {
            // Fallback to direct canvas connection if no graph
            const connection = this.canvas.addConnection(
                connectionData.fromNodeId,
                connectionData.fromOutputIndex,
                connectionData.toNodeId,
                connectionData.toInputIndex
            );
            this.canvas.render();
        }
    }

    deleteSelectedNodes() {
        for (const nodeId of this.selectedNodes) {
            this.removeNode(nodeId);
        }
        this.selectedNodes.clear();
    }

    deleteSelectedConnections() {
        for (const connectionId of this.selectedConnections) {
            // Try InteractionGraph first (proper way)
            if (this.interactionGraph) {
                this.interactionGraph.removeConnection(connectionId);
            } else {
                this.canvas.removeConnection(connectionId);
            }
        }
        this.selectedConnections.clear();
        this.canvas.render();
    }

    resize() {
        if (this.canvas && this.canvas.updateCanvasSize) {
            this.canvas.updateCanvasSize();
        }
    }

    // Serialization for persistence
    serialize() {
        const data = {
            nodes: {},
            connections: this.canvas ? [...this.canvas.connections] : [],
            metadata: {
                version: '1.0',
                timestamp: Date.now()
            }
        };

        // Serialize individual nodes
        this.nodes.forEach((node, id) => {
            if (node.serialize) {
                data.nodes[id] = node.serialize();
            }
        });

        // Include interaction graph data if available
        if (this.interactionGraph) {
            data.interactionGraph = this.interactionGraph.serialize();
        }

        return data;
    }

    // Deserialization from saved state
    deserialize(data) {
        if (!data) return;

        // Clear existing state
        this.clearEditor();

        // Restore interaction graph first
        if (this.interactionGraph && data.interactionGraph) {
            this.interactionGraph.deserialize(data.interactionGraph);
        }

        // Restore nodes - will need node factory for proper instantiation
        if (data.nodes) {
            Object.values(data.nodes).forEach(nodeData => {
                const node = this.createNodeFromData(nodeData);
                if (node) {
                    this.addNode(node);
                }
            });
        }

        // Render restored state
        this.canvas.render();
    }

    // Clear all editor state
    clearEditor() {
        // Clear local state
        this.nodes.clear();
        this.selectedNodes.clear();
        this.selectedConnections.clear();

        // Clear canvas state
        if (this.canvas) {
            // Clear all nodes and connections from canvas
            this.canvas.nodes.clear();
            this.canvas.connections.length = 0;
            this.canvas.selectedNodes.clear();
            this.canvas.selectedConnections.clear();
        }
    }

    // Factory method for creating nodes from serialized data
    createNodeFromData(nodeData) {
        // Import node types as needed
        switch (nodeData.type) {
            case 'Spin':
                import('./nodes/SpinNode.js').then(({ SpinNode }) => {
                    return new SpinNode(nodeData.position.x, nodeData.position.y);
                });
                return null; // Will be handled asynchronously
            case 'Pulse':
                import('./nodes/PulseNode.js').then(({ PulseNode }) => {
                    return new PulseNode(nodeData.position.x, nodeData.position.y);
                });
                return null; // Will be handled asynchronously
            case 'Clock':
                return new ClockNode(nodeData.position.x, nodeData.position.y);
            case 'Position':
                return new PositionNode(nodeData.position.x, nodeData.position.y);
            case 'Time':
                import('./nodes/TimeNode.js').then(({ TimeNode }) => {
                    return new TimeNode(nodeData.position.x, nodeData.position.y);
                });
                return null; // Will be handled asynchronously
            case 'Multiply':
                import('./nodes/MultiplyNode.js').then(({ MultiplyNode }) => {
                    return new MultiplyNode(nodeData.position.x, nodeData.position.y);
                });
                return null; // Will be handled asynchronously
            case 'SceneObject':
                // SceneObject nodes need special handling to relink to scene objects
                // For now, create a placeholder - the InteractionGraph will handle relinking
                import('./nodes/SceneObjectNode.js').then(({ SceneObjectNode }) => {
                    return new SceneObjectNode(null, nodeData.position.x, nodeData.position.y);
                });
                return null; // Will be handled asynchronously
            case 'ObjectProperty':
                // Property-specific nodes for Meta Spark AR style patches
                const propertyType = nodeData.propertyType;
                switch (propertyType) {
                    case 'position':
                        import('./nodes/ObjectPositionNode.js').then(({ ObjectPositionNode }) => {
                            // Will need to relink to scene object during restoration
                            return new ObjectPositionNode(null, nodeData.position.x, nodeData.position.y);
                        });
                        return null;
                    case 'rotation':
                        import('./nodes/ObjectRotationNode.js').then(({ ObjectRotationNode }) => {
                            return new ObjectRotationNode(null, nodeData.position.x, nodeData.position.y);
                        });
                        return null;
                    case 'scale':
                        import('./nodes/ObjectScaleNode.js').then(({ ObjectScaleNode }) => {
                            return new ObjectScaleNode(null, nodeData.position.x, nodeData.position.y);
                        });
                        return null;
                    default:
                        console.warn(`Unknown property type: ${propertyType}`);
                        return null;
                }
            // Additional node types will be added here
            default:
                console.warn(`Unknown node type: ${nodeData.type}`);
                return null;
        }
    }

    // Get interaction graph for external access
    getInteractionGraph() {
        return this.interactionGraph;
    }

    // Create property patch for a specific object property
    createPropertyPatch(object, propertyType) {
        if (!object || !propertyType) {
            console.warn('Invalid object or property type for patch creation');
            return;
        }

        // Use the InteractionGraph to create the property patch
        if (this.interactionGraph && this.interactionGraph.createPropertyPatch) {
            return this.interactionGraph.createPropertyPatch(object, propertyType);
        } else {
            console.warn('InteractionGraph createPropertyPatch method not available');
        }
    }

    destroy() {
        if (this.interactionGraph) {
            this.interactionGraph.destroy();
            this.interactionGraph = null;
        }

        if (this.canvas) {
            this.canvas.destroy();
        }

        this.nodes.clear();
        this.connections = [];
        this.selectedNodes.clear();
        this.selectedConnections.clear();

        console.log('Custom Patch Editor destroyed');
    }
}