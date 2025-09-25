# How to Extend the Three.js Editor

This guide provides step-by-step instructions for extending the editor with new features, based on the architectural patterns documented in `EDITOR_INSTRUCTIONS.md`.

## Quick Start Checklist

Before building any new feature:
- [ ] Read `EDITOR_INSTRUCTIONS.md` sections 1-11
- [ ] Study existing implementations of similar features
- [ ] Plan your integration points (Sidebar tab? Viewport component? New command?)
- [ ] Test with simple colored div first to verify positioning/layout

## Common Feature Types

### 1. Adding a New Sidebar Panel

**Use Case**: Property editors, asset browsers, settings panels

**Steps**:
1. Create new file: `js/Sidebar.YourFeature.js`
2. Follow the standard component pattern:
   ```javascript
   function SidebarYourFeature(editor) {
       const signals = editor.signals;
       const strings = editor.strings;
       
       // Use UI library for simple layouts, pure DOM for complex ones
       const container = new UI.Panel();
       
       // Add signal listeners
       signals.objectSelected.add(onObjectSelected);
       
       function onObjectSelected(object) {
           // Update panel content
       }
       
       return container;
   }
   ```
3. Register in `js/Sidebar.js`:
   ```javascript
   import { SidebarYourFeature } from './Sidebar.YourFeature.js';
   
   const yourFeature = new SidebarYourFeature(editor);
   container.addTab('yourFeature', 'Your Feature', yourFeature);
   ```

**Key Considerations**:
- Use UI library (`UIPanel`, `UIButton`) for simple form-like interfaces
- Switch to pure DOM (`document.createElement`) for modern styled components
- Use viewport units (`calc(100vh - 140px)`) for reliable height calculations
- Always listen to `objectSelected` signal for context-sensitive panels

### 2. Adding a New Command

**Use Case**: Any operation that modifies editor state (should be undoable)

**Steps**:
1. Create new file: `js/commands/YourFeatureCommand.js`
2. Extend Command class:
   ```javascript
   import { Command } from './Command.js';
   
   class YourFeatureCommand extends Command {
       constructor(editor, object, newValue, oldValue) {
           super(editor);
           this.object = object;
           this.newValue = newValue;
           this.oldValue = oldValue;
           this.type = 'YourFeatureCommand';
           this.name = 'Your Feature';
       }
       
       execute() {
           this.object.yourProperty = this.newValue;
           this.editor.signals.objectChanged.dispatch(this.object);
       }
       
       undo() {
           this.object.yourProperty = this.oldValue;
           this.editor.signals.objectChanged.dispatch(this.object);
       }
       
       toJSON() {
           return {
               type: this.type,
               object: this.object.uuid,
               newValue: this.newValue,
               oldValue: this.oldValue
           };
       }
       
       fromJSON(json) {
           super.fromJSON(json);
           this.object = this.editor.objectByUuid(json.object);
           this.newValue = json.newValue;
           this.oldValue = json.oldValue;
       }
   }
   
   export { YourFeatureCommand };
   ```
3. Register in `js/commands/Commands.js`:
   ```javascript
   export { YourFeatureCommand } from './YourFeatureCommand.js';
   ```

**Key Considerations**:
- ALWAYS use `editor.history.execute(command)` instead of direct execution
- Store both old and new values for proper undo/redo
- Dispatch `objectChanged` signal to update UI
- Handle JSON serialization for project save/load

### 3. Adding Viewport Components

**Use Case**: 3D overlays, gizmos, floating controls

**Steps**:
1. Create new file: `js/Viewport.YourFeature.js`
2. Follow viewport component pattern:
   ```javascript
   function ViewportYourFeature(editor) {
       const signals = editor.signals;
       const container = editor.container;
       
       // Create overlay element
       const overlay = document.createElement('div');
       overlay.style.cssText = `
           position: absolute;
           top: 16px;
           right: 16px;
           z-index: 100;
           background: rgba(0, 0, 0, 0.8);
           padding: 12px;
           border-radius: 4px;
           color: white;
       `;
       
       // Add to viewport
       container.appendChild(overlay);
       
       // Listen to editor events
       signals.objectSelected.add(onObjectSelected);
       
       function onObjectSelected(object) {
           overlay.textContent = object ? object.name : 'No selection';
       }
       
       return {
           dispose: function() {
               container.removeChild(overlay);
           }
       };
   }
   ```
3. Register in `js/Viewport.js`:
   ```javascript
   import { ViewportYourFeature } from './Viewport.YourFeature.js';
   
   const yourFeature = new ViewportYourFeature(editor);
   ```

**Key Considerations**:
- Use `position: absolute` with high `z-index` for overlays
- Always provide dispose method for cleanup
- Use `requestAnimationFrame` for smooth animations
- Check `transformControls.dragging` before handling mouse events

### 4. Adding Menu Items

**Use Case**: File operations, editor settings, tools

**Steps**:
1. Edit `js/Menubar.js`
2. Find appropriate menu section and add:
   ```javascript
   // Add menu item
   const yourAction = new UI.Row();
   yourAction.setClass('option');
   yourAction.setTextContent('Your Action');
   yourAction.onClick(function() {
       // Your action logic
       const command = new YourFeatureCommand(editor, params);
       editor.history.execute(command);
   });
   
   editMenu.add(yourAction);
   ```

**Key Considerations**:
- Group related actions together
- Use commands for state changes
- Add keyboard shortcuts in `js/Viewport.js` keydown handler
- Follow existing menu structure and styling

## Advanced Patterns

### Complex UI with Pure DOM

When the UI library limitations become apparent:

```javascript
function createComplexPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        height: calc(100vh - 140px);
        overflow-y: auto;
    `;
    
    // Modern CSS works perfectly
    const modernButton = document.createElement('button');
    modernButton.style.cssText = `
        background: linear-gradient(45deg, #667eea, #764ba2);
        border: none;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.2s;
    `;
    
    modernButton.addEventListener('mouseenter', () => {
        modernButton.style.transform = 'scale(1.05)';
    });
    
    panel.appendChild(modernButton);
    return panel;
}
```

### State Management with Conflicts Prevention

```javascript
let isUpdatingFromSignal = false;

function updateFromUI(newValue) {
    if (isUpdatingFromSignal) return;
    
    // Update editor state
    const command = new YourCommand(editor, object, newValue, oldValue);
    editor.history.execute(command);
}

function onSignalUpdate(object) {
    isUpdatingFromSignal = true;
    
    // Update UI
    updateUIElements(object);
    
    // Reset flag after UI updates
    setTimeout(() => {
        isUpdatingFromSignal = false;
    }, 100);
}
```

### Performance Optimization

```javascript
// Debounce frequent updates
let updateTimeout;
function debouncedUpdate() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        performExpensiveUpdate();
    }, 100);
}

// Batch DOM updates
function batchUIUpdates() {
    requestAnimationFrame(() => {
        // All DOM changes here
        updatePanel1();
        updatePanel2();
        updatePanel3();
    });
}

// Cache expensive lookups
const objectCache = new Map();
function getCachedObject(uuid) {
    if (!objectCache.has(uuid)) {
        objectCache.set(uuid, editor.objectByUuid(uuid));
    }
    return objectCache.get(uuid);
}
```

## Testing Your Feature

### Basic Integration Test

1. Add a colored test div first:
   ```javascript
   const testDiv = document.createElement('div');
   testDiv.style.cssText = `
       position: absolute;
       top: 20px;
       left: 20px;
       width: 200px;
       height: 100px;
       background: lime;
       z-index: 1000;
   `;
   container.appendChild(testDiv);
   ```

2. Verify positioning works before building real component

### Signal Integration Test

```javascript
// Test signal listening
editor.signals.objectSelected.add(function(object) {
    console.log('Selection changed:', object?.name);
});

// Test signal dispatching
editor.select(someObject);
```

### Command Integration Test

```javascript
// Test command execution
const testCommand = new YourCommand(editor, object, newValue, oldValue);
editor.history.execute(testCommand);

// Test undo
editor.history.undo();

// Test redo  
editor.history.redo();
```

## Common Debugging Steps

1. **Check console for errors**
2. **Verify signal connections**: `console.log` in signal handlers
3. **Test with colored divs** for layout issues
4. **Check transform control state**: `editor.transformControls.dragging`
5. **Validate editor state**: `editor.selected`, `editor.scene.children`
6. **Monitor performance**: Check for infinite loops in signal handlers

## Working with the Interaction Editor System

The integrated interaction editor provides node-based visual programming. Here's how to extend it:

### 5. Adding New Node Types

**Use Case**: Custom behaviors, math operations, data processors

**Steps**:
1. Create new file: `js/interaction-editor/nodes/YourCustomNode.js`
2. Extend PatchNode base class:
   ```javascript
   import { PatchNode } from '../PatchNode.js';

   export class YourCustomNode extends PatchNode {
       constructor(x = 0, y = 0, editor = null) {
           super('Your Node Name', x, y);
           this.editor = editor;

           // Define inputs and outputs
           this.addInput('input1', 'number', 0);
           this.addInput('input2', 'number', 1);
           this.addOutput('result', 'number');

           // Initial processing
           this.process();
       }

       process() {
           const val1 = this.getInputValue('input1');
           const val2 = this.getInputValue('input2');
           const result = val1 + val2; // Your custom logic

           this.setOutputValue('result', result);

           // If node affects scene objects, notify editor
           if (this.editor && this.editor.signals) {
               this.editor.signals.sceneGraphChanged.dispatch();
           }
       }

       // Override for custom serialization if needed
       serialize() {
           const baseData = super.serialize();
           return {
               ...baseData,
               type: 'YourCustomNode',
               // Add custom data if needed
           };
       }
   }
   ```
3. Register in node creation system (InteractionGraph.js):
   ```javascript
   import { YourCustomNode } from './nodes/YourCustomNode.js';

   // Add to createNode method
   case 'YourCustom':
       return new YourCustomNode(x, y, this.editor);
   ```

**Key Considerations**:
- Always call `this.process()` in constructor for initial state
- Use `setOutputValue()` to trigger propagation to connected nodes
- Handle scene object updates via editor signals
- Store only serializable data in node properties

### 6. Object Property Nodes Pattern

**Use Case**: Controlling Three.js object properties (position, rotation, scale, materials)

**Critical Pattern - State Synchronization**:
```javascript
export class ObjectPropertyNode extends PatchNode {
    constructor(sceneObject, x = 0, y = 0, editor = null) {
        const objectName = sceneObject ? (sceneObject.name || 'Object') : 'Object';
        super(`${objectName} Property`, x, y);

        this.sceneObject = sceneObject;
        this.objectName = objectName;
        this.editor = editor;

        // IMPORTANT: Use current object values as defaults
        this.addInput('value', 'number',
            sceneObject ? sceneObject.property : defaultValue);
        this.addOutput('value', 'number');

        this.process();
    }

    process() {
        if (!this.sceneObject) return;

        const newValue = this.getInputValue('value');

        // Apply to Three.js object
        this.sceneObject.property = newValue;
        this.sceneObject.updateMatrix();
        this.sceneObject.updateMatrixWorld();

        // Update outputs
        this.setOutputValue('value', newValue);

        // Notify editor for UI updates
        if (this.editor && this.editor.signals) {
            this.editor.signals.objectChanged.dispatch(this.sceneObject);
            this.editor.signals.sceneGraphChanged.dispatch();
        }
    }

    // CRITICAL: Sync with current object state after loading
    deserialize(data) {
        super.deserialize(data);
        this.objectName = data.objectName || 'Object';
        // This prevents stale cached values after page refresh
        this.syncFromObject();
    }

    syncFromObject() {
        if (!this.sceneObject) return;
        this.setInputValue('value', this.sceneObject.property);
    }

    serialize() {
        const baseData = super.serialize();
        return {
            ...baseData,
            type: 'ObjectProperty',
            propertyType: 'yourProperty',
            objectUuid: this.sceneObject ? this.sceneObject.uuid : null,
            objectName: this.objectName
        };
    }
}
```

### Key Patterns for Interaction Editor Extensions

**1. Persistence Integration**:
```javascript
// Always store UUIDs, not direct object references
serialize() {
    return {
        objectUuid: this.sceneObject?.uuid,
        // other serializable data
    };
}

// Handle async object relinking during deserialization
async deserialize(data) {
    super.deserialize(data);
    if (data.objectUuid && this.editor) {
        this.sceneObject = this.editor.scene.getObjectByProperty('uuid', data.objectUuid);
    }
    // Sync with current state after relinking
    this.syncFromObject();
}
```

**2. Number Formatting for UI**:
```javascript
// In PatchCanvas.js or custom rendering
formatNumber(value) {
    if (typeof value !== 'number') return value.toString();
    if (Math.abs(value) < 0.001) return '0.00';
    return Number(value.toFixed(2)).toString();
}
```

**3. Signal Integration**:
```javascript
// Listen to editor changes
constructor(editor) {
    // ... setup code

    if (editor && editor.signals) {
        editor.signals.objectSelected.add(this.onObjectSelected.bind(this));
        editor.signals.sceneGraphChanged.add(this.onSceneChanged.bind(this));
    }
}

// Dispatch changes to editor
process() {
    // ... processing logic

    if (this.editor && this.editor.signals) {
        this.editor.signals.interactionGraphChanged.dispatch();
    }
}
```

**4. Canvas Interaction Handling**:
```javascript
// In custom canvas components
handleMouseEvent(event) {
    // Get canvas-relative coordinates
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Handle interactions (node selection, connection dragging, etc.)
    // Always call render() after state changes
    this.render();
}
```

## Debugging Interaction Editor Extensions

### Common Issues and Solutions

**1. Nodes Not Persisting**:
- Check: `interactionGraphChanged` signal is dispatched when nodes are modified
- Verify: `setupAutoSaveListener()` is called in InteractionGraph constructor
- Debug: Look for "Saved state to IndexedDB" console messages

**2. Object References Breaking**:
- Ensure you store UUIDs, not direct object references
- Handle cases where referenced objects might not exist during loading
- Use async deserialization patterns for object relinking

**3. Value Synchronization Issues**:
- Always call `syncFromObject()` in deserialize methods for property nodes
- Use current object values as input defaults in constructors
- Test save/load cycles thoroughly

**4. Performance Issues**:
- Avoid excessive signal dispatching in render loops
- Use `requestAnimationFrame` for smooth canvas animations
- Implement dirty flags to minimize unnecessary updates

### Testing Checklist

- [ ] Create nodes and connections → Save → Reload → Verify state restored
- [ ] Test with different object types and property values
- [ ] Verify undo/redo works with your custom nodes
- [ ] Check performance with large node graphs (50+ nodes)
- [ ] Test edge cases: deleted objects, empty scenes, corrupted data

## Future Feature Considerations

The interaction editor system provides a solid foundation for:

- **Advanced Node Types**: Conditional logic, loops, array operations
- **Timeline Integration**: Keyframe-based animations with node connections
- **Template System**: Pre-built node graphs for common behaviors
- **Collaboration**: Real-time node graph sharing between users
- **Performance Profiling**: Visual debugging for node execution timing

These advanced features should follow the patterns documented here while extending the editor's capabilities.

Remember: The interaction editor integrates deeply with the Three.js editor's architecture. Work with the established patterns for seamless integration!