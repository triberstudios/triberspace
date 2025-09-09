# Triber Editor

The Triber Editor is a forked and customized version of the three.js editor, designed specifically for creating immersive 3D experiences within the Triber ecosystem.

## Features

- **3D Scene Creation**: Build immersive 3D environments
- **Asset Management**: Import and manage 3D models, textures, and media
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

### Integration with Triber Platform

The editor integrates with the Triber ecosystem through:
- **Experience Publishing**: Export experiences to the main platform
- **Asset Storage**: Upload assets to Cloudflare R2
- **Authentication**: Single sign-on with main Triber account

## Customization

This editor has been customized from the original three.js editor with:
- Triber branding and styling
- Experience-focused workflows
- Template system for different experience types
- Publishing integration with Triber platform

## Future Enhancements

Planned features include:
- AI-assisted scene generation
- Node-based behavior editor
- Template marketplace
- Collaborative editing