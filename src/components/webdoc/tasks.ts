import { TaskItem as Base, TaskList } from '@tiptap/extension-list'
import { mergeAttributes } from '@tiptap/core'

/** La checkbox di serie è un `input` nudo dentro un `label` senza testo: è la
 *  stessa violazione axe («checkbox del to-do senza etichetta») già corretta
 *  una volta su `TODO_HTML` in `lib/richtext.ts`. Qui si aggiunge l'etichetta
 *  a mano invece di reintrodurla. */
const TaskItem = Base.extend({
  renderHTML({ node, HTMLAttributes }) {
    return [
      'li',
      mergeAttributes(HTMLAttributes, { 'data-type': 'taskItem' }),
      [
        'label',
        [
          'input',
          {
            type: 'checkbox',
            'aria-label': 'Fatto',
            ...(node.attrs['checked'] === true ? { checked: 'checked' } : {}),
          },
        ],
        ['span'],
      ],
      ['div', 0],
    ]
  },
})

export { TaskItem, TaskList }
