const { ipcMain } = require('electron')
const todoService = require('../services/todo.service.js')

function registerTodoHandlers(){
    ipcMain.handle('todo:getAll', () => {
        return todoService.getAll()
    }) 

    ipcMain.handle('todo:add', (_event, title) => {
        return todoService.add(title)
    })

    ipcMain.handle('todo:toggle', (_event, id) => {
        return todoService.toggle(id)
    })

    ipcMain.handle('todo:delete', (_event, id) => {
        return todoService.delete(id)
    })
}

module.exports = { registerTodoHandlers }