export function renderShell() {
    return `
        <div class="todo-container">
            <h1 class="todo-title">Ma Todo List</h1>
            <div class="todo-form">
                <input type="text" id="todo-input" placeholder="Nouvelle tâche..." />
                <button id="todo-add-btn">Ajouter</button>
            </div>
            <ul id="todo-list" class="todo-list"></ul>
        </div>
    `;
}

export function renderItem(todo) {
    return `
        <li class="todo-item ${todo.todo ? 'todo-item--done' : ''}" data-id="${todo.id}">
            <button class="todo-check-btn ${todo.todo ? 'checked' : ''}" data-id="${todo.id}">
                ${todo.todo ? '✓' : ''}
            </button>
            <span class="todo-text">${escapeHtml(todo.title)}</span>
            <button class="todo-delete-btn" data-id="${todo.id}">✕</button>
        </li>
    `;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
