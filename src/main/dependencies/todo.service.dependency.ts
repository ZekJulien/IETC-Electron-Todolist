import { makeTodoRepository } from './todo.repository.dependency'
import { TodoService } from '../services'

export function makeTodoService(): TodoService {
  return new TodoService(makeTodoRepository())
}
