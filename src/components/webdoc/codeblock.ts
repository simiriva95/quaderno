import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { createLowlight } from 'lowlight'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'
import { CodeBlockView } from './CodeBlockView'

/** `lowlight` e `highlight.js` importati nudi sono ~300 KB gzip l'uno: sono
 *  tutte e centonovanta le grammatiche. Qui se ne registrano sette. */
const lowlight = createLowlight()
lowlight.register({ bash, javascript, json, python, sql, typescript, yaml })

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
}).configure({ lowlight })
