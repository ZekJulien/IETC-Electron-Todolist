const { app } = require('electron');
const path = require('path');
const { readJSON, writeJSON } = require('../services/json.service.js')

const TODO_PATH = path.join(app.getPath('userData'), 'todo.json')


class TodoService{
    constructor(){
        this._todos = readJSON(TODO_PATH);
    }

    saveJSON(){
        writeJSON(TODO_PATH, this._todos);
    }

    getIndex(){
        if(this._todos.length === 0) return 1;
        return Math.max(...this._todos.map(t => t.id)) + 1;
    }

    getAll() {
        return this._todos;
    }

    add(title){
        let newTodo = {'id': this.getIndex(), 'title': title, 'todo': false}
        this._todos.push(newTodo);
        this.saveJSON();
        return newTodo
    }

    toggle(id){
        const todo = this._todos.find(t => t.id === id);
        if (todo) todo.todo = !todo.todo;
        this.saveJSON();
    }

    delete(id){
        this._todos = this._todos.filter(todo => todo.id !== id);
        this.saveJSON();
    }

}

module.exports = new TodoService()

