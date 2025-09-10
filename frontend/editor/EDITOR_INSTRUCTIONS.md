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