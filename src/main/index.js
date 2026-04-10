const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerTodoHandlers } = require('./handlers/todo.handler.js')

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
    registerTodoHandlers();
    createWindow();
});

