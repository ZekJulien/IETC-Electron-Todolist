import { TodoService } from '../services'
import { makeTodoService } from './todo.service.dependency'

export interface AppDependencies {
  todoService: TodoService
}

export function buildDependencies(): AppDependencies {
  return {
    todoService: makeTodoService(),
  }
}
