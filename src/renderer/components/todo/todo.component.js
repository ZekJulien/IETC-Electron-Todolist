import { renderShell, renderItem } from './todo.template.js';

export class TodoComponent {
    constructor(root) {
        this._root = root;
    }

    async init() {
        this._root.innerHTML = renderShell();
        this._input = this._root.querySelector('#todo-input');
        this._list = this._root.querySelector('#todo-list');
        this._root.querySelector('#todo-add-btn').addEventListener('click', () => this._onAdd());
        this._input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._onAdd(); });
        this._list.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.todo-delete-btn');
            if (deleteBtn) return this._onDelete(Number(deleteBtn.dataset.id));
            const checkBtn = e.target.closest('.todo-check-btn');
            if (checkBtn) this._onToggle(Number(checkBtn.dataset.id));
        });
        await this._render();
    }

    async _render() {
        const todos = await window.todoService.getAll();
        this._list.innerHTML = todos.length
            ? todos.map(renderItem).join('')
            : '<li class="todo-empty">Aucune tâche pour l\'instant.</li>';
    }

    async _onAdd() {
        const title = this._input.value.trim();
        if (!title) return;
        await window.todoService.add(title);
        this._input.value = '';
        await this._render();
    }

    async _onToggle(id) {
        await window.todoService.toggle(id);
        await this._render();
    }

    async _onDelete(id) {
        await window.todoService.delete(id);
        await this._render();
    }
}
