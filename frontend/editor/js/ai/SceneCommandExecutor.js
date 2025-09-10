import * as THREE from 'three';
import { AddObjectCommand } from '../commands/AddObjectCommand.js';
import { SetPositionCommand } from '../commands/SetPositionCommand.js';
import { SetRotationCommand } from '../commands/SetRotationCommand.js';
import { SetScaleCommand } from '../commands/SetScaleCommand.js';
import { RemoveObjectCommand } from '../commands/RemoveObjectCommand.js';

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
				geometry = new THREE.BoxGeometry(1, 1, 1);
				break;
			case 'sphere':
				geometry = new THREE.SphereGeometry(0.5, 32, 16);
				break;
			case 'plane':
				geometry = new THREE.PlaneGeometry(5, 5);
				break;
			case 'cylinder':
				geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
				break;
			default:
				throw new Error(`Unknown object type: ${type}`);
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
	 * Move an object in the scene
	 * @param {Object} command - Move object command
	 */
	moveObject(command) {
		const { target, position } = command;
		const object = this.findObject(target);

		if (!object) {
			throw new Error(`Object not found: ${target}`);
		}

		// Use editor command system for undo/redo
		this.editor.execute(new SetPositionCommand(this.editor, object, ...position));

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

		// Use editor command system for undo/redo
		this.editor.execute(new SetRotationCommand(this.editor, object, ...rotation));

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
			throw new Error(`Object not found: ${target}`);
		}

		// Use editor command system for undo/redo
		this.editor.execute(new SetScaleCommand(this.editor, object, ...scale));

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
			return this.editor.selected;
		}

		if (typeof target === 'string') {
			// Search by name first
			let object = this.editor.scene.getObjectByName(target);
			if (object) return object;

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
			context.selectedObjects.push({
				name: this.editor.selected.name,
				type: this.getObjectType(this.editor.selected),
				position: this.editor.selected.position.toArray(),
				uuid: this.editor.selected.uuid
			});
		}

		// Get all scene objects info
		this.editor.scene.traverse((child) => {
			if (child.isMesh && child !== this.editor.camera) {
				context.sceneObjects.push({
					name: child.name,
					type: this.getObjectType(child),
					position: child.position.toArray(),
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
		if (!object.geometry) return 'unknown';

		if (object.geometry.type === 'BoxGeometry') return 'cube';
		if (object.geometry.type === 'SphereGeometry') return 'sphere';
		if (object.geometry.type === 'PlaneGeometry') return 'plane';
		if (object.geometry.type === 'CylinderGeometry') return 'cylinder';
		
		return 'object';
	}
}

export { SceneCommandExecutor };