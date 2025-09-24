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
        this.selectedConnections = new Set();
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
            nodeSelectedBorderColor: '#4a90e2',
            nodeTextColor: '#cccccc',
            nodeBorderRadius: 8,
            nodeMinWidth: 120,
            nodeHeight: 80,
            socketSize: 8,
            connectionColor: '#666666',
            connectionSelectedColor: '#4a90e2',
            connectionWidth: 2,
            connectionSelectedWidth: 3
        };

        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.draggedNode = null;
        this.isPanning = false;
        this.lastPanPos = { x: 0, y: 0 };
        this.isConnecting = false;
        this.connectingFrom = null;
        this.connectionPreview = null;
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
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert screen coordinates to world coordinates
        const worldX = (x - this.viewport.x) / this.viewport.zoom;
        const worldY = (y - this.viewport.y) / this.viewport.zoom;

        // Priority 1: Check for input field click (highest priority)
        const clickedInputField = this.getInputFieldAtPosition(worldX, worldY);
        if (clickedInputField) {
            this.handleInputFieldClick(clickedInputField);
            return;
        }

        // Priority 2: Check for socket click (for connection creation)
        const clickedSocket = this.getSocketAtPosition(x, y);
        if (clickedSocket && clickedSocket.socketType === 'output') {
            // Start connection from output socket
            this.isConnecting = true;
            this.connectingFrom = {
                nodeId: clickedSocket.nodeId,
                socketIndex: clickedSocket.socketIndex,
                position: clickedSocket.position
            };
            this.connectionPreview = { x: clickedSocket.position.x, y: clickedSocket.position.y };
            this.emit('connectionStart', this.connectingFrom);
            return;
        }

        // Priority 2: Check for connection click (for selection)
        const clickedConnection = this.getConnectionAtPosition(x, y);
        if (clickedConnection) {
            console.log('Connection clicked:', clickedConnection.id);
            this.emit('connectionClick', clickedConnection.id);
            return;
        }

        // Priority 3: Check for node click (for selection/dragging)
        const clickedNode = this.getNodeAtPosition(x, y);
        if (clickedNode) {
            this.isDragging = true;
            this.draggedNode = clickedNode.id;
            this.dragStartPos = { x, y };
            this.emit('nodeClick', clickedNode.id);
        } else {
            // Priority 4: Start panning if no specific element was clicked
            this.isPanning = true;
            this.lastPanPos = { x, y };
            this.canvas.style.cursor = 'grabbing';
            // Emit empty space click to deselect all items
            this.emit('emptySpaceClick');
        }
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isConnecting) {
            // Update connection preview
            const worldX = (x - this.viewport.x) / this.viewport.zoom;
            const worldY = (y - this.viewport.y) / this.viewport.zoom;
            this.connectionPreview = { x: worldX, y: worldY };
            this.render();
        } else if (this.isDragging && this.draggedNode) {
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
        if (this.isConnecting) {
            // Check if we're dropping on a valid input socket
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const targetSocket = this.getSocketAtPosition(x, y);
            if (targetSocket && targetSocket.socketType === 'input') {
                // Complete the connection
                this.emit('connectionComplete', {
                    fromNodeId: this.connectingFrom.nodeId,
                    fromOutputIndex: this.connectingFrom.socketIndex,
                    toNodeId: targetSocket.nodeId,
                    toInputIndex: targetSocket.socketIndex
                });
            }

            // Reset connection state
            this.isConnecting = false;
            this.connectingFrom = null;
            this.connectionPreview = null;
            this.render();
        }

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

        // Check if this is a pinch zoom gesture (ctrlKey is set for pinch on trackpad)
        if (e.ctrlKey) {
            // Pinch to zoom - zoom around mouse cursor position
            // Smaller deltaY for smoother zoom on trackpad
            const zoomDelta = -e.deltaY * 0.01;
            const zoomFactor = Math.exp(zoomDelta);
            const newZoom = Math.min(Math.max(this.viewport.zoom * zoomFactor, 0.1), 3.0);

            // Calculate new viewport position to zoom around mouse
            const zoomChange = newZoom / this.viewport.zoom;
            this.viewport.x = mouseX - (mouseX - this.viewport.x) * zoomChange;
            this.viewport.y = mouseY - (mouseY - this.viewport.y) * zoomChange;
            this.viewport.zoom = newZoom;
        } else if (e.shiftKey) {
            // Shift + scroll for horizontal panning (Figma-style for mouse users)
            // Convert vertical scroll to horizontal pan
            this.viewport.x -= e.deltaY;
        } else {
            // Two-finger pan (trackpad scroll without modifiers)
            // Regular mouse wheel or trackpad scroll
            this.viewport.x -= e.deltaX;
            this.viewport.y -= e.deltaY;
        }

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
            const nodeWidth = this.getNodeWidth(node);
            const nodeHeight = this.getNodeHeight(node);

            if (worldX >= node.position.x &&
                worldX <= node.position.x + nodeWidth &&
                worldY >= node.position.y &&
                worldY <= node.position.y + nodeHeight) {
                return node;
            }
        }
        return null;
    }

    getSocketAtPosition(x, y) {
        // Transform screen coordinates to world coordinates
        const worldX = (x - this.viewport.x) / this.viewport.zoom;
        const worldY = (y - this.viewport.y) / this.viewport.zoom;

        // Check all nodes for socket hits
        for (const node of this.nodes.values()) {
            const nodeWidth = this.getNodeWidth(node);
            const socketRadius = this.styles.socketSize / 2;
            const startY = node.position.y + 35; // After title (matches new layout)
            const lineHeight = 20;

            // Check input sockets (left border)
            for (let i = 0; i < node.inputs.length; i++) {
                const socketX = node.position.x;
                const socketY = startY + (i * lineHeight);

                const distance = Math.sqrt(
                    Math.pow(worldX - socketX, 2) +
                    Math.pow(worldY - socketY, 2)
                );

                if (distance <= socketRadius) {
                    return {
                        nodeId: node.id,
                        socketType: 'input',
                        socketIndex: i,
                        position: { x: socketX, y: socketY }
                    };
                }
            }

            // Check output sockets (right border)
            for (let i = 0; i < node.outputs.length; i++) {
                const socketX = node.position.x + nodeWidth;
                const socketY = startY + (i * lineHeight);

                const distance = Math.sqrt(
                    Math.pow(worldX - socketX, 2) +
                    Math.pow(worldY - socketY, 2)
                );

                if (distance <= socketRadius) {
                    return {
                        nodeId: node.id,
                        socketType: 'output',
                        socketIndex: i,
                        position: { x: socketX, y: socketY }
                    };
                }
            }
        }
        return null;
    }

    getInputFieldAtPosition(x, y) {
        // Check all nodes for input field hits
        for (const node of this.nodes.values()) {
            // Check each input that has fieldBounds set
            for (const input of node.inputs) {
                if (input.fieldBounds && !input.connection) {
                    const bounds = input.fieldBounds;
                    if (x >= bounds.x && x <= bounds.x + bounds.width &&
                        y >= bounds.y && y <= bounds.y + bounds.height) {
                        return { node, input, bounds };
                    }
                }
            }
        }
        return null;
    }

    handleInputFieldClick(clickedField) {
        const { node, input } = clickedField;

        if (input.type === 'boolean') {
            // Toggle boolean value
            const newValue = !input.value;
            node.setInputValue(input.name, newValue);
            this.render();
        } else if (input.type === 'number') {
            // Create number input dialog
            this.createNumberInputDialog(node, input, clickedField.bounds);
        }
    }

    createNumberInputDialog(node, input, bounds) {
        // Remove any existing input dialog
        this.removeNumberInputDialog();

        // Create input element
        const inputElement = document.createElement('input');
        inputElement.type = 'number';
        inputElement.value = input.value;
        inputElement.step = 'any';
        inputElement.style.position = 'absolute';
        inputElement.style.zIndex = '10000';
        inputElement.style.fontSize = '12px';
        inputElement.style.padding = '2px 4px';
        inputElement.style.border = '1px solid #4a90e2';
        inputElement.style.borderRadius = '3px';
        inputElement.style.background = '#2a2a2a';
        inputElement.style.color = '#ffffff';
        inputElement.style.width = `${bounds.width}px`;
        inputElement.style.height = `${bounds.height}px`;

        // Position relative to canvas
        const canvasRect = this.canvas.getBoundingClientRect();
        const screenX = bounds.x * this.viewport.zoom + this.viewport.x + canvasRect.left;
        const screenY = bounds.y * this.viewport.zoom + this.viewport.y + canvasRect.top;

        inputElement.style.left = `${screenX}px`;
        inputElement.style.top = `${screenY}px`;

        // Add to document
        document.body.appendChild(inputElement);
        this.currentNumberInput = inputElement;

        // Focus and select all
        inputElement.focus();
        inputElement.select();

        // Handle input changes
        const updateValue = () => {
            const newValue = parseFloat(inputElement.value) || 0;
            node.setInputValue(input.name, newValue);
            this.render();
        };

        // Event listeners
        inputElement.addEventListener('blur', () => {
            updateValue();
            this.removeNumberInputDialog();
        });

        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                updateValue();
                this.removeNumberInputDialog();
            } else if (e.key === 'Escape') {
                this.removeNumberInputDialog();
            }
        });

        // Update in real-time as user types (optional)
        inputElement.addEventListener('input', updateValue);
    }

    removeNumberInputDialog() {
        if (this.currentNumberInput) {
            document.body.removeChild(this.currentNumberInput);
            this.currentNumberInput = null;
        }
    }

    getConnectionAtPosition(x, y) {
        // Transform screen coordinates to world coordinates
        const worldX = (x - this.viewport.x) / this.viewport.zoom;
        const worldY = (y - this.viewport.y) / this.viewport.zoom;

        // Check all connections for hits
        for (const connection of this.connections) {
            const fromNode = this.nodes.get(connection.fromNodeId);
            const toNode = this.nodes.get(connection.toNodeId);

            if (!fromNode || !toNode) continue;

            const fromNodeWidth = this.getNodeWidth(fromNode);
            const startY = 35; // After title (matches new layout)
            const lineHeight = 20;

            const fromX = fromNode.position.x + fromNodeWidth;
            const fromY = fromNode.position.y + startY + (connection.fromOutputIndex * lineHeight);
            const toX = toNode.position.x;
            const toY = toNode.position.y + startY + (connection.toInputIndex * lineHeight);

            // Simple distance check to bezier curve (approximation)
            const distance = this.distanceToConnectionCurve(worldX, worldY, fromX, fromY, toX, toY);

            if (distance <= 10) { // 10px tolerance for easier clicking
                return connection;
            }
        }
        return null;
    }

    distanceToConnectionCurve(px, py, fromX, fromY, toX, toY) {
        // Simplified distance calculation to bezier curve
        // For better precision, we'd use the actual bezier curve formula
        // For now, use distance to the line segment as approximation

        const A = px - fromX;
        const B = py - fromY;
        const C = toX - fromX;
        const D = toY - fromY;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) {
            return Math.sqrt(A * A + B * B);
        }

        const param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
            xx = fromX;
            yy = fromY;
        } else if (param > 1) {
            xx = toX;
            yy = toY;
        } else {
            xx = fromX + param * C;
            yy = fromY + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
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

        // Draw connection preview if connecting
        if (this.isConnecting && this.connectionPreview) {
            this.drawConnectionPreview();
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
        const nodeHeight = this.getNodeHeight(node);

        // Draw node background
        this.ctx.fillStyle = this.styles.nodeColor;
        this.ctx.beginPath();
        this.roundRect(
            node.position.x,
            node.position.y,
            nodeWidth,
            nodeHeight,
            this.styles.nodeBorderRadius
        );
        this.ctx.fill();

        // Draw blue border for selected nodes
        if (isSelected) {
            this.ctx.strokeStyle = this.styles.nodeSelectedBorderColor;
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

        // Draw internal content (inputs with fields)
        this.drawNodeContent(node, nodeWidth, nodeHeight);

        // Draw sockets on the borders (external connection points)
        this.drawNodeSockets(node, nodeWidth, nodeHeight);
    }

    drawNodeContent(node, nodeWidth, nodeHeight) {
        const contentPadding = 8;
        const startY = node.position.y + 35; // After title
        const lineHeight = 20;

        // Set font for content
        this.ctx.fillStyle = this.styles.nodeTextColor;
        this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

        // Draw inputs with inline fields
        node.inputs.forEach((input, index) => {
            const y = startY + (index * lineHeight);

            // Draw input label
            this.ctx.fillText(input.name, node.position.x + contentPadding, y + 3);

            // Draw inline input field if not connected
            if (!input.connection) {
                const labelWidth = this.ctx.measureText(input.name).width;
                this.drawInlineInputField(
                    node,
                    input,
                    node.position.x + contentPadding + labelWidth + 8,
                    y
                );
            }
        });

        // Draw outputs (just labels on right side)
        node.outputs.forEach((output, index) => {
            const y = startY + (index * lineHeight);

            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                output.name,
                node.position.x + nodeWidth - contentPadding,
                y + 3
            );
            this.ctx.textAlign = 'left';
        });
    }

    drawNodeSockets(node, nodeWidth, nodeHeight) {
        const { socketSize } = this.styles;
        const startY = node.position.y + 35; // After title
        const lineHeight = 20;

        // Draw input sockets on left border
        node.inputs.forEach((input, index) => {
            const y = startY + (index * lineHeight);

            this.ctx.fillStyle = input.connection ? '#4a90e2' : '#666';
            this.ctx.beginPath();
            this.ctx.arc(node.position.x, y, socketSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw output sockets on right border
        node.outputs.forEach((output, index) => {
            const y = startY + (index * lineHeight);

            this.ctx.fillStyle = '#f5a623';
            this.ctx.beginPath();
            this.ctx.arc(node.position.x + nodeWidth, y, socketSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawInlineInputField(node, input, x, y) {
        if (input.dataType === 'boolean') {
            // Draw compact boolean toggle
            this.drawCompactBooleanToggle(x, y, input.value, node, input);
        } else if (input.dataType === 'number') {
            // Draw compact number field
            this.drawCompactNumberField(x, y, input.value, node, input);
        }
    }

    drawCompactNumberField(x, y, value, node, input) {
        const fieldWidth = 40;
        const fieldHeight = 12;
        const fieldY = y - fieldHeight / 2;

        // Draw subtle background
        this.ctx.fillStyle = '#333';
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(x, fieldY, fieldWidth, fieldHeight, 2);
        } else {
            this.ctx.rect(x, fieldY, fieldWidth, fieldHeight);
        }
        this.ctx.fill();
        this.ctx.stroke();

        // Draw value text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(value.toString(), x + fieldWidth / 2, fieldY + fieldHeight / 2 + 3);
        this.ctx.textAlign = 'left';

        // Store field bounds for click detection
        input.fieldBounds = { x, y: fieldY, width: fieldWidth, height: fieldHeight, node, input };
    }

    drawCompactBooleanToggle(x, y, value, node, input) {
        const toggleWidth = 20;
        const toggleHeight = 10;
        const toggleY = y - toggleHeight / 2;

        // Draw toggle background
        this.ctx.fillStyle = value ? '#4a90e2' : '#666';
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(x, toggleY, toggleWidth, toggleHeight, 5);
        } else {
            this.ctx.rect(x, toggleY, toggleWidth, toggleHeight);
        }
        this.ctx.fill();

        // Draw toggle switch
        this.ctx.fillStyle = '#ffffff';
        const switchX = value ? x + toggleWidth - 4 : x + 4;
        this.ctx.beginPath();
        this.ctx.arc(switchX, y, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Store toggle bounds for click detection
        input.fieldBounds = { x, y: toggleY, width: toggleWidth, height: toggleHeight, node, input };
    }

    drawNodePorts(node, nodeWidth) {
        const { socketSize } = this.styles;

        // Draw input ports (left side)
        node.inputs.forEach((input, index) => {
            const y = node.position.y + 40 + (index * 20);

            // Draw input socket - dimmed if not connected
            this.ctx.fillStyle = input.connection ? '#4a90e2' : '#666';
            this.ctx.beginPath();
            this.ctx.arc(node.position.x, y, socketSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Input label
            this.ctx.fillStyle = this.styles.nodeTextColor;
            this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            this.ctx.fillText(input.name, node.position.x + 12, y + 3);

            // Draw inline input field if not connected
            if (!input.connection) {
                this.drawInputField(node, input, index, y, nodeWidth);
            }
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

    drawInputField(node, input, index, y, nodeWidth) {
        // Position the input field to the right side of the node, inside the node area
        const fieldWidth = 50;
        const fieldHeight = 14;
        const fieldX = node.position.x + nodeWidth - fieldWidth - 8;
        const fieldY = y - fieldHeight / 2;

        if (input.dataType === 'boolean') {
            // Draw boolean toggle switch
            this.drawBooleanToggle(fieldX + fieldWidth - 20, fieldY + fieldHeight / 2, input.value, node, input);
        } else if (input.dataType === 'number') {
            // Draw number input field
            this.drawNumberField(fieldX, fieldY, fieldWidth, fieldHeight, input.value, node, input);
        }
    }

    drawNumberField(x, y, width, height, value, node, input) {
        // Draw input background
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        // Use roundRect with fallback
        if (this.ctx.roundRect) {
            this.ctx.roundRect(x, y, width, height, 2);
        } else {
            this.ctx.rect(x, y, width, height);
        }
        this.ctx.fill();
        this.ctx.stroke();

        // Draw value text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(value.toString(), x + width / 2, y + height / 2 + 3);
        this.ctx.textAlign = 'left';

        // Store field bounds for click detection
        if (!input.fieldBounds) input.fieldBounds = {};
        input.fieldBounds = { x, y, width, height, node, input };
    }

    drawBooleanToggle(x, y, value, node, input) {
        const toggleWidth = 16;
        const toggleHeight = 10;
        const toggleX = x - toggleWidth / 2;
        const toggleY = y - toggleHeight / 2;

        // Draw toggle background
        this.ctx.fillStyle = value ? '#4a90e2' : '#555';
        this.ctx.beginPath();
        if (this.ctx.roundRect) {
            this.ctx.roundRect(toggleX, toggleY, toggleWidth, toggleHeight, 5);
        } else {
            this.ctx.rect(toggleX, toggleY, toggleWidth, toggleHeight);
        }
        this.ctx.fill();

        // Draw toggle switch
        this.ctx.fillStyle = '#ffffff';
        const switchX = value ? toggleX + toggleWidth - 6 : toggleX + 2;
        this.ctx.beginPath();
        this.ctx.arc(switchX, y, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Store toggle bounds for click detection
        if (!input.fieldBounds) input.fieldBounds = {};
        input.fieldBounds = { x: toggleX, y: toggleY, width: toggleWidth, height: toggleHeight, node, input };
    }

    getNodeWidth(node) {
        // Calculate width based on content
        let maxWidth = this.styles.nodeMinWidth;

        // Check title width
        this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const titleWidth = this.ctx.measureText(node.type).width + 16; // 8px padding each side
        maxWidth = Math.max(maxWidth, titleWidth);

        // Check input label widths (including input fields)
        this.ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        node.inputs.forEach(input => {
            let inputWidth = 12 + this.ctx.measureText(input.name).width + 8; // socket + label + padding

            // Add space for input field if not connected
            if (!input.connection) {
                if (input.dataType === 'number') {
                    inputWidth += 58; // 50px field + 8px padding
                } else if (input.dataType === 'boolean') {
                    inputWidth += 24; // 16px toggle + 8px padding
                }
            }

            maxWidth = Math.max(maxWidth, inputWidth);
        });

        // Check output label widths
        node.outputs.forEach(output => {
            const outputWidth = 12 + this.ctx.measureText(output.name).width + 8; // socket + label + padding
            maxWidth = Math.max(maxWidth, outputWidth);
        });

        // Ensure enough space for both input and output labels side by side
        if (node.inputs.length > 0 && node.outputs.length > 0) {
            let maxRowWidth = titleWidth;
            const maxPorts = Math.max(node.inputs.length, node.outputs.length);

            for (let i = 0; i < maxPorts; i++) {
                let rowWidth = 0;

                // Input side
                if (i < node.inputs.length) {
                    const input = node.inputs[i];
                    let inputSideWidth = 12 + this.ctx.measureText(input.name).width + 8;

                    // Add space for input field if not connected
                    if (!input.connection) {
                        if (input.dataType === 'number') {
                            inputSideWidth += 58; // 50px field + 8px padding
                        } else if (input.dataType === 'boolean') {
                            inputSideWidth += 24; // 16px toggle + 8px padding
                        }
                    }

                    rowWidth += inputSideWidth;
                }

                // Output side
                if (i < node.outputs.length) {
                    rowWidth += 12 + this.ctx.measureText(node.outputs[i].name).width + 8;
                }

                // Add some spacing between input and output sides
                if (i < node.inputs.length && i < node.outputs.length) {
                    rowWidth += 16; // spacing between input and output
                }

                maxRowWidth = Math.max(maxRowWidth, rowWidth);
            }
            maxWidth = Math.max(maxWidth, maxRowWidth);
        }

        return maxWidth;
    }

    getNodeHeight(node) {
        // Calculate height based on content
        const titleHeight = 32; // Title area with padding
        const maxPorts = Math.max(node.inputs.length, node.outputs.length);
        const portsHeight = maxPorts * 20; // 20px per port row
        const bottomPadding = 8;

        return titleHeight + portsHeight + bottomPadding;
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
        const startY = 35; // After title (matches new layout)
        const lineHeight = 20;

        const fromX = fromNode.position.x + fromNodeWidth;
        const fromY = fromNode.position.y + startY + (connection.fromOutputIndex * lineHeight);

        const toX = toNode.position.x;
        const toY = toNode.position.y + startY + (connection.toInputIndex * lineHeight);

        // Check if connection is selected
        const isSelected = this.selectedConnections.has(connection.id);

        // Draw bezier curve with selection styling
        this.ctx.strokeStyle = isSelected ? this.styles.connectionSelectedColor : this.styles.connectionColor;
        this.ctx.lineWidth = isSelected ? this.styles.connectionSelectedWidth : this.styles.connectionWidth;
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

    drawConnectionPreview() {
        if (!this.connectingFrom || !this.connectionPreview) return;

        const fromX = this.connectingFrom.position.x;
        const fromY = this.connectingFrom.position.y;
        const toX = this.connectionPreview.x;
        const toY = this.connectionPreview.y;

        // Draw preview bezier curve with semi-transparent style
        this.ctx.strokeStyle = this.styles.connectionSelectedColor;
        this.ctx.lineWidth = this.styles.connectionWidth;
        this.ctx.globalAlpha = 0.7;
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);

        const controlPointOffset = Math.abs(toX - fromX) * 0.5;
        this.ctx.bezierCurveTo(
            fromX + controlPointOffset, fromY,
            toX - controlPointOffset, toY,
            toX, toY
        );

        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0; // Reset alpha
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

    setSelectedConnections(selectedConnections) {
        this.selectedConnections = selectedConnections;
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
        // Clean up input dialogs
        this.removeNumberInputDialog();

        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.nodes.clear();
        this.eventListeners.clear();
    }
}