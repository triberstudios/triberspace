import { UIPanel, UIDiv, UIInput, UIButton, UIText, UISelect, UIRow } from './libs/ui.js';
import { AIManager } from './ai/AIManager.js';
import { SceneCommandExecutor } from './ai/SceneCommandExecutor.js';

function SidebarAI( editor ) {

	const strings = editor.strings;
	const container = new UIPanel();
	container.setId( 'ai-panel' );
	
	// Basic positioning works! The issue must be in the content structure.
	
	// Fix the TabbedPanel Panels layout and prevent whole-panel scrolling
	const style = document.createElement('style');
	style.textContent = `
		.TabbedPanel .Panels {
			position: absolute;
			top: 40px;
			bottom: 0;
			display: flex;
			flex-direction: column;
			width: 100%;
			height: calc(100% - 40px);
			overflow: hidden;
		}
		#ai-panel {
			overflow: hidden !important;
		}
	`;
	document.head.appendChild(style);


	// Initialize AI system
	const aiManager = AIManager.createDefault();
	const commandExecutor = new SceneCommandExecutor(editor);
	let isInitializing = false;
	let currentProvider = 'mock';

	// Messages area - use viewport height for reliable calculation
	const messagesArea = document.createElement('div');
	messagesArea.className = 'ai-messages-area';
	messagesArea.style.cssText = `
		height: calc(100vh - 140px);
		overflow-y: auto;
		overflow-x: hidden;
		padding: 16px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 16px;
	`;
	
	// Input area - positioned at bottom (same as working red test div)
	const inputContainer = document.createElement('div');
	inputContainer.className = 'ai-input-container';
	inputContainer.style.cssText = `
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 12px;
		z-index: 10;
	`;
	
	const inputWrapper = document.createElement('div');
	inputWrapper.style.cssText = `
		position: relative;
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 50px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		height: 48px;
		transition: all 0.2s ease;
	`;
	
	const messageInput = document.createElement('input');
	messageInput.type = 'text';
	messageInput.placeholder = 'Ask AI to add objects, move things around...';
	messageInput.style.cssText = `
		width: 100%;
		border: none;
		background: transparent;
		color: #f8f8f2;
		font-size: 14px;
		outline: none;
		padding: 0 60px 0 16px;
	`;
	
	const sendButton = document.createElement('button');
	sendButton.innerHTML = '<i class="ph ph-paper-plane-tilt"></i>';
	sendButton.style.cssText = `
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: #f8f8f2;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		transition: all 0.2s ease;
	`;
	
	sendButton.addEventListener('mouseenter', () => {
		sendButton.style.background = 'rgba(255, 255, 255, 0.1)';
	});
	sendButton.addEventListener('mouseleave', () => {
		sendButton.style.background = 'transparent';
	});
	
	inputWrapper.appendChild(messageInput);
	inputWrapper.appendChild(sendButton);
	inputContainer.appendChild(inputWrapper);
	
	container.dom.appendChild(messagesArea);
	container.dom.appendChild(inputContainer);
	
	// Focus effects on input wrapper
	messageInput.addEventListener('focus', () => {
		inputWrapper.style.background = 'rgba(0, 0, 0, 0.7)';
		inputWrapper.style.borderColor = 'rgba(255, 255, 255, 0.2)';
		inputWrapper.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.1)';
	});
	
	messageInput.addEventListener('blur', () => {
		inputWrapper.style.background = 'rgba(0, 0, 0, 0.5)';
		inputWrapper.style.borderColor = 'rgba(255, 255, 255, 0.1)';
		inputWrapper.style.boxShadow = 'none';
	});

	// Empty state with suggested prompts
	const emptyState = document.createElement('div');
	emptyState.style.cssText = `
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 16px;
		padding: 20px;
	`;
	
	const welcomeText = document.createElement('div');
	welcomeText.textContent = 'What do you want to create?';
	welcomeText.style.cssText = `
		font-size: 20px;
		font-weight: 600;
		color: #ffffff;
		margin-bottom: 8px;
		text-align: center;
	`;
	emptyState.appendChild(welcomeText);
	
	// Container for prompts
	const promptsContainer = document.createElement('div');
	promptsContainer.style.cssText = `
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		max-width: 280px;
	`;
	
	// Suggested prompts
	const prompts = [
		'Add a red cube at position 2,0,5',
		'Add a sphere above the cube',
		'Add a cube',
		'Add a sphere',
		'Clear the scene'
	];
	
	prompts.forEach(prompt => {
		const promptButton = document.createElement('div');
		promptButton.style.cssText = `
			padding: 12px 20px;
			background: rgba(255, 255, 255, 0.08);
			border: 1px solid rgba(255, 255, 255, 0.15);
			border-radius: 12px;
			cursor: pointer;
			transition: all 0.2s ease;
			color: #e2e8f0;
			font-size: 14px;
			text-align: center;
			font-weight: 500;
		`;
		promptButton.textContent = prompt;
		
		promptButton.addEventListener('mouseenter', () => {
			promptButton.style.background = 'rgba(255, 255, 255, 0.15)';
			promptButton.style.transform = 'translateY(-1px)';
		});
		promptButton.addEventListener('mouseleave', () => {
			promptButton.style.background = 'rgba(255, 255, 255, 0.08)';
			promptButton.style.transform = 'translateY(0)';
		});
		promptButton.addEventListener('click', () => {
			messageInput.value = prompt;
			processMessage(prompt);
		});
		
		promptsContainer.appendChild(promptButton);
	});
	
	emptyState.appendChild(promptsContainer);
	messagesArea.appendChild(emptyState);

	// Chat message management
	const messages = [];

	function addMessage(content, isUser = false, isError = false) {
		// Hide empty state when adding first message
		if (messages.length === 0) {
			emptyState.style.display = 'none';
		}
		
		const messageContainer = document.createElement('div');
		messageContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 6px;
			margin-bottom: 12px;
		`;
		
		if (isUser) {
			// User message - right aligned with bubble (no label)
			messageContainer.style.alignItems = 'flex-end';
			
			const bubble = document.createElement('div');
			bubble.style.cssText = `
				background: rgba(255, 255, 255, 0.12);
				border-radius: 18px;
				padding: 12px 16px;
				max-width: 75%;
				word-wrap: break-word;
				color: #e2e8f0;
				font-size: 14px;
				line-height: 1.4;
			`;
			bubble.textContent = content;
			
			messageContainer.appendChild(bubble);
		} else {
			// AI message - left aligned, plain text, no model dropdown
			messageContainer.style.alignItems = 'flex-start';
			
			const messageText = document.createElement('div');
			messageText.style.cssText = `
				color: ${isError ? '#fc8181' : '#cbd5e0'};
				font-size: 14px;
				line-height: 1.5;
				max-width: 90%;
				word-wrap: break-word;
			`;
			messageText.textContent = content;
			messageContainer.appendChild(messageText);
		}
		
		messagesArea.appendChild(messageContainer);

		// Auto-scroll to show latest messages (scroll to bottom)
		setTimeout(() => {
			messagesArea.scrollTop = messagesArea.scrollHeight;
		}, 10);

		messages.push({ content, isUser, isError, timestamp: Date.now() });
	}

	function showTypingIndicator() {
		const indicator = document.createElement('div');
		indicator.className = 'ai-typing';
		indicator.style.cssText = `
			padding: 8px 12px;
			margin-bottom: 12px;
			border-radius: 8px;
			background-color: rgba(255, 255, 255, 0.05);
			color: #a0aec0;
			font-size: 14px;
			font-style: italic;
			align-self: flex-start;
		`;
		indicator.textContent = 'AI is thinking...';
		
		messagesArea.appendChild(indicator);

		// Auto-scroll to show latest messages (scroll to bottom)
		setTimeout(() => {
			messagesArea.scrollTop = messagesArea.scrollHeight;
		}, 10);

		return indicator;
	}

	function removeTypingIndicator(indicator) {
		if (indicator && indicator.parentNode) {
			indicator.parentNode.removeChild(indicator);
		}
	}

	async function processMessage(userInput) {
		if (!userInput.trim()) return;

		// Add user message
		addMessage(userInput, true);

		// Show typing indicator
		const typingIndicator = showTypingIndicator();

		try {
			// Get scene context
			const context = commandExecutor.getSceneContext();

			// Parse command with AI
			const result = await aiManager.parseSceneCommand(userInput, context);

			// Remove typing indicator
			removeTypingIndicator(typingIndicator);

			if (result.commands && result.commands.length > 0) {
				// Execute commands
				const executionResults = await commandExecutor.executeCommands(result.commands);
				
				// Check for failures
				const failures = executionResults.filter(r => !r.success);
				if (failures.length > 0) {
					const errorMsg = `Failed to execute ${failures.length} command(s): ${failures.map(f => f.error).join(', ')}`;
					addMessage(errorMsg, false, true);
				}

				// Show success message
				if (result.response) {
					addMessage(result.response);
				} else {
					addMessage(`Executed ${result.commands.length} command(s) successfully!`);
				}
			} else {
				// No commands, just conversational response
				if (result.response) {
					addMessage(result.response);
				} else {
					addMessage("I understood your message but couldn't create any scene commands from it. Try asking me to add objects or modify the scene!");
				}
			}

		} catch (error) {
			console.error('Error processing AI message:', error);
			removeTypingIndicator(typingIndicator);
			addMessage(`Error: ${error.message}`, false, true);
		}
	}

	// Event handlers
	sendButton.addEventListener('click', async function() {
		const input = messageInput.value.trim();
		if (input) {
			messageInput.value = '';
			await processMessage(input);
		}
	});

	messageInput.addEventListener('keydown', function(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendButton.click();
		}
	});

	// Initialize AI system
	async function initializeAI() {
		if (isInitializing) return;
		isInitializing = true;

		try {
			const provider = AIManager.getBestProvider();
			await aiManager.initialize(provider);
			currentProvider = aiManager.currentProviderName || provider;
			
			// Don't show initial message - let empty state handle it
		} catch (error) {
			console.error('Failed to initialize AI:', error);
			addMessage(`Failed to initialize AI: ${error.message}`, false, true);
		} finally {
			isInitializing = false;
		}
	}

	// Initialize when panel is created
	setTimeout(initializeAI, 100);

	return container;
}

export { SidebarAI };