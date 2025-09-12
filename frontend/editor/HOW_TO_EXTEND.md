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

## Future Feature Considerations

For the upcoming patch editor and template system:

- **Patch Editor**: Will need complex node-based UI (use pure DOM)
- **Templates**: Will need asset management integration
- **Collaboration**: Will need real-time signal synchronization

These advanced features should follow the patterns documented here while extending the editor's capabilities.

Remember: The editor's strength is its proven architecture. Work with it, not against it!