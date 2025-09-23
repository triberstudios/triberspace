
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

// Create viewport with container wrapper
const viewportWrapper = document.createElement( 'div' );
viewportWrapper.className = 'viewport-wrapper panel-container';
viewportWrapper.style.flex = '1';
const viewport = new Viewport( editor );
viewportWrapper.appendChild( viewport.dom );

// Add toolbar inside viewport wrapper
const toolbar = new Toolbar( editor );
viewportWrapper.appendChild( toolbar.dom );

mainContent.appendChild( viewportWrapper );

// Create resizer handle
const resizerHandle = document.createElement( 'div' );
resizerHandle.className = 'panel-resizer';
mainContent.appendChild( resizerHandle );

// Create sidebar with container wrapper
const sidebarWrapper = document.createElement( 'div' );
sidebarWrapper.className = 'sidebar-wrapper panel-container';
sidebarWrapper.style.width = '350px';
const sidebar = new Sidebar( editor );
sidebarWrapper.appendChild( sidebar.dom );
mainContent.appendChild( sidebarWrapper );

// Add resize functionality
let isResizing = false;
let startX = 0;
let startWidth = 0;

function handlePointerMove( event ) {
	if ( !isResizing || event.isPrimary === false ) return;
	
	const deltaX = startX - event.clientX;
	const newWidth = Math.min( Math.max( startWidth + deltaX, 250 ), 600 );
	sidebarWrapper.style.width = newWidth + 'px';
	
	editor.signals.windowResize.dispatch();
	event.preventDefault();
}

function handlePointerUp( event ) {
	if ( !isResizing || event.isPrimary === false ) return;
	
	isResizing = false;
	document.body.style.cursor = '';
	
	// Remove the event listeners when done resizing
	document.removeEventListener( 'pointermove', handlePointerMove );
	document.removeEventListener( 'pointerup', handlePointerUp );
	
	event.preventDefault();
}

resizerHandle.addEventListener( 'pointerdown', function( event ) {
	if ( event.isPrimary === false ) return;
	isResizing = true;
	startX = event.clientX;
	startWidth = sidebarWrapper.offsetWidth;
	document.body.style.cursor = 'col-resize';
	
	// Add event listeners only when actively resizing
	document.addEventListener( 'pointermove', handlePointerMove );
	document.addEventListener( 'pointerup', handlePointerUp );
	
	event.preventDefault();
});

// Hidden panels
const script = new Script( editor );
document.body.appendChild( script.dom );

const player = new Player( editor );
document.body.appendChild( player.dom );

const resizer = new Resizer( editor );
document.body.appendChild( resizer.dom );


// Interaction Editor Window with consistent spacing
const interactionEditorWrapper = document.createElement( 'div' );
interactionEditorWrapper.className = 'interaction-editor-wrapper';
interactionEditorWrapper.style.cssText = `
	padding: 0 8px 8px 8px;
`;

const interactionEditor = new InteractionEditorWindow( editor );
interactionEditorWrapper.appendChild( interactionEditor.getContainer() );
editorContainer.appendChild( interactionEditorWrapper );

// Expose interaction editor globally for menu access
window.interactionEditor = interactionEditor;


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

