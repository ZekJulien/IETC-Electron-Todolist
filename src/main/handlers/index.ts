import { AppDependencies } from '../dependencies'
import { registerTodoHandlers } from './todo.handler'

export function registerAllHandlers(deps: AppDependencies): void {
  registerTodoHandlers(deps.todoService)
}
