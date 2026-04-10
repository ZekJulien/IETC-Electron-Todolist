const { ipcRenderer } = require('electron');

const todoService = {
    getAll: () => ipcRenderer.invoke('todo:getAll'),
    add: (title) => ipcRenderer.invoke('todo:add', title),
    toggle: (id) => ipcRenderer.invoke('todo:toggle', id),
    delete: (id) => ipcRenderer.invoke('todo:delete', id)
}

module.exports = { todoService }