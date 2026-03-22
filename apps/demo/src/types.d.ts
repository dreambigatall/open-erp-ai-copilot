declare module 'chalk' {
  interface Chalk {
    (text: string): string
    bold: Chalk
    dim: Chalk
    italic: Chalk
    underline: Chalk
    inverse: Chalk
    strikethrough: Chalk
    black: Chalk
    red: Chalk
    green: Chalk
    yellow: Chalk
    blue: Chalk
    magenta: Chalk
    cyan: Chalk
    white: Chalk
    gray: Chalk
    bgRed: Chalk
    bgGreen: Chalk
    bgYellow: Chalk
    bgBlue: Chalk
    bgMagenta: Chalk
    bgCyan: Chalk
    bgWhite: Chalk
  }
  const chalk: Chalk
  export default chalk
}

declare module 'ink-spinner' {
  import type { FC } from 'react'
  interface SpinnerProps {
    type?: string
  }
  const Spinner: FC<SpinnerProps>
  export default Spinner
}
