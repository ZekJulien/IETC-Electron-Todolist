import { ITodoAPI } from "./todo";

declare global {
    interface Window{
        todoService: ITodoAPI
    }
}

export{}