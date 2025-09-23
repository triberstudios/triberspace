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

		// Initialize interaction editor since it's visible by default
		if (this.isVisible) {
			setTimeout(() => {
				this.initCustomInteractionEditor();
			}, 100);
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
			this.interactionEditor = new CustomPatchEditor(this.interactionCanvas);
			console.log('Custom interaction editor initialized successfully');
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

		// Initialize custom interaction editor on first show with proper timing
		if (!this.interactionEditor) {
			// Use requestAnimationFrame for better timing with DOM
			requestAnimationFrame(() => {
				setTimeout(() => {
					this.initCustomInteractionEditor();
				}, 50);
			});
		} else {
			// If interaction editor already exists, force resize and render
			requestAnimationFrame(() => {
				setTimeout(() => {
					if (this.interactionEditor.resize) {
						this.interactionEditor.resize();
					}
					if (this.interactionEditor.canvas && this.interactionEditor.canvas.render) {
						this.interactionEditor.canvas.render();
					}
				}, 50);
			});
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


	destroy() {
		if (this.interactionEditor) {
			this.interactionEditor.destroy();
			this.interactionEditor = null;
		}
	}
}

export { InteractionEditorWindow };