import { CustomPatchEditor } from './patch-editor/CustomPatchEditor.js';

/**
 * Interaction Editor Window - Independent resizable panel for node-based editing
 * Matches existing UI styling and integrates with Three.js editor
 */
class InteractionEditorWindow {
	constructor(editor) {
		this.editor = editor;
		this.isVisible = false;
		this.panelHeight = 400; // Default height
		this.interactionEditor = null;

		this.container = null;
		this.interactionCanvas = null;

		this.init();
	}

	init() {
		this.createDOM();
	}

	createDOM() {
		// Main interaction editor container
		this.container = document.createElement('div');
		this.container.className = 'interaction-editor-container panel-container';
		this.container.style.cssText = `
			height: ${this.panelHeight}px;
			display: none;
			position: relative;
		`;

		// Resizer handle
		this.resizerHandle = document.createElement('div');
		this.resizerHandle.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 8px;
			cursor: ns-resize;
			background-color: transparent;
			user-select: none;
			-webkit-user-select: none;
			z-index: 10;
		`;
		this.container.appendChild(this.resizerHandle);

		// Interaction editor title bar
		const titleBar = document.createElement('div');
		titleBar.className = 'interaction-editor-title';
		titleBar.textContent = 'Interaction Editor';
		titleBar.style.cssText = `
			padding: 8px 12px;
			background-color: #3a3a3a;
			border-bottom: 1px solid #4a4a4a;
			font-size: 12px;
			color: #cccccc;
			user-select: none;
		`;

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

		// Setup resizing
		this.setupResizing();
	}

	initCustomInteractionEditor() {
		// Initialize custom vanilla JS interaction editor
		if (!this.interactionEditor) {
			this.interactionEditor = new CustomPatchEditor(this.interactionCanvas);
			console.log('Custom interaction editor initialized successfully');
		}
	}

	show() {
		if (this.isVisible) return;

		this.isVisible = true;
		this.container.style.display = 'block';

		// Trigger layout reflow
		this.editor.signals.windowResize.dispatch();

		// Initialize custom interaction editor on first show with proper timing
		if (!this.interactionEditor) {
			// Use requestAnimationFrame for better timing with DOM
			requestAnimationFrame(() => {
				setTimeout(() => {
					this.initCustomInteractionEditor();
				}, 50);
			});
		}
	}

	hide() {
		if (!this.isVisible) return;

		this.isVisible = false;
		this.container.style.display = 'none';
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

	setupResizing() {
		let isResizing = false;
		let startY = 0;
		let startHeight = 0;

		const handlePointerMove = (event) => {
			if (!isResizing || event.isPrimary === false) return;

			const deltaY = startY - event.clientY;
			const newHeight = Math.min(Math.max(startHeight + deltaY, 200), 800);
			this.panelHeight = newHeight;
			this.container.style.height = newHeight + 'px';

			// Resize the interaction editor canvas
			if (this.interactionEditor && this.interactionEditor.resize) {
				this.interactionEditor.resize();
			}

			// Trigger window resize for other components
			this.editor.signals.windowResize.dispatch();
			event.preventDefault();
		};

		const handlePointerUp = (event) => {
			if (!isResizing || event.isPrimary === false) return;

			isResizing = false;
			document.body.style.cursor = '';

			document.removeEventListener('pointermove', handlePointerMove);
			document.removeEventListener('pointerup', handlePointerUp);

			event.preventDefault();
		};

		this.resizerHandle.addEventListener('pointerdown', (event) => {
			if (event.isPrimary === false) return;

			isResizing = true;
			startY = event.clientY;
			startHeight = this.panelHeight;
			document.body.style.cursor = 'ns-resize';

			document.addEventListener('pointermove', handlePointerMove);
			document.addEventListener('pointerup', handlePointerUp);

			event.preventDefault();
		});
	}

	destroy() {
		if (this.interactionEditor) {
			this.interactionEditor.destroy();
			this.interactionEditor = null;
		}
	}
}

export { InteractionEditorWindow };