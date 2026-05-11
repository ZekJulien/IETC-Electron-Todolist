# Todo List — V5 Electron Forge

> Branche `v5-electron-forge` — [Retour au main](../../tree/main) — [V4 Prisma](../../tree/v4-prisma)

---

## Stack

- [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) — framework desktop + build tooling officiel
- [Angular](https://angular.io/) + TypeScript — frontend
- TypeScript intégral — main, preload, shared et renderer
- [Vite](https://vitejs.dev/) — bundler géré par Electron Forge
- [Prisma ORM](https://www.prisma.io/) + SQLite — persistance

---

## Lancer le projet

```bash
npm install
npm run prisma:generate
npm start
```

> `npm install` installe les dépendances et les dépendances du renderer Angular automatiquement.  
> `prisma:generate` régénère le client TypeScript depuis le schéma.  
> Les migrations sont appliquées automatiquement à la DB utilisateur au démarrage via `migrator.ts`.

**Modifier le schéma ?** Après chaque modification de `prisma/schema/` :
```bash
npm run prisma:migrate
```

> `prisma:migrate` utilise `DATABASE_URL` défini dans `prisma.config.ts` (`file:./todo.db` par défaut). Pour personnaliser, créer un `.env` depuis `.env.example` — cette DB n'est jamais utilisée par l'app, uniquement par la CLI Prisma.

---

## Fonctionnalités

- Ajouter une tâche (bouton ou touche `Entrée`)
- Cocher / décocher une tâche comme terminée
- Supprimer une tâche
- Persistance des données dans une base SQLite via Prisma

---

## Architecture

```
src/
├── main/                            # Processus principal (Node.js) — TypeScript
│   ├── index.ts                     # Point d'entrée Electron — lifecycle + window
│   ├── bootstrap.ts                 # Composition root — câble DI, retourne PrismaClient
│   ├── core/
│   │   └── db.ts                    # Infrastructure transversale — singleton PrismaClient, initDb() + getDb()
│   ├── database/
│   │   └── migrator.ts              # Migration runner — applique les migrations au démarrage
│   ├── dependencies/
│   │   ├── index.ts                          # buildDependencies() + AppDependencies
│   │   ├── todo.repository.dependency.ts     # makeTodoRepository() — appelle getDb()
│   │   └── todo.service.dependency.ts        # makeTodoService() — appelle makeTodoRepository()
│   ├── handlers/
│   │   ├── index.ts                 # Barrel — registerAllHandlers (fan-out IPC)
│   │   └── todo.handler.ts          # Écouteurs IPC todo (ipcMain.handle)
│   ├── repositories/
│   │   ├── index.ts                 # Barrel
│   │   └── todo.repository.ts       # Accès données — wrape Prisma, isole @prisma/client
│   └── services/
│       ├── index.ts                 # Barrel
│       └── todo.service.ts          # Logique métier CRUD — async, délègue au repository
│
├── preload/                         # Pont sécurisé — TypeScript
│   ├── index.ts                     # Exposition via contextBridge
│   └── apis/
│       └── todo.api.ts              # Appels IPC (ipcRenderer.invoke)
│
├── shared/                          # Zone neutre Electron ↔ Angular — TypeScript
│   ├── interfaces/
│   │   ├── todo.interface.ts        # Modèle de données Todo
│   │   └── todo-api.interface.ts    # Contrat IPC ITodoAPI — preload ↔ renderer
│   └── channels/
│       └── todo.channels.ts         # Constantes TODO_CHANNELS — preload ↔ main
│
└── renderer/                        # Projet Angular (frontend) — inchangé
    └── src/app/

prisma/
├── schema/
│   ├── base.prisma                  # Generator + datasource — config technique
│   └── todo.prisma                  # Modèle Todo isolé
├── migrations/                      # Historique SQL versionné — embarqué dans l'app
└── generated/                       # Client TypeScript généré — ne pas éditer
```

---

## Flux de données

```
Angular (UI)
  → preload/todo.api         (ipcRenderer.invoke)
    → main/todo.handler      (ipcMain.handle)
      → main/todo.service    (logique métier — async)
        → main/todo.repository  (accès données — wrape Prisma)
          → Prisma Client        (ORM)
            → SQLite (todo.db)
```

---

## Réflexions & problèmes rencontrés

### `electron-forge import` ne fait pas tout

`electron-forge import` migre un projet Electron existant en mode **minimal** : il ajoute les makers (`.exe`, `.deb`, `.rpm`, `.dmg`), les scripts `start`/`package`/`make`, `forge.config.js` et `electron-squirrel-startup`. Il ne touche pas au bundler — il ne sait pas si tu utilises Vite, webpack, ou rien.

Pour avoir Vite géré par Forge, il faut ajouter `@electron-forge/plugin-vite` manuellement et configurer `forge.config.ts` avec le `VitePlugin`. Si on avait créé le projet from scratch avec le template officiel (`npm create electron-app@latest -- --template=vite-typescript`), tout aurait été pré-configuré. En migrant depuis un projet existant, on câble manuellement.

**Ce que Forge apporte vs notre setup v4 :**
- `electron-forge start` → rebuild automatique des modules natifs (`better-sqlite3`) + lance Electron — plus besoin de `@electron/rebuild` en postinstall
- `forge.config.ts` en TypeScript → remplace `vite.main.config.ts` / `vite.preload.config.ts` individuels comme point d'entrée central
- Les configs Vite passent en `.mts` (ES modules) — Forge les charge différemment
- `electron-forge make` → produit les binaires distribuables pour chaque plateforme
- `renderer: []` dans VitePlugin → on garde Angular CLI pour le renderer, Forge ne le gère pas

### Warning `inlineDynamicImports` — bug connu Forge v7 + Vite 8

Au démarrage, un warning apparaît :
```
WARN  inlineDynamicImports option is deprecated, please use codeSplitting: false instead.
```

Ce warning vient du VitePlugin de Forge v7 qui passe `inlineDynamicImports: true` en interne lors du build du preload — option dépréciée dans rolldown (Vite 8). Forge v7 cible officiellement Vite 7 ; le support Vite 8 est en cours (suivi dans [electron/forge#4166](https://github.com/electron/forge/issues/4166)). L'app fonctionne correctement, c'est purement cosmétique.

---

## Partenaire de réflexion

Ce projet a été développé avec l'aide de **Claude** (Anthropic) comme partenaire de réflexion sur les choix d'architecture. Les décisions finales restent les miennes, mais les échanges ont permis de comprendre le pourquoi derrière chaque choix plutôt que d'appliquer une recette.
