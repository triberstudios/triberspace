# Three.js Editor Development Guide

This document contains key insights and best practices for working with the Three.js editor system, learned through hands-on development experience.

## **1. UI Library vs Pure DOM Implementation**
- **The Three.js editor UI library** (`UIPanel`, `UIDiv`, `UIInput`, etc.) is designed for simple form-like interfaces, not complex modern UIs
- **When to switch**: For complex interfaces like chat systems, message bubbles, or modern styled components, **pure DOM with `document.createElement()` and `style.cssText`** works much better
- **Key insight**: The UI library doesn't support advanced CSS styling that modern interfaces require

## **2. Container Hierarchy & Height Calculations**
- **The TabbedPanel system** has specific CSS structure: `.TabbedPanel .Panels` containers manage panel visibility
- **Percentage heights fail** in complex nested containers - use **viewport units** (`calc(100vh - 140px)`) for reliable height calculations
- **Critical CSS fix**: Always set `.TabbedPanel .Panels { height: calc(100% - 40px); overflow: hidden; }` for proper panel sizing

## **3. Positioning Strategy**
- **Absolute positioning works best** for complex layouts within the editor panels
- **Key technique**: Use a "test div" approach - create a simple colored div first to verify positioning works, then implement the real component
- **Viewport-relative positioning** is more reliable than container-relative in the editor environment

## **4. State Management Conflicts**
- **Multiple systems can fight each other**: Manual user interactions vs automatic system updates
- **Solution pattern**: Use flags (`isManualToggle`) to prevent system conflicts
- **MutationObserver timing**: Add debouncing and state checking to prevent infinite loops

## **5. Editor Integration Patterns**
- **Tab structure**: Tabs are added in `Sidebar.js` with `container.addTab(id, label, component)`
- **Signal system**: The editor uses a signal/event system for communication between components
- **File organization**: Each sidebar panel is its own file (`Sidebar.AI.js`, `Sidebar.Scene.js`, etc.)

## **6. CSS Challenges & Solutions**
- **Backdrop filters and transparency** work well for modern floating elements
- **Flexbox gap** is better than margins for consistent spacing in editor panels  
- **Transition timing**: 300ms is good for smooth animations without feeling slow
- **Z-index management**: Floating elements need `z-index: 100+` to appear above editor UI

## **7. Animation & Interaction Patterns**
- **Fade transitions**: Use opacity changes with `pointerEvents: none/auto` during transitions
- **Smooth state changes**: Always provide visual feedback for state changes (disabled states, hover effects)
- **Icon integration**: Phosphor icons work well - use specific styling for proper display

## **8. Debugging Techniques**
- **Console logging with context**: Always log what state you're in and why actions are taken
- **Visual debugging**: Use colored test divs to understand layout issues
- **Observer monitoring**: Log observer triggers to understand timing issues

## **9. Future Architecture Recommendations**

For complex features going forward:

1. **Start with pure DOM** for any advanced UI components
2. **Plan container hierarchy** early - understand the editor's existing CSS structure  
3. **Use viewport units** for reliable sizing
4. **Implement state management flags** to prevent conflicts
5. **Test positioning first** with simple elements before building complex components
6. **Consider the Three.js editor as a host environment** rather than trying to fit everything into its UI system

## **10. Key Files to Remember**
- **`Sidebar.js`**: Tab management and order
- **`Viewport.js`**: Main 3D view and floating elements  
- **Individual panel files**: `Sidebar.*.js` for specific functionality
- **UI library**: `/libs/ui.js` - understand its limitations

## **Common Patterns & Code Examples**

### Pure DOM Component Creation
```javascript
const container = document.createElement('div');
container.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(100vh - 140px);
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;
```

### State Management with Conflict Prevention
```javascript
let isManualToggle = false;

function manualAction() {
    isManualToggle = true;
    // Perform action
    setTimeout(() => {
        isManualToggle = false;
    }, 350);
}

function automaticUpdate() {
    if (isManualToggle) {
        return; // Skip automatic updates during manual actions
    }
    // Perform automatic update
}
```

### Adding New Sidebar Tab
```javascript
// In Sidebar.js
import { SidebarNewFeature } from './Sidebar.NewFeature.js';

const newFeature = new SidebarNewFeature(editor);
container.addTab('newFeature', 'Label', newFeature);
```

### Reliable Height for Scrollable Content
```javascript
const scrollableArea = document.createElement('div');
scrollableArea.style.cssText = `
    height: calc(100vh - 140px); /* Viewport-based height */
    overflow-y: auto;
    overflow-x: hidden;
`;
```

This foundation will make future advanced features much smoother to implement!

## **11. Advanced Architecture Patterns**

### **Signal System Architecture**
The editor uses a centralized signal system with 30+ signals for inter-component communication:

**Signal Categories:**
- **Scene Management**: `sceneChanged`, `objectAdded`, `objectRemoved`
- **Selection**: `objectSelected`, `objectDeselected`, `objectFocused`  
- **Property Changes**: `materialChanged`, `geometryChanged`, `scriptChanged`
- **Editor State**: `transformModeChanged`, `cameraChanged`
- **Rendering**: `sceneRendered`, `viewportCameraChanged`

**Integration Pattern**: Listen → React → Dispatch
```javascript
// Listen to signals
editor.signals.objectSelected.add(function(object) {
    // React to selection change
    updatePropertiesPanel(object);
    
    // Dispatch related signals if needed
    editor.signals.selectionChanged.dispatch(object);
});
```

### **Component Architecture Patterns**
Components follow a consistent function-based pattern:

```javascript
function SidebarFeatureName(editor) {
    // Access editor systems
    const signals = editor.signals;
    const strings = editor.strings;
    
    // Create UI container
    const container = new UI.Panel();
    
    // Add signal listeners
    signals.objectSelected.add(onObjectSelected);
    
    // Create component UI
    function onObjectSelected(object) {
        // Update component based on selection
    }
    
    return container;
}
```

**Key Integration Points:**
- **Sidebar Integration**: Add tabs to `Sidebar.js` with `container.addTab(id, label, component)`
- **Viewport Integration**: Add components to `Viewport.js` for 3D-related features
- **Command Integration**: Export commands from `commands/Commands.js`

### **Command System & History**
All operations that modify editor state should use the command pattern:

**Command Structure:**
```javascript
class MyFeatureCommand extends Command {
    constructor(editor, object, newValue, oldValue) {
        super(editor);
        this.object = object;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }
    
    execute() {
        this.object.property = this.newValue;
        this.editor.signals.objectChanged.dispatch(this.object);
    }
    
    undo() {
        this.object.property = this.oldValue;
        this.editor.signals.objectChanged.dispatch(this.object);
    }
    
    toJSON() {
        return {
            type: 'MyFeatureCommand',
            object: this.object.uuid,
            newValue: this.newValue,
            oldValue: this.oldValue
        };
    }
}

// Usage
const command = new MyFeatureCommand(editor, object, newValue, oldValue);
editor.history.execute(command); // Auto-integrates with undo/redo
```

### **Three.js Scene Management Patterns**
The editor maintains multiple scenes and resource registries:

**Scene Structure:**
- `editor.scene`: Main scene for 3D objects
- `editor.sceneHelpers`: Helper objects (grids, transform controls)

**Resource Management:**
```javascript
// Always use editor methods for scene operations
editor.addObject(object);        // NOT scene.add(object)
editor.removeObject(object);     // NOT scene.remove(object)
editor.select(object);          // NOT direct selection

// Access resource registries
const material = editor.materials.get(uuid);
const geometry = editor.geometries.get(uuid);
const script = editor.scripts.get(uuid);
```

### **Event Handling Architecture**
Multi-level event hierarchy with proper precedence:

**Event Priority Order:**
1. Transform Controls (highest priority)
2. Object Selection
3. Camera Controls (lowest priority)

**Event Handling Pattern:**
```javascript
function onPointerDown(event) {
    // 1. Prevent conflicts
    if (transformControls.dragging) return;
    
    // 2. Perform action
    const intersects = getIntersects(event);
    if (intersects.length > 0) {
        editor.select(intersects[0].object);
    }
    
    // 3. Update state
    // 4. Dispatch signals
}
```

### **Common Integration Pitfalls & Solutions**

**1. Signal Conflicts**
- **Problem**: Multiple components updating the same property simultaneously
- **Solution**: Use debouncing and state flags
```javascript
let isUpdating = false;
function updateProperty(value) {
    if (isUpdating) return;
    isUpdating = true;
    // Update logic
    setTimeout(() => isUpdating = false, 100);
}
```

**2. UI Library Limitations**
- **Problem**: UI library can't handle modern styled components
- **Solution**: Switch to pure DOM for complex interfaces
```javascript
// Instead of UI library for complex components
const container = document.createElement('div');
container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
```

**3. Transform Control Conflicts**
- **Problem**: Camera controls interfere with transform controls
- **Solution**: Always check transform control state
```javascript
if (editor.transformControls.dragging) return;
```

**4. History System Integration**
- **Problem**: Direct modifications bypass undo/redo
- **Solution**: Always use commands for state changes
```javascript
// Wrong
object.position.set(x, y, z);

// Right  
const command = new SetPositionCommand(editor, object, newPosition);
editor.history.execute(command);
```

### **File Organization Strategy**
The editor follows clear organizational patterns:

**Directory Structure:**
- **Root**: Core files (`Editor.js`, `Sidebar.js`, `Viewport.js`)
- **`commands/`**: All command classes + Commands.js registry
- **`libs/`**: External libraries and utilities
- **`ai/`**: AI-related functionality

**Naming Conventions:**
- **Components**: `Sidebar.*.js`, `Viewport.*.js` 
- **Commands**: `*Command.js`
- **Libraries**: Descriptive names in `libs/`

### **Performance Considerations**

**Signal Performance:**
- Avoid creating new signals - reuse existing ones
- Use `signals.objectChanged.dispatch()` instead of multiple specific signals
- Debounce frequent updates (resize, mouse move)

**Scene Traversal:**
```javascript
// Efficient object finding
const object = editor.objectByUuid(uuid);  // Fast lookup

// Avoid frequent scene.traverse()
// Cache results when possible
```

**UI Update Batching:**
```javascript
// Batch DOM updates
requestAnimationFrame(() => {
    // All DOM updates here
    updatePanel1();
    updatePanel2();
    updatePanel3();
});
```

This architectural foundation ensures new features integrate seamlessly with the editor's established patterns!

The following sections document the core architectural patterns of the Three.js editor that are essential for building complex features correctly.

### **Signal System Architecture**

The editor uses a comprehensive signal/event system for inter-component communication:

**Core Signal Pattern:**
```javascript
// In Editor.js - signals are defined centrally
this.signals = {
    objectSelected: new Signal(),
    objectAdded: new Signal(),
    sceneGraphChanged: new Signal(),
    // ... 30+ other signals
};

// Components listen to signals
editor.signals.objectSelected.add(function(object) {
    // React to object selection
});

// Components dispatch signals
editor.signals.objectSelected.dispatch(selectedObject);
```

**Key Signal Categories:**
- **Scene Management**: `sceneGraphChanged`, `objectAdded`, `objectRemoved`
- **Selection**: `objectSelected`, `objectFocused`
- **Property Changes**: `materialChanged`, `geometryChanged`, `cameraChanged`
- **Editor State**: `transformModeChanged`, `viewportShadingChanged`
- **Rendering**: `sceneRendered`, `rendererUpdated`

**Integration Pattern for New Features:**
1. **Listen** to relevant signals in your component constructor
2. **Dispatch** signals when your feature changes editor state
3. **Use existing signals** rather than creating new ones when possible

### **Component Architecture Patterns**

**Sidebar Component Structure:**
```javascript
// Standard sidebar component pattern
function SidebarFeatureName( editor ) {
    const signals = editor.signals;        // Access signal system
    const strings = editor.strings;        // Access localization
    const container = new UIPanel();       // Root UI container
    
    // UI setup with the UI library or pure DOM
    
    // Signal listeners
    signals.objectSelected.add(refreshUI);
    
    // Internal functions
    function refreshUI() { /* ... */ }
    
    return container; // Return UI container
}

// Integration in Sidebar.js
import { SidebarFeatureName } from './Sidebar.FeatureName.js';
const feature = new SidebarFeatureName( editor );
container.addTab( 'feature', 'Display Name', feature );
```

**Key Component Patterns:**
- **Single Function Export**: Each component is a single function, not a class
- **Editor Instance**: Always pass `editor` as the first parameter
- **UI Container Return**: Return a UI library element or DOM element
- **Signal Integration**: Components communicate through the signal system
- **Resource Management**: Components manage their own UI state and cleanup

### **Command System & History**

The editor implements a robust command pattern for undo/redo functionality:

**Command Structure:**
```javascript
// All commands extend the base Command class
class CustomCommand extends Command {
    constructor(editor, ...params) {
        super(editor);
        this.type = 'CustomCommand';
        this.name = 'Display Name';
        // Store command parameters
    }
    
    execute() {
        // Perform the action
        // Update editor state
        // Dispatch relevant signals
    }
    
    undo() {
        // Reverse the action
        // Restore previous state
    }
    
    toJSON() { /* Serialization for history */ }
    fromJSON(json) { /* Deserialization */ }
}
```

**Command Execution Pattern:**
```javascript
// Execute command through history system
const command = new AddObjectCommand(editor, object);
editor.history.execute(command);

// Commands automatically:
// 1. Get added to undo stack
// 2. Execute their action
// 3. Update UI through signals
// 4. Enable undo/redo functionality
```

**Available Command Types:**
- **Object Operations**: `AddObjectCommand`, `RemoveObjectCommand`, `MoveObjectCommand`
- **Property Changes**: `SetPositionCommand`, `SetMaterialCommand`, `SetValueCommand`
- **Scene Operations**: `SetSceneCommand`
- **Batch Operations**: `MultiCmdsCommand`

### **Three.js Scene Management**

The editor maintains multiple scenes and objects:

**Core Scene Structure:**
```javascript
// In Editor.js
this.scene = new THREE.Scene();              // Main 3D scene
this.sceneHelpers = new THREE.Scene();       // Helper objects (gizmos, etc.)
this.camera = camera;                         // Active camera
this.selected = null;                         // Currently selected object

// Resource management
this.object = {};                             // Scene objects by uuid
this.geometries = {};                         // Shared geometries
this.materials = {};                          // Shared materials
this.scripts = {};                           // Object scripts
```

**Scene Integration Patterns:**
```javascript
// Adding objects properly
editor.addObject( object );                  // Handles geometry/material registration
editor.signals.objectAdded.dispatch( object );

// Selection management
editor.select( object );                     // Updates selection state
editor.signals.objectSelected.dispatch( object );

// Resource tracking
editor.addGeometry( geometry );              // Registers shared resources
editor.addMaterial( material );              // Tracks usage counts
```

### **Event Handling Architecture**

The editor handles events at multiple levels:

**Event Hierarchy:**
1. **Browser Events**: Mouse, keyboard, resize events
2. **Three.js Events**: Raycasting, object intersection
3. **Transform Events**: Gizmo interactions, object manipulation
4. **Editor Events**: Selection, focus, state changes

**Event Handling Pattern:**
```javascript
// Viewport event handling example
container.dom.addEventListener('mousedown', onMouseDown);
container.dom.addEventListener('mousemove', onMouseMove);

function onMouseDown(event) {
    // 1. Prevent conflicts with other systems
    if (transformControls.dragging) return;
    
    // 2. Perform raycasting
    const intersects = raycaster.intersectObjects(scene.children);
    
    // 3. Update editor state
    if (intersects.length > 0) {
        editor.select(intersects[0].object);
    }
    
    // 4. Let signals notify other components
    // (selection signal dispatched automatically)
}
```

**Transform Controls Integration:**
- **TransformControls**: Provides gizmos for moving/rotating/scaling objects
- **EditorControls**: Handles camera navigation when not transforming
- **Event Priority**: Transform interactions take precedence over camera controls

### **File Organization Strategy**

The editor follows a clear organizational pattern:

```
editor/js/
├── Editor.js                    # Core editor class
├── History.js                   # Command history system
├── Config.js                    # Configuration management
├── Loader.js                    # File loading utilities
├── Sidebar.js                   # Main sidebar container
├── Sidebar.*.js                 # Individual sidebar panels
├── Viewport.js                  # 3D viewport container
├── Viewport.*.js                # Viewport components
├── Menubar.js                   # Main menubar
├── Menubar.*.js                 # Individual menu sections
├── commands/                    # Command pattern implementations
│   ├── Command.js              # Base command class
│   └── *Command.js             # Specific command types
├── libs/                       # UI library and utilities
│   ├── ui.js                   # Core UI components
│   └── ui.three.js            # Three.js specific UI components
└── ai/                         # AI-specific features
    ├── AIManager.js            # AI system management
    └── *.js                    # AI components
```

**Naming Conventions:**
- **Sidebar panels**: `Sidebar.FeatureName.js`
- **Viewport components**: `Viewport.FeatureName.js`
- **Commands**: `FeatureNameCommand.js`
- **UI components**: Descriptive names in `libs/`

### **Integration Points for New Features**

When building new features, integrate at these key points:

**1. Sidebar Integration** (`Sidebar.js`):
```javascript
import { SidebarNewFeature } from './Sidebar.NewFeature.js';
const newFeature = new SidebarNewFeature( editor );
container.addTab( 'newfeature', 'Feature Name', newFeature );
```

**2. Viewport Integration** (`Viewport.js`):
```javascript
// Add viewport components like controls or overlays
container.add( new ViewportNewFeature( editor ) );
```

**3. Command Integration** (`commands/Commands.js`):
```javascript
// Export new commands for use throughout the editor
export { NewFeatureCommand } from './NewFeatureCommand.js';
```

**4. Signal Integration**:
- Listen to existing signals for editor state changes
- Dispatch existing signals when your feature changes state
- Only add new signals if no existing signal fits your use case

### **Common Pitfalls & Solutions**

**1. Signal Conflicts**:
- **Problem**: Multiple listeners modifying the same state
- **Solution**: Use debouncing and state flags to prevent conflicts

**2. UI Library Limitations**:
- **Problem**: UI library doesn't support modern CSS features
- **Solution**: Switch to pure DOM with `document.createElement()` and `style.cssText`

**3. Scene Resource Management**:
- **Problem**: Memory leaks from orphaned geometries/materials
- **Solution**: Use editor's resource management methods (`addGeometry`, `addMaterial`)

**4. Transform Control Conflicts**:
- **Problem**: Camera controls interfering with object transformation
- **Solution**: Check `transformControls.dragging` before handling camera events

**5. History System Integration**:
- **Problem**: Actions not appearing in undo stack
- **Solution**: Always execute changes through `editor.history.execute(command)`

**6. Cross-Component Communication**:
- **Problem**: Components directly accessing each other
- **Solution**: Use the signal system for loose coupling

### **Performance Considerations**

**1. Signal Performance**:
- Signals are lightweight but avoid excessive dispatching in render loops
- Use debouncing for high-frequency events (mouse move, scroll)

**2. Scene Traversal**:
- Cache scene traversals when possible
- Use `object.traverse()` efficiently for scene operations

**3. UI Updates**:
- Batch UI updates to avoid excessive DOM manipulation
- Use `requestAnimationFrame` for smooth animations

**4. Memory Management**:
- Clean up event listeners when components are destroyed
- Dispose of Three.js objects properly (geometries, materials, textures)

This architectural foundation ensures that new features integrate seamlessly with the editor's existing systems and maintain the performance and reliability standards of the codebase.

---

# **12. Interaction Editor System Architecture**

The interaction editor is a node-based visual programming system integrated into the Three.js editor. This section documents the architecture, key learnings, and troubleshooting approaches.

## **System Overview**

The interaction editor consists of several interconnected components:

**Core Components:**
- **InteractionGraph.js**: Central coordinator, manages nodes and connections, handles persistence
- **PatchNode.js**: Base class for all node types with inputs, outputs, and processing logic
- **PatchCanvas.js**: Canvas-based rendering system with user interaction handling
- **InteractionEditorWindow.jsx**: React wrapper component for integration into editor layout
- **Node Types**: Specialized nodes (ObjectRotation, ObjectPosition, ObjectScale, Math operations)

## **Architecture Patterns**

### **Node System Architecture**
```javascript
// Base node pattern
export class CustomNode extends PatchNode {
    constructor(sceneObject, x = 0, y = 0, editor = null) {
        super('Node Name', x, y);

        // Store references
        this.sceneObject = sceneObject;
        this.editor = editor;

        // Define inputs/outputs
        this.addInput('inputName', 'dataType', defaultValue);
        this.addOutput('outputName', 'dataType');

        // Initial processing
        this.process();
    }

    process() {
        // Core node logic
        const inputValue = this.getInputValue('inputName');
        this.setOutputValue('outputName', processedValue);

        // Apply to scene object
        if (this.sceneObject) {
            this.sceneObject.property = processedValue;
            this.sceneObject.updateMatrix();
        }

        // Notify editor of changes
        if (this.editor && this.editor.signals) {
            this.editor.signals.objectChanged.dispatch(this.sceneObject);
        }
    }
}
```

### **Persistence Architecture**
The interaction editor integrates with the Three.js editor's save/load system:

**Key Integration Points:**
- **Auto-save Trigger**: `setupAutoSaveListener()` connects to `interactionGraphChanged` signal
- **Serialization**: Nodes serialize to JSON with UUID references to scene objects
- **Deserialization**: Async system reconnects nodes to scene objects after loading
- **State Sync**: ObjectProperty nodes sync with current Three.js object state on restore

**Critical Pattern - Auto-save Integration:**
```javascript
// In InteractionGraph.js
setupAutoSaveListener() {
    if (this.editor && this.editor.signals && this.editor.signals.interactionGraphChanged) {
        const saveInteractionGraphState = () => {
            if (this.editor.storage) {
                this.editor.storage.set(this.editor.toJSON());
            }
        };
        this.editor.signals.interactionGraphChanged.add(saveInteractionGraphState);
    }
}
```

## **Key Technical Solutions**

### **1. Object Property Node Value Sync**
**Problem**: ObjectProperty nodes (Rotation, Position, Scale) displayed stale cached values after page refresh instead of current Three.js object values.

**Root Cause**: The `deserialize()` method restored cached input values but didn't sync with current object state.

**Solution Pattern**:
```javascript
// In ObjectRotationNode.js, ObjectPositionNode.js, ObjectScaleNode.js
deserialize(data) {
    super.deserialize(data);
    this.objectName = data.objectName || 'Object';
    // CRITICAL: Sync with current object state after restoration
    this.syncFromObject();
}

syncFromObject() {
    if (!this.sceneObject) return;
    this.setInputValue('x', this.sceneObject.rotation.x);
    this.setInputValue('y', this.sceneObject.rotation.y);
    this.setInputValue('z', this.sceneObject.rotation.z);
}
```

### **2. Number Formatting for UI Display**
**Problem**: Numbers displayed with excessive decimal places (e.g., `-2.220446049250313e-16` instead of `0.00`).

**Solution**: Number formatting utility in PatchCanvas.js:
```javascript
// Format number for display (limit to 2 decimal places)
formatNumber(value) {
    if (typeof value !== 'number') return value.toString();

    // Handle very small numbers (close to zero)
    if (Math.abs(value) < 0.001) {
        return '0.00';
    }

    // Format to 2 decimal places
    return Number(value.toFixed(2)).toString();
}

// Usage in canvas rendering
this.ctx.fillText(this.formatNumber(value), x + fieldWidth / 2, fieldY + fieldHeight / 2 + 3);
```

## **Debugging and Troubleshooting Patterns**

### **Common Issues and Solutions**

**1. Node Graphs Not Persisting After Refresh**
- **Check**: `interactionGraphChanged` signal has listeners (`signals.interactionGraphChanged._bindings.length`)
- **Fix**: Ensure `setupAutoSaveListener()` is called in InteractionGraph constructor
- **Verify**: Console should show "Saved state to IndexedDB" messages

**2. Connections Not Restoring**
- **Check**: Node IDs are preserved during deserialization
- **Fix**: Ensure `node.deserialize(nodeData)` is called to restore original IDs
- **Debug**: Log node IDs before/after deserialization

**3. ObjectProperty Nodes Show Wrong Values**
- **Check**: Nodes display current object values vs cached values
- **Fix**: Call `syncFromObject()` in deserialize method
- **Pattern**: Always sync property nodes with current scene object state after restoration

### **Development Debugging Approach**
When implementing interaction editor features, follow this systematic approach:

1. **Add Debug Logging**: Track signal dispatching and listener counts
2. **Test Save/Load Cycle**: Create node graphs → Save → Reload → Verify state
3. **Check Signal Integration**: Ensure `interactionGraphChanged` fires on modifications
4. **Verify Object Linking**: Confirm scene object UUID references are maintained
5. **Test Edge Cases**: Empty scenes, deleted objects, modified objects

**Debug Logging Pattern**:
```javascript
// Temporary debugging (remove after verification)
console.log('Signal listeners:', this.editor.signals.interactionGraphChanged._bindings.length);
console.log('Saving interaction graph:', this.serialize());
console.log('Node deserialized:', nodeData.id, 'Current object state:', this.sceneObject.rotation);
```

## **Performance Considerations**

**1. Canvas Rendering Optimization**:
- Batch canvas operations in `render()` methods
- Use `requestAnimationFrame` for smooth interactions
- Implement dirty flag pattern to avoid unnecessary re-renders

**2. Node Processing Efficiency**:
- Only process nodes when inputs change
- Use debouncing for high-frequency updates
- Cache expensive calculations in node properties

**3. Signal System Performance**:
- Minimize signal dispatching frequency
- Use `interactionGraphChanged` for batch updates, not individual node changes
- Clean up signal listeners when components are destroyed

## **Integration with Three.js Editor**

### **Signal System Integration**
The interaction editor integrates with the editor's signal system:

**Key Signals Used:**
- `interactionGraphChanged`: Triggers auto-save when node graph is modified
- `objectChanged`: Updates editor UI when objects are modified by nodes
- `sceneGraphChanged`: Notifies editor when scene structure changes

**Integration Pattern**:
```javascript
// Dispatch signals to keep editor in sync
if (this.editor && this.editor.signals) {
    this.editor.signals.objectChanged.dispatch(this.sceneObject);
    this.editor.signals.sceneGraphChanged.dispatch();
}
```

### **Layout Integration**
The interaction editor is integrated into the editor's panel system:

**Key Files:**
- **main.js**: Creates vertical split layout with viewport and interaction editor
- **InteractionEditorWindow.jsx**: Handles React component lifecycle and resize events
- **InteractionGraph.js**: Manages the interaction system lifecycle

**Resize Handling Pattern**:
```javascript
// In main.js - handle vertical panel resizing
if (window.interactionEditor && window.interactionEditor.isOpen()) {
    if (window.interactionEditor.interactionEditor && window.interactionEditor.interactionEditor.resize) {
        setTimeout(() => {
            window.interactionEditor.interactionEditor.resize();
            if (window.interactionEditor.interactionEditor.canvas) {
                window.interactionEditor.interactionEditor.canvas.render();
            }
        }, 10);
    }
}
```

## **Future Development Guidelines**

### **Adding New Node Types**
1. **Extend PatchNode**: Create new class extending PatchNode base class
2. **Define I/O**: Specify inputs, outputs, and data types in constructor
3. **Implement Process**: Core logic in `process()` method
4. **Handle Serialization**: Override serialize/deserialize if needed for special data
5. **Register Node**: Add to node creation system for user access

### **Extending Persistence**
1. **Property Storage**: Use `setProperty()` for custom node data
2. **Object References**: Store UUIDs for Three.js objects, not direct references
3. **Async Loading**: Handle cases where referenced objects might not exist during deserialization
4. **Migration**: Plan for backwards compatibility when changing node structure

### **Performance Scaling**
1. **Node Limits**: Consider performance impact of large node graphs
2. **Update Batching**: Batch multiple node updates into single render cycles
3. **Memory Management**: Clean up nodes, connections, and event listeners properly
4. **Canvas Optimization**: Implement viewport culling for large graphs

This comprehensive system provides a solid foundation for building complex visual programming features while maintaining integration with the Three.js editor's established architecture patterns.