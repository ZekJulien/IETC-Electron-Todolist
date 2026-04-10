const { app } = require('electron');
const fs = require('fs');

function readJSON(path){
    try{
        return JSON.parse(fs.readFileSync(path, 'utf-8'))
    } catch {
        return []
    }
}

function writeJSON(path, data){
    try{
        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
    } catch {
        alert('Erreur de sauvegarde')
    }
}

module.exports = {readJSON, writeJSON}