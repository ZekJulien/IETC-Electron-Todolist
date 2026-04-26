import { app } from 'electron'
import path from 'node:path'
import { Todo } from '@shared/interfaces'
import { JsonService, TodoService } from './services'
import { registerAllHandlers } from './handlers'

export function bootstrap(): void {
  const todoStore = new JsonService<Todo[]>(
    path.join(app.getPath('userData'), 'todo.json')
  )
  const todoService = new TodoService(todoStore)

  registerAllHandlers({ todoService })
}
