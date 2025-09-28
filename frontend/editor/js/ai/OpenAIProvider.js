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

		// Extract target for validation
		const extractedTarget = this.extractTargetObject(userInput.toLowerCase());

		try {
			const response = await this.callOpenAI([
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]);

			const result = JSON.parse(response);

			// Post-process commands to validate and correct targeting
			if (result.commands && Array.isArray(result.commands)) {
				result.commands = result.commands.map(command => {
					// Only process interaction commands that have targets
					if (['createSpinning', 'createPulsing', 'modifySpinning', 'modifyPulsing', 'removeInteraction'].includes(command.action) && command.target) {
						// If GPT-4's target doesn't match our extracted target and we have a better one
						if (extractedTarget && extractedTarget !== 'selected' && command.target !== extractedTarget) {
							console.log(`OpenAI Provider: Correcting target from "${command.target}" to "${extractedTarget}"`);
							command.target = extractedTarget;
						}
					}
					return command;
				});
			}

			return result;
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
		return `Convert 3D editor commands to JSON.

ACTIONS:
- Object creation: addObject, addLight
- Object manipulation: moveObject, rotateObject, scaleObject, removeObject, clearScene
- Material changes: changeMaterialColor, changeMaterialType, changeMaterialProperty
- INTERACTIONS: createSpinning, createPulsing, modifySpinning, modifyPulsing, removeInteraction

OBJECTS: cube, sphere, plane, cylinder, cone, torus, dodecahedron, icosahedron, octahedron, tetrahedron, capsule, circle, ring, torusknot.

LIGHTS: directional (default), point, spot, ambient, hemisphere. Properties: color, intensity, position.

MATERIALS: standard, basic, phong, lambert, toon. Properties: roughness(0-1), metalness(0-1), opacity(0-1), transparent(bool).

INTERACTIONS:
CREATE NEW:
- "make [object] spin" → {action:"createSpinning", target:"cube", speed:60, axis:"y", clockwise:true}
- "make [object] pulse" → {action:"createPulsing", target:"sphere", speed:1, intensity:0.5}

MODIFY EXISTING (use when interactions context shows existing animations):
- "spin counterclockwise" → {action:"modifySpinning", target:"cube", clockwise:false}
- "spin faster" → {action:"modifySpinning", target:"cube", speed:120}
- "pulse slower" → {action:"modifyPulsing", target:"sphere", speed:0.5}
- "change axis to x" → {action:"modifySpinning", target:"cube", axis:"x"}

REMOVE:
- "stop [object] spinning" → {action:"removeInteraction", target:"cube", type:"spinning"}

Parameters: speed (rpm for spin, frequency for pulse), axis (x/y/z for spin), intensity (0-1 for pulse), clockwise (true/false)

OBJECT TARGETING:
CRITICAL: Look for [Target: objecttype] in user prompt - this is the extracted target to use!

PRIORITY ORDER:
1. USE [Target: objecttype] from user prompt if present → target:"objecttype"
2. Extract object type from command: "make the cube spin" → target:"cube"
3. Use "objN" (e.g. obj12, obj42) from context if specified
4. Use "selected" for currently selected object
5. For commands with object names like "make the red cube spin", extract "red_cube" as target

NAMING: Generate descriptive names by combining attributes:
- Colors: red_cube, blue_sphere, green_cylinder
- Materials: glass_cube, metal_sphere, wood_plane
- Sizes: large_cube, small_sphere, tiny_cylinder
- Multiple: large_red_cube, small_glass_sphere
- Default: just object type if no attributes

Return: {"commands":[{action,type,name,position[x,y,z],color,target,property,value,intensity,etc}],"response":"brief message"}

MODIFICATION DETECTION:
Use modifySpinning/modifyPulsing when:
1. [Interactions: ...] context shows existing animations for target object
2. User uses modification keywords: counterclockwise, clockwise, faster, slower, reverse, change, adjust
3. User specifies parameter changes without "make" or "create"

Examples:
- "red cube" → {action:"addObject",type:"cube",name:"red_cube",color:"red"}
- "make the cube spin [Target: cube]" → {action:"createSpinning",target:"cube"}
- "make sphere pulse fast [Target: sphere]" → {action:"createPulsing",target:"sphere",speed:2}
- "spin counterclockwise [Target: cube]" + [Interactions: cube spinning clockwise] → {action:"modifySpinning",target:"cube",clockwise:false}
- "pulse faster [Target: sphere]" + [Interactions: sphere pulsing] → {action:"modifyPulsing",target:"sphere",speed:2}
- "stop the spinning" → {action:"removeInteraction",target:"selected",type:"spinning"}

Defaults: position[0,1,0], rotation[0,0,0], scale[1,1,1].`;
	}

	/**
	 * Extract target object from user input
	 * @param {string} input - User input string
	 * @returns {string} Target object identifier
	 */
	extractTargetObject(input) {
		// Check for object ID references (e.g., "obj12")
		const objIdMatch = input.match(/obj(\d+)/);
		if (objIdMatch) {
			return `obj${objIdMatch[1]}`;
		}

		// Check for object types in interaction commands
		// Pattern: "make the [object] [action]" or "[action] the [object]"
		const objectTypes = [
			'cube', 'box', 'sphere', 'ball', 'plane', 'ground',
			'cylinder', 'cone', 'torus', 'dodecahedron', 'icosahedron',
			'octahedron', 'tetrahedron', 'capsule', 'circle', 'ring', 'torusknot'
		];

		for (const type of objectTypes) {
			// Match patterns like "make the cube spin", "spin the cube", "cube spin"
			const patterns = [
				new RegExp(`\\bthe\\s+${type}\\b`, 'i'),
				new RegExp(`\\b${type}\\s+`, 'i'),
				new RegExp(`\\s+${type}\\b`, 'i')
			];

			for (const pattern of patterns) {
				if (pattern.test(input)) {
					return type;
				}
			}
		}

		// Check for "selected" keyword
		if (input.match(/\b(selected|selection|it|that|this)\b/i)) {
			return 'selected';
		}

		// Default fallback
		return 'selected';
	}

	createUserPrompt(userInput, context) {
		let prompt = userInput;

		// Extract target object for better targeting
		const extractedTarget = this.extractTargetObject(userInput.toLowerCase());
		if (extractedTarget && extractedTarget !== 'selected') {
			prompt += ` [Target: ${extractedTarget}]`;
		}

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