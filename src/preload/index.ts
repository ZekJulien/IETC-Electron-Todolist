import { contextBridge } from 'electron'
import { todoService } from './apis'

contextBridge.exposeInMainWorld('todoService', todoService)
