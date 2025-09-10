import { AIProvider } from './AIProvider.js';

/**
 * Mock AI provider for testing and development
 * Returns realistic responses without making API calls
 */
class MockProvider extends AIProvider {
	constructor(config = {}) {
		super(config);
		this.responses = new Map();
		this.initializeResponses();
	}

	async initialize() {
		// Mock initialization - always succeeds
		await this.simulateDelay(100, 300);
		this.isInitialized = true;
	}

	async parseSceneCommand(userInput, context = {}) {
		await this.simulateDelay(500, 1500); // Simulate thinking time
		
		const input = userInput.toLowerCase();
		const commands = [];
		let response = "I'm not sure how to do that yet.";

		// Pattern matching for different commands
		if (input.includes('cube') || input.includes('box')) {
			commands.push(this.createAddObjectCommand('cube', input));
			response = "I've added a cube to your scene!";
		}
		else if (input.includes('sphere') || input.includes('ball')) {
			commands.push(this.createAddObjectCommand('sphere', input));
			response = "I've added a sphere to your scene!";
		}
		else if (input.includes('plane') || input.includes('ground')) {
			commands.push(this.createAddObjectCommand('plane', input));
			response = "I've added a plane to your scene!";
		}
		else if (input.includes('cylinder')) {
			commands.push(this.createAddObjectCommand('cylinder', input));
			response = "I've added a cylinder to your scene!";
		}
		else if (input.includes('clear') || input.includes('delete all')) {
			commands.push({ action: 'clearScene' });
			response = "I've cleared the scene for you!";
		}
		else if (input.includes('move') || input.includes('position')) {
			// Extract object and position from input
			const moveCommand = this.parseMoveCommand(input);
			if (moveCommand) {
				commands.push(moveCommand);
				response = "I've moved the object for you!";
			}
		}

		return {
			commands,
			response
		};
	}

	async generateResponse(userInput, context = {}) {
		await this.simulateDelay(300, 800);
		
		const responses = [
			"I'm here to help you create 3D scenes! Try asking me to add objects like cubes, spheres, or planes.",
			"You can ask me to add shapes, move objects around, or clear the scene. What would you like to create?",
			"I can help you build 3D scenes with simple commands. For example, try 'add a red cube' or 'add a sphere at position 2,0,5'.",
			"Ready to create something awesome! I can add basic shapes and position them in your scene."
		];
		
		return responses[Math.floor(Math.random() * responses.length)];
	}

	getInfo() {
		return {
			name: 'Mock Provider',
			model: 'mock-v1.0',
			local: true,
			cost: 'free'
		};
	}

	// Helper methods
	createAddObjectCommand(type, input) {
		const command = {
			action: 'addObject',
			type: type,
			position: [0, 0, 0],
			rotation: [0, 0, 0],
			scale: [1, 1, 1]
		};

		// Try to extract position from input
		const positionMatch = input.match(/(?:at|to|position)\s+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
		if (positionMatch) {
			command.position = [
				parseFloat(positionMatch[1]),
				parseFloat(positionMatch[2]),
				parseFloat(positionMatch[3])
			];
		} else {
			// Random position if none specified
			command.position = [
				(Math.random() - 0.5) * 10,
				Math.random() * 5,
				(Math.random() - 0.5) * 10
			];
		}

		// Try to extract scale
		const scaleMatch = input.match(/size\s+(-?\d+(?:\.\d+)?)/);
		if (scaleMatch) {
			const scale = parseFloat(scaleMatch[1]);
			command.scale = [scale, scale, scale];
		}

		// Add a name if we can infer one
		const colorMatch = input.match(/(red|blue|green|yellow|orange|purple|pink|white|black|gray)/);
		if (colorMatch) {
			command.name = `${colorMatch[1]}_${type}`;
		}

		return command;
	}

	parseMoveCommand(input) {
		const positionMatch = input.match(/(?:to|at|position)\s+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
		if (!positionMatch) return null;

		return {
			action: 'moveObject',
			target: 'selected', // Move selected object
			position: [
				parseFloat(positionMatch[1]),
				parseFloat(positionMatch[2]),
				parseFloat(positionMatch[3])
			]
		};
	}

	async simulateDelay(min = 100, max = 500) {
		const delay = Math.random() * (max - min) + min;
		return new Promise(resolve => setTimeout(resolve, delay));
	}

	initializeResponses() {
		// Pre-defined responses for common queries
		this.responses.set('hello', "Hello! I'm your AI assistant for creating 3D scenes. What would you like to build today?");
		this.responses.set('help', "I can help you add objects to your scene! Try commands like:\n• 'Add a cube'\n• 'Add a red sphere at position 2,0,5'\n• 'Clear the scene'");
		this.responses.set('what can you do', "I can add basic 3D shapes like cubes, spheres, planes, and cylinders. I can also position them and clear the scene. More features coming soon!");
	}
}

export { MockProvider };