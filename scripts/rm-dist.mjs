import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')
rmSync(dist, { recursive: true, force: true })
