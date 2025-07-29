# 📁 PROJECT STRUCTURE

```text
├── node_modules                # Workspace dependencies
│
├── frontend                   # Next.js app
│   └── app
│       ├── README.md
│       ├── app                # App Router pages and layouts
│       ├── eslint.config.mjs
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── public             # Static assets
│       └── tsconfig.json
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
│
├── package-lock.json
├── package.json
├── turbo.json                # Turbo pipeline config
└── README.md
