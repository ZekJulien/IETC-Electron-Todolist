import { TodoService } from '../services/todo.service'
import { registerTodoHandlers } from './todo.handler'

export interface AppServices {
  todoService: TodoService
}

export function registerAllHandlers(services: AppServices): void {
  registerTodoHandlers(services.todoService)
}
