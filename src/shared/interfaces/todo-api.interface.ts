import { Todo } from './todo.interface'

export interface ITodoAPI {
  getAll: () => Promise<Todo[]>
  add: (title: string) => Promise<Todo>
  toggle: (id: number) => Promise<void>
  delete: (id: number) => Promise<void>
}
