import { Table, TableCell, TableHeader as Base, TableRow } from '@tiptap/extension-table'

/** Senza `scope` axe segnala `th-has-data-cells` (gravità serious): una
 *  tabella di appunti ha sempre l'intestazione in cima. */
const TableHeader = Base.extend({
  renderHTML({ HTMLAttributes }) {
    return ['th', { ...HTMLAttributes, scope: 'col' }, 0]
  },
})

export { Table, TableCell, TableHeader, TableRow }
