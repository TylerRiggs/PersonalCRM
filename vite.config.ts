import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execFile } from 'node:child_process'

/**
 * Vite plugin that adds a /api/chat middleware.
 * POST /api/chat  →  runs `npx openclaw agent --message "..." --json`
 * POST /api/health →  runs `npx openclaw --version`
 *
 * This bypasses the known OpenClaw HTTP 405 bug (issue #4417)
 * by using the CLI, which communicates via the Gateway WebSocket RPC.
 */
function openclawPlugin(): Plugin {
  return {
    name: 'openclaw-cli-proxy',
    configureServer(server) {
      // ---- POST /api/chat ----
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const { messages, agentId } = JSON.parse(body) as {
              messages: { role: string; content: string }[]
              agentId?: string
            }

            // Build the prompt from messages array (combine system + user)
            const prompt = messages
              .map((m) => (m.role === 'system' ? `[System]: ${m.content}` : m.content))
              .join('\n\n')

            if (!prompt.trim()) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Empty message' }))
              return
            }

            const args = ['openclaw', 'agent', '--message', prompt]
            if (agentId && agentId !== 'main') {
              args.push('--agent', agentId)
            }

            execFile('npx', args, { timeout: 120_000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
              if (err) {
                console.error('[openclaw-plugin] CLI error:', err.message)
                console.error('[openclaw-plugin] stderr:', stderr)
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  error: `OpenClaw CLI error: ${err.message}`,
                  stderr: stderr?.substring(0, 500),
                }))
                return
              }

              // Return in OpenAI chat completion format so the client parser works
              const text = stdout.trim()
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                choices: [{
                  message: { role: 'assistant', content: text },
                  finish_reason: 'stop',
                }],
              }))
            })
          } catch (parseErr) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid JSON body' }))
          }
        })
      })

      // ---- GET /api/health ----
      server.middlewares.use('/api/health', (_req, res) => {
        execFile('npx', ['openclaw', '--version'], { timeout: 10_000 }, (err, stdout) => {
          if (err) {
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: err.message }))
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, version: stdout.trim() }))
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), openclawPlugin()],
  server: {
    proxy: {
      // Keep these as fallback for direct gateway access if the bug is fixed
      '/v1': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
      },
      '/tools': {
        target: 'http://127.0.0.1:18789',
        changeOrigin: true,
      },
    },
  },
})
