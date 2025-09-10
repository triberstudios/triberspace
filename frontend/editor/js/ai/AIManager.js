import { OpenAIProvider } from './OpenAIProvider.js';
import { MockProvider } from './MockProvider.js';

/**
 * AI Manager handles provider switching, configuration, and initialization
 */
class AIManager {
	constructor(config = {}) {
		this.config = config;
		this.providers = new Map();
		this.currentProvider = null;
		this.initialized = false;
		
		this.registerProviders();
	}

	registerProviders() {
		// Register available providers
		this.providers.set('openai', {
			class: OpenAIProvider,
			config: this.config.openai || {}
		});

		this.providers.set('mock', {
			class: MockProvider,
			config: this.config.mock || {}
		});
	}

	/**
	 * Initialize the AI manager with a specific provider
	 * @param {string} providerName - Name of provider to use ('openai', 'mock')
	 */
	async initialize(providerName = 'mock') {
		try {
			await this.switchProvider(providerName);
			this.initialized = true;
			console.log(`AI Manager initialized with ${providerName} provider`);
		} catch (error) {
			console.error('Failed to initialize AI Manager:', error);
			
			// Fallback to mock provider if initialization fails
			if (providerName !== 'mock') {
				console.log('Falling back to mock provider...');
				try {
					await this.switchProvider('mock');
					this.initialized = true;
					console.log('AI Manager initialized with mock provider (fallback)');
				} catch (fallbackError) {
					console.error('Fallback to mock provider also failed:', fallbackError);
					throw new Error('Failed to initialize AI system');
				}
			} else {
				throw error;
			}
		}
	}

	/**
	 * Switch to a different AI provider
	 * @param {string} providerName - Name of provider to switch to
	 */
	async switchProvider(providerName) {
		if (!this.providers.has(providerName)) {
			throw new Error(`Unknown provider: ${providerName}`);
		}

		// Clean up current provider
		if (this.currentProvider) {
			this.currentProvider.destroy();
		}

		// Create and initialize new provider
		const providerInfo = this.providers.get(providerName);
		const Provider = providerInfo.class;
		const provider = new Provider(providerInfo.config);

		await provider.initialize();
		
		this.currentProvider = provider;
		this.currentProviderName = providerName;
		
		console.log(`Switched to ${providerName} provider`);
	}

	/**
	 * Parse a scene command using the current provider
	 * @param {string} userInput - User's natural language input
	 * @param {Object} context - Current scene context
	 * @returns {Promise<Object>} Parsed commands and response
	 */
	async parseSceneCommand(userInput, context = {}) {
		if (!this.initialized || !this.currentProvider) {
			throw new Error('AI Manager not initialized');
		}

		try {
			return await this.currentProvider.parseSceneCommand(userInput, context);
		} catch (error) {
			console.error('Error parsing scene command:', error);
			throw error;
		}
	}

	/**
	 * Generate a conversational response
	 * @param {string} userInput - User's message
	 * @param {Object} context - Current context
	 * @returns {Promise<string>} AI response
	 */
	async generateResponse(userInput, context = {}) {
		if (!this.initialized || !this.currentProvider) {
			throw new Error('AI Manager not initialized');
		}

		try {
			return await this.currentProvider.generateResponse(userInput, context);
		} catch (error) {
			console.error('Error generating response:', error);
			return "I'm having trouble responding right now. Please try again.";
		}
	}

	/**
	 * Check if AI system is available
	 * @returns {boolean}
	 */
	isAvailable() {
		return this.initialized && this.currentProvider && this.currentProvider.isAvailable();
	}

	/**
	 * Get current provider information
	 * @returns {Object}
	 */
	getCurrentProviderInfo() {
		if (!this.currentProvider) {
			return { name: 'None', status: 'not initialized' };
		}

		return {
			...this.currentProvider.getInfo(),
			status: this.currentProvider.isAvailable() ? 'ready' : 'not ready'
		};
	}

	/**
	 * Get list of available providers
	 * @returns {Array}
	 */
	getAvailableProviders() {
		return Array.from(this.providers.keys());
	}

	/**
	 * Update configuration for a provider
	 * @param {string} providerName - Provider to update
	 * @param {Object} newConfig - New configuration
	 */
	updateProviderConfig(providerName, newConfig) {
		if (this.providers.has(providerName)) {
			this.providers.get(providerName).config = { ...this.providers.get(providerName).config, ...newConfig };
		}
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		if (this.currentProvider) {
			this.currentProvider.destroy();
			this.currentProvider = null;
		}
		this.initialized = false;
	}

	/**
	 * Create AI manager with default configuration
	 * @returns {AIManager}
	 */
	static createDefault() {
		const config = {
			openai: {
				apiKey: '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',
				model: 'gpt-4-turbo',
				maxTokens: 1000
			},
			mock: {
				// Mock provider needs no configuration
			}
		};

		return new AIManager(config);
	}

	/**
	 * Determine best provider to use based on environment
	 * @returns {string}
	 */
	static getBestProvider() {
		// Default to mock for safe testing
		// Change to 'openai' once you add your API key above
		return 'mock';
	}
}

export { AIManager };