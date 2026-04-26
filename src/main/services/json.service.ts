import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export class JsonService<T> {
  private _path: string

  constructor(path: string) {
    this._path = path
  }

  readJson(): T {
    return JSON.parse(readFileSync(this._path, 'utf-8'))
  }

  readOrDefault(defaultValue: T): T {
    return existsSync(this._path) ? this.readJson() : defaultValue
  }

  writeJson(data: T): void {
    writeFileSync(this._path, JSON.stringify(data, null, 2), 'utf-8')
  }
}
