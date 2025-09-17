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
		else if (input.includes('color') || input.includes('make') && (input.includes('red') || input.includes('blue') || input.includes('green'))) {
			const colorCommand = this.parseColorCommand(input);
			if (colorCommand) {
				commands.push(colorCommand);
				response = `I've changed the color to ${colorCommand.color}!`;
			}
		}
		else if (input.includes('material') || input.includes('rough') || input.includes('metal') || input.includes('shiny')) {
			const materialCommand = this.parseMaterialCommand(input);
			if (materialCommand) {
				commands.push(materialCommand);
				response = "I've updated the material properties!";
			}
		}
		else if (input.includes('rotate') || input.includes('turn')) {
			const rotateCommand = this.parseRotateCommand(input);
			if (rotateCommand) {
				commands.push(rotateCommand);
				response = "I've rotated the object for you!";
			}
		}
		else if (input.includes('scale') || input.includes('size') || input.includes('bigger') || input.includes('smaller')) {
			const scaleCommand = this.parseScaleCommand(input);
			if (scaleCommand) {
				commands.push(scaleCommand);
				response = "I've scaled the object for you!";
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
			"I'm here to help you create 3D scenes! Try asking me to add objects, change colors, or modify materials.",
			"You can ask me to add shapes, move objects around, change colors, or adjust materials. What would you like to create?",
			"I can help you build 3D scenes with simple commands. For example, try 'add a red cube', 'make it metal', or 'rotate 45 degrees'.",
			"Ready to create something awesome! I can add shapes, change materials, adjust colors, and transform objects in your scene."
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

		// Try to extract color from input
		const colorMatch = input.match(/(red|blue|green|yellow|orange|purple|pink|white|black|gray|grey|brown|cyan|magenta)/);
		if (colorMatch) {
			command.color = colorMatch[1];
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

	parseColorCommand(input) {
		const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'gray', 'brown'];
		const foundColor = colors.find(color => input.includes(color));

		if (!foundColor) return null;

		return {
			action: 'changeMaterialColor',
			target: 'selected',
			color: foundColor
		};
	}

	parseMaterialCommand(input) {
		if (input.includes('rough')) {
			return {
				action: 'changeMaterialProperty',
				target: 'selected',
				property: 'roughness',
				value: input.includes('very rough') ? 1.0 : 0.8
			};
		}

		if (input.includes('metal') || input.includes('metallic')) {
			return {
				action: 'changeMaterialProperty',
				target: 'selected',
				property: 'metalness',
				value: 1.0
			};
		}

		if (input.includes('shiny') || input.includes('smooth')) {
			return {
				action: 'changeMaterialProperty',
				target: 'selected',
				property: 'roughness',
				value: 0.1
			};
		}

		if (input.includes('glass') || input.includes('transparent')) {
			return {
				action: 'changeMaterialProperty',
				target: 'selected',
				property: 'opacity',
				value: 0.5
			};
		}

		return null;
	}

	parseRotateCommand(input) {
		// Simple rotation parsing - default to 45 degrees
		const angleMatch = input.match(/(\d+)\s*degrees?/);
		const angle = angleMatch ? parseFloat(angleMatch[1]) : 45;
		const radians = (angle * Math.PI) / 180;

		// Determine axis
		let rotation = [0, 0, 0];
		if (input.includes('x')) {
			rotation[0] = radians;
		} else if (input.includes('z')) {
			rotation[2] = radians;
		} else {
			rotation[1] = radians; // Default to Y axis
		}

		return {
			action: 'rotateObject',
			target: 'selected',
			rotation: rotation
		};
	}

	parseScaleCommand(input) {
		let scale = [1, 1, 1];

		if (input.includes('bigger') || input.includes('larger')) {
			scale = [2, 2, 2];
		} else if (input.includes('smaller')) {
			scale = [0.5, 0.5, 0.5];
		} else {
			// Look for specific scale values
			const scaleMatch = input.match(/scale\s+(\d+(?:\.\d+)?)/);
			if (scaleMatch) {
				const scaleValue = parseFloat(scaleMatch[1]);
				scale = [scaleValue, scaleValue, scaleValue];
			}
		}

		return {
			action: 'scaleObject',
			target: 'selected',
			scale: scale
		};
	}

	async simulateDelay(min = 100, max = 500) {
		const delay = Math.random() * (max - min) + min;
		return new Promise(resolve => setTimeout(resolve, delay));
	}

	initializeResponses() {
		// Pre-defined responses for common queries
		this.responses.set('hello', "Hello! I'm your AI assistant for creating 3D scenes. What would you like to build today?");
		this.responses.set('help', "I can help you with your 3D scene! Try commands like:\n• 'Add a red cube'\n• 'Make it metallic'\n• 'Rotate 45 degrees'\n• 'Make the sphere blue'\n• 'Scale it bigger'\n• 'Clear the scene'");
		this.responses.set('what can you do', "I can add 3D shapes (cubes, spheres, planes, cylinders), change colors and materials, rotate and scale objects, move them around, and clear the scene. Just tell me what you want to create!");
	}
}

export { MockProvider };