import { ipcRenderer } from 'electron'
import { ITodoAPI } from '@shared/interfaces'
import { TODO_CHANNELS } from '@shared/channels'

export const todoService: ITodoAPI = {
  getAll: ()      => ipcRenderer.invoke(TODO_CHANNELS.GET_ALL),
  add:    (title) => ipcRenderer.invoke(TODO_CHANNELS.ADD, title),
  toggle: (id)    => ipcRenderer.invoke(TODO_CHANNELS.TOGGLE, id),
  delete: (id)    => ipcRenderer.invoke(TODO_CHANNELS.DELETE, id),
}
