import { PrismaClient } from '@db/client'
import { Todo } from '@shared/interfaces'

export class TodoRepository {
  constructor(private prisma: PrismaClient) {}

  async getAll(): Promise<Todo[]> {
    return this.prisma.todo.findMany()
  }

  async add(title: string): Promise<Todo> {
    return this.prisma.todo.create({ data: { title } })
  }

  async toggle(id: number): Promise<void> {
    const todo = await this.prisma.todo.findUnique({ where: { id } })
    if (!todo) return
    await this.prisma.todo.update({
      where: { id },
      data: { completed: !todo.completed },
    })
  }

  async delete(id: number): Promise<void> {
    await this.prisma.todo.delete({ where: { id } })
  }
}
