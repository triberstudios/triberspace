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

		// Check for object ID references (e.g., "obj12")
		const objIdMatch = input.match(/obj(\d+)/);
		let targetObject = objIdMatch ? `obj${objIdMatch[1]}` : 'selected';

		// Pattern matching for shapes
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
		else if (input.includes('cone')) {
			commands.push(this.createAddObjectCommand('cone', input));
			response = "I've added a cone to your scene!";
		}
		else if (input.includes('torus') || input.includes('donut')) {
			commands.push(this.createAddObjectCommand('torus', input));
			response = "I've added a torus to your scene!";
		}
		else if (input.includes('dodecahedron')) {
			commands.push(this.createAddObjectCommand('dodecahedron', input));
			response = "I've added a dodecahedron to your scene!";
		}
		else if (input.includes('icosahedron')) {
			commands.push(this.createAddObjectCommand('icosahedron', input));
			response = "I've added an icosahedron to your scene!";
		}
		else if (input.includes('octahedron')) {
			commands.push(this.createAddObjectCommand('octahedron', input));
			response = "I've added an octahedron to your scene!";
		}
		else if (input.includes('tetrahedron')) {
			commands.push(this.createAddObjectCommand('tetrahedron', input));
			response = "I've added a tetrahedron to your scene!";
		}
		else if (input.includes('capsule') || input.includes('pill')) {
			commands.push(this.createAddObjectCommand('capsule', input));
			response = "I've added a capsule to your scene!";
		}
		else if (input.includes('circle')) {
			commands.push(this.createAddObjectCommand('circle', input));
			response = "I've added a circle to your scene!";
		}
		else if (input.includes('ring')) {
			commands.push(this.createAddObjectCommand('ring', input));
			response = "I've added a ring to your scene!";
		}
		else if (input.includes('torusknot') || input.includes('torus knot')) {
			commands.push(this.createAddObjectCommand('torusknot', input));
			response = "I've added a torus knot to your scene!";
		}
		// Pattern matching for lights
		else if (input.includes('light') || input.includes('directional') || input.includes('point') || input.includes('spot') || input.includes('ambient') || input.includes('hemisphere')) {
			const lightCommand = this.createAddLightCommand(input);
			if (lightCommand) {
				commands.push(lightCommand);
				response = `I've added a ${lightCommand.type} light to your scene!`;
			}
		}
		else if (input.includes('clear') || input.includes('delete all')) {
			commands.push({ action: 'clearScene' });
			response = "I've cleared the scene for you!";
		}
		else if (input.includes('move') || input.includes('position')) {
			// Extract object and position from input
			const moveCommand = this.parseMoveCommand(input, targetObject);
			if (moveCommand) {
				commands.push(moveCommand);
				response = "I've moved the object for you!";
			}
		}
		else if (input.includes('color') || input.includes('make') && (input.includes('red') || input.includes('blue') || input.includes('green'))) {
			const colorCommand = this.parseColorCommand(input, targetObject);
			if (colorCommand) {
				commands.push(colorCommand);
				response = `I've changed the color to ${colorCommand.color}!`;
			}
		}
		else if (input.includes('material') || input.includes('rough') || input.includes('metal') || input.includes('shiny')) {
			const materialCommand = this.parseMaterialCommand(input, targetObject);
			if (materialCommand) {
				commands.push(materialCommand);
				response = "I've updated the material properties!";
			}
		}
		else if (input.includes('transparent') || input.includes('opacity') || input.includes('glass')) {
			const transparencyCommand = this.parseTransparencyCommand(input, targetObject);
			if (transparencyCommand) {
				commands.push(transparencyCommand);
				response = "I've made the object transparent!";
			}
		}
		else if (input.includes('rotate') || input.includes('turn')) {
			const rotateCommand = this.parseRotateCommand(input, targetObject);
			if (rotateCommand) {
				commands.push(rotateCommand);
				response = "I've rotated the object for you!";
			}
		}
		else if (input.includes('scale') || input.includes('size') || input.includes('bigger') || input.includes('smaller')) {
			const scaleCommand = this.parseScaleCommand(input, targetObject);
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

	createAddLightCommand(input) {
		const command = {
			action: 'addLight',
			type: 'directional', // default
			color: 0xffffff,
			intensity: 1,
			position: [5, 10, 7.5]
		};

		// Determine light type
		if (input.includes('point')) {
			command.type = 'point';
			command.position = [0, 5, 0];
		} else if (input.includes('spot')) {
			command.type = 'spot';
			command.position = [5, 10, 5];
		} else if (input.includes('ambient')) {
			command.type = 'ambient';
			command.intensity = 0.4; // Lower intensity for ambient
			delete command.position; // Ambient lights don't need position
		} else if (input.includes('hemisphere')) {
			command.type = 'hemisphere';
			command.position = [0, 10, 0];
		}

		// Try to extract position from input
		const positionMatch = input.match(/(?:at|to|position)\s+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
		if (positionMatch) {
			command.position = [
				parseFloat(positionMatch[1]),
				parseFloat(positionMatch[2]),
				parseFloat(positionMatch[3])
			];
		}

		// Try to extract color from input
		const colorMatch = input.match(/(red|blue|green|yellow|orange|purple|pink|white|black|gray|grey|brown|cyan|magenta)/);
		if (colorMatch) {
			const colorMap = {
				'red': 0xff0000, 'blue': 0x0000ff, 'green': 0x00ff00,
				'yellow': 0xffff00, 'orange': 0xffa500, 'purple': 0x800080,
				'pink': 0xffc0cb, 'white': 0xffffff, 'black': 0x000000,
				'gray': 0x808080, 'grey': 0x808080, 'brown': 0xa52a2a,
				'cyan': 0x00ffff, 'magenta': 0xff00ff
			};
			command.color = colorMap[colorMatch[1]] || 0xffffff;
		}

		// Try to extract intensity
		const intensityMatch = input.match(/(?:intensity|bright|dim)\s+(\d*\.?\d+)/);
		if (intensityMatch) {
			command.intensity = parseFloat(intensityMatch[1]);
		} else if (input.includes('bright')) {
			command.intensity = 2.0;
		} else if (input.includes('dim')) {
			command.intensity = 0.3;
		}

		return command;
	}

	parseMoveCommand(input, target = 'selected') {
		const positionMatch = input.match(/(?:to|at|position)\s+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
		if (!positionMatch) return null;

		return {
			action: 'moveObject',
			target: target,
			position: [
				parseFloat(positionMatch[1]),
				parseFloat(positionMatch[2]),
				parseFloat(positionMatch[3])
			]
		};
	}

	parseColorCommand(input, target = 'selected') {
		const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'gray', 'brown'];
		const foundColor = colors.find(color => input.includes(color));

		if (!foundColor) return null;

		return {
			action: 'changeMaterialColor',
			target: target,
			color: foundColor
		};
	}

	parseMaterialCommand(input, target = 'selected') {
		if (input.includes('rough')) {
			return {
				action: 'changeMaterialProperty',
				target: target,
				property: 'roughness',
				value: input.includes('very rough') ? 1.0 : 0.8
			};
		}

		if (input.includes('metal') || input.includes('metallic')) {
			return {
				action: 'changeMaterialProperty',
				target: target,
				property: 'metalness',
				value: 1.0
			};
		}

		if (input.includes('shiny') || input.includes('smooth')) {
			return {
				action: 'changeMaterialProperty',
				target: target,
				property: 'roughness',
				value: 0.1
			};
		}

		return null;
	}

	parseTransparencyCommand(input, target = 'selected') {
		let opacity = 0.5; // Default transparency

		// Try to extract specific opacity value
		const opacityMatch = input.match(/opacity\s+(\d*\.?\d+)/);
		if (opacityMatch) {
			opacity = parseFloat(opacityMatch[1]);
		}

		return {
			action: 'changeMaterialProperty',
			target: target,
			property: 'opacity',
			value: opacity
		};
	}

	parseRotateCommand(input, target = 'selected') {
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
			target: target,
			rotation: rotation
		};
	}

	parseScaleCommand(input, target = 'selected') {
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
			target: target,
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