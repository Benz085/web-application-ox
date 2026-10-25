// Fails the production build if the E2E fake-auth module leaked into dist/.
// Run automatically after `npm run build` (see "postbuild" in package.json).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = new URL('../dist', import.meta.url).pathname
const MARKERS = ['e2e-token-', 'e2eUser']

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(js|mjs|html|css|map)$/.test(name)) yield path
  }
}

const leaks = []
for (const file of walk(DIST)) {
  const text = readFileSync(file, 'utf8')
  for (const marker of MARKERS) if (text.includes(marker)) leaks.push(`${file} contains "${marker}"`)
}

if (leaks.length > 0) {
  console.error('E2E fake auth leaked into the production bundle:\n' + leaks.join('\n'))
  process.exit(1)
}
console.log('check-no-e2e: dist/ is free of the E2E fake auth')
