import { AIProvider } from './AIProvider.js';

/**
 * OpenAI provider for GPT-4 integration
 * Handles API calls to OpenAI for scene command parsing
 */
class OpenAIProvider extends AIProvider {
	constructor(config = {}) {
		super(config);
		this.apiKey = config.apiKey;
		this.model = config.model || 'gpt-3.5-turbo'; // Much cheaper, sufficient for parsing
		this.baseURL = 'https://api.openai.com/v1/chat/completions';
		this.maxTokens = config.maxTokens || 300; // Reduced from 1000
	}

	async initialize() {
		if (!this.apiKey) {
			throw new Error('OpenAI API key is required');
		}

		// Test the API connection
		try {
			await this.testConnection();
			this.isInitialized = true;
		} catch (error) {
			console.error('Failed to initialize OpenAI provider:', error);
			throw error;
		}
	}

	async parseSceneCommand(userInput, context = {}) {
		if (!this.isInitialized) {
			throw new Error('Provider not initialized');
		}

		const systemPrompt = this.createSystemPrompt();
		const userPrompt = this.createUserPrompt(userInput, context);

		try {
			const response = await this.callOpenAI([
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]);

			return JSON.parse(response);
		} catch (error) {
			console.error('Error parsing scene command:', error);
			throw new Error('Failed to parse command. Please try rephrasing your request.');
		}
	}

	async generateResponse(userInput, context = {}) {
		if (!this.isInitialized) {
			throw new Error('Provider not initialized');
		}

		const systemPrompt = "You are a helpful 3D scene assistant. Provide friendly, conversational responses about creating 3D scenes. Keep responses brief and encouraging.";

		try {
			const response = await this.callOpenAI([
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userInput }
			]);

			return response;
		} catch (error) {
			console.error('Error generating response:', error);
			return "I'm having trouble responding right now. Please try again.";
		}
	}

	async testConnection() {
		try {
			await this.callOpenAI([
				{ role: 'user', content: 'Test connection' }
			], 10); // Very short response for testing
			return true;
		} catch (error) {
			throw new Error(`OpenAI connection test failed: ${error.message}`);
		}
	}

	async callOpenAI(messages, maxTokens = null) {
		const response = await fetch(this.baseURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.apiKey}`
			},
			body: JSON.stringify({
				model: this.model,
				messages: messages,
				max_tokens: maxTokens || this.maxTokens,
				temperature: 0.7,
				response_format: messages.some(m => m.content.includes('JSON')) 
					? { type: "json_object" } 
					: undefined
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => null);
			throw new Error(`OpenAI API error: ${response.status} ${errorData?.error?.message || response.statusText}`);
		}

		const data = await response.json();
		return data.choices[0].message.content;
	}

	createSystemPrompt() {
		return `Convert 3D editor commands to JSON. Actions: addObject, addLight, moveObject, rotateObject, scaleObject, removeObject, clearScene, changeMaterialColor/Type/Property.
Objects: cube, sphere, plane, cylinder, cone, torus, dodecahedron, icosahedron, octahedron, tetrahedron, capsule, circle, ring, torusknot.
Lights: directional (default), point, spot, ambient, hemisphere. Light properties: color, intensity, position.
Materials: standard, basic, phong, lambert, toon. Properties: roughness(0-1), metalness(0-1), opacity(0-1), transparent(bool).
For transparency/glass: use changeMaterialProperty with property:"opacity", value:0.5 (or desired transparency).
Object targeting: Use "objN" (e.g. obj12, obj42) from context. Use "selected" for currently selected object. Lower IDs = created first.
Return: {"commands":[{action,type,position[x,y,z],color,target,property,value,intensity,etc}],"response":"brief message"}
Defaults: position[0,1,0], rotation[0,0,0], scale[1,1,1]. Target "selected" for current/last object.`;
	}

	createUserPrompt(userInput, context) {
		let prompt = userInput;

		// Only add context if it's relevant to the command
		const needsContext = userInput.match(/\b(it|that|this|selected|move|rotate|scale|change|make|color|transparent|opacity)\b/i);

		// Add selected object info
		if (needsContext && context.selectedObjects && context.selectedObjects.length > 0) {
			const selected = context.selectedObjects[0];
			prompt += ` [Selected: obj${selected.id}]`;
		}

		// Include scene objects with IDs when they might be referenced
		if (context.sceneObjects && context.sceneObjects.length > 0) {
			// Check if user is referencing objects by color, type, or position
			const mightReferenceObjects = userInput.match(/\b(red|blue|green|yellow|orange|purple|pink|white|black|gray|brown|cyan|magenta|maroon|crimson|coral|salmon|gold|silver|copper|bronze|navy|teal|indigo|violet|emerald|turquoise|forest|sky|dark|light|pale|bright|deep|cube|sphere|plane|cylinder|cone|torus|dodecahedron|icosahedron|octahedron|tetrahedron|capsule|circle|ring|torusknot|box|ball|light|directional|point|spot|ambient|hemisphere|first|second|third|all|every|scene|objects|rgb)\b/i);

			if (mightReferenceObjects || needsContext) {
				// Sort by ID to maintain creation order
				const sortedObjects = [...context.sceneObjects].sort((a, b) => a.id - b.id);
				const objectDescriptions = sortedObjects.slice(0, 10).map(obj => {
					const objId = `obj${obj.id}`;
					const type = obj.type || 'mesh';
					const color = obj.color || 'gray';
					const pos = obj.position ? `@${obj.position.x.toFixed(1)},${obj.position.y.toFixed(1)},${obj.position.z.toFixed(1)}` : '';
					return `${objId}:${color}_${type}${pos}`;
				}).join(', ');

				prompt += ` [Objects: ${objectDescriptions}]`;
			}
		}

		return prompt;
	}

	getInfo() {
		return {
			name: 'OpenAI',
			model: this.model,
			local: false,
			cost: 'paid'
		};
	}

	destroy() {
		super.destroy();
		this.apiKey = null;
	}
}

export { OpenAIProvider };