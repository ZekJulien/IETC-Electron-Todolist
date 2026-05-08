
import { ipcMain } from 'electron'
import { TodoService } from '../services/todo.service'
import { TODO_CHANNELS } from '@shared/channels'

export function registerTodoHandlers(todoService: TodoService): void {
  ipcMain.handle(TODO_CHANNELS.GET_ALL, () => todoService.getAll())
  ipcMain.handle(TODO_CHANNELS.ADD,    (_e, title: string) => todoService.add(title))
  ipcMain.handle(TODO_CHANNELS.TOGGLE, (_e, id: number)    => todoService.toggle(id))
  ipcMain.handle(TODO_CHANNELS.DELETE, (_e, id: number)    => todoService.delete(id))
}
