
import * as THREE from 'three';

import { Editor } from './js/Editor.js';
import { Viewport } from './js/Viewport.js';
import { Toolbar } from './js/Toolbar.js';
import { Script } from './js/Script.js';
import { Player } from './js/Player.js';
import { Sidebar } from './js/Sidebar.js';
import { Menubar } from './js/Menubar.js';
import { Resizer } from './js/Resizer.js';
import { InteractionEditorWindow } from './js/PatchEditorWindow.jsx';

window.URL = window.URL || window.webkitURL;
window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;

//

const editor = new Editor();

window.editor = editor; // Expose editor to Console - Vite setup complete!
window.THREE = THREE; // Expose THREE to APP Scripts and Console

// Create main container wrapper
const editorContainer = document.createElement( 'div' );
editorContainer.className = 'editor-container';
document.body.appendChild( editorContainer );

// Create menubar (spans full width at top)
const menubar = new Menubar( editor );
editorContainer.appendChild( menubar.dom );

// Create main content wrapper for flex layout
const mainContent = document.createElement( 'div' );
mainContent.className = 'main-content';
editorContainer.appendChild( mainContent );

// Create left container for Scene + Interaction Editor (vertical split)
const leftContainer = document.createElement( 'div' );
leftContainer.className = 'left-container';
leftContainer.style.cssText = `
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 400px;
`;

// Create viewport with container wrapper (takes full width of left container)
const viewportWrapper = document.createElement( 'div' );
viewportWrapper.className = 'viewport-wrapper panel-container';
viewportWrapper.style.cssText = `
	flex: none;
	height: calc(100% - 100px);
	display: flex;
	flex-direction: column;
	min-height: 200px;
`;
const viewport = new Viewport( editor );
viewportWrapper.appendChild( viewport.dom );

// Add toolbar inside viewport wrapper
const toolbar = new Toolbar( editor );
viewportWrapper.appendChild( toolbar.dom );

leftContainer.appendChild( viewportWrapper );

// Create vertical resizer handle (between scene and interaction editor)
const verticalResizerHandle = document.createElement( 'div' );
verticalResizerHandle.className = 'vertical-panel-resizer';
verticalResizerHandle.style.cssText = `
	height: 8px;
	width: 100%;
	cursor: ns-resize;
	background-color: transparent;
	display: block;
	user-select: none;
	-webkit-user-select: none;
`;
leftContainer.appendChild( verticalResizerHandle );

mainContent.appendChild( leftContainer );

// Create horizontal resizer handle (between left container and sidebar)
const horizontalResizerHandle = document.createElement( 'div' );
horizontalResizerHandle.className = 'horizontal-panel-resizer';
horizontalResizerHandle.style.cssText = `
	width: 8px;
	height: 100%;
	cursor: col-resize;
	background-color: transparent;
	user-select: none;
	-webkit-user-select: none;
`;
mainContent.appendChild( horizontalResizerHandle );

// Create sidebar with container wrapper
const sidebarWrapper = document.createElement( 'div' );
sidebarWrapper.className = 'sidebar-wrapper panel-container';
sidebarWrapper.style.width = '350px';
const sidebar = new Sidebar( editor );
sidebarWrapper.appendChild( sidebar.dom );
mainContent.appendChild( sidebarWrapper );

// Add resize functionality for horizontal resizer (left container <-> sidebar)
let isResizingHorizontal = false;
let isResizingVertical = false;
let startX = 0;
let startY = 0;
let startWidth = 0;
let startHeight = 0;

function handleHorizontalPointerMove( event ) {
	if ( !isResizingHorizontal || event.isPrimary === false ) return;

	const deltaX = startX - event.clientX;
	const newWidth = Math.min( Math.max( startWidth + deltaX, 250 ), 600 );
	sidebarWrapper.style.width = newWidth + 'px';

	editor.signals.windowResize.dispatch();
	event.preventDefault();
}

function handleHorizontalPointerUp( event ) {
	if ( !isResizingHorizontal || event.isPrimary === false ) return;

	isResizingHorizontal = false;
	document.body.style.cursor = '';

	document.removeEventListener( 'pointermove', handleHorizontalPointerMove );
	document.removeEventListener( 'pointerup', handleHorizontalPointerUp );

	event.preventDefault();
}

horizontalResizerHandle.addEventListener( 'pointerdown', function( event ) {
	if ( event.isPrimary === false ) return;
	isResizingHorizontal = true;
	startX = event.clientX;
	startWidth = sidebarWrapper.offsetWidth;
	document.body.style.cursor = 'col-resize';

	document.addEventListener( 'pointermove', handleHorizontalPointerMove );
	document.addEventListener( 'pointerup', handleHorizontalPointerUp );

	event.preventDefault();
});

// Add resize functionality for vertical resizer (scene <-> interaction editor)
function handleVerticalPointerMove( event ) {
	if ( !isResizingVertical || event.isPrimary === false ) return;

	const deltaY = event.clientY - startY;
	const newHeight = Math.min( Math.max( startHeight + deltaY, 200 ), 800 );
	viewportWrapper.style.height = newHeight + 'px';
	viewportWrapper.style.flex = 'none'; // Override flex when manually resized

	// Trigger interaction editor canvas resize if visible
	if ( window.interactionEditor && window.interactionEditor.isOpen() ) {
		if ( window.interactionEditor.interactionEditor && window.interactionEditor.interactionEditor.resize ) {
			setTimeout(() => {
				window.interactionEditor.interactionEditor.resize();
				// Also trigger a render to redraw the patches
				if ( window.interactionEditor.interactionEditor.canvas && window.interactionEditor.interactionEditor.canvas.render ) {
					window.interactionEditor.interactionEditor.canvas.render();
				}
			}, 10);
		}
	}

	editor.signals.windowResize.dispatch();
	event.preventDefault();
}

function handleVerticalPointerUp( event ) {
	if ( !isResizingVertical || event.isPrimary === false ) return;

	isResizingVertical = false;
	document.body.style.cursor = '';

	document.removeEventListener( 'pointermove', handleVerticalPointerMove );
	document.removeEventListener( 'pointerup', handleVerticalPointerUp );

	event.preventDefault();
}

verticalResizerHandle.addEventListener( 'pointerdown', function( event ) {
	if ( event.isPrimary === false ) return;
	isResizingVertical = true;
	startY = event.clientY;
	startHeight = viewportWrapper.offsetHeight;
	document.body.style.cursor = 'ns-resize';

	document.addEventListener( 'pointermove', handleVerticalPointerMove );
	document.addEventListener( 'pointerup', handleVerticalPointerUp );

	event.preventDefault();
});

// Hidden panels
const script = new Script( editor );
document.body.appendChild( script.dom );

const player = new Player( editor );
document.body.appendChild( player.dom );

const resizer = new Resizer( editor );
document.body.appendChild( resizer.dom );


// Interaction Editor Window integrated into modular layout
const interactionEditor = new InteractionEditorWindow( editor );
leftContainer.appendChild( interactionEditor.getContainer() );

// Expose interaction editor globally for menu access
window.interactionEditor = interactionEditor;

// Prevent Chrome swipe navigation with proper passive: false handling
leftContainer.addEventListener('wheel', (e) => {
	// Only prevent default for horizontal scroll events that could trigger navigation
	if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
		e.preventDefault();
	}
}, { passive: false });


//

editor.storage.init( function () {

	editor.storage.get( async function ( state ) {

if ( isLoadingFromHash ) return;

if ( state !== undefined ) {

	await editor.fromJSON( state );

}

const selected = editor.config.getKey( 'selected' );

if ( selected !== undefined ) {

	editor.selectByUuid( selected );

}

	} );

	//

	let timeout;

	function saveState() {

if ( editor.config.getKey( 'autosave' ) === false ) {

	return;

}

clearTimeout( timeout );

timeout = setTimeout( function () {

	editor.signals.savingStarted.dispatch();

	timeout = setTimeout( function () {

		editor.storage.set( editor.toJSON() );

		editor.signals.savingFinished.dispatch();

	}, 100 );

}, 1000 );

	}

	const signals = editor.signals;

	signals.geometryChanged.add( saveState );
	signals.objectAdded.add( saveState );
	signals.objectChanged.add( saveState );
	signals.objectRemoved.add( saveState );
	signals.materialChanged.add( saveState );
	signals.sceneBackgroundChanged.add( saveState );
	signals.sceneEnvironmentChanged.add( saveState );
	signals.sceneFogChanged.add( saveState );
	signals.sceneGraphChanged.add( saveState );
	signals.scriptChanged.add( saveState );
	signals.historyChanged.add( saveState );

} );

//

document.addEventListener( 'dragover', function ( event ) {

	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';

} );

document.addEventListener( 'drop', function ( event ) {

	event.preventDefault();

	if ( event.dataTransfer.types[ 0 ] === 'text/plain' ) return; // Outliner drop

	if ( event.dataTransfer.items ) {

// DataTransferItemList supports folders

editor.loader.loadItemList( event.dataTransfer.items );

	} else {

editor.loader.loadFiles( event.dataTransfer.files );

	}

} );

function onWindowResize() {

	editor.signals.windowResize.dispatch();

}

window.addEventListener( 'resize', onWindowResize );

onWindowResize();

//

let isLoadingFromHash = false;
const hash = window.location.hash;

if ( hash.slice( 1, 6 ) === 'file=' ) {

	const file = hash.slice( 6 );

	if ( confirm( editor.strings.getKey( 'prompt/file/open' ) ) ) {

const loader = new THREE.FileLoader();
loader.crossOrigin = '';
loader.load( file, function ( text ) {

	editor.clear();
	editor.fromJSON( JSON.parse( text ) );

} );

isLoadingFromHash = true;

	}

}

// ServiceWorker - disabled for now due to CDN migration

// if ( 'serviceWorker' in navigator ) {

// 	try {

// 		navigator.serviceWorker.register( 'sw.js' );

// 	} catch ( error ) {

// 	}

// }

