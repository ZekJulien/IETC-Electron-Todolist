const { contextBridge } = require('electron');
const { todoService } = require('./apis/todo.api.js')

contextBridge.exposeInMainWorld('todoService', todoService)