/**
 * PatchCanvas - Canvas-based rendering system for patch editor
 * Handles drawing nodes, connections, and background with high performance
 */

export class PatchCanvas {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.nodes = new Map();
        this.connections = [];
        this.selectedNodes = new Set();
        this.eventListeners = new Map();

        // Viewport state
        this.viewport = {
            x: 0,
            y: 0,
            zoom: 1
        };

        // Style constants
        this.styles = {
            background: '#2a2a2a',
            dotColor: '#555555',
            dotSize: 1,
            dotSpacing: 16,
            nodeColor: '#3a3a3a',
            nodeSelectedColor: '#4a4a4a',
            nodeTextColor: '#cccccc',
            nodeBorderRadius: 8,
            nodeMinWidth: 120,
            nodeHeight: 80,
            socketSize: 8
        };

        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.draggedNode = null;
        this.isPanning = false;
        this.lastPanPos = { x: 0, y: 0 };
    }

    init() {
        this.createCanvas();
        this.setupEventListeners();
        this.render();
    }

    createCanvas() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            display: block;
            cursor: default;
        `;

        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Handle high DPI displays
        this.updateCanvasSize();

        // Handle resize
        window.addEventListener('resize', () => this.updateCanvasSize());
    }

    updateCanvasSize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if we clicked on a node
        const clickedNode = this.getNodeAtPosition(x, y);

        if (clickedNode) {
            this.isDragging = true;
            this.draggedNode = clickedNode.id;
            this.dragStartPos = { x, y };
            this.emit('nodeClick', clickedNode.id);
        } else {
            // Start panning if no node was clicked
            this.isPanning = true;
            this.lastPanPos = { x, y };
            this.canvas.style.cursor = 'grabbing';
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isDragging && this.draggedNode) {
            const delta = {
                x: (x - this.dragStartPos.x) / this.viewport.zoom,
                y: (y - this.dragStartPos.y) / this.viewport.zoom
            };

            this.dragStartPos = { x, y };
            this.emit('nodeDrag', this.draggedNode, delta);
        } else if (this.isPanning) {
            // Pan the viewport
            const deltaX = x - this.lastPanPos.x;
            const deltaY = y - this.lastPanPos.y;

            this.viewport.x += deltaX;
            this.viewport.y += deltaY;

            this.lastPanPos = { x, y };
            this.render();
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.draggedNode = null;
        this.isPanning = false;
        this.canvas.style.cursor = 'default';
    }

    onWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom factor
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(this.viewport.zoom * zoomFactor, 0.1), 3.0);

        // Calculate new viewport position to zoom around mouse
        const zoomChange = newZoom / this.viewport.zoom;
        this.viewport.x = mouseX - (mouseX - this.viewport.x) * zoomChange;
        this.viewport.y = mouseY - (mouseY - this.viewport.y) * zoomChange;
        this.viewport.zoom = newZoom;

        this.render();
    }

    getNodeAtPosition(x, y) {
        // Transform screen coordinates to world coordinates
        const worldX = (x - this.viewport.x) / this.viewport.zoom;
        const worldY = (y - this.viewport.y) / this.viewport.zoom;

        // Check nodes from top to bottom (reverse order)
        const nodeArray = Array.from(this.nodes.values());
        for (let i = nodeArray.length - 1; i >= 0; i--) {
            const node = nodeArray[i];
            const nodeWidth = Math.max(this.styles.nodeMinWidth, this.getNodeWidth(node));

            if (worldX >= node.position.x &&
                worldX <= node.position.x + nodeWidth &&
                worldY >= node.position.y &&
                worldY <= node.position.y + this.styles.nodeHeight) {
                return node;
            }
        }
        return null;
    }

    render() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context and apply transformations
        this.ctx.save();
        this.ctx.translate(this.viewport.x, this.viewport.y);
        this.ctx.scale(this.viewport.zoom, this.viewport.zoom);

        // Draw background
        this.drawBackground();

        // Draw connections
        for (const connection of this.connections) {
            this.drawConnection(connection);
        }

        // Draw nodes
        for (const node of this.nodes.values()) {
            this.drawNode(node);
        }

        // Restore context
        this.ctx.restore();
    }

    drawBackground() {
        const { background, dotColor, dotSize, dotSpacing } = this.styles;

        // Calculate visible area in world coordinates
        const rect = this.canvas.getBoundingClientRect();
        const startX = Math.floor((-this.viewport.x / this.viewport.zoom) / dotSpacing) * dotSpacing;
        const startY = Math.floor((-this.viewport.y / this.viewport.zoom) / dotSpacing) * dotSpacing;
        const endX = startX + (rect.width / this.viewport.zoom) + dotSpacing;
        const endY = startY + (rect.height / this.viewport.zoom) + dotSpacing;

        // Fill background (without transform)
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Draw dotted pattern
        this.ctx.fillStyle = dotColor;
        for (let x = startX; x < endX; x += dotSpacing) {
            for (let y = startY; y < endY; y += dotSpacing) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, dotSize / this.viewport.zoom, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawNode(node) {
        const isSelected = this.selectedNodes.has(node.id);
        const nodeWidth = this.getNodeWidth(node);

        // Draw node background
        this.ctx.fillStyle = isSelected ? this.styles.nodeSelectedColor : this.styles.nodeColor;
        this.ctx.beginPath();
        this.roundRect(
            node.position.x,
            node.position.y,
            nodeWidth,
            this.styles.nodeHeight,
            this.styles.nodeBorderRadius
        );
        this.ctx.fill();

        // Draw border for selected nodes
        if (isSelected) {
            this.ctx.strokeStyle = '#555';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Draw node title
        this.ctx.fillStyle = this.styles.nodeTextColor;
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        this.ctx.fillText(
            node.type,
            node.position.x + 8,
            node.position.y + 20
        );

        // Draw inputs and outputs
        this.drawNodePorts(node, nodeWidth);
    }

    drawNodePorts(node, nodeWidth) {
        const { socketSize } = this.styles;

        // Draw input ports (left side)
        node.inputs.forEach((input, index) => {
            const y = node.position.y + 40 + (index * 20);
            this.ctx.fillStyle = '#4a90e2';
            this.ctx.beginPath();
            this.ctx.arc(node.position.x, y, socketSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Input label
            this.ctx.fillStyle = this.styles.nodeTextColor;
            this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            this.ctx.fillText(input.name, node.position.x + 12, y + 3);
        });

        // Draw output ports (right side)
        node.outputs.forEach((output, index) => {
            const y = node.position.y + 40 + (index * 20);
            this.ctx.fillStyle = '#f5a623';
            this.ctx.beginPath();
            this.ctx.arc(node.position.x + nodeWidth, y, socketSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Output label
            this.ctx.fillStyle = this.styles.nodeTextColor;
            this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(output.name, node.position.x + nodeWidth - 12, y + 3);
            this.ctx.textAlign = 'left';
        });
    }

    getNodeWidth(node) {
        // Calculate width based on content
        let maxWidth = this.styles.nodeMinWidth;

        // Check title width
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const titleWidth = this.ctx.measureText(node.type).width + 16;
        maxWidth = Math.max(maxWidth, titleWidth);

        return maxWidth;
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    drawConnection(connection) {
        const fromNode = this.nodes.get(connection.fromNodeId);
        const toNode = this.nodes.get(connection.toNodeId);

        if (!fromNode || !toNode) return;

        // Calculate port positions
        const fromOutput = fromNode.outputs[connection.fromOutputIndex];
        const toInput = toNode.inputs[connection.toInputIndex];

        if (!fromOutput || !toInput) return;

        const fromNodeWidth = this.getNodeWidth(fromNode);
        const fromX = fromNode.position.x + fromNodeWidth;
        const fromY = fromNode.position.y + 40 + (connection.fromOutputIndex * 20);

        const toX = toNode.position.x;
        const toY = toNode.position.y + 40 + (connection.toInputIndex * 20);

        // Draw bezier curve
        this.ctx.strokeStyle = '#888888';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);

        const controlPointOffset = Math.abs(toX - fromX) * 0.5;
        this.ctx.bezierCurveTo(
            fromX + controlPointOffset, fromY,
            toX - controlPointOffset, toY,
            toX, toY
        );

        this.ctx.stroke();
    }

    addNode(node) {
        this.nodes.set(node.id, node);
    }

    removeNode(nodeId) {
        this.nodes.delete(nodeId);
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
        return connection;
    }

    removeConnection(connectionId) {
        this.connections = this.connections.filter(conn => conn.id !== connectionId);
    }

    setSelectedNodes(selectedNodes) {
        this.selectedNodes = selectedNodes;
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, ...args) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(...args));
        }
    }

    destroy() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.nodes.clear();
        this.eventListeners.clear();
    }
}