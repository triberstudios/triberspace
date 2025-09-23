/**
 * Custom Patch Editor - Main controller for Meta Spark AR-style node editor
 * Pure vanilla JavaScript implementation for Three.js integration
 */

import { PatchCanvas } from './PatchCanvas.js';
import { ClockNode } from './nodes/ClockNode.js';
import { PositionNode } from './nodes/PositionNode.js';

export class CustomPatchEditor {
    constructor(container) {
        this.container = container;
        this.canvas = new PatchCanvas(container);
        this.nodes = new Map();
        this.connections = [];
        this.selectedNodes = new Set();
        this.selectedConnections = new Set();
        this.isInitialized = false;

        this.init();
    }

    init() {
        console.log('Initializing Custom Patch Editor');

        // Initialize canvas
        this.canvas.init();

        // Add some test nodes
        this.addTestNodes();

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
        this.canvas.addNode(node);
    }

    removeNode(nodeId) {
        if (this.nodes.has(nodeId)) {
            this.nodes.delete(nodeId);
            this.canvas.removeNode(nodeId);
            this.canvas.render();
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

        // Create the connection
        const connection = this.canvas.addConnection(
            connectionData.fromNodeId,
            connectionData.fromOutputIndex,
            connectionData.toNodeId,
            connectionData.toInputIndex
        );

        this.canvas.render();
    }

    deleteSelectedNodes() {
        for (const nodeId of this.selectedNodes) {
            this.removeNode(nodeId);
        }
        this.selectedNodes.clear();
    }

    deleteSelectedConnections() {
        console.log('deleteSelectedConnections called with:', Array.from(this.selectedConnections));
        for (const connectionId of this.selectedConnections) {
            console.log('Removing connection:', connectionId);
            this.canvas.removeConnection(connectionId);
        }
        this.selectedConnections.clear();
        this.canvas.render();
    }

    destroy() {
        if (this.canvas) {
            this.canvas.destroy();
        }
        this.nodes.clear();
        this.connections = [];
        this.selectedNodes.clear();
        console.log('Custom Patch Editor destroyed');
    }
}