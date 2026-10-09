import { test, expect } from 'claude-code/testing'

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
const WRITE = { type: 'create', filePath: '/repo/src/new.ts', content: 'b\n', structuredPatch: [], originalFile: null }

// Stands in for the engine's own result renderer beneath the plugin.
const ENGINE = 'engine result'

const draw = async ($: any, on: any, surface: (typeof SURFACES)[number], tool: string, output: unknown, isErrored = false) => {
  on('ui.render', { component: 'ToolResult' }, ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, null, ENGINE)
  })
  const ui = await $.ui.mount({
    plugin: 'collapse-diffs',
    surface,
    component: 'ToolResult',
    props: { tool_use_id: 'toolu_1', tool, output, isErrored },
  })
  const shown = await ui.find({ text: ENGINE })
  await ui.unmount()
  return shown !== undefined
}

for (const surface of SURFACES) {
  test(`${surface}: successful edit hides the diff`, async ($, on) => {
    expect(await draw($, on, surface, 'Edit', EDIT)).toBe(false)
  })

  test(`${surface}: successful write hides the diff`, async ($, on) => {
    expect(await draw($, on, surface, 'Write', WRITE)).toBe(false)
  })

  test(`${surface}: errored edit shows the engine's result`, async ($, on) => {
    expect(await draw($, on, surface, 'Edit', 'File has not been read yet.', true)).toBe(true)
  })

  test(`${surface}: held-for-review edit shows the engine's result`, async ($, on) => {
    expect(await draw($, on, surface, 'Edit', { ...EDIT, staged: true })).toBe(true)
  })

  test(`${surface}: unexpected output shows the engine's result`, async ($, on) => {
    expect(await draw($, on, surface, 'Edit', 'done')).toBe(true)
  })
}
