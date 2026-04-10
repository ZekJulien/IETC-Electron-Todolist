import { Component, inject } from '@angular/core';
import { TodoService } from '../../services/todo/todo.service';

@Component({
  selector: 'app-todo',
  imports: [],
  templateUrl: './todo.html',
  styleUrl: './todo.css',
})
export class Todo {

    private _todoService = inject(TodoService);

    readonly todoList = this._todoService.todoList.asReadonly();

    async add(title: string){
        await this._todoService.add(title);
    }

    async toggle(id: number){
        await this._todoService.toggle(id);
    }

    async delete(id: number){
        await this._todoService.delete(id);
    }
}
