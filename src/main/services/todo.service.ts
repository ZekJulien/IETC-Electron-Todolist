import { Todo } from '@shared/interfaces'
import { JsonService } from './json.service'

export class TodoService {
  private _todos: Todo[]

  constructor(private store: JsonService<Todo[]>) {
    this._todos = store.readOrDefault([])
  }

  private nextId(): number {
    return this._todos.length === 0
      ? 1
      : Math.max(...this._todos.map(t => t.id)) + 1
  }

  private save(): void {
    this.store.writeJson(this._todos)
  }

  getAll(): Todo[] {
    return this._todos
  }

  add(title: string): Todo {
    const todo: Todo = { id: this.nextId(), title, todo: false }
    this._todos.push(todo)
    this.save()
    return todo
  }

  toggle(id: number): void {
    const todo = this._todos.find(t => t.id === id)
    if (todo) todo.todo = !todo.todo
    this.save()
  }

  delete(id: number): void {
    this._todos = this._todos.filter(t => t.id !== id)
    this.save()
  }
}
