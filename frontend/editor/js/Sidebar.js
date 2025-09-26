import { UITabbedPanel, UISpan } from './libs/ui.js';

import { SidebarScene } from './Sidebar.Scene.js';
import { SidebarProperties } from './Sidebar.Properties.js';
import { SidebarProject } from './Sidebar.Project.js';
import { SidebarSettings } from './Sidebar.Settings.js';
import { SidebarAI } from './Sidebar.AI.js';
import { SidebarSketchfab } from './Sidebar.Sketchfab.js';

function Sidebar( editor ) {

	const strings = editor.strings;

	const container = new UITabbedPanel();
	container.setId( 'sidebar' );

	const sidebarProperties = new SidebarProperties( editor );

	const scene = new UISpan().add(
		new SidebarScene( editor ),
		sidebarProperties
	);
	const settings = new SidebarSettings( editor );
	const ai = new SidebarAI( editor );
	const sketchfab = new SidebarSketchfab( editor );

	container.addTab( 'ai', 'Chat', ai );
	container.addTab( 'scene', strings.getKey( 'sidebar/scene' ), scene );
	container.addTab( 'sketchfab', strings.getKey( 'sidebar/sketchfab' ), sketchfab );
	container.addTab( 'settings', strings.getKey( 'sidebar/settings' ), settings );
	container.select( 'ai' );

	const sidebarPropertiesResizeObserver = new ResizeObserver( function () {

		sidebarProperties.tabsDiv.setWidth( getComputedStyle( container.dom ).width );

	} );

	sidebarPropertiesResizeObserver.observe( container.tabsDiv.dom );

	return container;

}

export { Sidebar };
