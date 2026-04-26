import { ITodoAPI } from '@shared/interfaces'

declare global {
    interface Window {
        todoService: ITodoAPI
    }
}

export {}
