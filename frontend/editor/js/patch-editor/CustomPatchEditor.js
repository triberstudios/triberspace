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

        this.canvas.on('nodeDrag', (nodeId, delta) => {
            const node = this.nodes.get(nodeId);
            if (node) {
                node.position.x += delta.x;
                node.position.y += delta.y;
                this.canvas.render();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedNodes.size > 0) {
                this.deleteSelectedNodes();
            }
        });
    }

    selectNode(nodeId) {
        this.selectedNodes.clear();
        this.selectedNodes.add(nodeId);
        this.canvas.setSelectedNodes(this.selectedNodes);
        this.canvas.render();
    }

    deleteSelectedNodes() {
        for (const nodeId of this.selectedNodes) {
            this.removeNode(nodeId);
        }
        this.selectedNodes.clear();
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