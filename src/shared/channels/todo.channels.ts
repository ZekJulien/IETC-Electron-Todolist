export const TODO_CHANNELS = {
  GET_ALL: 'todo:getAll',
  ADD:     'todo:add',
  TOGGLE:  'todo:toggle',
  DELETE:  'todo:delete',
} as const

export type TodoChannel = typeof TODO_CHANNELS[keyof typeof TODO_CHANNELS]
