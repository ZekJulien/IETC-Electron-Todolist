import { Injectable, signal } from '@angular/core';
import { Todo } from '@shared/interfaces/todo.interface';

@Injectable({
  providedIn: 'root'
})
export class TodoService {

  readonly todoList = signal<Todo[]>([]);

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    try {
      const todos = await window.todoService.getAll();
      this.todoList.set(todos ?? []);
    } catch (error) {
      console.error('Erreur lors du chargement initial des tâches', error);
      this.todoList.set([]);
    }
  }

  async add(title: string): Promise<void> {
    try {
      const newTodo = await window.todoService.add(title);
      if (newTodo) {
        this.todoList.update(todos => [...todos, newTodo]);
      }
    } catch (error) {
      console.error("Impossible d'ajouter la tâche", error);
    }
  }

  async toggle(id: number): Promise<void> {
    try {
      await window.todoService.toggle(id);
      this.todoList.update(todos =>
        todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
    } catch (error) {
      console.error('Impossible de modifier la tâche, l\'interface ne change pas', error);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await window.todoService.delete(id);
      this.todoList.update(todos => todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Impossible de supprimer la tâche', error);
    }
  }

}
