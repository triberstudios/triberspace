import { UIPanel, UIRow } from './libs/ui.js';

function MenubarRuntime( editor ) {

	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( 'Runtime' );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// Preview Scene
	const previewOption = new UIRow();
	previewOption.setClass( 'option' );
	previewOption.setTextContent( 'Preview Scene' );
	previewOption.onClick( async function () {

		// Show loading state
		previewOption.setTextContent( 'Uploading...' );
		previewOption.dom.style.opacity = '0.6';

		try {
			// Get scene JSON with compiled behaviors
			const sceneData = editor.toJSON();
			console.log('📤 MenubarRuntime: Scene data prepared for upload:', {
				hasScene: !!sceneData.scene,
				hasCamera: !!sceneData.camera,
				hasCompiledBehaviors: !!sceneData.compiledBehaviors,
				hasInteractionGraph: !!sceneData.interactionGraph,
				keys: Object.keys(sceneData),
				compiledBehaviorsDetail: sceneData.compiledBehaviors ? {
					behaviorCount: sceneData.compiledBehaviors.behaviors?.length || 0,
					errorCount: sceneData.compiledBehaviors.errors?.length || 0,
					hasBehaviors: Array.isArray(sceneData.compiledBehaviors.behaviors),
					behaviors: sceneData.compiledBehaviors.behaviors?.map(b => ({
						objectName: b.objectName,
						objectUuid: b.objectUuid,
						behaviorCount: b.behaviors?.length || 0,
						hasUpdateFunction: !!b.updateFunction?.execute
					}))
				} : null,
				sceneObjectCount: sceneData.scene?.children?.length || 0
			});

			// Upload to backend
			const response = await fetch('http://localhost:3001/api/v1/runtime/scenes', {
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
			console.log('📤 MenubarRuntime: Backend response:', {
				success: result.success,
				hasData: !!result.data,
				sceneId: result.data?.sceneId,
				error: result.error
			});

			if (!result.success) {
				throw new Error(result.error || 'Upload failed');
			}

			const { sceneId } = result.data;

			// Open preview in new tab - point to Next.js app on port 3000
			const previewUrl = `http://localhost:3000/runtime/preview/${sceneId}`;
			window.open(previewUrl, '_blank');

			console.log('📤 MenubarRuntime: Scene uploaded successfully, opening preview:', {
				sceneId,
				previewUrl
			});

		} catch (error) {
			console.error('Failed to preview scene:', error);
			alert('Failed to preview scene: ' + error.message);
		} finally {
			// Reset button state
			previewOption.setTextContent( 'Preview Scene' );
			previewOption.dom.style.opacity = '1';
		}

	} );
	options.add( previewOption );

	// Export Scene Data (for debugging)
	const exportOption = new UIRow();
	exportOption.setClass( 'option' );
	exportOption.setTextContent( 'Export Scene Data' );
	exportOption.onClick( function () {

		try {
			const sceneData = editor.toJSON();

			// Pretty print with compiled behaviors info
			const exportData = {
				...sceneData,
				_meta: {
					exportedAt: new Date().toISOString(),
					compiledBehaviors: sceneData.compiledBehaviors ? {
						behaviorCount: sceneData.compiledBehaviors.behaviors?.length || 0,
						errorCount: sceneData.compiledBehaviors.errors?.length || 0,
						hasInteractions: (sceneData.compiledBehaviors.behaviors?.length || 0) > 0
					} : null
				}
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = `scene-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			console.log('Scene data exported');

		} catch (error) {
			console.error('Failed to export scene data:', error);
			alert('Failed to export scene data: ' + error.message);
		}

	} );
	options.add( exportOption );

	// Debug Behaviors (development only)
	if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
		const debugOption = new UIRow();
		debugOption.setClass( 'option' );
		debugOption.setTextContent( 'Debug Behaviors' );
		debugOption.onClick( function () {

			try {
				const sceneData = editor.toJSON();

				if (!sceneData.compiledBehaviors) {
					alert('No compiled behaviors found in scene');
					return;
				}

				const { behaviors, errors } = sceneData.compiledBehaviors;

				let debugInfo = `=== BEHAVIOR DEBUG INFO ===\n\n`;
				debugInfo += `Behaviors: ${behaviors.length}\n`;
				debugInfo += `Errors: ${errors.length}\n\n`;

				if (errors.length > 0) {
					debugInfo += `ERRORS:\n`;
					errors.forEach((error, i) => {
						debugInfo += `${i + 1}. ${error.message}\n`;
					});
					debugInfo += `\n`;
				}

				if (behaviors.length > 0) {
					debugInfo += `BEHAVIORS:\n`;
					behaviors.forEach((behaviorSet, i) => {
						debugInfo += `${i + 1}. Object: ${behaviorSet.objectName} (${behaviorSet.objectUuid})\n`;
						behaviorSet.behaviors.forEach((behavior, j) => {
							debugInfo += `   ${j + 1}. ${behavior.type}: ${behavior.speed} ${behavior.type === 'spin' ? 'RPM' : 'BPM'}\n`;
						});
						debugInfo += `\n`;
					});
				}

				// Show in a popup
				const popup = window.open('', '_blank', 'width=600,height=400');
				popup.document.write(`
					<html>
						<head><title>Behavior Debug Info</title></head>
						<body style="font-family: monospace; white-space: pre; padding: 20px; background: #2a2a2a; color: #fff;">
							${debugInfo}
						</body>
					</html>
				`);

			} catch (error) {
				console.error('Failed to debug behaviors:', error);
				alert('Failed to debug behaviors: ' + error.message);
			}

		} );
		options.add( debugOption );
	}

	return container;

}

export { MenubarRuntime };