import fs from 'node:fs'
import path from 'node:path'

function rmIfExists(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

const root = process.cwd()

rmIfExists(path.join(root, 'node_modules'))

for (const dir of ['packages', 'apps']) {
  const base = path.join(root, dir)
  if (!fs.existsSync(base)) continue

  for (const name of fs.readdirSync(base)) {
    const nm = path.join(base, name, 'node_modules')
    rmIfExists(nm)
  }
}

console.log('Removed node_modules (root + workspaces).')
