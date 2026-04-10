# Todo List — V2 Electron + Angular + TypeScript

> Branche `v2-angular` — [Retour au main](../../tree/main)

---

## Stack

- [Electron](https://www.electronjs.org/) — framework desktop
- [Angular](https://angular.io/) + TypeScript — frontend
- Node.js `fs` — persistance JSON locale

---

## Lancer le projet

```bash
npm install
npm start
```

> `npm start` build automatiquement Angular avant de lancer Electron.

---

## Fonctionnalités

- Ajouter une tâche (bouton ou touche `Entrée`)
- Cocher / décocher une tâche comme terminée
- Supprimer une tâche
- Persistance des données dans un fichier JSON local (`userData/todo.json`)

---

## Architecture

```
src/
├── main/                            # Processus principal (Node.js)
│   ├── index.js                     # Point d'entrée — création de la BrowserWindow
│   ├── handlers/
│   │   └── todo.handler.js          # Écouteurs IPC (ipcMain.handle)
│   └── services/
│       ├── todo.service.js          # Logique métier CRUD
│       └── json.service.js          # Lecture / écriture fichier JSON
│
├── preload/                         # Pont sécurisé
│   ├── index.js                     # Exposition via contextBridge
│   └── apis/
│       └── todo.api.js              # Appels IPC (ipcRenderer.invoke)
│
├── shared/                          # Zone neutre Electron ↔ Angular
│   └── interfaces/
│       └── todo.interface.ts        # Interface Todo — source de vérité unique
│
└── renderer/                        # Projet Angular (frontend)
    ├── src/
    │   ├── app/
    │   │   ├── features/todo/       # Composant todo
    │   │   └── services/            # Services Angular
    │   └── types/
    │       └── electron/
    │           ├── todo.d.ts        # ITodoAPI — contrat de l'API Electron
    │           └── index.d.ts       # declare global Window + export {}
    └── dist/                        # Build généré (non versionné)
```

---

## Flux de données

```
Angular (UI)
  → preload/todo.api       (ipcRenderer.invoke)
    → main/todo.handler    (ipcMain.handle)
      → main/todo.service  (logique métier)
        → main/json.service  (fichier JSON local)
```

---

## Réflexions & problèmes rencontrés

### Page blanche au lancement

En lançant l'app pour la première fois après le build Angular, j'ai eu une page blanche sans aucune erreur apparente. Après investigation, j'ai compris qu'Angular génère par défaut des chemins absolus dans le `index.html` (`/main-xxx.js`). Quand Electron charge l'application via le protocole `file://`, il cherche ces fichiers depuis la racine du système de fichiers (`C:\`) au lieu du dossier de l'application.

J'ai résolu le problème en buildant Angular avec `--base-href ./` pour que tous les chemins soient relatifs au `index.html`. C'est désormais intégré directement dans le script `build:renderer` du `package.json`.

```bash
npx ng build --base-href ./
```

---

### Typage de `window.todoService` — où placer les déclarations TypeScript ?

Electron expose des fonctions au renderer via `contextBridge.exposeInMainWorld`, ce qui les rend accessibles sur `window`. Il faut donc déclarer ces types côté Angular pour que TypeScript les reconnaisse. La question était : où les mettre proprement ?

**Options que j'ai envisagées :**
- Un seul fichier `electron.d.ts` → simple mais devient vite ingérable si le projet grandit avec plusieurs features
- Dans `src/app/` → j'ai écarté cette option rapidement, ce ne sont pas des fichiers Angular mais des déclarations TypeScript globales
- Dans `src/types/` plat → mieux, mais pas scalable par feature

**Ce que j'ai retenu : dossier `shared/` + `src/types/electron/` découpé par feature**

En réfléchissant à où placer l'interface `Todo`, j'ai réalisé qu'elle n'appartient ni à Electron ni à Angular — c'est un contrat entre les deux mondes. La mettre d'un côté ou de l'autre crée une dépendance artificielle. J'ai donc opté pour une zone neutre `shared/`, unique source de vérité importée des deux côtés.

```
src/
├── shared/
│   └── interfaces/
│       └── todo.interface.ts     ← interface Todo (source de vérité unique)
└── renderer/src/
    └── types/
        └── electron/
            ├── todo.d.ts     ← ITodoAPI qui importe Todo depuis shared/
            └── index.d.ts    ← declare global Window + export {}
```

**Piège TypeScript découvert :** dès qu'un fichier `.d.ts` contient un `import`, TypeScript le traite comme un module et non plus comme une déclaration globale. Le `declare global` casse sans un `export {}` explicite à la fin de `index.d.ts`.

**Angular n'inclut pas les `.d.ts` par défaut** — le `tsconfig.app.json` généré par Angular n'inclut que les `.ts`. Il faut explicitement ajouter `"src/**/*.d.ts"` dans le tableau `include` pour que TypeScript découvre les déclarations globales :

**Pourquoi ne pas mettre `Todo` directement dans `todo.d.ts` ?** Tentant au premier abord, mais Angular n'aime pas importer des modèles métier depuis des `.d.ts`. Et mélanger déclaration d'API et modèle de données dans un même fichier rend la structure fragile dès que le projet grossit.

**Pourquoi `interfaces/` et pas `models/` ?** Le mot `models/` porte une ambiguïté — dans certains contextes il implique des classes avec logique (MVC, ActiveRecord...). Ici la règle est stricte : uniquement des `interface` TypeScript, jamais de classes, jamais de logique. `interfaces/` reflète cette décision explicitement et interdit structurellement toute dérive. De plus, c'est la convention TypeScript pour des types purs sans comportement — une `interface` ne peut par définition pas contenir de méthodes exécutables, ce qui protège contre l'erreur de mettre de la logique dans un DTO. Et c'est précisément un DTO : une "valise" qui transporte la donnée entre Electron et Angular via l'IPC, sans jamais embarquer de comportement — car les fonctions sont effacées lors de la sérialisation (*Structured Clone Algorithm*) qu'Electron applique au passage de la frontière IPC.

**Pourquoi `shared/` est à la racine `src/` et pas dans `src/renderer/` ?** J'ai d'abord créé `shared/` à l'intérieur d'Angular sans trop réfléchir. Mais en y repensant, si `shared/` est dans Angular, il n'est plus vraiment neutre — il appartient au renderer. Le but du dossier c'est d'être la zone franche entre Electron ET Angular. En le mettant à `src/shared/`, au même niveau que `main/` et `preload/`, il est structurellement indépendant des deux. Aujourd'hui le main process est en JS pur et ne peut pas importer du TypeScript directement, donc ça ne change rien en pratique — mais quand on passera le main en TypeScript avec Prisma, la structure sera déjà en place.

**Pourquoi anticiper cette structure pour une simple todo list ?** L'app est amenée à évoluer avec Prisma et d'autres features. J'ai préféré poser des fondations solides plutôt que de refactorer dans la douleur plus tard.

---

### Alias `@shared` — relier Angular au dossier partagé

Avec `shared/` en dehors du projet Angular, TypeScript ne sait pas comment résoudre les imports vers ce dossier. J'ai configuré un alias de chemin dans `tsconfig.json` :

```json
"paths": {
  "@shared/*": ["../shared/*"]
}
```

Ce qui permet d'importer proprement depuis n'importe quel fichier Angular :

```typescript
import { Todo } from '@shared/interfaces/todo.interface';
```

Sans cet alias, TypeScript se plaint que les fichiers importés sont en dehors du `rootDir`. Il a aussi fallu fixer `rootDir: ".."` dans `tsconfig.app.json` et `tsconfig.spec.json` pour que TypeScript accepte que la compilation couvre à la fois `src/renderer/` et `src/shared/`.

---

### `resource()` Angular — écarté car expérimental

J'ai envisagé d'utiliser `resource()` d'Angular 19+ pour gérer l'async de façon plus réactive. C'est conceptuellement très propre — ça expose `.isLoading()`, `.status()`, `.value()` directement en signals. Mais le tag `@experimental` dans la doc officielle m'a convaincu de ne pas l'utiliser pour ce projet. Il est prévu qu'il soit stable en 2026.

---

### Pattern Optimistic UI pour les mutations

Pour `add`, `toggle` et `delete`, j'ai choisi de ne pas recharger toute la liste depuis Electron après chaque action. À la place, je mets à jour le signal localement après confirmation du backend :

- **`add`** — le backend renvoie la tâche créée avec son ID généré, on l'ajoute directement au signal
- **`toggle`** — on inverse `!t.todo` localement après que le backend confirme sans erreur
- **`delete`** — on filtre localement après confirmation

La clé : on est sur Electron, pas sur du web. L'IPC est local, fiable, pas de risque réseau. Le pattern "no error = success" est donc parfaitement valide — si le backend plante, il throw, l'IPC propage l'erreur, le `catch` l'attrape et le signal reste intact. Zéro désynchronisation possible.

---

### VS Code perdu sur le projet Angular

En ouvrant le projet depuis la racine Electron, VS Code ne proposait aucune aide sur les fichiers Angular — pas d'autocomplétion, pas de diagnostics. J'ai compris que l'Angular Language Service a besoin que `angular.json` soit à la racine du dossier ouvert pour s'activer correctement.

J'ai mis en place un workspace multi-root `.vscode/todolist.code-workspace` qui expose à la fois le projet Electron et le dossier `src/renderer/` comme racines séparées. VS Code reconnaît alors les deux projets correctement dans la même fenêtre.

---

## Partenaire de réflexion

Ce projet a été développé avec l'aide de **Claude** (Anthropic) comme partenaire de réflexion sur les choix d'architecture — structure des dossiers, organisation des types TypeScript, intégration Electron/Angular. Les décisions finales restent les miennes, mais les échanges ont permis d'aller chercher les bonnes pratiques de l'industrie et de comprendre le pourquoi derrière chaque choix plutôt que de juste appliquer une recette.
