import * as THREE from 'three';

/**
 * SurfacePlacementMode - Allows placing objects on surfaces with visual preview
 * Clones the object and shows a wireframe preview of placement
 */
class SurfacePlacementMode {

	constructor( editor ) {

		this.editor = editor;
		this.isActive = false;
		this.selectedObject = null;
		this.ghostHelper = null;
		this.lastIntersect = null;

		// Raycaster for finding surfaces
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

	}

	activate( object ) {

		if ( ! object ) return;

		this.isActive = true;
		this.selectedObject = object;
		this.createGhostHelper();

		// Change cursor to crosshair
		this.editor.container.dom.style.cursor = 'crosshair';

	}

	deactivate() {

		this.isActive = false;
		this.selectedObject = null;
		this.lastIntersect = null;

		// Remove ghost helper
		if ( this.ghostHelper ) {

			this.editor.sceneHelpers.remove( this.ghostHelper );

			// Dispose of all geometries and materials in the cloned object
			this.ghostHelper.traverse( function ( child ) {

				if ( child.geometry ) child.geometry.dispose();
				if ( child.material ) child.material.dispose();

			} );

			this.ghostHelper = null;

		}

		// Reset cursor
		this.editor.container.dom.style.cursor = '';

	}

	createGhostHelper() {

		if ( ! this.selectedObject ) return;

		// Clone the actual object to create an accurate preview
		this.ghostHelper = this.selectedObject.clone();

		// Apply wireframe material to all meshes in the cloned object
		this.ghostHelper.traverse( function ( child ) {

			if ( child.isMesh ) {

				// Replace material with green wireframe
				child.material = new THREE.MeshBasicMaterial( {
					color: 0x00ff00,
					wireframe: true,
					transparent: true,
					opacity: 0.6,
					depthTest: false // Always visible through other objects
				} );

			}

		} );

		this.ghostHelper.visible = false; // Hidden until we find a surface

		this.editor.sceneHelpers.add( this.ghostHelper );

	}

	onMouseMove( mousePosition, camera ) {

		if ( ! this.isActive || ! this.ghostHelper ) return;

		// Update raycaster
		this.mouse.copy( mousePosition );
		this.mouse.x = ( this.mouse.x * 2 ) - 1;
		this.mouse.y = - ( this.mouse.y * 2 ) + 1;

		this.raycaster.setFromCamera( this.mouse, camera );

		// Get objects to raycast against (exclude selected object and helpers)
		const objects = [];
		this.editor.scene.traverseVisible( function ( child ) {

			if ( child.isMesh && child !== this.selectedObject ) {

				objects.push( child );

			}

		}.bind( this ) );

		// Perform raycast
		const intersects = this.raycaster.intersectObjects( objects, false );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];
			this.lastIntersect = intersect;

			// Show ghost helper
			this.ghostHelper.visible = true;

			// Update ghost position and rotation
			this.updateGhostPosition( intersect );

		} else {

			// Hide ghost when no surface found
			this.ghostHelper.visible = false;
			this.lastIntersect = null;

		}

	}

	updateGhostPosition( intersect ) {

		if ( ! this.ghostHelper ) return;

		// Get surface normal (direction pointing away from surface)
		const normal = intersect.face.normal.clone();
		normal.transformDirection( intersect.object.matrixWorld );

		// Position at intersection point with slight offset along normal
		this.ghostHelper.position.copy( intersect.point );
		this.ghostHelper.position.add( normal.multiplyScalar( 0.01 ) ); // Prevent z-fighting

		// Reset rotation to identity before applying lookAt
		// Otherwise rotation accumulates on each mouse move
		this.ghostHelper.rotation.set( 0, 0, 0 );
		this.ghostHelper.quaternion.set( 0, 0, 0, 1 );

		// Use lookAt to align object with surface normal
		const lookAtPoint = new THREE.Vector3().addVectors( this.ghostHelper.position, normal );
		const worldUp = new THREE.Vector3( 0, 1, 0 );
		this.ghostHelper.up.copy( worldUp );
		this.ghostHelper.lookAt( lookAtPoint );

		// Rotate 180° around X-axis to flip object so back face is against surface
		this.ghostHelper.rotateX( Math.PI );

	}

	onClick() {

		if ( ! this.isActive || ! this.lastIntersect || ! this.ghostHelper.visible ) {

			return false; // No valid placement position

		}

		// Place object at ghost position
		this.placeObject();

		return true; // Successfully placed

	}

	placeObject() {

		if ( ! this.selectedObject || ! this.ghostHelper ) return;

		// Store old transform for undo
		const oldPosition = this.selectedObject.position.clone();
		const oldRotation = this.selectedObject.rotation.clone();

		// Copy transform from ghost to actual object
		this.selectedObject.position.copy( this.ghostHelper.position );
		this.selectedObject.quaternion.copy( this.ghostHelper.quaternion );
		this.selectedObject.updateMatrixWorld( true );

		// Create undo command
		const PlaceOnSurfaceCommand = this.editor.PlaceOnSurfaceCommand;
		if ( PlaceOnSurfaceCommand ) {

			const command = new PlaceOnSurfaceCommand(
				this.editor,
				this.selectedObject,
				this.selectedObject.position.clone(),
				this.selectedObject.rotation.clone(),
				oldPosition,
				oldRotation
			);
			this.editor.execute( command );

		} else {

			// Fallback: Just dispatch change signal
			this.editor.signals.objectChanged.dispatch( this.selectedObject );

		}

	}

}

export { SurfacePlacementMode };
