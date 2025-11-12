import { UIPanel } from './libs/ui.js';

import { MenubarAdd } from './Menubar.Add.js';
import { MenubarEdit } from './Menubar.Edit.js';
import { MenubarFile } from './Menubar.File.js';
import { MenubarView } from './Menubar.View.js';
import { MenubarHelp } from './Menubar.Help.js';
import { MenubarStatus } from './Menubar.Status.js';
import { PublishModal } from './modals/PublishModal.js';
import { getApiEndpoint } from './api-config.js';

function Menubar( editor ) {

	const container = new UIPanel();
	container.setId( 'menubar' );

	// Add Triber Engine Logo
	const logoContainer = new UIPanel();
	logoContainer.setClass( 'menubar-logo-container' );

	const logo = document.createElement( 'img' );
	logo.src = 'images/TriberEngineLogo.svg';
	logo.className = 'menubar-logo';
	logo.alt = 'Triber Engine';

	logoContainer.dom.appendChild( logo );
	container.add( logoContainer );

	container.add( new MenubarFile( editor ) );
	container.add( new MenubarEdit( editor ) );
	container.add( new MenubarAdd( editor ) );
	container.add( new MenubarView( editor ) );
	container.add( new MenubarHelp( editor ) );

	// Right-aligned action buttons
	const actionButtons = new UIPanel();
	actionButtons.setClass( 'menubar-actions' );

	// Preview button (secondary style)
	const previewButton = document.createElement( 'button' );
	previewButton.className = 'menubar-btn menubar-btn-secondary';
	previewButton.textContent = 'Preview';
	previewButton.addEventListener( 'click', async function () {

		// Show loading state
		const originalText = previewButton.textContent;
		previewButton.textContent = 'Uploading...';
		previewButton.disabled = true;

		try {
			// Get scene JSON with compiled behaviors
			const sceneData = editor.toJSON();

			// Upload to backend
			const response = await fetch(getApiEndpoint('/api/v1/runtime/scenes'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...sceneData,
					metadata: {
						name: 'Preview Scene',
						description: 'Generated from Triber Editor',
						creator: 'Editor User',
						createdAt: new Date().toISOString()
					}
				})
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.statusText}`);
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Upload failed');
			}

			const { sceneId } = result.data;

			// Open preview in new tab
			const runtimeUrl = window.location.hostname === 'engine.triber.space' || window.location.hostname.includes('pages.dev')
				? 'https://triber.space'
				: 'http://localhost:3000';
			const previewUrl = `${runtimeUrl}/runtime/preview/${sceneId}`;
			window.open(previewUrl, '_blank');

		} catch (error) {
			console.error('Failed to preview scene:', error);
			alert('Failed to preview scene: ' + error.message);
		} finally {
			// Reset button state
			previewButton.textContent = originalText;
			previewButton.disabled = false;
		}

	} );

	// Publish button (primary style) with modal
	const publishButton = document.createElement( 'button' );
	publishButton.className = 'menubar-btn menubar-btn-primary';
	publishButton.textContent = 'Publish';

	// Create publish modal instance
	const publishModal = new PublishModal( editor );

	publishButton.addEventListener( 'click', function () {
		publishModal.open();
	} );

	actionButtons.dom.appendChild( previewButton );
	actionButtons.dom.appendChild( publishButton );
	container.add( actionButtons );

	//container.add( new MenubarStatus( editor ) );

	return container;

}

export { Menubar };
