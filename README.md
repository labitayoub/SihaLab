# Sihalab - Medical Platform

Plateforme médicale avec backend NestJS et frontend React TypeScript.

## Structure du projet

```
Sihalab/
├── backend/          # API NestJS (Port 3000)
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   └── app.service.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
└── frontend/         # Application React + TypeScript (Port 5173)
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── App.css
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

## Installation et Démarrage

### Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

Le backend sera accessible sur http://localhost:3000

### Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

Le frontend sera accessible sur http://localhost:5173

## Technologies utilisées

### Backend
- NestJS 11.x
- TypeScript 5.x
- Node.js

### Frontend
- React 19.x
- TypeScript 5.x
- Vite 6.x
- CSS3

## Scripts disponibles

### Backend
- `npm run start:dev` - Démarre le serveur en mode développement avec hot-reload
- `npm run build` - Compile le projet
- `npm run start:prod` - Démarre le serveur en mode production

### Frontend
- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Compile pour la production
- `npm run preview` - Prévisualise la version de production
