import type { Register } from 'claude-code'

// A written change: an object with a patch, not held for review.
const isWritten = (output: unknown) =>
  typeof output === 'object' &&
  output !== null &&
  Array.isArray((output as { structuredPatch?: unknown }).structuredPatch) &&
  (output as { staged?: boolean }).staged !== true

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
}
