import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'

// Dev-only: serves the Vercel-style handlers in `api/` from the Vite dev server so that
// `npm run dev` works end to end without the Vercel CLI. It is not part of the production
// build (`apply: 'serve'`); on Vercel the handlers run as Vercel Functions.

interface HandlerModule {
  default?: (req: IncomingMessage & { body?: unknown }, res: unknown) => unknown
}

const ROUTE = /^\/api\/[A-Za-z0-9_/-]+$/

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text) return resolve(undefined)
      try {
        resolve(JSON.parse(text))
      } catch {
        resolve(text) // not JSON: the handler's validation answers 400
      }
    })
    req.on('error', () => resolve(undefined))
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function devApi(): Plugin {
  return {
    name: 'ox-dev-api',
    apply: 'serve',
    configureServer(server) {
      if (process.env.VITEST || process.env.VITE_E2E === 'true') return

      // The server code reads FIREBASE_* from process.env (like on Vercel).
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith('FIREBASE_') && process.env[key] === undefined) process.env[key] = value
      }

      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
        if (!pathname.startsWith('/api/')) return next()
        if (!ROUTE.test(pathname) || pathname.includes('..')) {
          return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } })
        }

        let mod: HandlerModule
        try {
          mod = (await server.ssrLoadModule(`${pathname}.ts`)) as HandlerModule
        } catch {
          return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } })
        }
        if (typeof mod.default !== 'function') {
          return sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } })
        }

        const request = Object.assign(req, { body: await readJson(req) })
        const response = {
          status(code: number) {
            res.statusCode = code
            return { json: (body: unknown) => sendJson(res, code, body) }
          },
          setHeader: (name: string, value: string) => res.setHeader(name, value),
        }
        try {
          await mod.default(request, response)
        } catch {
          if (!res.writableEnded) sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Internal error' } })
        }
      })
    },
  }
}
