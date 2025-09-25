# Triber Editor

The Triber Editor is a forked and customized version of the three.js editor, designed specifically for creating immersive 3D experiences within the Triber ecosystem.

## Features

- **3D Scene Creation**: Build immersive 3D environments
- **Asset Management**: Import and manage 3D models, textures, and media
- **Node-based Interaction Editor**: Visual programming system for interactive behaviors
- **Experience Templates**: Pre-built templates for different experience types
- **Export System**: Publish experiences directly to the Triber platform

## Development

### Running the Editor

```bash
# From the root of the monorepo
npm run dev

# Or directly from the editor directory
cd frontend/editor
npm run dev
```

The editor will be available at `http://localhost:3001`

### Architecture

The Triber Editor is built on:
- **Three.js**: Core 3D rendering engine
- **Vanilla JavaScript**: Lightweight and fast
- **Modular UI System**: Custom UI components for editor interface
- **Interaction Editor System**: Node-based visual programming with persistent state management

### Integration with Triber Platform

The editor integrates with the Triber ecosystem through:
- **Experience Publishing**: Export experiences to the main platform
- **Asset Storage**: Upload assets to Cloudflare R2
- **Authentication**: Single sign-on with main Triber account

## Customization

This editor has been customized from the original three.js editor with:
- Triber branding and styling
- Experience-focused workflows
- Node-based interaction editor for interactive behaviors
- Template system for different experience types
- Publishing integration with Triber platform

## Future Enhancements

Planned features include:
- AI-assisted scene generation
- Enhanced interaction editor with more node types
- Template marketplace
- Collaborative editing

## Interaction Editor System

The integrated interaction editor provides node-based visual programming:

### Features
- **Node-based Visual Programming**: Create interactive behaviors by connecting nodes
- **Object Property Nodes**: Control position, rotation, and scale of 3D objects
- **Math Nodes**: Perform calculations and data transformations
- **Time-based Animations**: Create smooth transitions and animations
- **Persistent State**: Node graphs automatically save and restore with scene data

### Usage
1. Access the interaction editor from the bottom panel of the editor
2. Right-click in the canvas to add new nodes
3. Connect nodes by dragging from outputs to inputs
4. Save your scene - node graphs persist automatically

### Architecture
- **InteractionGraph.js**: Central coordinator for interaction system
- **PatchNode.js**: Base class for all node types
- **PatchCanvas.js**: Canvas-based rendering with 2-decimal precision formatting
- **Node Types**: ObjectRotation, ObjectPosition, ObjectScale, Math operations