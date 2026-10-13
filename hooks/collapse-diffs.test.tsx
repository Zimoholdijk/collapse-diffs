import type { On } from 'claude-code'
import { test, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const SURFACES = ['terminal', 'vscode'] as const
const PATCH = [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-a', '+b'] }]
const EDIT = {
  filePath: '/repo/src/auth.ts',
  oldString: 'a',
  newString: 'b',
  originalFile: 'a\n',
  structuredPatch: PATCH,
  userModified: false,
  replaceAll: false,
}
const CREATE = { ...EDIT, oldString: '', originalFile: null }
const WRITE_NEW = { type: 'create', filePath: '/repo/src/new.ts', content: 'b\n', structuredPatch: [], originalFile: null }
const WRITE_OVER = { type: 'update', filePath: '/repo/src/auth.ts', content: 'b\n', structuredPatch: PATCH, originalFile: 'a\n' }

// Stands in for the engine's own result renderer beneath the plugin.
const ENGINE = 'engine result'

// Draws a ToolResult through the plugin; true when the engine's result shows.
const draw = async ($: Engine, on: On, surface: (typeof SURFACES)[number], tool: string, output: unknown, isErrored = false) => {
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{ENGINE}</Text>
  })
  const ui = await $.ui.mount({
    plugin: 'collapse-diffs',
    surface,
    component: 'ToolResult',
    props: { tool_use_id: 'toolu_1', tool, output, isErrored },
  })
  const shown = (await ui.find({ text: ENGINE })) !== undefined
  if (!shown) {
    // Hidden means drawn as an empty Box, not a failed or missing drawing.
    expect(await ui.drawn()).toMatchObject({ type: 'Box' })
    expect(await ui.findAll({ type: 'Text' })).toHaveLength(0)
  }
  await ui.unmount()
  return shown
}

const HIDDEN: [string, string, unknown][] = [
  ['successful edit', 'Edit', EDIT],
  ['edit that creates a file', 'Edit', CREATE],
  ['write of a new file', 'Write', WRITE_NEW],
  ['write over an existing file', 'Write', WRITE_OVER],
]

const SHOWN: [string, string, unknown, boolean?][] = [
  ['errored edit', 'Edit', 'File has not been read yet.', true],
  ['held-for-review edit', 'Edit', { ...EDIT, staged: true }],
  ['string output', 'Edit', 'done'],
  ['null output', 'Edit', null],
  ['output without a patch', 'Write', { filePath: '/repo/x' }],
  ['patch that is not a list', 'Edit', { ...EDIT, structuredPatch: 'x' }],
  ['other tool (Read)', 'Read', 'file contents'],
  ['other tool (Bash)', 'Bash', { stdout: 'ok', stderr: '', interrupted: false }],
]

for (const surface of SURFACES) {
  for (const [name, tool, output] of HIDDEN) {
    test(`${surface}: ${name} hides the diff`, async ($, on) => {
      expect(await draw($, on, surface, tool, output)).toBe(false)
    })
  }
  for (const [name, tool, output, isErrored] of SHOWN) {
    test(`${surface}: ${name} shows the engine's result`, async ($, on) => {
      expect(await draw($, on, surface, tool, output, isErrored)).toBe(true)
    })
  }
}
