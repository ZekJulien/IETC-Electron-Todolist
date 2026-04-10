import { Todo } from "@shared/interfaces/todo.interface";

interface ITodoAPI {
    getAll: () => Promise<Todo[]>;
    add: (title: string) => Promise<Todo>;
    toggle: (id: number) => Promise<void>;
    delete: (id: number) => Promise<void>;
}