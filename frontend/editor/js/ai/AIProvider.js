/**
 * Abstract base class for AI providers
 * This allows us to switch between OpenAI, Llama, Mock, etc. easily
 */
class AIProvider {
	constructor(config = {}) {
		this.config = config;
		this.isInitialized = false;
	}

	/**
	 * Initialize the AI provider (API keys, model loading, etc.)
	 * @returns {Promise<void>}
	 */
	async initialize() {
		throw new Error('initialize() must be implemented by provider');
	}

	/**
	 * Parse user input into structured scene commands
	 * @param {string} userInput - Natural language input from user
	 * @param {Object} context - Current scene context (selected objects, etc.)
	 * @returns {Promise<Object>} - { commands: [], response: string }
	 */
	async parseSceneCommand(userInput, context = {}) {
		throw new Error('parseSceneCommand() must be implemented by provider');
	}

	/**
	 * Generate a conversational response to user (for chat-like interaction)
	 * @param {string} userInput - User's message
	 * @param {Object} context - Current scene/conversation context
	 * @returns {Promise<string>} - Text response
	 */
	async generateResponse(userInput, context = {}) {
		throw new Error('generateResponse() must be implemented by provider');
	}

	/**
	 * Check if the provider is available and working
	 * @returns {Promise<boolean>}
	 */
	async isAvailable() {
		return this.isInitialized;
	}

	/**
	 * Get provider information (name, model, etc.)
	 * @returns {Object}
	 */
	getInfo() {
		return {
			name: 'Unknown Provider',
			model: 'unknown',
			local: false,
			cost: 'unknown'
		};
	}

	/**
	 * Clean up resources when provider is no longer needed
	 */
	destroy() {
		this.isInitialized = false;
	}
}

export { AIProvider };