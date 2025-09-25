import { CustomPatchEditor } from './patch-editor/CustomPatchEditor.js';

/**
 * Interaction Editor Window - Independent resizable panel for node-based editing
 * Matches existing UI styling and integrates with Three.js editor
 */
class InteractionEditorWindow {
	constructor(editor) {
		this.editor = editor;
		this.isVisible = true; // Start visible by default
		this.panelHeight = 200; // Start at minimum height
		this.interactionEditor = null;

		this.container = null;
		this.interactionCanvas = null;

		this.init();
	}

	init() {
		this.createDOM();

		// Initialize interaction editor immediately to ensure it's available for load
		if (this.isVisible) {
			this.initCustomInteractionEditor();
		}
	}

	createDOM() {
		// Main interaction editor container (integrates with flex layout)
		this.container = document.createElement('div');
		this.container.className = 'interaction-editor-container panel-container';
		this.container.style.cssText = `
			flex: 1;
			display: block;
			position: relative;
			min-height: 200px;
		`;

		// Interaction editor title bar
		const titleBar = document.createElement('div');
		titleBar.className = 'interaction-editor-title';
		titleBar.style.cssText = `
			padding: 8px 12px;
			background-color: #3a3a3a;
			border-bottom: 1px solid #4a4a4a;
			font-size: 12px;
			color: #cccccc;
			user-select: none;
			display: flex;
			justify-content: space-between;
			align-items: center;
		`;

		// Title text
		const titleText = document.createElement('span');
		titleText.textContent = 'Interaction Editor';
		titleBar.appendChild(titleText);

		// Add Node button
		const addNodeButton = document.createElement('button');
		addNodeButton.textContent = 'Add Node';
		addNodeButton.style.cssText = `
			background: #4a4a4a;
			border: 1px solid #666;
			color: #cccccc;
			font-size: 11px;
			cursor: pointer;
			padding: 4px 8px;
			border-radius: 3px;
			margin-right: 8px;
		`;
		addNodeButton.addEventListener('click', () => this.showAddNodeMenu(addNodeButton));
		titleBar.appendChild(addNodeButton);

		// Close button
		const closeButton = document.createElement('button');
		closeButton.textContent = '×';
		closeButton.style.cssText = `
			background: none;
			border: none;
			color: #cccccc;
			font-size: 16px;
			cursor: pointer;
			padding: 0;
			width: 20px;
			height: 20px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 3px;
		`;

		closeButton.addEventListener('mouseenter', () => {
			closeButton.style.backgroundColor = '#555555';
		});

		closeButton.addEventListener('mouseleave', () => {
			closeButton.style.backgroundColor = 'transparent';
		});

		closeButton.addEventListener('click', () => {
			this.hide();
		});

		titleBar.appendChild(closeButton);

		// Canvas container for interaction nodes
		this.interactionCanvas = document.createElement('div');
		this.interactionCanvas.className = 'interaction-editor-canvas';
		this.interactionCanvas.style.cssText = `
			width: 100%;
			height: calc(100% - 33px);
			position: relative;
			background-color: #2a2a2a;
			background-image: radial-gradient(circle, #3a3a3a 0.5px, transparent 0.5px);
			background-size: 16px 16px;
			overflow: hidden;
		`;

		this.container.appendChild(titleBar);
		this.container.appendChild(this.interactionCanvas);
	}

	initCustomInteractionEditor() {
		// Initialize custom vanilla JS interaction editor
		if (!this.interactionEditor) {
			console.log('PatchEditorWindow: Creating CustomPatchEditor...');
			this.interactionEditor = new CustomPatchEditor(this.interactionCanvas, this.editor);
			console.log('PatchEditorWindow: CustomPatchEditor created successfully', this.interactionEditor);
			console.log('PatchEditorWindow: InteractionGraph available:', this.interactionEditor.getInteractionGraph());
		}
	}

	show() {
		if (this.isVisible) return;

		this.isVisible = true;
		this.container.style.display = 'block';

		// Show the vertical resizer handle
		const verticalResizer = document.querySelector('.vertical-panel-resizer');
		if (verticalResizer) {
			verticalResizer.style.display = 'block';
		}

		// Trigger layout reflow
		this.editor.signals.windowResize.dispatch();

		// Initialize custom interaction editor on first show immediately
		if (!this.interactionEditor) {
			this.initCustomInteractionEditor();
		} else {
			// If interaction editor already exists, force resize and render
			if (this.interactionEditor.resize) {
				this.interactionEditor.resize();
			}
			if (this.interactionEditor.canvas && this.interactionEditor.canvas.render) {
				this.interactionEditor.canvas.render();
			}
		}
	}

	hide() {
		if (!this.isVisible) return;

		this.isVisible = false;
		this.container.style.display = 'none';

		// Hide the vertical resizer handle
		const verticalResizer = document.querySelector('.vertical-panel-resizer');
		if (verticalResizer) {
			verticalResizer.style.display = 'none';
		}

		// Reset viewport to use flex when interaction editor is hidden
		const viewportWrapper = document.querySelector('.viewport-wrapper');
		if (viewportWrapper) {
			viewportWrapper.style.flex = '1';
			viewportWrapper.style.height = 'auto';
		}

		this.editor.signals.windowResize.dispatch();
	}

	toggle() {
		if (this.isVisible) {
			this.hide();
		} else {
			this.show();
		}
	}

	getContainer() {
		return this.container;
	}

	isOpen() {
		return this.isVisible;
	}


	showAddNodeMenu(buttonElement) {
		// Remove existing menu if open
		const existingMenu = document.querySelector('.add-node-menu');
		if (existingMenu) {
			existingMenu.remove();
			return;
		}

		// Create dropdown menu
		const menu = document.createElement('div');
		menu.className = 'add-node-menu';
		menu.style.cssText = `
			position: absolute;
			top: ${buttonElement.offsetTop + buttonElement.offsetHeight + 4}px;
			left: ${buttonElement.offsetLeft}px;
			background: #3a3a3a;
			border: 1px solid #555;
			border-radius: 4px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			z-index: 1000;
			min-width: 150px;
			max-height: 300px;
			overflow-y: auto;
		`;

		// Node categories and types
		const nodeCategories = {
			'Animation Behaviors': [
				{ name: 'Spin', type: 'Spin' },
				{ name: 'Pulse', type: 'Pulse' },
				{ name: 'Float', type: 'Float' },
				{ name: 'Fade', type: 'Fade' }
			],
			'Input': [
				{ name: 'Clock', type: 'Clock' },
				{ name: 'Time', type: 'Time' },
				{ name: 'Position', type: 'Position' }
			],
			'Math': [
				{ name: 'Add', type: 'Add' },
				{ name: 'Multiply', type: 'Multiply' },
				{ name: 'Subtract', type: 'Subtract' },
				{ name: 'Divide', type: 'Divide' }
			],
			'Utility': [
				{ name: 'Vector3', type: 'Vector3' },
				{ name: 'Pack', type: 'Pack' },
				{ name: 'Unpack', type: 'Unpack' }
			]
		};

		// Build menu structure
		Object.entries(nodeCategories).forEach(([categoryName, nodes]) => {
			// Category header
			const categoryHeader = document.createElement('div');
			categoryHeader.textContent = categoryName;
			categoryHeader.style.cssText = `
				padding: 6px 12px;
				font-size: 11px;
				color: #888;
				background: #2a2a2a;
				border-bottom: 1px solid #555;
				font-weight: bold;
			`;
			menu.appendChild(categoryHeader);

			// Category items
			nodes.forEach(node => {
				const item = document.createElement('div');
				item.textContent = node.name;
				item.style.cssText = `
					padding: 6px 16px;
					font-size: 12px;
					color: #ccc;
					cursor: pointer;
					border-bottom: 1px solid #333;
				`;

				item.addEventListener('mouseenter', () => {
					item.style.backgroundColor = '#4a4a4a';
				});

				item.addEventListener('mouseleave', () => {
					item.style.backgroundColor = 'transparent';
				});

				item.addEventListener('click', () => {
					this.createNode(node.type);
					menu.remove();
				});

				menu.appendChild(item);
			});
		});

		// Close menu when clicking outside
		const closeMenu = (e) => {
			if (!menu.contains(e.target) && e.target !== buttonElement) {
				menu.remove();
				document.removeEventListener('click', closeMenu);
			}
		};

		setTimeout(() => {
			document.addEventListener('click', closeMenu);
		}, 0);

		// Add to DOM
		this.container.appendChild(menu);
	}

	createNode(nodeType) {
		if (!this.interactionEditor) return;

		// Calculate center position for new node
		const canvasRect = this.interactionCanvas.getBoundingClientRect();
		const x = canvasRect.width / 2 - 50;
		const y = canvasRect.height / 2 - 25;

		// Create node based on type
		let node = null;
		switch (nodeType) {
			case 'Spin':
				import('./patch-editor/nodes/SpinNode.js').then(({ SpinNode }) => {
					node = new SpinNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Pulse':
				import('./patch-editor/nodes/PulseNode.js').then(({ PulseNode }) => {
					node = new PulseNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Float':
				import('./patch-editor/nodes/FloatNode.js').then(({ FloatNode }) => {
					node = new FloatNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Fade':
				import('./patch-editor/nodes/FadeNode.js').then(({ FadeNode }) => {
					node = new FadeNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Clock':
				import('./patch-editor/nodes/ClockNode.js').then(({ ClockNode }) => {
					node = new ClockNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Time':
				import('./patch-editor/nodes/TimeNode.js').then(({ TimeNode }) => {
					node = new TimeNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Position':
				import('./patch-editor/nodes/PositionNode.js').then(({ PositionNode }) => {
					node = new PositionNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Multiply':
				import('./patch-editor/nodes/MultiplyNode.js').then(({ MultiplyNode }) => {
					node = new MultiplyNode(x, y);
					this.interactionEditor.addNode(node);
				});
				break;
			case 'Add':
			case 'Subtract':
			case 'Divide':
			case 'Vector3':
			case 'Pack':
			case 'Unpack':
				// These node types would need to be implemented
				console.log(`${nodeType} node not yet implemented`);
				break;
			default:
				console.warn(`Unknown node type: ${nodeType}`);
		}
	}

	destroy() {
		if (this.interactionEditor) {
			this.interactionEditor.destroy();
			this.interactionEditor = null;
		}
	}
}

export { InteractionEditorWindow };