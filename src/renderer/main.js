import { TodoComponent } from './components/todo/todo.component.js';

const app = document.getElementById('app');
const todo = new TodoComponent(app);
todo.init();
