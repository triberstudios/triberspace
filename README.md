# 📁 PROJECT STRUCTURE

```text
├── node_modules                # Workspace dependencies
│
├── frontend                   
│   ├── app                    # Main application (triber.space)
│   │   ├── README.md
│   │   ├── app                # App Router pages and layouts
│   │   ├── components         # UI components
│   │   ├── eslint.config.mjs
│   │   ├── next-env.d.ts
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── postcss.config.mjs
│   │   ├── public             # Static assets
│   │   └── tsconfig.json
│   │
│   └── engine                 # Triber Engine (engine.triber.space)
│       ├── index.html         # Three.js engine entry
│       ├── js/                # Engine JavaScript modules
│       ├── css/               # Engine styles
│       └── package.json
│
├── backend
│   ├── api                    # Fastify API server
│   └── game-server            # Colyseus + LiveKit server
│
├── packages                   # Shared internal packages
│   ├── auth                   # Better Auth config
│   ├── database               # Drizzle ORM schema + client
│   ├── ui-components          # shadcn/ui + 3D component system
│   └── utils                  # Shared helpers and types
│
├── docs                       # Project documentation
│   ├── architecture.md        # System architecture diagram
│   ├── documentation.md       # Main project documentation
│   ├── backend-docs.md        # API documentation
│   └── schema-docs.md         # Database schema
│
├── package-lock.json
├── package.json
├── turbo.json                # Turbo pipeline config
├── CLAUDE.md                  # AI assistant instructions
└── README.md
