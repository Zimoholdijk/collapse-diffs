import type { Register } from 'claude-code'

// The gutter the engine opens a line beneath a tool row with.
const GUTTER = '  ⎿  '

// A written change: an object with a patch, not held for review.
const isWritten = (output: unknown) =>
  typeof output === 'object' &&
  output !== null &&
  Array.isArray((output as { structuredPatch?: unknown }).structuredPatch) &&
  (output as { staged?: boolean }).staged !== true

type EditDiff = {
  files: { filePath: string; hunks?: { lines?: string[] }[]; created?: true; deleted?: true }[]
  moreFiles?: number
}

// A Bash output without the per-file diff of the files its command changed
// (sed -i, a heredoc, a generator script), and those files with the lines
// added and removed. Files past the diff's cap stay as an emptied diff, so the
// engine still counts them.
export const withoutFileDiffs = (output: unknown) => {
  const diff = (output as { bashEditDiff?: EditDiff } | null)?.bashEditDiff
  if (typeof output !== 'object' || output === null || !Array.isArray(diff?.files) || diff.files.length === 0) {
    return { output, changedFiles: [] }
  }
  const { bashEditDiff: _, ...rest } = output as { bashEditDiff: EditDiff }
  return {
    output: diff.moreFiles ? { ...output, bashEditDiff: { ...diff, files: [] } } : rest,
    changedFiles: diff.files.map(file => {
      const changed = (file.hunks ?? []).flatMap(hunk => hunk.lines ?? [])
      return {
        path: file.filePath,
        change: file.created === true ? 'Created' : file.deleted === true ? 'Deleted' : 'Updated',
        added: changed.filter(line => line.startsWith('+')).length,
        removed: changed.filter(line => line.startsWith('-')).length,
      }
    }),
  }
}

// A Bash output that printed nothing and that the engine marks no other way
// (interrupted, backgrounded, an image, saved to a file).
const isSilent = (output: unknown) => {
  const result = output as Record<string, unknown>
  return (
    !('bashEditDiff' in result) &&
    result.interrupted !== true &&
    !result.isImage &&
    result.backgroundTaskId === undefined &&
    result.persistedOutputPath === undefined &&
    [result.stdout, result.stderr].every(s => typeof s !== 'string' || s.trim() === '')
  )
}

// `path` relative to `root` when it is inside it.
const shortPath = (path: string, root: string) => {
  const dir = root.endsWith('/') ? root : `${root}/`
  return path.startsWith(dir) ? path.slice(dir.length) : path
}

export const register: Register = on => {
  for (const tool of ['Edit', 'Write']) {
    on('ui.render', { component: 'ToolResult', props: { tool } }, ($, e, next) => {
      if (e.props.isErrored || !isWritten(e.props.output)) {
        return next(e)
      }
      const { Box } = $.ui.resolve(e)
      return <Box />
    })
  }

  // A Bash row that changed files lists each beneath it as
  // `Updated src/a.ts +1 -1` in place of the diff. The row is handed the
  // output without the diff, as an expanded group's row draws it inline.
  on('ui.render', { component: 'ToolUse', props: { tool: 'Bash' } }, async ($, e, next) => {
    const { output, changedFiles } = withoutFileDiffs(e.props.output)
    if (e.props.isRunning || changedFiles.length === 0) {
      return next(e)
    }
    const root = await $.session.root()
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {await next({ ...e, props: { ...e.props, output } })}
        {changedFiles.map(file => (
          <Box key={`${file.change}:${file.path}`}>
            <Text dimColor>{GUTTER}</Text>
            <Text>
              {file.change} {shortPath(file.path, root)}
              {[
                { text: ` +${file.added}`, color: 'success' as const, isShown: file.added > 0 },
                { text: ` -${file.removed}`, color: 'error' as const, isShown: file.removed > 0 },
              ]
                .filter(side => side.isShown)
                .map(side => (
                  <Text key={side.color} color={side.color}>
                    {side.text}
                  </Text>
                ))}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })

  // The result beneath it draws the command's output without the diff, and
  // nothing when the changed files, already on the row, were all it had.
  on('ui.render', { component: 'ToolResult', props: { tool: 'Bash' } }, ($, e, next) => {
    const { output, changedFiles } = withoutFileDiffs(e.props.output)
    if (changedFiles.length === 0) {
      return next(e)
    }
    if (!e.props.isErrored && isSilent(output)) {
      const { Box } = $.ui.resolve(e)
      return <Box />
    }
    return next({ ...e, props: { ...e.props, output } })
  })
}
