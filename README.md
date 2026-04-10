# Todo List — V1 Electron + Vanilla JS

> Branch `v1-vanilla` — [Back to main](../../tree/main)

---

## Stack

- [Electron](https://www.electronjs.org/) — desktop framework
- HTML / CSS / JavaScript Vanilla — frontend
- Node.js `fs` — JSON file persistence

---

## Getting started

```bash
npm install
npm start
```

---

## Features

- Add a task (button or `Enter` key)
- Toggle a task as done / undone
- Delete a task
- Data persisted locally in a JSON file (`userData/todo.json`)

---

## Architecture

The app follows Electron's 3-layer architecture:

```
src/
├── main/                            # Main process (Node.js)
│   ├── index.js                     # Entry point — creates the BrowserWindow
│   ├── handlers/
│   │   └── todo.handler.js          # IPC listeners (ipcMain.handle)
│   └── services/
│       ├── todo.service.js          # CRUD business logic
│       └── json.service.js          # Read / write JSON file
│
├── preload/                         # Bridge (secure context)
│   ├── index.js                     # Exposes API via contextBridge
│   └── apis/
│       └── todo.api.js              # IPC calls (ipcRenderer.invoke)
│
└── renderer/                        # Renderer process (browser)
    ├── index.html                   # HTML entry point
    ├── main.js                      # Component bootstrap
    └── components/todo/
        ├── todo.component.js        # Events & rendering logic
        ├── todo.template.js         # HTML template functions
        └── todo.style.css           # Styles (dark theme)
```

---

## Data flow

```
Renderer (UI)
  → preload/todo.api       (ipcRenderer.invoke)
    → main/todo.handler    (ipcMain.handle)
      → main/todo.service  (business logic)
        → main/json.service  (local JSON file)
```
