import type { On } from 'claude-code'
import { withoutFileDiffs } from './register'
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
  ['bash that changed no files', 'Bash', { stdout: 'ok', stderr: '', interrupted: false }],
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

// Bash commands that change files (sed -i, a heredoc, a generator script).
const bashOutput = (stdout = '') => ({ stdout, stderr: '', interrupted: false })
const changedBy = (stdout = '', moreFiles = 0) => ({
  ...bashOutput(stdout),
  bashEditDiff: {
    files: [
      { filePath: '/repo/src/auth.ts', hunks: PATCH },
      { filePath: '/repo/gen/new.ts', hunks: [{ ...PATCH[0], lines: ['+a', '+b', '+c'] }], created: true as const },
      { filePath: '/repo/old.txt', hunks: [{ ...PATCH[0], lines: ['-a', '-b'] }], deleted: true as const },
    ],
    moreFiles,
  },
})

// Draws a Bash row or result through the plugin over an engine that draws
// both as `engine`, collecting the outputs the engine was handed.
const drawBash = async ($: Engine, on: On, component: 'ToolUse' | 'ToolResult', output: unknown, isRunning = false) => {
  const handed: unknown[] = []
  on('session.root', () => ({ value: '/repo' }))
  on('ui.render', { component: 'ToolUse' }, ($, e) => {
    handed.push(e.props.output)
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    handed.push(e.props.output)
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const props = { tool_use_id: 'toolu_1', tool: 'Bash', output, isErrored: false }
  const ui = await (component === 'ToolUse'
    ? $.ui.mount({
        plugin: 'collapse-diffs',
        surface: 'terminal',
        component,
        props: { ...props, input: { command: 'sed -i s/a/b/ src/auth.ts' }, isRunning, isInterrupted: false },
      })
    : $.ui.mount({ plugin: 'collapse-diffs', surface: 'terminal', component, props }))
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text)
  await ui.unmount()
  return { texts, handed }
}

const hasDiff = (output: unknown) => typeof output === 'object' && output !== null && 'bashEditDiff' in output

test('withoutFileDiffs takes the changed files out of the diff and counts their lines', () => {
  const { output, changedFiles } = withoutFileDiffs(changedBy('ok'))
  expect(changedFiles).toEqual([
    { path: '/repo/src/auth.ts', change: 'Updated', added: 1, removed: 1 },
    { path: '/repo/gen/new.ts', change: 'Created', added: 3, removed: 0 },
    { path: '/repo/old.txt', change: 'Deleted', added: 0, removed: 2 },
  ])
  expect(output).toEqual(bashOutput('ok'))
  expect((withoutFileDiffs(changedBy('', 4)).output as { bashEditDiff: unknown }).bashEditDiff).toEqual({ files: [], moreFiles: 4 })
  expect(withoutFileDiffs(bashOutput('ok'))).toEqual({ output: bashOutput('ok'), changedFiles: [] })
  expect(withoutFileDiffs('text').output).toBe('text')
  expect(withoutFileDiffs(null).output).toBe(null)
})

test('a bash row lists the files it changed, and the engine is not handed their diff', async ($, on) => {
  const { texts, handed } = await drawBash($, on, 'ToolUse', changedBy())
  expect(texts).toContain('engine')
  expect(texts).toContain('Updated src/auth.ts +1 -1')
  expect(texts).toContain('Created gen/new.ts +3')
  expect(texts).toContain('Deleted old.txt -2')
  expect(hasDiff(handed.at(-1))).toBe(false)
})

test('a running bash row is the engine’s', async ($, on) => {
  expect((await drawBash($, on, 'ToolUse', undefined, true)).texts).toEqual(['engine'])
})

test('a bash row that changed no files is the engine’s', async ($, on) => {
  expect((await drawBash($, on, 'ToolUse', bashOutput('ok'))).texts).toEqual(['engine'])
})

test('the result of a bash command that changed files and printed nothing draws nothing', async ($, on) => {
  const { texts, handed } = await drawBash($, on, 'ToolResult', changedBy())
  expect(texts).toEqual([])
  expect(handed).toEqual([])
})

test('the result of a bash command that changed files and printed output shows the output without the diff', async ($, on) => {
  const { texts, handed } = await drawBash($, on, 'ToolResult', changedBy('ok'))
  expect(texts).toEqual(['engine'])
  expect(handed.at(-1)).toEqual(bashOutput('ok'))
})

test('files past the diff’s cap are still counted by the engine', async ($, on) => {
  const { texts, handed } = await drawBash($, on, 'ToolResult', changedBy('', 4))
  expect(texts).toEqual(['engine'])
  expect((handed.at(-1) as { bashEditDiff: unknown }).bashEditDiff).toEqual({ files: [], moreFiles: 4 })
})
