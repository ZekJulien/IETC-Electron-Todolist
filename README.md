# Todo List — V4 Prisma

> Branche `v4-prisma` — [Retour au main](../../tree/main) — [V3 Full TypeScript](../../tree/v3-full-typescript)

---

## Stack

- [Electron](https://www.electronjs.org/) — framework desktop
- [Angular](https://angular.io/) + TypeScript — frontend
- TypeScript intégral — main, preload, shared et renderer
- [Vite](https://vitejs.dev/) — bundler pour main et preload (remplace `tsc -b`)
- [Prisma ORM](https://www.prisma.io/) + SQLite — persistance (remplace `JsonService`)

---

## Lancer le projet

```bash
npm install
npm run prisma:migrate
npm start
```

> `npm install` déclenche automatiquement `postinstall` qui recompile `better-sqlite3` pour le Node embarqué par Electron.  
> `prisma:migrate` génère le fichier SQL dans `prisma/migrations/` et régénère le client TypeScript — `prisma:generate` séparé est inutile.  
> `npm start` bundle main et preload via Vite, build Angular, puis lance Electron.  
> Les migrations sont appliquées automatiquement à la DB utilisateur au démarrage via `migrator.ts`.

**Quand relancer `prisma:migrate` ?** Uniquement quand le schéma change. La DB locale `./todo.db` créée par le CLI n'est jamais utilisée par l'app — c'est un effet de bord inévitable de `prisma migrate dev`. L'app tourne toujours sur `app.getPath('userData')/todo.db`.

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

.vite/build/                         # Sortie Vite (non versionné)
├── main.js                          # Main process bundlé (CJS)
└── preload.js                       # Preload bundlé (CJS)
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

### Pourquoi Vite remplace `tsc -b` pour main et preload

Prisma v7 a changé son générateur. L'ancien (`prisma-client-js`) produisait du CommonJS. Le nouveau (`prisma-client-ts`) génère du TypeScript ESM pur avec des `import.meta.url` — une syntaxe ESM qui n'existe pas en CJS.

`tsc -b` compile fichier par fichier. Il ne peut pas convertir `import.meta.url` en CJS. Vite est un **bundler** : il analyse toutes les dépendances, les inline dans un seul fichier, et traduit `import.meta.url` → `__dirname` pendant le bundle. C'est pour ça que Vite est nécessaire dès qu'on utilise Prisma v7.

`tsc-alias` disparaît avec lui — Vite résout les alias `@shared/*` nativement via `resolve.alias`. Les `tsconfig.json` restent en place mais uniquement pour le **type-checking** (IDE, erreurs TypeScript) — ils ne pilotent plus le build.

---

### `emptyOutDir: false` — deux builds dans le même dossier

Main et preload ont tous les deux `outDir: '.vite/build'`. Par défaut Vite vide l'`outDir` avant chaque build. Sans `emptyOutDir: false`, le build preload efface le `main.js` produit juste avant, et Electron ne trouve plus son point d'entrée.

La solution : désactiver le nettoyage automatique sur les deux configs. Les deux fichiers cohabitent dans `.vite/build/` sans se supprimer.

---

### Le chemin du preload change avec Vite

Avec `tsc -b`, le main compilait dans `dist/main/` et le preload dans `dist/preload/`. Le chemin dans `index.ts` était donc `../preload/index.js`.

Avec Vite, les deux bundles atterrissent **au même niveau** dans `.vite/build/` :
```
.vite/build/
├── main.js
└── preload.js
```

`__dirname` dans le bundle main vaut `.vite/build/`. Le chemin devient simplement `preload.js` — plus de remontée de dossier.

---

### `/^node:/` en external — le piège du mode "client" Vite

Par défaut Vite build en environnement "client" (browser). Il détecte les imports `node:path`, `node:fs` et les externalise avec des stubs vides pour compatibilité browser. Résultat : `import path from 'node:path'` compile en `u.default.join(...)` où `u.default` est `undefined` — crash au démarrage.

En ajoutant `/^node:/` à la liste des externals de rolldown, Vite laisse tous les imports `node:*` sous forme de `require('node:path')` dans le bundle. Electron/Node les résout correctement au runtime.

---

### DI manuelle inspirée FastAPI — `dependencies/` comme composition root distribuée

En FastAPI, `Depends()` permet d'enchaîner les dépendances sans jamais passer manuellement l'objet DB :

```python
def get_repo(db = Depends(get_db)): return TodoRepository(db)
def get_service(repo = Depends(get_repo)): return TodoService(repo)
```

Le framework résout le graphe automatiquement. En TypeScript sans conteneur DI, ce mécanisme n'existe pas nativement — mais on peut s'en approcher avec le pattern `getDb()` + `dependencies/`.

**La clé : confiner `getDb()` dans la couche `dependencies/`, pas dans les repositories.**

```
core/db.ts                          → infrastructure transversale — singleton prisma, initDb() + getDb()
dependencies/
  todo.repository.dependency.ts     → makeTodoRepository() appelle getDb(), injecte dans le repo
  todo.service.dependency.ts        → makeTodoService() appelle makeTodoRepository()
  index.ts                          → buildDependencies() — graphe complet, sans prisma en paramètre
repositories/
  todo.repository.ts                → reçoit prisma par constructeur — ne connaît pas getDb()
services/
  todo.service.ts                   → reçoit le repo par constructeur — ne connaît pas prisma
```

`TodoRepository` reste pur et testable — il reçoit `prisma` par constructeur. C'est la couche `dependencies/` qui appelle `getDb()`, c'est son rôle. Les handlers ne voient que les services. Les services ne voient que les repos. Les repos ne voient que Prisma.

**Pourquoi pas le Service Locator ?** Si le repo lui-même appelait `getDb()`, ses dépendances seraient cachées — on verrait un constructeur vide mais une dépendance implicite sur un état global. Ici `getDb()` est appelé dans `dependencies/` dont c'est explicitement le rôle de résoudre le graphe.

**Le résultat** : `bootstrap.ts` fait `initDb(prisma)` puis `buildDependencies()` sans jamais threader `prisma` à travers chaque fonction. Ajouter une feature = créer `user.repository.dependency.ts`, ajouter une ligne dans `buildDependencies()`. `bootstrap.ts` ne grossit jamais.

---

### Le pattern Repository — Prisma reste dans sa couche

`@prisma/client` n'est importé que dans `todo.repository.ts`. Les handlers IPC et `TodoService` ne voient jamais un type Prisma. `shared/Todo` est le DTO qui voyage sur le pont IPC — si demain on change d'ORM, seul le repository change, les handlers, services et le renderer restent intacts.

Un `PrismaService` wrapper avait été envisagé mais écarté : il n'ajoutait aucune logique, juste une couche supplémentaire. L'instance `PrismaClient` est créée directement dans `bootstrap.ts` (la composition root) et passée au repository par injection de dépendances. `bootstrap()` retourne l'instance pour que `index.ts` puisse appeler `$disconnect()` sur `before-quit`.

---

### `moduleFormat = "cjs"` et `@prisma/client` en external — deux problèmes distincts

Deux erreurs successives, deux causes différentes.

**Problème 1** : `import.meta.url` est `undefined` dans le bundle CJS. Prisma v7 génère du code ESM par défaut. Rolldown (le bundler de Vite 8) ne traduit pas `import.meta.url` en son équivalent CJS. Première tentative : `define: { 'import.meta.url': ... }` — évité car trop proche du sparadras. Vraie solution : `moduleFormat = "cjs"` dans le generator Prisma demande à Prisma de générer directement du CommonJS pour les fichiers TypeScript du client.

**Problème 2** : après `moduleFormat = "cjs"`, le WASM query compiler de Prisma (`query_compiler_fast_bg.sqlite.js`) utilise encore `import.meta.url` dans son propre loader — ce fichier vit dans `@prisma/client/runtime/`, pas dans le client généré. Solution : ajouter `/^@prisma\/client/` aux externals de Vite. Le runtime Prisma n'est plus bundlé — Node le charge dynamiquement depuis `node_modules` en contexte ESM natif où `import.meta.url` est correctement défini.

Ces deux fixes sont complémentaires et distincts : l'un corrige les fichiers générés, l'autre corrige le runtime du package.

---

### `better-sqlite3` et `@electron/rebuild` — modules natifs avec Electron

`better-sqlite3` est un module natif : du C++ compilé en fichier `.node` pour une version spécifique de l'ABI Node.js. Electron embarque sa propre version de Node, différente de celle du système. Le `.node` compilé par `npm install` (pour le Node système) est incompatible avec le Node d'Electron — crash au démarrage.

`@electron/rebuild` recompile les modules natifs spécifiquement pour la version Node embarquée par Electron. C'est ce que Electron Forge fait automatiquement au démarrage — en faisant sans Electron Forge, on le gère manuellement avec `npx electron-rebuild -f -w better-sqlite3`. À ajouter comme script `postinstall` pour automatiser après chaque `npm install`.

---

### Multi-file schema — un fichier par modèle Prisma

Par défaut `prisma init` génère un seul `schema.prisma` qui contient le generator, le datasource et tous les modèles. Pour un projet à un seul modèle c'est lisible. Dès qu'on dépasse 4-5 modèles, le fichier devient un enfer à naviguer.

Prisma v7 supporte nativement les schemas multi-fichiers — il suffit de pointer `prisma.config.ts` vers un dossier plutôt qu'un fichier :

```
prisma/
└── schema/
    ├── base.prisma    ← generator + datasource uniquement
    └── todo.prisma    ← model Todo isolé
```

`base.prisma` ne contient que la config technique (provider, output). Chaque modèle a son propre fichier. Demain on ajoute `user.prisma`, `tag.prisma` — chaque fichier est autonome, on ne touche pas aux autres.

Le client généré atterrit dans `prisma/generated/` plutôt que dans `src/` — les outputs auto-générés n'ont pas leur place dans le code source écrit à la main. `src/` reste réservé au code qu'on écrit, `prisma/` regroupe tout l'écosystème Prisma : schema, migrations, client généré.

---

### Migrations au runtime — le problème des deux bases

`prisma migrate dev` crée et applique les migrations sur un fichier DB local (`todo.db` à la racine du projet, chemin défini dans `.env`). Mais au runtime, l'app ouvre une DB dans `app.getPath('userData')` — un chemin différent, propre à chaque OS et chaque utilisateur. Ces deux fichiers sont distincts.

Résultat : au premier lancement, la DB de l'utilisateur est vide, sans tables. Il faut appliquer les migrations au démarrage de l'app.

**Prisma n'a pas d'API publique pour ça.** Citation de la discussion GitHub officielle : *"There is no programmatic interface to Prisma migrate — the only way to run prisma migrate deploy on app start is to fork a new process."* Les options :

- **Raw SQL manuel** (`CREATE TABLE IF NOT EXISTS`) — simple mais on duplique ce que Prisma a déjà généré
- **Lire et exécuter les fichiers SQL de migration** — le SQL vient de Prisma, on ne l'écrit pas à la main ← retenu
- **Child process `prisma migrate deploy`** — correct mais nécessite les binaires Prisma en prod (~70 MB)

**Solution retenue : `src/main/database/migrator.ts`**

Au démarrage, le migrator lit les dossiers `prisma/migrations/` triés par nom (les noms sont des timestamps Prisma : `20260507204102_init` → ordre alphabétique = ordre chronologique), vérifie lesquels ont déjà été appliqués via une table `_prisma_migrations`, et exécute les SQL en attente.

La table `_prisma_migrations` elle-même est créée avec du raw SQL — c'est inévitable : c'est une table de tracking qui doit exister avant toute migration, elle ne peut pas être dans le schéma Prisma. C'est d'ailleurs exactement ce que fait le Prisma CLI en interne. Tous les outils de migration (Alembic, Flyway, Liquibase) font pareil.

Les fichiers de migration étant de petits fichiers texte inclus dans le package Electron, cette approche fonctionne aussi bien en dev qu'en production sans binaires supplémentaires.

**Pourquoi `database/` et pas `utils/` ou `bootstrap.ts`**

Ce code n'est ni de la logique métier (pas dans `services/`), ni de l'accès aux données du domaine (pas dans `repositories/`), ni du wiring (pas dans `bootstrap.ts`). C'est de l'infrastructure technique liée à la base de données. Un dossier `database/` regroupe ce type de préoccupations sans les mélanger avec le reste.

---

## Conclusion — Ce que cette branche apporte et ses limites

### Ce qui est solide

L'architecture est cohérente de bout en bout : chaque couche a une responsabilité unique, les dépendances vont toujours dans le bon sens, et ajouter une feature future est un workflow prévisible (un `.prisma`, un `.repository.ts`, un `.repository.dependency.ts`, un `.service.ts`, un `.service.dependency.ts`, une ligne dans `buildDependencies()`).

La DI est réelle — les repositories et services sont testables de manière isolée, `bootstrap.ts` restera court pour toujours, et le pattern `core/db.ts` + `dependencies/` se rapproche autant que possible du `Depends()` de FastAPI sans conteneur DI.

### Les limites honnêtes

- **`electron-rebuild` manuel** — chaque clone du projet nécessite `npx electron-rebuild -f -w better-sqlite3`. Un script `postinstall` réglerait ça.
- **Migration runner custom** — on a réimplémenté ce que Prisma ne fournit pas. Le code fonctionne mais un edge case (SQL avec `;` dans une string) pourrait poser problème sur des schémas plus complexes.
- **Pas de hot reload** — chaque modification nécessite un `npm start` complet. Electron Forge ou `electron-vite` résout ça.
- **`@prisma/client` en external** — contournement nécessaire pour éviter le problème WASM/`import.meta.url` avec rolldown. Fonctionne mais fragile si Prisma change son packaging.

### Ce qui vient après — V5

La v5 alignera le tooling avec l'écosystème réel : **Electron Forge + Vite** ou **electron-vite**. Ces outils gèrent automatiquement la recompilation des modules natifs, apportent le hot reload en dev, et produisent un binaire distributable propre. L'architecture construite ici (DI, repositories, dependencies, migrator) survit complètement à ce changement de build tool — c'est justement l'intérêt d'une séparation des couches bien faite.

---

## Partenaire de réflexion

Ce projet a été développé avec l'aide de **Claude** (Anthropic) comme partenaire de réflexion sur les choix d'architecture. Les décisions finales restent les miennes, mais les échanges ont permis de comprendre le pourquoi derrière chaque choix plutôt que d'appliquer une recette.
