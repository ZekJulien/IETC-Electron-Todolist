import { Component, signal } from '@angular/core';
import { Todo } from "./features/todo/todo";

@Component({
  selector: 'app-root',
  imports: [Todo],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
