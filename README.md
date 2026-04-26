# Todo List — V3 Full TypeScript

> Branche `v3-full-typescript` — [Retour au main](../../tree/main) — [V2 Angular](../../tree/v2-angular)

---

## Stack

- [Electron](https://www.electronjs.org/) — framework desktop
- [Angular](https://angular.io/) + TypeScript — frontend
- TypeScript intégral — main, preload, shared et renderer
- Node.js `fs` — persistance JSON locale

---

## Lancer le projet

```bash
npm install
npm start
```

> `npm start` compile `shared`, `preload` et `main` via `tsc -b`, build Angular, puis lance Electron.

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
├── main/                            # Processus principal (Node.js) — TypeScript
│   ├── tsconfig.json                # Projet TS, cible CommonJS
│   ├── index.ts                     # Point d'entrée Electron — lifecycle + window
│   ├── bootstrap.ts                 # Composition root — instancie services, câble handlers
│   ├── handlers/
│   │   ├── index.ts                 # Barrel — registerAllHandlers (fan-out IPC)
│   │   └── todo.handler.ts          # Écouteurs IPC todo (ipcMain.handle)
│   └── services/
│       ├── index.ts                 # Barrel — exporte tous les services
│       ├── todo.service.ts          # Logique métier CRUD (DI : reçoit JsonService)
│       └── json.service.ts          # Lecture / écriture JSON générique
│
├── preload/                         # Pont sécurisé — TypeScript
│   ├── tsconfig.json                # Projet TS, cible CommonJS, référence shared
│   ├── index.ts                     # Exposition via contextBridge
│   └── apis/
│       └── todo.api.ts              # Appels IPC (ipcRenderer.invoke)
│
├── shared/                          # Zone neutre Electron ↔ Angular — TypeScript
│   ├── tsconfig.json                # Projet TS composite, émet des .d.ts
│   ├── interfaces/
│   │   ├── todo.interface.ts        # Modèle de données Todo
│   │   └── todo-api.interface.ts    # Contrat IPC ITodoAPI — preload ↔ renderer
│   └── channels/
│       └── todo.channels.ts         # Constantes TODO_CHANNELS — preload ↔ main
│
└── renderer/                        # Projet Angular (frontend)
    ├── src/app/                     # Composants, services Angular
    └── dist/                        # Build Angular (non versionné)

dist/                                # Sortie des projets TS composite (non versionné)
├── shared/
├── preload/
└── main/
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

### Pourquoi un tsconfig par sous-projet plutôt qu'un tsconfig unique à la racine ?

En migrant main et preload en TypeScript, mon premier réflexe a été un seul `tsconfig.json` à la racine pour couvrir tout le repo. Vite écarté : chaque zone du projet a une **cible de compilation différente**. Le preload et le main tournent dans Node et ont besoin de `module: CommonJS`. Le renderer Angular bundle en ESNext via l'Angular CLI avec sa propre résolution. Shared n'émet que des déclarations. Mettre tout dans un seul tsconfig forcerait des compromis sur chaque option et des `overrides` partout.

La structure retenue : un projet TS par sous-dossier, chacun avec son `tsconfig.json`, sa cible de module et son `outDir` — `src/main/`, `src/preload/` et `src/shared/` compilent indépendamment vers `dist/`, tandis que `src/renderer/` reste piloté par l'Angular CLI avec son propre tsconfig. Chaque zone a un contrat clair avec le compilateur, sans polluer les autres.

---

### Importer des types depuis `shared/` — l'erreur `TS6059` et pourquoi `import type` ne la résout pas

Quand j'ai voulu importer `Todo` depuis `@shared/interfaces` dans le preload, tsc a refusé avec `TS6059: File '.../shared/interfaces/index.ts' is not under 'rootDir'`. La raison est simple : le `rootDir` du preload est `src/preload/`, et `shared/` est en dehors de ce scope.

**Pourquoi `import type` n'aide pas** — mon premier réflexe a été d'utiliser `import type`, qui efface l'import à la compilation. Mais la vérification `rootDir` se fait au **chargement** du fichier pour le type-checking, **pas à l'émission**. tsc doit ouvrir `todo.interface.ts` pour comprendre ce qu'est `Todo`, et à ce moment-là il détecte que le fichier est hors scope — bien avant l'étape où l'import serait effacé. `import type` change ce qui est émis, pas ce qui est chargé.

**Options envisagées :**

- **Renommer shared en `.d.ts`** — les fichiers `.d.ts` échappent au check `rootDir` car ce sont des déclarations pures, jamais émises. Simple et cohérent avec "shared = types purs". Écarté parce que ça ne scale pas : dès que shared contiendra des **valeurs** runtime (constantes de canaux IPC, helpers partagés), il faudra rebasculer toute la structure. Autant poser la bonne fondation tout de suite.

- **Élargir `rootDir` à `src/`** — l'erreur disparaît mais la sortie devient `dist/preload/preload/index.js` (dossier doublé, moche), et tsc émet des `.js` vides pour shared dans le dist du preload en doublon pour rien. Bancal.

- **Project references avec `composite: true`** — la solution officielle TypeScript pour les repos multi-projets. Retenue.

---

### Project references et `composite: true`

Chaque projet TS référencé déclare `"composite": true`, émet ses `.d.ts`, et les projets consommateurs déclarent `"references": [{ "path": "../shared" }]`. tsc considère alors les fichiers de shared comme "gérés par un autre projet" — plus d'erreur `rootDir` dans le preload, même avec un import classique.

En pratique :
- `src/shared/tsconfig.json` reçoit `"composite": true"`, `"declaration": true"`, `"declarationMap": true"` et émet vers `dist/shared/`. Le `declarationMap` permet aux "go to definition" depuis preload ou main de remonter à la source `.ts` de shared, pas au `.d.ts` compilé.
- `src/preload/tsconfig.json` (et plus tard `src/main/tsconfig.json`) ajoutent `"references": [{ "path": "../shared" }]`.
- La build passe de `tsc -p` à `tsc -b` (build mode) qui gère l'ordre de compilation et le cache incrémental via des fichiers `*.tsbuildinfo`.

C'est le pattern utilisé par VS Code, Babel, et les gros monorepos TS. Ça peut sembler overkill pour une todolist, mais c'est la base saine pour tout repo TS multi-zone — et ça pose la bonne structure pour quand d'autres projets partagés s'ajouteront (helpers communs, validators, types d'événements, etc.).

---

### `moduleResolution: "node"` déprécié — `Node16` vs `NodeNext`

TypeScript 6.0 a déprécié les anciennes valeurs `moduleResolution: "node"` / `"node10"` avec un warning qui rougit les tsconfig : *"will stop functioning in TypeScript 7.0"*. Il faut passer à une valeur moderne : **`Node16`**, **`NodeNext`** ou **`Bundler`**.

`Bundler` est hors-jeu ici — c'est réservé aux codes qui passent par un bundler type webpack/esbuild/vite. Main, preload et shared tournent directement dans Node (celui d'Electron), sans bundler. Reste le choix entre `Node16` et `NodeNext`.

**Point clé : quel Node doit-on cibler ?**

Il y a deux Node en jeu, et c'est facile de se tromper :
- Le Node de la machine qui exécute `tsc` (chez moi Node 25) — il n'exécute **jamais** le code compilé, il ne fait que compiler. Sa version n'a aucune importance pour le choix de `moduleResolution`.
- Le Node **intégré à Electron** qui exécute les `.js` produits dans `dist/`. Electron 41 embarque Node 22.

C'est **uniquement** le second qui compte pour le choix de `module` et `moduleResolution`.

**Pourquoi `Node16` plutôt que `NodeNext` :**

- `Node16` fixe un **plancher clair** — garantit du code qui tourne à partir de Node 16, donc largement couvert par le Node 22 d'Electron
- `NodeNext` est une **cible mouvante** — suit la dernière version Node supportée par la version de TS installée. Peut émettre des constructions que des Node plus anciens ne comprennent pas, et son comportement peut changer entre releases de TS
- Aucun gain pratique de `NodeNext` dans ce projet : toutes les features dont j'ai besoin sont supportées dès Node 16
- Si un jour je rollback Electron vers une version plus ancienne, `Node16` tient, `NodeNext` potentiellement pas

Config retenue dans `shared/`, `preload/` et (à venir) `main/` :

```json
"module": "Node16",
"moduleResolution": "Node16"
```

`module: "Node16"` émet automatiquement en **CommonJS ou ESM par fichier** selon le `"type"` de `package.json` (ici `"commonjs"`) ou l'extension (`.cts` forcé CJS, `.mts` forcé ESM). Donc concrètement mon JS émis reste du CommonJS, exactement comme avant, juste avec la résolution moderne qui supporte les `exports` de `package.json` et gère mieux l'interop.

---

### Le piège `paths` non réécrit au runtime

TypeScript résout les alias `paths` (`@shared/*`) à la compilation pour le type-checking, mais **ne les réécrit PAS** dans le JS émis. Si le preload contient `import { Todo } from '@shared/interfaces'`, le JS compilé contient littéralement `require('@shared/interfaces')` — ce que Node ne sait pas résoudre.

Tant que les imports depuis shared sont **uniquement des types** (effacés à la compilation via `import type`), aucun problème runtime : l'import disparaît avant que Node ne touche au code. C'est le cas actuellement pour `Todo`.

Mais dès que shared contiendra des **valeurs** — typiquement les constantes de canaux IPC (`TODO_CHANNELS.GET_ALL` etc.) pour éviter les fautes de frappe silencieuses entre preload et handler main — le problème ressurgira avec un `Cannot find module '@shared/...'` au lancement de l'app.

**Options envisagées :**
- **`tsc-alias`** en post-build qui réécrit les alias en chemins relatifs dans le JS émis. **Retenu.**
- **Imports relatifs** directs (`../../shared/...`) dans les zones runtime — moche et casse la cohérence avec Angular qui utilise l'alias.
- **npm workspaces** transformant shared en vrai package `@app/shared` résolu comme un module Node — overkill pour le scope actuel.

**Solution appliquée : `tsc-alias`.** Petit outil (~30 kB) qui ouvre les `.js` émis par tsc et **réécrit chaque alias en chemin relatif** depuis l'emplacement du fichier compilé :

```js
// Avant tsc-alias
const channels_1 = require("@shared/channels");
// Après tsc-alias
const channels_1 = require("../../shared/channels");
```

Build chaîné dans `package.json` :
```json
"build:preload": "tsc -b src/preload && tsc-alias -p src/preload/tsconfig.json",
"build:main":    "tsc -b src/main    && tsc-alias -p src/main/tsconfig.json"
```

Vérifié par recherche industrie (issue officielle TypeScript #55432, articles 2026) : `tsc-alias` est le **standard de facto** pour les projets Node + TS avec aliases. Aucun risque, ergonomie inchangée côté code (l'alias `@shared/*` reste partout, pas de mix avec des imports relatifs).

Côté Angular : aucune modif nécessaire — webpack/esbuild résout déjà les alias automatiquement à la compilation.

---

### `as const` plutôt que `enum` pour les constantes partagées

Pour centraliser les canaux IPC dans `shared/` (pour que preload et main pointent sur les mêmes strings et que TypeScript rattrape toute faute de frappe), mon premier réflexe a été `enum`. Mais en creusant :

- Les `string enum` TS génèrent un objet **bidirectionnel** au runtime (inverse mapping) totalement inutile ici
- Mauvaise tree-shakeability
- L'équipe TypeScript elle-même déconseille les enums dans les projets modernes — c'est une construction antérieure aux unions littérales

Implémenté avec `as const` dans `src/shared/channels/todo.channels.ts` — produit un objet runtime minimal et dérive un type union strict :

```ts
export const TODO_CHANNELS = {
  GET_ALL: 'todo:getAll',
  ADD:     'todo:add',
  TOGGLE:  'todo:toggle',
  DELETE:  'todo:delete',
} as const

export type TodoChannel = typeof TODO_CHANNELS[keyof typeof TODO_CHANNELS]
```

Consommé identiquement des deux côtés :

```ts
// preload
ipcRenderer.invoke(TODO_CHANNELS.GET_ALL)

// main
ipcMain.handle(TODO_CHANNELS.GET_ALL, () => todoService.getAll())
```

Résultat : un seul endroit pour les strings IPC, un type union strict consommable côté preload et main, aucun runtime parasite, et TS rattrape immédiatement toute incohérence de part et d'autre du pont IPC.

C'est aussi le **premier import runtime** (et plus uniquement type) depuis shared — c'est donc à ce moment que le piège des `paths` non réécrits par tsc devient bloquant. Résolu par `tsc-alias` (cf. réflexion dédiée plus haut).

---

### Le contrat IPC `ITodoAPI` — source de vérité unique dans `shared/`

En migrant le preload en TS, j'ai remarqué que la forme de l'API exposée à Angular était définie **deux fois** :

- Côté **preload**, dans la déclaration de l'objet `todoService` exposé via `contextBridge`
- Côté **renderer**, dans `src/renderer/src/types/electron/todo.d.ts` qui déclarait `interface ITodoAPI` pour typer `window.todoService`

Les deux étaient alignées par chance. Mais **rien dans la structure n'imposait qu'elles le restent**. Si j'ajoutais une méthode (`setPriority`) ou changeais une signature (`add(title, priority)`) côté preload sans toucher au renderer, TypeScript ne disait rien — jusqu'au crash runtime, ou pire, jusqu'à un comportement silencieusement faux.

C'est exactement le bug que le typage est censé empêcher : **quand un contrat est défini deux fois, ce n'est plus un contrat, c'est une coïncidence**.

**Solution retenue : déplacer `ITodoAPI` dans `shared/interfaces/`** — la même zone neutre où vit déjà `Todo`. Les deux côtés réfèrent à la même source :

```ts
// shared/interfaces/todo-api.interface.ts — source de vérité
export interface ITodoAPI {
  getAll: () => Promise<Todo[]>
  add: (title: string) => Promise<Todo>
  toggle: (id: number) => Promise<void>
  delete: (id: number) => Promise<void>
}

// preload/apis/todo.api.ts — implémentation typée par le contrat
export const todoService: ITodoAPI = {
  getAll: ()      => ipcRenderer.invoke('todo:getAll'),
  add:    (title) => ipcRenderer.invoke('todo:add', title),
  // ...
}

// renderer/types/electron/index.d.ts — déclaration globale typée par le contrat
declare global { interface Window { todoService: ITodoAPI } }
```

Si je modifie `ITodoAPI` dans shared, **TypeScript rouge des deux côtés** tant que je n'ai pas mis à jour preload **et** renderer. Le contrat est désormais structurellement maintenu, plus accidentellement.

**Cohérent avec la philosophie shared = DTO neutre** : `Todo` est la donnée transportée, `ITodoAPI` est le contrat du transport. Tous les deux appartiennent à la zone neutre — aucun ne devrait vivre uniquement d'un côté.

**Pourquoi `I` devant le nom** : convention que j'ai gardée pour distinguer ce qui est un **contrat d'API** (préfixe `I`) des **modèles de données** (sans préfixe). `Todo` est un objet qu'on transporte ; `ITodoAPI` est une interface comportementale. La distinction sert à la lisibilité — voir `ITodoAPI` quelque part dit immédiatement « c'est un contrat de méthodes asynchrones », là où `Todo` dit « c'est de la donnée ».

---

### Composition root et DI manuelle — pas de module singleton

Pour exposer un service au reste du main, le réflexe Node typique est `export const todoService = new TodoService()` au bas du fichier service. Simple, direct, et le module cache de Node garantit qu'il n'y a qu'une instance. C'est ce que faisait mon code en V2 (`module.exports = new TodoService()`).

J'ai écarté ce pattern pour deux raisons :

- **Couplage caché** : les handlers importent directement le service. Pour savoir ce dont dépend `todo.handler`, il faut ouvrir le fichier et lire les imports. Multiplié par 10 features, l'arbre de dépendances de l'app n'est plus visible à un seul endroit.
- **Non-testable** : impossible de remplacer `todoService` par un mock pour tester le handler sans monkey-patcher des modules.

**Solution retenue : DI manuelle avec composition root.**

Chaque service reçoit ses dépendances par constructeur, chaque module de handlers reçoit son service par paramètre, et tout est câblé dans un seul fichier `bootstrap.ts` qui joue le rôle de **composition root** :

```ts
// bootstrap.ts
export function bootstrap(): void {
  const todoStore = new JsonService<Todo[]>(
    path.join(app.getPath('userData'), 'todo.json')
  )
  const todoService = new TodoService(todoStore)

  registerAllHandlers({ todoService })
}
```

`main/index.ts` ne fait plus que le lifecycle Electron — il appelle `bootstrap()` et c'est tout. Quel que soit le nombre de features ajoutées, `index.ts` reste à ~15 lignes. Pour lire l'architecture du main, on lit `bootstrap.ts` et on a l'arbre complet en 10 lignes.

---

### Pattern barrel pour les handlers — l'équivalent TypeScript de `__init__.py`

Pour éviter que `bootstrap.ts` doive importer chaque `register*Handlers` individuellement (et grossir avec chaque feature), j'ai centralisé l'agrégation dans `handlers/index.ts` :

```ts
// handlers/index.ts
export interface AppServices {
  todoService: TodoService
  // userService: UserService    (futur)
}

export function registerAllHandlers(services: AppServices): void {
  registerTodoHandlers(services.todoService)
  // registerUserHandlers(services.userService)
}
```

C'est l'analogue TypeScript du `__init__.py` Python : un fichier qui expose **une seule fonction de haut niveau** au reste du système. `bootstrap.ts` fait `registerAllHandlers({ todoService })` et n'a aucune visibilité sur les détails de chaque handler. Ajouter une feature devient un workflow prévisible :

1. Créer `services/user.service.ts` (classe avec ses dépendances en constructeur)
2. Créer `handlers/user.handler.ts` exportant `registerUserHandlers(userService)`
3. Ajouter une ligne dans `handlers/index.ts` (un champ dans `AppServices`, un appel dans `registerAllHandlers`)
4. Ajouter une ligne dans `bootstrap.ts` (instancier le service, l'inclure dans le câblage)

Aucun fichier existant n'enfle — chaque ajout est local et explicite.

---

### Pourquoi pas un framework DI (tsyringe, InversifyJS) ?

Existent et fonctionnent. Mais à mon scope (un service, quatre handlers), ils sont overkill et introduisent une magie de décorateurs (`@injectable`, `@inject`) qui masque la simplicité du câblage manuel. La DI manuelle reste lisible jusqu'à ~10 services ; au-delà, un framework devient pertinent. À garder en tête pour quand le projet grossira — pas un besoin actuel.

Note conceptuelle : Angular utilise un container DI parce que les composants sont instanciés **par le framework**, pas par le développeur — la seule façon de leur fournir des dépendances est de passer par le container. Dans le main process Electron, je contrôle moi-même le point d'entrée, donc je peux câbler à la main sans framework. Les deux approches sont valides dans leur contexte respectif.

---

## Partenaire de réflexion

Ce projet a été développé avec l'aide de **Claude** (Anthropic) comme partenaire de réflexion sur les choix d'architecture — structure des dossiers, organisation des types TypeScript, intégration Electron/Angular. Les décisions finales restent les miennes, mais les échanges ont permis d'aller chercher les bonnes pratiques de l'industrie et de comprendre le pourquoi derrière chaque choix plutôt que de juste appliquer une recette.
