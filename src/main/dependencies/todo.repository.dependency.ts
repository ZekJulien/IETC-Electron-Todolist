import { getDb } from '../core'
import { TodoRepository } from '../repositories'

export function makeTodoRepository(): TodoRepository {
  return new TodoRepository(getDb())
}
