import { Todo } from '@shared/interfaces'
import { TodoRepository } from '../repositories'

export class TodoService {
  constructor(private repo: TodoRepository) {}

  async getAll(): Promise<Todo[]> {
    return this.repo.getAll()
  }

  async add(title: string): Promise<Todo> {
    return this.repo.add(title)
  }

  async toggle(id: number): Promise<void> {
    return this.repo.toggle(id)
  }

  async delete(id: number): Promise<void> {
    return this.repo.delete(id)
  }
}
