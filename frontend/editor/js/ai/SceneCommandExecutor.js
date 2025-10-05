import * as THREE from 'three';
import { AddObjectCommand } from '../commands/AddObjectCommand.js';
import { SetPositionCommand } from '../commands/SetPositionCommand.js';
import { SetRotationCommand } from '../commands/SetRotationCommand.js';
import { SetScaleCommand } from '../commands/SetScaleCommand.js';
import { RemoveObjectCommand } from '../commands/RemoveObjectCommand.js';
import { SetMaterialColorCommand } from '../commands/SetMaterialColorCommand.js';
import { SetMaterialCommand } from '../commands/SetMaterialCommand.js';
import { SetMaterialValueCommand } from '../commands/SetMaterialValueCommand.js';
import { AddInteractionNodeCommand } from '../commands/AddInteractionNodeCommand.js';

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

			case 'createSpinning':
				return this.createSpinning(command);

			case 'createPulsing':
				return this.createPulsing(command);

			case 'modifySpinning':
				return this.modifySpinning(command);

			case 'modifyPulsing':
				return this.modifyPulsing(command);

			case 'updateInteraction':
				return this.updateInteraction(command);

			case 'createInteraction':
				return this.createInteraction(command);

			case 'removeInteraction':
				return this.removeInteraction(command);

			case 'searchSketchfab':
				return this.searchSketchfab(command);

			case 'importSketchfabModel':
				return this.importSketchfabModel(command);

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
						const objType = this.getObjectType(child).toLowerCase();
						let matches = true;

						// Check color match (only if color is specified)
						if (targetColor && !objectName.includes(targetColor)) {
							matches = false;
						}

						// Check type match (only if type is specified)
						if (targetType && objType !== targetType) {
							matches = false;
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
					console.log(`Found ${matchingObjects.length} objects matching "${target}", using: ${matchingObjects[0].name} (type: ${this.getObjectType(matchingObjects[0])})`);
					return matchingObjects[0];
				} else {
					console.log(`No objects found matching color: ${targetColor}, type: ${targetType}`);
				}
			}

			// If we still haven't found anything, try a broader search for just the object type
			if (targetType) {
				console.log(`Doing broader search for object type: ${targetType}`);
				let typeMatchingObjects = [];
				this.editor.scene.traverse((child) => {
					if (child.isMesh && child !== this.editor.camera) {
						const objType = this.getObjectType(child).toLowerCase();
						if (objType === targetType) {
							typeMatchingObjects.push(child);
						}
					}
				});

				if (typeMatchingObjects.length > 0) {
					// Sort by most recent
					typeMatchingObjects.sort((a, b) => {
						if (a.name.startsWith('AI_') && !b.name.startsWith('AI_')) return -1;
						if (!a.name.startsWith('AI_') && b.name.startsWith('AI_')) return 1;
						return b.name.localeCompare(a.name);
					});
					console.log(`Found ${typeMatchingObjects.length} objects of type "${targetType}", using: ${typeMatchingObjects[0].name}`);
					return typeMatchingObjects[0];
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

		// Add interaction/animation context
		context.interactions = this.getInteractionContext();

		// Scene statistics
		context.sceneInfo = {
			objectCount: context.sceneObjects.length,
			hasSelection: context.selectedObjects.length > 0,
			activeAnimations: context.interactions.length
		};

		return context;
	}

	/**
	 * Get current interaction/animation context for AI awareness
	 * @returns {Array} Array of interaction descriptions
	 */
	getInteractionContext() {
		const interactions = [];
		const interactionGraph = this.getInteractionGraph();

		if (!interactionGraph || !interactionGraph.nodes) {
			return interactions;
		}

		// Iterate through all nodes in the interaction graph
		for (const [nodeId, node] of interactionGraph.nodes) {
			if (node.type === 'Spin' || node.type === 'Pulse' || node.type === 'Float' || node.type === 'Fade') {
				// Find connected object property nodes
				const connectedObjects = this.findConnectedObjects(node, interactionGraph);

				connectedObjects.forEach(objectInfo => {
					const interaction = {
						type: node.type.toLowerCase(),
						objectName: objectInfo.objectName,
						objectType: objectInfo.objectType,
						nodeId: nodeId,
						parameters: this.getNodeParameters(node)
					};

					interactions.push(interaction);
				});
			}
		}

		return interactions;
	}

	/**
	 * Find objects connected to an animation node
	 * @param {Object} animationNode - The animation node (Spin, Pulse, etc.)
	 * @param {Object} interactionGraph - The interaction graph
	 * @returns {Array} Array of connected object info
	 */
	findConnectedObjects(animationNode, interactionGraph) {
		const connectedObjects = [];

		// Find connections from animation node outputs
		for (const connection of interactionGraph.connections) {
			if (connection.fromNodeId === animationNode.id) {
				const toNode = interactionGraph.nodes.get(connection.toNodeId);
				if (toNode && toNode.type === 'ObjectProperty' && toNode.sceneObject) {
					connectedObjects.push({
						object: toNode.sceneObject, // Add the actual object reference
						objectName: toNode.sceneObject.name || 'Unnamed Object',
						objectType: this.getObjectType(toNode.sceneObject),
						propertyType: toNode.propertyType || 'unknown'
					});
				}
			}
		}

		return connectedObjects;
	}

	/**
	 * Get current parameter values from a node
	 * @param {Object} node - The node to get parameters from
	 * @returns {Object} Parameter values
	 */
	getNodeParameters(node) {
		const params = {};

		if (node.inputs) {
			node.inputs.forEach(input => {
				params[input.name] = node.getInputValue ? node.getInputValue(input.name) : input.value;
			});
		}

		return params;
	}

	/**
	 * Find existing animation nodes for a specific object
	 * @param {THREE.Object3D} object - The scene object
	 * @param {string} animationType - Type of animation ('spin', 'pulse', etc.)
	 * @returns {Array} Array of matching nodes
	 */
	findExistingAnimationNodes(object, animationType = null) {
		const matchingNodes = [];
		const interactionGraph = this.getInteractionGraph();

		if (!interactionGraph || !interactionGraph.nodes) {
			return matchingNodes;
		}

		for (const [nodeId, node] of interactionGraph.nodes) {
			// Check if this is an animation node of the right type
			const nodeType = node.type.toLowerCase();
			if (animationType && nodeType !== animationType) {
				continue;
			}

			if (nodeType === 'spin' || nodeType === 'pulse' || nodeType === 'float' || nodeType === 'fade') {
				// Check if this node is connected to the target object
				const connectedObjects = this.findConnectedObjects(node, interactionGraph);
				console.log(`Checking node ${node.type} for connections to target object:`, {
					nodeId: nodeId,
					connectedObjects: connectedObjects.map(obj => ({
						name: obj.objectName,
						type: obj.objectType,
						hasObjectRef: !!obj.object
					}))
				});

				const isConnectedToObject = connectedObjects.some(objInfo => {
					// More flexible object matching
					const targetName = object.name || object.type || 'Unnamed Object';
					const connectedName = objInfo.objectName;

					// Direct name match
					if (connectedName === targetName) return true;

					// Match by object reference/UUID if available
					if (objInfo.object && objInfo.object === object) return true;
					if (objInfo.object && objInfo.object.uuid && object.uuid && objInfo.object.uuid === object.uuid) return true;

					// Match by type (e.g., "cube" matches "Cube" or "BoxGeometry")
					const targetType = (object.type || '').toLowerCase();
					const connectedType = (connectedName || '').toLowerCase();
					if (targetType && (connectedType.includes(targetType) || targetType.includes(connectedType))) return true;

					return false;
				});

				if (isConnectedToObject) {
					matchingNodes.push({
						node: node,
						nodeId: nodeId,
						type: nodeType,
						parameters: this.getNodeParameters(node)
					});
				}
			}
		}

		return matchingNodes;
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
		const extendedColorMap = {
			// Basic colors
			'red': 0xff0000, 'green': 0x00ff00, 'blue': 0x0000ff,
			'yellow': 0xffff00, 'orange': 0xffa500, 'purple': 0x800080,
			'pink': 0xffc0cb, 'white': 0xffffff, 'black': 0x000000,
			'gray': 0x808080, 'grey': 0x808080, 'brown': 0xa52a2a,
			'cyan': 0x00ffff, 'magenta': 0xff00ff,

			// Extended CSS colors
			'maroon': 0x800000, 'darkred': 0x8b0000, 'crimson': 0xdc143c,
			'firebrick': 0xb22222, 'indianred': 0xcd5c5c, 'lightcoral': 0xf08080,
			'salmon': 0xfa8072, 'darksalmon': 0xe9967a, 'lightsalmon': 0xffa07a,
			'orangered': 0xff4500, 'tomato': 0xff6347, 'coral': 0xff7f50,
			'chocolate': 0xd2691e, 'sandybrown': 0xf4a460, 'darkorange': 0xff8c00,
			'gold': 0xffd700, 'khaki': 0xf0e68c, 'palegoldenrod': 0xeee8aa,
			'darkkhaki': 0xbdb76b, 'olive': 0x808000, 'darkolivegreen': 0x556b2f,
			'yellowgreen': 0x9acd32, 'limegreen': 0x32cd32, 'lime': 0x00ff00,
			'forestgreen': 0x228b22, 'darkgreen': 0x006400, 'mediumseagreen': 0x3cb371,
			'seagreen': 0x2e8b57, 'springgreen': 0x00ff7f, 'mediumspringgreen': 0x00fa9a,
			'aqua': 0x00ffff, 'lightcyan': 0xe0ffff, 'paleturquoise': 0xafeeee,
			'aquamarine': 0x7fffd4, 'turquoise': 0x40e0d0, 'mediumturquoise': 0x48d1cc,
			'darkturquoise': 0x00ced1, 'lightseagreen': 0x20b2aa, 'cadetblue': 0x5f9ea0,
			'darkcyan': 0x008b8b, 'teal': 0x008080, 'steelblue': 0x4682b4,
			'lightsteelblue': 0xb0c4de, 'lightblue': 0xadd8e6, 'powderblue': 0xb0e0e6,
			'skyblue': 0x87ceeb, 'lightskyblue': 0x87cefa, 'deepskyblue': 0x00bfff,
			'dodgerblue': 0x1e90ff, 'cornflowerblue': 0x6495ed, 'royalblue': 0x4169e1,
			'mediumblue': 0x0000cd, 'darkblue': 0x00008b, 'navy': 0x000080,
			'midnightblue': 0x191970, 'indigo': 0x4b0082, 'darkslateblue': 0x483d8b,
			'slateblue': 0x6a5acd, 'mediumslateblue': 0x7b68ee, 'mediumpurple': 0x9370db,
			'blueviolet': 0x8a2be2, 'darkviolet': 0x9400d3, 'darkorchid': 0x9932cc,
			'mediumorchid': 0xba55d3, 'thistle': 0xd8bfd8, 'plum': 0xdda0dd,
			'violet': 0xee82ee, 'fuchsia': 0xff00ff, 'darkmagenta': 0x8b008b,
			'mediumvioletred': 0xc71585, 'palevioletred': 0xdb7093, 'deeppink': 0xff1493,
			'hotpink': 0xff69b4, 'lightpink': 0xffb6c1,

			// Material colors
			'silver': 0xc0c0c0, 'copper': 0xb87333, 'bronze': 0xcd7f32,
			'brass': 0xb5a642, 'platinum': 0xe5e4e2, 'iron': 0x696969,
			'steel': 0x4682b4,

			// Natural colors
			'emerald': 0x50c878, 'jade': 0x00a86b, 'ruby': 0xe0115f,
			'sapphire': 0x0f52ba, 'amber': 0xffbf00, 'pearl': 0xf8f6ff
		};

		// Clean input string
		const cleanColor = colorString.toLowerCase().trim().replace(/\s+/g, '');

		// Check for exact match
		if (extendedColorMap[cleanColor]) {
			return extendedColorMap[cleanColor];
		}

		// Check for RGB format
		const rgbResult = this.parseRGBColor(colorString);
		if (rgbResult !== null) {
			return rgbResult;
		}

		// Check if it's a hex color
		if (colorString.startsWith('#')) {
			const hexValue = parseInt(colorString.slice(1), 16);
			if (!isNaN(hexValue)) {
				return hexValue;
			}
		}

		// Handle color modifiers (dark, light, pale)
		const modifierResult = this.parseColorWithModifier(cleanColor, extendedColorMap);
		if (modifierResult !== null) {
			return modifierResult;
		}

		// Smart color approximation using fuzzy matching
		return this.approximateColor(cleanColor, extendedColorMap);
	}

	/**
	 * Parse RGB color format
	 * @param {string} colorString - RGB color string like "rgb(255, 0, 0)"
	 * @returns {number|null} Hex color value or null if invalid
	 */
	parseRGBColor(colorString) {
		const rgbMatch = colorString.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
		if (rgbMatch) {
			const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1])));
			const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2])));
			const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3])));
			return (r << 16) | (g << 8) | b;
		}
		return null;
	}

	/**
	 * Parse color with modifiers like "dark blue", "light red", "pale green"
	 * @param {string} cleanColor - Clean color string
	 * @param {Object} colorMap - Color mapping object
	 * @returns {number|null} Modified hex color value or null
	 */
	parseColorWithModifier(cleanColor, colorMap) {
		// Define modifier patterns
		const modifiers = {
			'dark': { factor: 0.4 },
			'light': { factor: 1.6 },
			'pale': { factor: 1.3, saturation: 0.6 },
			'bright': { factor: 1.4 },
			'deep': { factor: 0.7 }
		};

		for (const [modifier, config] of Object.entries(modifiers)) {
			if (cleanColor.startsWith(modifier)) {
				const baseColor = cleanColor.substring(modifier.length);
				if (colorMap[baseColor]) {
					return this.modifyColor(colorMap[baseColor], config);
				}
			}
		}
		return null;
	}

	/**
	 * Modify a color based on factors
	 * @param {number} hexColor - Original hex color
	 * @param {Object} config - Modification config with factor and optional saturation
	 * @returns {number} Modified hex color
	 */
	modifyColor(hexColor, config) {
		const r = (hexColor >> 16) & 0xff;
		const g = (hexColor >> 8) & 0xff;
		const b = hexColor & 0xff;

		let newR = Math.min(255, Math.max(0, Math.round(r * config.factor)));
		let newG = Math.min(255, Math.max(0, Math.round(g * config.factor)));
		let newB = Math.min(255, Math.max(0, Math.round(b * config.factor)));

		// Apply saturation adjustment for pale colors
		if (config.saturation) {
			const gray = Math.round((newR + newG + newB) / 3);
			newR = Math.round(gray + (newR - gray) * config.saturation);
			newG = Math.round(gray + (newG - gray) * config.saturation);
			newB = Math.round(gray + (newB - gray) * config.saturation);
		}

		return (newR << 16) | (newG << 8) | newB;
	}

	/**
	 * Approximate closest color using fuzzy string matching
	 * @param {string} input - Input color string
	 * @param {Object} colorMap - Available colors
	 * @returns {number} Best matching color
	 */
	approximateColor(input, colorMap) {
		let bestMatch = null;
		let bestScore = -1;

		// Try substring matching first
		for (const [colorName, colorValue] of Object.entries(colorMap)) {
			if (colorName.includes(input) || input.includes(colorName)) {
				return colorValue;
			}
		}

		// Try Levenshtein distance matching
		for (const [colorName, colorValue] of Object.entries(colorMap)) {
			const score = this.calculateSimilarity(input, colorName);
			if (score > bestScore) {
				bestScore = score;
				bestMatch = colorValue;
			}
		}

		// Return best match or default to a reasonable color
		return bestMatch || 0x808080; // Default to gray if no good match
	}

	/**
	 * Calculate string similarity using simple character matching
	 * @param {string} str1 - First string
	 * @param {string} str2 - Second string
	 * @returns {number} Similarity score between 0 and 1
	 */
	calculateSimilarity(str1, str2) {
		const longer = str1.length > str2.length ? str1 : str2;
		const shorter = str1.length > str2.length ? str2 : str1;

		if (longer.length === 0) return 1.0;

		let matches = 0;
		for (let i = 0; i < shorter.length; i++) {
			if (longer.includes(shorter[i])) {
				matches++;
			}
		}

		return matches / longer.length;
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

	// ==================== INTERACTION EDITOR COMMANDS ====================

	/**
	 * Create a spinning animation for an object
	 * @param {Object} command - Create spinning command
	 */
	async createSpinning(command) {
		const { target = 'selected', speed = 60, axis = 'y', clockwise = true } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Get the interaction graph
		const interactionGraph = this.getInteractionGraph();
		if (!interactionGraph) {
			throw new Error('Interaction editor not available');
		}

		console.log('Creating spinning animation for object:', object.name || object.type);

		try {
			// Create SpinNode
			const { SpinNode } = await import('../interaction-editor/nodes/SpinNode.js');
			const position = interactionGraph.findSmartPosition({ type: 'Spin' });
			const spinNode = new SpinNode(position.x, position.y);

			// Set spin parameters
			spinNode.setInputValue('speed', speed);
			spinNode.setInputValue('clockwise', clockwise);

			console.log('Adding SpinNode with command system');
			// Add SpinNode using command system
			const addSpinCommand = new AddInteractionNodeCommand(this.editor, spinNode);
			this.editor.execute(addSpinCommand);

			console.log('Finding or creating rotation property node');
			// Create or find ObjectRotationNode for the target object
			const rotationNode = await this.findOrCreatePropertyNode(object, 'rotation');

			if (!rotationNode) {
				throw new Error('Failed to create rotation property node');
			}

			console.log('Creating connection from SpinNode to RotationNode');
			// Use direct connection method instead of commands to avoid potential issues
			try {
				const interactionGraph = this.getInteractionGraph();
				if (interactionGraph) {
					const connection = interactionGraph.addConnection(
						spinNode.id, 0, // SpinNode rotation output (index 0)
						rotationNode.id, this.getAxisInputIndex(axis) // ObjectRotationNode axis input
					);
					console.log('Spinning connection created:', connection);
				}
			} catch (connectionError) {
				console.error('Error creating spinning connection:', connectionError);
				// Don't throw - the nodes are created, just connections failed
			}

			console.log('Spinning animation created successfully');
			return {
				spinNode,
				rotationNode,
				object,
				message: `Created spinning animation for ${object.name || 'object'}`
			};

		} catch (error) {
			console.error('Error creating spinning animation:', error);
			throw new Error(`Failed to create spinning animation: ${error.message}`);
		}
	}

	/**
	 * Create a pulsing animation for an object
	 * @param {Object} command - Create pulsing command
	 */
	async createPulsing(command) {
		const { target = 'selected', speed = 1, intensity = 0.5 } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Get the interaction graph
		const interactionGraph = this.getInteractionGraph();
		if (!interactionGraph) {
			throw new Error('Interaction editor not available');
		}

		console.log('Creating pulsing animation for object:', object.name || object.type);

		try {
			// Create PulseNode
			const { PulseNode } = await import('../interaction-editor/nodes/PulseNode.js');
			const position = interactionGraph.findSmartPosition({ type: 'Pulse' });
			const pulseNode = new PulseNode(position.x, position.y);

			// Set pulse parameters
			pulseNode.setInputValue('frequency', speed);
			pulseNode.setInputValue('amplitude', intensity);

			console.log('Adding PulseNode with command system');
			// Add PulseNode using command system
			const addPulseCommand = new AddInteractionNodeCommand(this.editor, pulseNode);
			this.editor.execute(addPulseCommand);

			console.log('Finding or creating scale property node');
			// Create or find ObjectScaleNode for the target object
			const scaleNode = await this.findOrCreatePropertyNode(object, 'scale');

			if (!scaleNode) {
				throw new Error('Failed to create scale property node');
			}

			console.log('Creating connections from PulseNode to ScaleNode');
			// Connect PulseNode output to ObjectScaleNode inputs (uniform scaling)
			const connections = [];

			// Use direct connection method instead of commands to avoid potential issues
			try {
				const interactionGraph = this.getInteractionGraph();
				if (interactionGraph) {
					// Connect to X, Y, Z scale inputs
					for (let i = 0; i < 3; i++) {
						console.log(`Connecting PulseNode output to ScaleNode input ${i}`);
						const connection = interactionGraph.addConnection(
							pulseNode.id, 0, // PulseNode output (index 0)
							scaleNode.id, i // ObjectScaleNode x/y/z input
						);
						if (connection) {
							connections.push(connection);
						}
					}
				}
			} catch (connectionError) {
				console.error('Error creating connections:', connectionError);
				// Don't throw - the nodes are created, just connections failed
			}

			console.log('Pulsing animation created successfully');
			return {
				pulseNode,
				scaleNode,
				object,
				connections,
				message: `Created pulsing animation for ${object.name || 'object'}`
			};

		} catch (error) {
			console.error('Error creating pulsing animation:', error);
			throw new Error(`Failed to create pulsing animation: ${error.message}`);
		}
	}

	/**
	 * General interaction creation method
	 * @param {Object} command - Create interaction command
	 */
	async createInteraction(command) {
		const { type, target, ...params } = command;

		switch (type) {
			case 'spinning':
			case 'spin':
				return this.createSpinning({ target, ...params });
			case 'pulsing':
			case 'pulse':
				return this.createPulsing({ target, ...params });
			default:
				throw new Error(`Unknown interaction type: ${type}`);
		}
	}

	/**
	 * Remove interaction from an object
	 * @param {Object} command - Remove interaction command
	 */
	async removeInteraction(command) {
		const { target = 'selected', type = 'all' } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		const interactionGraph = this.getInteractionGraph();
		if (!interactionGraph) {
			throw new Error('Interaction editor not available');
		}

		// Find nodes connected to this object
		const connectedNodes = [];
		for (const [nodeId, node] of interactionGraph.nodes) {
			if (node.sceneObject === object) {
				// Find nodes connected to this property node
				for (const connection of interactionGraph.connections) {
					if (connection.toNodeId === nodeId) {
						const fromNode = interactionGraph.nodes.get(connection.fromNodeId);
						if (fromNode && (type === 'all' || this.nodeMatchesType(fromNode, type))) {
							connectedNodes.push(fromNode);
						}
					}
				}
			}
		}

		// Remove the connected nodes (this will automatically remove connections)
		for (const node of connectedNodes) {
			interactionGraph.removeNode(node.id);
		}

		return {
			removedNodes: connectedNodes,
			object,
			message: `Removed ${connectedNodes.length} interaction(s) from ${object.name || 'object'}`
		};
	}

	// ==================== HELPER METHODS ====================

	/**
	 * Get the interaction graph from the editor
	 * @returns {InteractionGraph|null}
	 */
	getInteractionGraph() {
		if (this.editor &&
			this.editor.interactionEditor &&
			this.editor.interactionEditor.interactionEditor &&
			this.editor.interactionEditor.interactionEditor.interactionGraph) {
			return this.editor.interactionEditor.interactionEditor.interactionGraph;
		}
		return null;
	}

	/**
	 * Refresh the interaction editor UI to show updated node values
	 */
	refreshInteractionUI() {
		if (this.editor &&
			this.editor.interactionEditor &&
			this.editor.interactionEditor.interactionEditor &&
			this.editor.interactionEditor.interactionEditor.canvas) {
			this.editor.interactionEditor.interactionEditor.canvas.render();
			console.log('Refreshed interaction editor UI');
		}
	}

	/**
	 * Modify existing spinning animation parameters
	 * @param {Object} command - Modify spinning command
	 */
	async modifySpinning(command) {
		const { target = 'selected', speed, axis, clockwise } = command;
		const object = this.findObject(target);
		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Find existing spin nodes for this object
		const existingNodes = this.findExistingAnimationNodes(object, 'spin');
		console.log(`Looking for spin nodes for object:`, {
			name: object.name,
			type: object.type,
			uuid: object.uuid,
			foundNodes: existingNodes.length
		});

		if (existingNodes.length === 0) {
			// Show debug info about what nodes exist
			const allAnimationNodes = this.findExistingAnimationNodes(object);
			console.log('All animation nodes for this object:', allAnimationNodes);
			throw new Error(`No spinning animation found for ${object.name || object.type}. Create one first.`);
		}

		// Modify the first (most recent) spin node
		const { node } = existingNodes[0];
		console.log('Modifying existing SpinNode parameters for:', object.name || object.type);

		// Update parameters if specified
		if (speed !== undefined) {
			node.setInputValue('speed', speed);
			console.log(`Updated spin speed to: ${speed}`);
		}
		if (clockwise !== undefined) {
			node.setInputValue('clockwise', clockwise);
			console.log(`Updated spin direction to: ${clockwise ? 'clockwise' : 'counterclockwise'}`);
		}

		// Refresh the UI to show updated values
		this.refreshInteractionUI();

		return { success: true, modified: 'spinning', object: object.name || object.type };
	}

	/**
	 * Modify existing pulsing animation parameters
	 * @param {Object} command - Modify pulsing command
	 */
	async modifyPulsing(command) {
		const { target = 'selected', speed, intensity } = command;
		const object = this.findObject(target);
		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Find existing pulse nodes for this object
		const existingNodes = this.findExistingAnimationNodes(object, 'pulse');
		if (existingNodes.length === 0) {
			throw new Error(`No pulsing animation found for ${object.name || object.type}. Create one first.`);
		}

		// Modify the first (most recent) pulse node
		const { node } = existingNodes[0];
		console.log('Modifying existing PulseNode parameters for:', object.name || object.type);

		// Update parameters if specified
		if (speed !== undefined) {
			node.setInputValue('frequency', speed);
			console.log(`Updated pulse speed to: ${speed}`);
		}
		if (intensity !== undefined) {
			node.setInputValue('amplitude', intensity);
			console.log(`Updated pulse intensity to: ${intensity}`);
		}

		// Refresh the UI to show updated values
		this.refreshInteractionUI();

		return { success: true, modified: 'pulsing', object: object.name || object.type };
	}

	/**
	 * Generic method to update any interaction parameters
	 * @param {Object} command - Update interaction command
	 */
	async updateInteraction(command) {
		const { target = 'selected', type, parameters } = command;

		switch (type) {
			case 'spin':
			case 'spinning':
				return this.modifySpinning({ target, ...parameters });
			case 'pulse':
			case 'pulsing':
				return this.modifyPulsing({ target, ...parameters });
			default:
				throw new Error(`Unknown interaction type: ${type}`);
		}
	}

	/**
	 * Find or create a property node for an object
	 * @param {THREE.Object3D} object - Target object
	 * @param {string} propertyType - Property type (position, rotation, scale)
	 * @returns {Promise<PatchNode>} Property node
	 */
	async findOrCreatePropertyNode(object, propertyType) {
		const interactionGraph = this.getInteractionGraph();
		if (!interactionGraph) {
			throw new Error('Interaction graph not available');
		}

		// Check if property node already exists
		const existingNode = Array.from(interactionGraph.nodes.values()).find(node =>
			node.sceneObject === object &&
			node.type === 'ObjectProperty' &&
			node.propertyType === propertyType
		);

		if (existingNode) {
			return existingNode;
		}

		// Create new property node
		const nodePromise = interactionGraph.createPropertyPatch(object, propertyType);
		const node = await nodePromise;

		if (!node) {
			throw new Error(`Failed to create ${propertyType} property node`);
		}

		return node;
	}

	/**
	 * Create a connection command between two nodes
	 * @param {string} fromNodeId - Source node ID
	 * @param {number} fromOutputIndex - Source output index
	 * @param {string} toNodeId - Target node ID
	 * @param {number} toInputIndex - Target input index
	 * @returns {Promise<Command>} Connection command
	 */
	async createConnectionCommand(fromNodeId, fromOutputIndex, toNodeId, toInputIndex) {
		// Import connection command dynamically
		try {
			const { AddInteractionConnectionCommand } = await import('../commands/AddInteractionConnectionCommand.js');
			return new AddInteractionConnectionCommand(
				this.editor,
				fromNodeId,
				fromOutputIndex,
				toNodeId,
				toInputIndex
			);
		} catch (error) {
			console.warn('AddInteractionConnectionCommand not found, using direct method');
			// Fallback to direct connection if command not available
			const interactionGraph = this.getInteractionGraph();
			if (interactionGraph) {
				interactionGraph.addConnection(fromNodeId, fromOutputIndex, toNodeId, toInputIndex);
			}
			return null;
		}
	}

	/**
	 * Get the input index for a rotation axis
	 * @param {string} axis - Rotation axis (x, y, z)
	 * @returns {number} Input index
	 */
	getAxisInputIndex(axis) {
		switch (axis.toLowerCase()) {
			case 'x': return 0;
			case 'y': return 1;
			case 'z': return 2;
			default: return 1; // Default to Y axis
		}
	}

	/**
	 * Check if a node matches a specific interaction type
	 * @param {PatchNode} node - Node to check
	 * @param {string} type - Interaction type
	 * @returns {boolean} Whether node matches type
	 */
	nodeMatchesType(node, type) {
		const nodeType = node.constructor.name.toLowerCase();
		const targetType = type.toLowerCase();

		if (targetType === 'spin' || targetType === 'spinning') {
			return nodeType.includes('spin');
		}
		if (targetType === 'pulse' || targetType === 'pulsing') {
			return nodeType.includes('pulse');
		}
		if (targetType === 'all') {
			return true;
		}

		return nodeType.includes(targetType);
	}

	/**
	 * Search Sketchfab for 3D models
	 * @param {Object} command - Search command with query
	 * @returns {Promise<Object>} Search results with models
	 */
	async searchSketchfab(command) {
		const { query, count = 3 } = command;

		try {
			const response = await fetch('http://localhost:3001/api/v1/sketchfab/search', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query, count })
			});

			if (!response.ok) {
				throw new Error(`Sketchfab search failed: ${response.status}`);
			}

			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Search failed');
			}

			// Return models data - this will be used by the UI to render cards
			return {
				models: data.data.models,
				query: data.data.query
			};

		} catch (error) {
			console.error('Sketchfab search error:', error);
			throw new Error(`Failed to search Sketchfab: ${error.message}`);
		}
	}

	/**
	 * Import a Sketchfab model into the scene
	 * @param {Object} command - Import command with model details
	 * @returns {Promise<Object>} Imported model
	 */
	async importSketchfabModel(command) {
		const { uid, name, viewerUrl } = command;

		console.log('Importing Sketchfab model:', { uid, name, viewerUrl });

		try {
			// Lazy load Sketchfab modules
			const { SketchfabAPI } = await import('../sketchfab/SketchfabAPI.js');
			const { SketchfabLoader } = await import('../sketchfab/SketchfabLoader.js');

			// Initialize API and loader
			const api = new SketchfabAPI();
			const loader = new SketchfabLoader(this.editor);

			// Check if user is authenticated
			if (!api.isAuthenticated) {
				throw new Error('Please authenticate with Sketchfab first. Click the Sketchfab icon in the toolbar to login.');
			}

			// Get full model details and download link
			const modelData = await api.getModel(uid);
			const downloadData = await api.requestDownload(uid);

			// Use the existing loader to download and import the model
			await loader.loadModel(downloadData, modelData);

			return {
				success: true,
				message: `Successfully imported "${name}" from Sketchfab`
			};

		} catch (error) {
			console.error('Failed to import Sketchfab model:', error);
			throw new Error(`Failed to import model: ${error.message}`);
		}
	}
}

export { SceneCommandExecutor };