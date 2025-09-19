import * as THREE from 'three';
import { AddObjectCommand } from '../commands/AddObjectCommand.js';
import { SetPositionCommand } from '../commands/SetPositionCommand.js';
import { SetRotationCommand } from '../commands/SetRotationCommand.js';
import { SetScaleCommand } from '../commands/SetScaleCommand.js';
import { RemoveObjectCommand } from '../commands/RemoveObjectCommand.js';
import { SetMaterialColorCommand } from '../commands/SetMaterialColorCommand.js';
import { SetMaterialCommand } from '../commands/SetMaterialCommand.js';
import { SetMaterialValueCommand } from '../commands/SetMaterialValueCommand.js';

/**
 * Executes AI-generated commands in the Three.js editor
 * Converts structured commands into editor operations with undo/redo support
 */
class SceneCommandExecutor {
	constructor(editor) {
		this.editor = editor;
	}

	/**
	 * Execute a list of AI commands
	 * @param {Array} commands - Array of command objects
	 * @returns {Promise<Array>} Results of executed commands
	 */
	async executeCommands(commands) {
		const results = [];

		for (const command of commands) {
			try {
				const result = await this.executeCommand(command);
				results.push({ success: true, command, result });
			} catch (error) {
				console.error('Error executing command:', command, error);
				results.push({ success: false, command, error: error.message });
			}
		}

		return results;
	}

	/**
	 * Execute a single AI command
	 * @param {Object} command - Command object
	 * @returns {Promise<any>} Result of the command
	 */
	async executeCommand(command) {
		switch (command.action) {
			case 'addObject':
				return this.addObject(command);

			case 'addLight':
				return this.addLight(command);

			case 'moveObject':
				return this.moveObject(command);

			case 'rotateObject':
				return this.rotateObject(command);

			case 'scaleObject':
				return this.scaleObject(command);

			case 'removeObject':
				return this.removeObject(command);

			case 'clearScene':
				return this.clearScene(command);

			case 'changeMaterialColor':
				return this.changeMaterialColor(command);

			case 'changeMaterialType':
				return this.changeMaterialType(command);

			case 'changeMaterialProperty':
				return this.changeMaterialProperty(command);

			default:
				throw new Error(`Unknown command action: ${command.action}`);
		}
	}

	/**
	 * Add an object to the scene
	 * @param {Object} command - Add object command
	 */
	addObject(command) {
		const { type, position = [0, 1, 0], rotation = [0, 0, 0], scale = [1, 1, 1], name } = command;

		let geometry;
		let material = new THREE.MeshStandardMaterial({ color: 0x888888 });

		// Create geometry based on type
		switch (type) {
			case 'cube':
			case 'box':
				geometry = new THREE.BoxGeometry(1, 1, 1);
				break;
			case 'sphere':
			case 'ball':
				geometry = new THREE.SphereGeometry(0.5, 32, 16);
				break;
			case 'plane':
			case 'ground':
				geometry = new THREE.PlaneGeometry(5, 5);
				break;
			case 'cylinder':
				geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
				break;
			case 'cone':
				geometry = new THREE.ConeGeometry(0.5, 1, 32);
				break;
			case 'torus':
			case 'donut':
				geometry = new THREE.TorusGeometry(0.7, 0.2, 16, 100);
				break;
			case 'dodecahedron':
				geometry = new THREE.DodecahedronGeometry(0.8, 0);
				break;
			case 'icosahedron':
				geometry = new THREE.IcosahedronGeometry(0.8, 0);
				break;
			case 'octahedron':
				geometry = new THREE.OctahedronGeometry(0.8, 0);
				break;
			case 'tetrahedron':
				geometry = new THREE.TetrahedronGeometry(0.8, 0);
				break;
			case 'capsule':
			case 'pill':
				geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
				break;
			case 'circle':
				geometry = new THREE.CircleGeometry(1, 32);
				break;
			case 'ring':
				geometry = new THREE.RingGeometry(0.5, 1, 32);
				break;
			case 'torusknot':
			case 'torus_knot':
				geometry = new THREE.TorusKnotGeometry(0.7, 0.2, 100, 16);
				break;
			default:
				throw new Error(`Unknown object type: ${type}`);
		}

		// Apply material properties if specified
		if (command.material) {
			// If color is specified at top level, add it to material properties
			const materialProps = { ...command.material.properties };
			if (command.color && !materialProps.color) {
				materialProps.color = command.color;
			}
			material = this.createMaterial(command.material.type || 'standard', materialProps);
		} else if (command.color) {
			material.color.setHex(this.parseColorString(command.color));
		}

		// Create mesh
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(...position);
		mesh.rotation.set(...rotation);
		mesh.scale.set(...scale);

		// Set name if provided
		if (name) {
			mesh.name = name;
		} else {
			mesh.name = `AI_${type}_${Date.now()}`;
		}

		// Add to scene using editor command system (for undo/redo)
		this.editor.execute(new AddObjectCommand(this.editor, mesh));

		return mesh;
	}

	/**
	 * Add a light to the scene
	 * @param {Object} command - Add light command
	 */
	addLight(command) {
		const { type = 'directional', color = 0xffffff, intensity = 1, position = [5, 10, 7.5], distance = 0, angle = Math.PI / 4, penumbra = 0, decay = 2 } = command;

		let light;

		// Create light based on type
		switch (type.toLowerCase()) {
			case 'directional':
				light = new THREE.DirectionalLight(color, intensity);
				light.name = 'DirectionalLight';
				light.target.name = 'DirectionalLight Target';
				light.position.set(position[0], position[1], position[2]);
				break;

			case 'point':
				light = new THREE.PointLight(color, intensity, distance, decay);
				light.name = 'PointLight';
				light.position.set(position[0], position[1], position[2]);
				break;

			case 'spot':
				light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
				light.name = 'SpotLight';
				light.target.name = 'SpotLight Target';
				light.position.set(position[0], position[1], position[2]);
				break;

			case 'ambient':
				light = new THREE.AmbientLight(color, intensity);
				light.name = 'AmbientLight';
				break;

			case 'hemisphere':
				const skyColor = command.skyColor || color;
				const groundColor = command.groundColor || 0x444444;
				light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
				light.name = 'HemisphereLight';
				light.position.set(position[0], position[1], position[2]);
				break;

			default:
				throw new Error(`Unknown light type: ${type}`);
		}

		// Generate unique name with timestamp
		const timestamp = Date.now();
		light.name = `AI_${light.name}_${timestamp}`;

		// Use editor command system for undo/redo
		this.editor.execute(new AddObjectCommand(this.editor, light));

		return light;
	}

	/**
	 * Move an object in the scene
	 * @param {Object} command - Move object command
	 */
	moveObject(command) {
		const { target, position } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Create THREE.Vector3 object from position array
		const newPosition = new THREE.Vector3(position[0], position[1], position[2]);

		// Use editor command system for undo/redo
		this.editor.execute(new SetPositionCommand(this.editor, object, newPosition));

		return object;
	}

	/**
	 * Rotate an object in the scene
	 * @param {Object} command - Rotate object command
	 */
	rotateObject(command) {
		const { target, rotation } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Create THREE.Euler object from rotation array
		const newRotation = new THREE.Euler(rotation[0], rotation[1], rotation[2]);

		// Use editor command system for undo/redo
		this.editor.execute(new SetRotationCommand(this.editor, object, newRotation));

		return object;
	}

	/**
	 * Scale an object in the scene
	 * @param {Object} command - Scale object command
	 */
	scaleObject(command) {
		const { target, scale } = command;
		const object = this.findObject(target);

		if (!object) {
			if (target === 'selected') {
				throw new Error(`No object is currently selected. Please select an object first, or try adding an object before scaling it.`);
			}
			throw new Error(`Object not found: ${target}. Make sure the object exists in the scene.`);
		}

		// Create THREE.Vector3 object from scale array
		const newScale = new THREE.Vector3(scale[0], scale[1], scale[2]);

		// Use editor command system for undo/redo
		this.editor.execute(new SetScaleCommand(this.editor, object, newScale));

		return object;
	}

	/**
	 * Remove an object from the scene
	 * @param {Object} command - Remove object command
	 */
	removeObject(command) {
		const { target } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Use editor command system for undo/redo
		this.editor.execute(new RemoveObjectCommand(this.editor, object));

		return object;
	}

	/**
	 * Clear all objects from the scene
	 * @param {Object} command - Clear scene command
	 */
	clearScene(command) {
		// Get all objects in the scene (except camera, lights, etc.)
		const objectsToRemove = [];
		
		this.editor.scene.traverse((child) => {
			if (child.isMesh && child !== this.editor.camera) {
				objectsToRemove.push(child);
			}
		});

		// Remove each object using the command system
		objectsToRemove.forEach(object => {
			this.editor.execute(new RemoveObjectCommand(this.editor, object));
		});

		return { removedCount: objectsToRemove.length };
	}

	/**
	 * Find an object in the scene by various criteria
	 * @param {string|number} target - Target identifier (name, uuid, 'selected', etc.)
	 * @returns {THREE.Object3D|null}
	 */
	findObject(target) {
		if (target === 'selected') {
			// First try to get the selected object
			if (this.editor.selected) {
				return this.editor.selected;
			}

			// If no object is selected, try to find the most recently added object
			console.warn('No object selected, trying to find the most recent object...');
			const recentObjects = [];
			this.editor.scene.traverse((child) => {
				if (child.isMesh && child !== this.editor.camera && child.name.startsWith('AI_')) {
					recentObjects.push(child);
				}
			});

			if (recentObjects.length > 0) {
				// Sort by name which includes timestamp, get the most recent
				recentObjects.sort((a, b) => b.name.localeCompare(a.name));
				const mostRecent = recentObjects[0];
				console.log('Using most recent AI object:', mostRecent.name);
				return mostRecent;
			}

			console.error('No selected object and no AI objects found in scene');
			return null;
		}

		if (typeof target === 'string') {
			// Check if target is an object ID (e.g., "obj12")
			if (target.startsWith('obj')) {
				const targetId = parseInt(target.substring(3));
				if (!isNaN(targetId)) {
					let foundObject = null;
					this.editor.scene.traverse((child) => {
						if (child.id === targetId) {
							foundObject = child;
						}
					});
					if (foundObject) {
						console.log(`Found object by ID: ${target} -> ${foundObject.name || foundObject.type}`);
						return foundObject;
					}
				}
			}

			// Search by exact name first
			let object = this.editor.scene.getObjectByName(target);
			if (object) return object;

			// Try to find by color + type combination (e.g., "purple_sphere", "blue_cube")
			const lowerTarget = target.toLowerCase();
			const colorTypes = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black', 'gray', 'brown'];
			const objectTypes = ['cube', 'sphere', 'plane', 'cylinder'];

			// Check if target contains color and/or type descriptors
			let targetColor = null;
			let targetType = null;

			for (const color of colorTypes) {
				if (lowerTarget.includes(color)) {
					targetColor = color;
					break;
				}
			}

			for (const type of objectTypes) {
				if (lowerTarget.includes(type)) {
					targetType = type;
					break;
				}
			}

			// Search for objects matching the description
			if (targetColor || targetType) {
				let matchingObjects = [];
				this.editor.scene.traverse((child) => {
					if (child.isMesh && child !== this.editor.camera) {
						const objectName = child.name.toLowerCase();
						let matches = true;

						// Check color match
						if (targetColor && !objectName.includes(targetColor)) {
							matches = false;
						}

						// Check type match
						if (targetType) {
							const objType = this.getObjectType(child).toLowerCase();
							if (objType !== targetType) {
								matches = false;
							}
						}

						if (matches) {
							matchingObjects.push(child);
						}
					}
				});

				// Return the most recently created matching object
				if (matchingObjects.length > 0) {
					matchingObjects.sort((a, b) => {
						// Prioritize AI-created objects with timestamps
						if (a.name.startsWith('AI_') && !b.name.startsWith('AI_')) return -1;
						if (!a.name.startsWith('AI_') && b.name.startsWith('AI_')) return 1;
						return b.name.localeCompare(a.name);
					});
					console.log(`Found ${matchingObjects.length} objects matching "${target}", using: ${matchingObjects[0].name}`);
					return matchingObjects[0];
				}
			}

			// Search by UUID
			object = this.editor.scene.getObjectByProperty('uuid', target);
			if (object) return object;
		}

		return null;
	}

	/**
	 * Get current scene context for AI commands
	 * @returns {Object} Scene context
	 */
	getSceneContext() {
		const context = {
			selectedObjects: [],
			sceneObjects: [],
			cameraPosition: this.editor.camera.position.toArray(),
			sceneInfo: {}
		};

		// Get selected object info
		if (this.editor.selected) {
			// Get material color if available
			let color = 'gray';
			if (this.editor.selected.material && this.editor.selected.material.color) {
				const hexColor = this.editor.selected.material.color.getHexString();
				const colorMap = {
					'ff0000': 'red', '00ff00': 'green', '0000ff': 'blue',
					'ffff00': 'yellow', 'ffa500': 'orange', 'ff00ff': 'magenta',
					'00ffff': 'cyan', 'ffffff': 'white', '000000': 'black',
					'800080': 'purple', 'ffc0cb': 'pink', '808080': 'gray',
					'ff8000': 'orange', '8000ff': 'purple', 'ff69b4': 'pink'
				};
				color = colorMap[hexColor.toLowerCase()] || 'gray';
			}

			context.selectedObjects.push({
				id: this.editor.selected.id,
				name: this.editor.selected.name,
				type: this.getObjectType(this.editor.selected),
				color: color,
				position: this.editor.selected.position.toArray(),
				uuid: this.editor.selected.uuid
			});
		}

		// Get all scene objects info (meshes and lights)
		this.editor.scene.traverse((child) => {
			if ((child.isMesh || child.isLight) && child !== this.editor.camera) {
				// Get material color if available (for meshes only)
				let color = 'white';
				if (child.isMesh && child.material && child.material.color) {
					const hexColor = child.material.color.getHexString();
					// Map common hex colors to names
					const colorMap = {
						'ff0000': 'red', '00ff00': 'green', '0000ff': 'blue',
						'ffff00': 'yellow', 'ffa500': 'orange', 'ff00ff': 'magenta',
						'00ffff': 'cyan', 'ffffff': 'white', '000000': 'black',
						'800080': 'purple', 'ffc0cb': 'pink', '808080': 'gray',
						'ff8000': 'orange', '8000ff': 'purple', 'ff69b4': 'pink'
					};
					color = colorMap[hexColor.toLowerCase()] || 'gray';
				} else if (child.isLight && child.color) {
					// For lights, get the light color
					const hexColor = child.color.getHexString();
					const colorMap = {
						'ff0000': 'red', '00ff00': 'green', '0000ff': 'blue',
						'ffff00': 'yellow', 'ffa500': 'orange', 'ff00ff': 'magenta',
						'00ffff': 'cyan', 'ffffff': 'white', '000000': 'black',
						'800080': 'purple', 'ffc0cb': 'pink', '808080': 'gray'
					};
					color = colorMap[hexColor.toLowerCase()] || 'white';
				}

				context.sceneObjects.push({
					id: child.id,
					name: child.name,
					type: this.getObjectType(child),
					color: color,
					position: child.position,
					uuid: child.uuid
				});
			}
		});

		// Scene statistics
		context.sceneInfo = {
			objectCount: context.sceneObjects.length,
			hasSelection: context.selectedObjects.length > 0
		};

		return context;
	}

	/**
	 * Get human-readable object type from Three.js object
	 * @param {THREE.Object3D} object - Three.js object
	 * @returns {string} Object type
	 */
	getObjectType(object) {
		// Handle lights
		if (object.isLight) {
			if (object.isDirectionalLight) return 'directionallight';
			if (object.isPointLight) return 'pointlight';
			if (object.isSpotLight) return 'spotlight';
			if (object.isAmbientLight) return 'ambientlight';
			if (object.isHemisphereLight) return 'hemispherelight';
			return 'light';
		}

		// Handle meshes
		if (!object.geometry) return 'unknown';

		// Basic shapes
		if (object.geometry.type === 'BoxGeometry') return 'cube';
		if (object.geometry.type === 'SphereGeometry') return 'sphere';
		if (object.geometry.type === 'PlaneGeometry') return 'plane';
		if (object.geometry.type === 'CylinderGeometry') return 'cylinder';

		// New shapes
		if (object.geometry.type === 'ConeGeometry') return 'cone';
		if (object.geometry.type === 'TorusGeometry') return 'torus';
		if (object.geometry.type === 'DodecahedronGeometry') return 'dodecahedron';
		if (object.geometry.type === 'IcosahedronGeometry') return 'icosahedron';
		if (object.geometry.type === 'OctahedronGeometry') return 'octahedron';
		if (object.geometry.type === 'TetrahedronGeometry') return 'tetrahedron';
		if (object.geometry.type === 'CapsuleGeometry') return 'capsule';
		if (object.geometry.type === 'CircleGeometry') return 'circle';
		if (object.geometry.type === 'RingGeometry') return 'ring';
		if (object.geometry.type === 'TorusKnotGeometry') return 'torusknot';

		return 'object';
	}

	/**
	 * Change the color of an object's material
	 * @param {Object} command - Change material color command
	 */
	changeMaterialColor(command) {
		const { target, color, materialSlot = -1 } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Convert color to hex if it's a string
		let hexColor;
		if (typeof color === 'string') {
			hexColor = this.parseColorString(color);
		} else {
			hexColor = color;
		}

		// Use editor command system for undo/redo
		this.editor.execute(new SetMaterialColorCommand(this.editor, object, 'color', hexColor, materialSlot));

		return object;
	}

	/**
	 * Change the material type of an object
	 * @param {Object} command - Change material type command
	 */
	changeMaterialType(command) {
		const { target, materialType, properties = {}, materialSlot = -1 } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Create new material based on type
		const newMaterial = this.createMaterial(materialType, properties);

		// Use editor command system for undo/redo
		this.editor.execute(new SetMaterialCommand(this.editor, object, newMaterial, materialSlot));

		return object;
	}

	/**
	 * Change a specific property of an object's material
	 * @param {Object} command - Change material property command
	 */
	changeMaterialProperty(command) {
		const { target, property, value, materialSlot = -1 } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Special handling for opacity - automatically enable transparency
		if (property === 'opacity' && value < 1.0) {
			// First enable transparency
			this.editor.execute(new SetMaterialValueCommand(this.editor, object, 'transparent', true, materialSlot));
			// Then set the opacity value
			this.editor.execute(new SetMaterialValueCommand(this.editor, object, property, value, materialSlot));
		} else {
			// Use editor command system for undo/redo
			this.editor.execute(new SetMaterialValueCommand(this.editor, object, property, value, materialSlot));
		}

		return object;
	}

	/**
	 * Parse a color string into a hex number
	 * @param {string} colorString - Color string (red, blue, #ff0000, etc.)
	 * @returns {number} Hex color value
	 */
	parseColorString(colorString) {
		const colorMap = {
			'red': 0xff0000,
			'green': 0x00ff00,
			'blue': 0x0000ff,
			'yellow': 0xffff00,
			'orange': 0xff8000,
			'purple': 0x8000ff,
			'pink': 0xff69b4,
			'white': 0xffffff,
			'black': 0x000000,
			'gray': 0x808080,
			'grey': 0x808080,
			'brown': 0x8b4513,
			'cyan': 0x00ffff,
			'magenta': 0xff00ff
		};

		// Check if it's a named color
		const lowerColor = colorString.toLowerCase();
		if (colorMap[lowerColor]) {
			return colorMap[lowerColor];
		}

		// Check if it's a hex color
		if (colorString.startsWith('#')) {
			return parseInt(colorString.slice(1), 16);
		}

		// Default to gray if can't parse
		return 0x808080;
	}

	/**
	 * Create a Three.js material based on type and properties
	 * @param {string} materialType - Type of material (standard, basic, phong, etc.)
	 * @param {Object} properties - Material properties
	 * @returns {THREE.Material} Created material
	 */
	createMaterial(materialType, properties = {}) {
		// Parse color if it's a string
		if (properties.color && typeof properties.color === 'string') {
			properties.color = this.parseColorString(properties.color);
		}

		const defaultProps = {
			color: 0x888888,
			...properties
		};

		switch (materialType.toLowerCase()) {
			case 'standard':
			case 'meshstandard':
				return new THREE.MeshStandardMaterial(defaultProps);

			case 'basic':
			case 'meshbasic':
				return new THREE.MeshBasicMaterial(defaultProps);

			case 'phong':
			case 'meshphong':
				return new THREE.MeshPhongMaterial(defaultProps);

			case 'lambert':
			case 'meshlambert':
				return new THREE.MeshLambertMaterial(defaultProps);

			case 'toon':
			case 'meshtoon':
				return new THREE.MeshToonMaterial(defaultProps);

			case 'normal':
			case 'meshnormal':
				return new THREE.MeshNormalMaterial(defaultProps);

			default:
				return new THREE.MeshStandardMaterial(defaultProps);
		}
	}
}

export { SceneCommandExecutor };