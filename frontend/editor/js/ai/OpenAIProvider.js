import { AIProvider } from './AIProvider.js';

/**
 * OpenAI provider for GPT-4 integration
 * Handles API calls to OpenAI for scene command parsing
 */
class OpenAIProvider extends AIProvider {
	constructor(config = {}) {
		super(config);
		this.apiKey = config.apiKey;
		this.model = config.model || 'gpt-4-turbo';
		this.baseURL = 'https://api.openai.com/v1/chat/completions';
		this.maxTokens = config.maxTokens || 1000;
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
		return `You are a 3D scene assistant for a Three.js editor. Convert user requests into structured JSON commands.

Available commands:
- addObject: Add 3D objects to the scene
- moveObject: Move existing objects
- rotateObject: Rotate objects
- scaleObject: Scale objects
- removeObject: Remove objects from scene
- clearScene: Clear all objects
- changeMaterialColor: Change object colors
- changeMaterialType: Change material types (standard, basic, phong, etc.)
- changeMaterialProperty: Change material properties (roughness, metalness, opacity, etc.)

Object types: cube, sphere, plane, cylinder
Material types: standard, basic, phong, lambert, toon, normal
Common material properties: roughness (0-1), metalness (0-1), opacity (0-1), transparent (true/false)

Response format (ALWAYS return valid JSON):
{
  "commands": [
    {
      "action": "addObject",
      "type": "cube|sphere|plane|cylinder",
      "position": [x, y, z],
      "rotation": [x, y, z],
      "scale": [x, y, z],
      "name": "optional_name",
      "color": "red|blue|#ff0000|etc",
      "material": {
        "type": "standard|basic|phong|etc",
        "properties": {
          "roughness": 0.5,
          "metalness": 0.0
        }
      }
    },
    {
      "action": "changeMaterialColor",
      "target": "selected|object_name|uuid",
      "color": "red|blue|#ff0000|etc",
      "materialSlot": -1
    },
    {
      "action": "changeMaterialType",
      "target": "selected|object_name|uuid",
      "materialType": "standard|basic|phong|etc",
      "properties": {
        "roughness": 0.5,
        "metalness": 0.0
      },
      "materialSlot": -1
    },
    {
      "action": "changeMaterialProperty",
      "target": "selected|object_name|uuid",
      "property": "roughness|metalness|opacity|etc",
      "value": 0.5,
      "materialSlot": -1
    }
  ],
  "response": "Friendly confirmation message"
}

Guidelines:
- Default position: [0, 1, 0] (slightly above ground)
- Default rotation: [0, 0, 0]
- Default scale: [1, 1, 1]
- materialSlot: -1 for main material, 0+ for specific material slots
- Infer reasonable positions if not specified
- Support color names (red, blue, etc.) and hex codes (#ff0000)
- For targeting objects:
  * If user says "the cube", "the sphere", etc., use object name (AI_cube_*, AI_sphere_*)
  * If user says "it" or refers to a previous object, use "selected"
  * If user mentions specific object by name, use that name
  * If context shows selected objects, prefer using their names over "selected"
- Use descriptive names when possible
- Keep response messages brief and friendly
- Always return valid JSON`;
	}

	createUserPrompt(userInput, context) {
		let prompt = `User request: "${userInput}"`;

		if (context.selectedObjects && context.selectedObjects.length > 0) {
			prompt += `\n\nCurrently selected objects: ${context.selectedObjects.map(obj => obj.name || obj.type).join(', ')}`;
		}

		if (context.sceneObjects && context.sceneObjects.length > 0) {
			prompt += `\n\nObjects in scene: ${context.sceneObjects.slice(0, 10).map(obj => obj.name || obj.type).join(', ')}`;
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