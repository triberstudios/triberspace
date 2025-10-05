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

		// Enhanced target object extraction with scene context
		let targetObject = this.extractTargetObject(input, context);

		// INTERACTION COMMANDS - Check these FIRST to avoid conflicts with shape names
		// Check for modification keywords first
		if (input.includes('spin') || (input.includes('rotate') && !input.match(/rotate\s+\d+/)) || input.includes('spinning')) {
			const isModification = this.detectModificationIntent(input, 'spin');
			if (isModification) {
				const spinCommand = this.parseSpinModificationCommand(input, targetObject);
				if (spinCommand) {
					commands.push(spinCommand);
					response = "I've updated the spinning animation parameters!";
				}
			} else {
				const spinCommand = this.parseSpinCommand(input, targetObject);
				if (spinCommand) {
					commands.push(spinCommand);
					response = "I've created a spinning animation for the object!";
				}
			}
		}
		else if (input.includes('pulse') || input.includes('pulsing') || input.includes('breathe') || input.includes('breathing')) {
			const isModification = this.detectModificationIntent(input, 'pulse');
			if (isModification) {
				const pulseCommand = this.parsePulseModificationCommand(input, targetObject);
				if (pulseCommand) {
					commands.push(pulseCommand);
					response = "I've updated the pulsing animation parameters!";
				}
			} else {
				const pulseCommand = this.parsePulseCommand(input, targetObject);
				if (pulseCommand) {
					commands.push(pulseCommand);
					response = "I've created a pulsing animation for the object!";
				}
			}
		}
		else if (input.includes('animate') || input.includes('animation')) {
			const animationCommand = this.parseAnimationCommand(input, targetObject);
			if (animationCommand) {
				commands.push(animationCommand);
				response = `I've created an animation for the object!`;
			}
		}
		else if (input.includes('stop') && (input.includes('spin') || input.includes('pulse') || input.includes('animation'))) {
			const stopCommand = this.parseStopCommand(input, targetObject);
			if (stopCommand) {
				commands.push(stopCommand);
				response = "I've stopped the animation for the object!";
			}
		}
		// Pattern matching for shapes - only for creation commands
		else if (input.includes('cube') || input.includes('box')) {
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
		else if (input.match(/\b(add|search|find)\b.*\bgallery\b/i) || input.match(/\bsearch\s+for\b/i)) {
			const searchQuery = this.extractSearchQuery(input, 'art gallery');
			commands.push({
				action: 'searchSketchfab',
				query: searchQuery
			});
			response = `Searching Sketchfab for "${searchQuery}"...`;
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
		// Extended color list including new colors
		const colors = [
			'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'gray', 'brown',
			'maroon', 'crimson', 'coral', 'salmon', 'gold', 'silver', 'copper', 'bronze', 'navy', 'teal',
			'indigo', 'violet', 'emerald', 'turquoise', 'forestgreen', 'skyblue', 'darkred', 'lightblue',
			'palegreen', 'brightred', 'deepblue', 'cyan', 'magenta', 'lime', 'olive', 'aqua'
		];

		// Check for RGB format
		const rgbMatch = input.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
		if (rgbMatch) {
			return {
				action: 'changeMaterialColor',
				target: target,
				color: `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`
			};
		}

		// Check for color modifiers
		const modifiers = ['dark', 'light', 'pale', 'bright', 'deep'];
		for (const modifier of modifiers) {
			if (input.includes(modifier)) {
				for (const color of colors) {
					if (input.includes(color)) {
						return {
							action: 'changeMaterialColor',
							target: target,
							color: `${modifier} ${color}`
						};
					}
				}
			}
		}

		// Check for basic color names
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

	parseSpinCommand(input, target = 'selected') {
		// Extract spinning parameters
		let speed = 60; // Default RPM
		let axis = 'y'; // Default axis
		let clockwise = true; // Default direction

		// Try to extract speed
		const speedMatch = input.match(/(?:speed|rpm)\s+(\d+(?:\.\d+)?)/);
		if (speedMatch) {
			speed = parseFloat(speedMatch[1]);
		} else if (input.includes('fast')) {
			speed = 120;
		} else if (input.includes('slow')) {
			speed = 30;
		}

		// Extract axis
		if (input.includes('x') || input.includes('horizontal')) {
			axis = 'x';
		} else if (input.includes('z') || input.includes('forward')) {
			axis = 'z';
		} // Default is y

		// Extract direction
		if (input.includes('counter') || input.includes('ccw') || input.includes('anticlockwise')) {
			clockwise = false;
		}

		return {
			action: 'createSpinning',
			target: target,
			speed: speed,
			axis: axis,
			clockwise: clockwise
		};
	}

	parsePulseCommand(input, target = 'selected') {
		// Extract pulsing parameters
		let speed = 1; // Default frequency
		let intensity = 0.5; // Default amplitude

		// Try to extract speed/frequency
		const speedMatch = input.match(/(?:speed|frequency)\s+(\d+(?:\.\d+)?)/);
		if (speedMatch) {
			speed = parseFloat(speedMatch[1]);
		} else if (input.includes('fast')) {
			speed = 2;
		} else if (input.includes('slow')) {
			speed = 0.5;
		}

		// Try to extract intensity
		const intensityMatch = input.match(/(?:intensity|amplitude)\s+(\d+(?:\.\d+)?)/);
		if (intensityMatch) {
			intensity = parseFloat(intensityMatch[1]);
		} else if (input.includes('big') || input.includes('large')) {
			intensity = 0.8;
		} else if (input.includes('small') || input.includes('subtle')) {
			intensity = 0.2;
		}

		return {
			action: 'createPulsing',
			target: target,
			speed: speed,
			intensity: intensity
		};
	}

	parseAnimationCommand(input, target = 'selected') {
		// General animation command - determine type from context
		if (input.includes('spin') || input.includes('rotate') || input.includes('turn')) {
			return this.parseSpinCommand(input, target);
		} else if (input.includes('pulse') || input.includes('scale') || input.includes('breathe')) {
			return this.parsePulseCommand(input, target);
		}

		// Default to spinning animation
		return this.parseSpinCommand(input, target);
	}

	parseStopCommand(input, target = 'selected') {
		// Determine which type of animation to stop
		let type = 'all'; // Default to stopping all animations

		if (input.includes('spin')) {
			type = 'spinning';
		} else if (input.includes('pulse')) {
			type = 'pulsing';
		}

		return {
			action: 'removeInteraction',
			target: target,
			type: type
		};
	}

	/**
	 * Extract target object from user input with enhanced support for any object name
	 * @param {string} input - User input string
	 * @param {Object} context - Scene context with object information
	 * @returns {string} Target object identifier
	 */
	extractTargetObject(input, context = {}) {
		console.log('Extracting target object from:', input);
		console.log('Scene context:', context);

		// Check for object ID references (e.g., "obj12")
		const objIdMatch = input.match(/obj(\d+)/);
		if (objIdMatch) {
			console.log(`Found object ID reference: obj${objIdMatch[1]}`);
			return `obj${objIdMatch[1]}`;
		}

		// Check for quoted object names (e.g., "scale 'VR Round Art Gallery' to 2")
		const quotedMatch = input.match(/["']([^"']+)["']/);
		if (quotedMatch) {
			const quotedName = quotedMatch[1];
			console.log(`Found quoted object name: ${quotedName}`);
			// Check if this matches any object in the scene
			if (context.sceneObjects) {
				const matchingObject = context.sceneObjects.find(obj =>
					obj.name && obj.name.toLowerCase().includes(quotedName.toLowerCase())
				);
				if (matchingObject) {
					console.log(`Matched quoted name to scene object: ${matchingObject.name}`);
					return matchingObject.name;
				}
			}
			return quotedName;
		}

		// Enhanced "the [object phrase]" pattern extraction
		// Look for everything between "the " and action words, capturing multi-word object names
		const actionWords = ['to', 'by', 'with', 'scale', 'rotate', 'move', 'spin', 'pulse', 'make', 'set'];
		const thePattern = new RegExp(`the\\s+([^\\s]+(?:\\s+[^\\s]+)*?)\\s+(?:${actionWords.join('|')})`, 'i');
		const theObjectMatch = input.match(thePattern);

		if (theObjectMatch) {
			const extractedPhrase = theObjectMatch[1].toLowerCase().trim();
			console.log(`Extracted phrase after 'the': "${extractedPhrase}"`);

			// Try to match against scene objects first
			if (context.sceneObjects) {
				const bestMatch = this.findBestObjectMatch(extractedPhrase, context.sceneObjects);
				if (bestMatch) {
					console.log(`Matched phrase to scene object: ${bestMatch.name}`);
					return bestMatch.name;
				}
			}

			// Return the extracted phrase as-is for the SceneCommandExecutor to handle
			return extractedPhrase;
		}

		// Fallback: Look for "the [word]" pattern (original logic)
		const simpleTheMatch = input.match(/the\s+(\w+)/);
		if (simpleTheMatch) {
			const singleWord = simpleTheMatch[1].toLowerCase();
			console.log(`Found simple 'the' pattern: ${singleWord}`);

			// Check against scene objects first
			if (context.sceneObjects) {
				const matchingObject = context.sceneObjects.find(obj =>
					obj.name && obj.name.toLowerCase().includes(singleWord)
				);
				if (matchingObject) {
					console.log(`Matched single word to scene object: ${matchingObject.name}`);
					return matchingObject.name;
				}
			}

			// Check against primitive types (keep existing logic as fallback)
			const objectTypes = [
				'cube', 'box', 'sphere', 'ball', 'plane', 'ground',
				'cylinder', 'cone', 'torus', 'donut', 'dodecahedron',
				'icosahedron', 'octahedron', 'tetrahedron', 'capsule',
				'pill', 'circle', 'ring', 'torusknot'
			];

			if (objectTypes.includes(singleWord)) {
				console.log(`Matched to primitive type: ${singleWord}`);
				return singleWord;
			}

			return singleWord;
		}

		// Look for primitive object types in the input (existing logic)
		const objectTypes = [
			'cube', 'box', 'sphere', 'ball', 'plane', 'ground',
			'cylinder', 'cone', 'torus', 'donut', 'dodecahedron',
			'icosahedron', 'octahedron', 'tetrahedron', 'capsule',
			'pill', 'circle', 'ring', 'torusknot'
		];

		for (const objectType of objectTypes) {
			if (input.includes(objectType)) {
				console.log(`Found primitive object type in input: ${objectType}`);
				return objectType;
			}
		}

		// Check for color + object combinations (existing logic)
		const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'gray', 'brown'];
		for (const color of colors) {
			for (const objectType of objectTypes) {
				if (input.includes(color) && input.includes(objectType)) {
					console.log(`Found color + object combination: ${color} ${objectType}`);
					return `${color}_${objectType}`;
				}
			}
		}

		// Default to selected if no specific object found
		console.log('No specific object found, defaulting to selected');
		return 'selected';
	}

	/**
	 * Find the best matching object from scene objects using fuzzy matching
	 * @param {string} searchPhrase - The phrase to search for
	 * @param {Array} sceneObjects - Array of scene objects
	 * @returns {Object|null} Best matching object or null
	 */
	findBestObjectMatch(searchPhrase, sceneObjects) {
		if (!sceneObjects || !Array.isArray(sceneObjects)) {
			return null;
		}

		let bestMatch = null;
		let bestScore = 0;

		for (const obj of sceneObjects) {
			if (!obj.name) continue;

			const objectName = obj.name.toLowerCase();
			const score = this.calculateNameSimilarity(searchPhrase, objectName);

			if (score > bestScore && score > 0.3) { // Only consider matches above 30% similarity
				bestScore = score;
				bestMatch = obj;
			}
		}

		if (bestMatch) {
			console.log(`Best match for "${searchPhrase}": "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`);
		}

		return bestMatch;
	}

	/**
	 * Calculate similarity between search phrase and object name
	 * @param {string} searchPhrase - The phrase being searched for
	 * @param {string} objectName - The object name to compare against
	 * @returns {number} Similarity score between 0 and 1
	 */
	calculateNameSimilarity(searchPhrase, objectName) {
		// Normalize both strings
		const search = searchPhrase.toLowerCase().trim();
		const name = objectName.toLowerCase().trim();

		// Exact match
		if (search === name) {
			return 1.0;
		}

		// Check if search phrase is contained in object name
		if (name.includes(search)) {
			return 0.8;
		}

		// Check if object name is contained in search phrase
		if (search.includes(name)) {
			return 0.7;
		}

		// Word-based matching - count matching words
		const searchWords = search.split(/\s+/);
		const nameWords = name.split(/\s+/);
		let matchingWords = 0;

		for (const searchWord of searchWords) {
			for (const nameWord of nameWords) {
				if (searchWord === nameWord ||
					searchWord.includes(nameWord) ||
					nameWord.includes(searchWord)) {
					matchingWords++;
					break;
				}
			}
		}

		// Calculate word match ratio
		const wordScore = matchingWords / Math.max(searchWords.length, nameWords.length);

		// Bonus for partial word matches
		let partialScore = 0;
		for (const searchWord of searchWords) {
			for (const nameWord of nameWords) {
				if (searchWord.length > 2 && nameWord.length > 2) {
					const commonChars = this.getCommonCharacters(searchWord, nameWord);
					if (commonChars > Math.min(searchWord.length, nameWord.length) * 0.6) {
						partialScore += 0.1;
					}
				}
			}
		}

		return Math.min(wordScore + partialScore, 1.0);
	}

	/**
	 * Count common characters between two strings
	 * @param {string} str1 - First string
	 * @param {string} str2 - Second string
	 * @returns {number} Number of common characters
	 */
	getCommonCharacters(str1, str2) {
		let common = 0;
		const chars1 = str1.split('');
		const chars2 = str2.split('');

		for (const char of chars1) {
			const index = chars2.indexOf(char);
			if (index !== -1) {
				common++;
				chars2.splice(index, 1); // Remove to avoid double counting
			}
		}

		return common;
	}

	/**
	 * Extract search query from user input
	 * @param {string} input - User input string
	 * @param {string} defaultQuery - Default query if none found
	 * @returns {string} Extracted search query
	 */
	extractSearchQuery(input, defaultQuery = 'art gallery') {
		// Pattern 1: "search for [query]"
		let match = input.match(/search\s+for\s+(.+)/i);
		if (match) {
			return match[1].trim();
		}

		// Pattern 2: "find [query]"
		match = input.match(/find\s+(?:a\s+)?(.+)/i);
		if (match) {
			return match[1].trim();
		}

		// Pattern 3: "add a [query]" or "add [query]"
		match = input.match(/add\s+(?:a\s+)?(.+)/i);
		if (match) {
			return match[1].trim();
		}

		// Pattern 4: "search [query]"
		match = input.match(/search\s+(.+)/i);
		if (match) {
			return match[1].trim();
		}

		// If no pattern matched, return default
		return defaultQuery;
	}

	async simulateDelay(min = 100, max = 500) {
		const delay = Math.random() * (max - min) + min;
		return new Promise(resolve => setTimeout(resolve, delay));
	}

	/**
	 * Detect if user wants to modify existing animation vs create new one
	 * @param {string} input - User input string
	 * @param {string} animationType - Type of animation (spin, pulse)
	 * @returns {boolean} True if modification intent detected
	 */
	detectModificationIntent(input, animationType) {
		// Keywords that suggest modification of existing animation
		const modificationKeywords = [
			'change', 'modify', 'update', 'adjust', 'alter',
			'faster', 'slower', 'speed up', 'slow down',
			'clockwise', 'counterclockwise', 'reverse', 'opposite',
			'more', 'less', 'increase', 'decrease',
			'stronger', 'weaker', 'harder', 'softer'
		];

		// Direction change keywords for spinning
		if (animationType === 'spin') {
			const directionKeywords = ['clockwise', 'counterclockwise', 'reverse', 'opposite', 'other way'];
			if (directionKeywords.some(keyword => input.includes(keyword))) {
				return true;
			}
		}

		// Speed/intensity change keywords
		const speedKeywords = ['faster', 'slower', 'speed up', 'slow down', 'quicker', 'speed'];
		if (speedKeywords.some(keyword => input.includes(keyword))) {
			return true;
		}

		// General modification keywords
		return modificationKeywords.some(keyword => input.includes(keyword));
	}

	/**
	 * Parse spin modification command
	 * @param {string} input - User input string
	 * @param {string} target - Target object
	 * @returns {Object} Modification command
	 */
	parseSpinModificationCommand(input, target = 'selected') {
		const command = {
			action: 'modifySpinning',
			target: target
		};

		// Extract new speed if specified
		const speedMatch = input.match(/(?:speed|rpm)\s+(\d+(?:\.\d+)?)/);
		if (speedMatch) {
			command.speed = parseFloat(speedMatch[1]);
		} else if (input.includes('fast')) {
			command.speed = 120;
		} else if (input.includes('slow')) {
			command.speed = 30;
		}

		// Extract direction changes
		if (input.includes('counterclockwise') || input.includes('ccw') || input.includes('reverse') || input.includes('opposite')) {
			command.clockwise = false;
		} else if (input.includes('clockwise') || input.includes('cw')) {
			command.clockwise = true;
		}

		return command;
	}

	/**
	 * Parse pulse modification command
	 * @param {string} input - User input string
	 * @param {string} target - Target object
	 * @returns {Object} Modification command
	 */
	parsePulseModificationCommand(input, target = 'selected') {
		const command = {
			action: 'modifyPulsing',
			target: target
		};

		// Extract new speed if specified
		const speedMatch = input.match(/(?:speed|frequency)\s+(\d+(?:\.\d+)?)/);
		if (speedMatch) {
			command.speed = parseFloat(speedMatch[1]);
		} else if (input.includes('fast')) {
			command.speed = 2;
		} else if (input.includes('slow')) {
			command.speed = 0.5;
		}

		// Extract intensity changes
		const intensityMatch = input.match(/(?:intensity|amplitude)\s+(\d+(?:\.\d+)?)/);
		if (intensityMatch) {
			command.intensity = parseFloat(intensityMatch[1]);
		} else if (input.includes('strong') || input.includes('more') || input.includes('big')) {
			command.intensity = 0.8;
		} else if (input.includes('weak') || input.includes('less') || input.includes('small') || input.includes('subtle')) {
			command.intensity = 0.2;
		}

		return command;
	}

	initializeResponses() {
		// Pre-defined responses for common queries
		this.responses.set('hello', "Hello! I'm your AI assistant for creating 3D scenes. What would you like to build today?");
		this.responses.set('help', "I can help you with your 3D scene! Try commands like:\n• 'Add a red cube'\n• 'Make it metallic'\n• 'Rotate 45 degrees'\n• 'Make the sphere blue'\n• 'Scale it bigger'\n• 'Make the cube spin'\n• 'Make the sphere pulse'\n• 'Stop the animation'\n• 'Clear the scene'");
		this.responses.set('what can you do', "I can add 3D shapes (cubes, spheres, planes, cylinders), change colors and materials, rotate and scale objects, move them around, create spinning and pulsing animations, and clear the scene. Just tell me what you want to create!");
	}
}

export { MockProvider };