import { defineConfig, loadEnv } from 'vite'

// 로컬 개발 서버에서도 Vercel의 /api 함수와 같은 로직을 쓰도록 연결한다.
function localApi() {
  const readBody = (req) =>
    new Promise((resolve) => {
      let data = ''
      req.on('data', (c) => (data += c))
      req.on('end', () => {
        try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
      })
    })
  const send = (res, { status, body }) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  }
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/jobs', async (req, res) => {
        const { handleJobsRequest } = await import('./api/_lib/alio.js')
        const query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
        send(res, await handleJobsRequest(query))
      })
      server.middlewares.use('/api/resume', async (req, res) => {
        if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'METHOD_NOT_ALLOWED' } })
        const { handleResumeRequest } = await import('./api/_lib/resume-ai.js')
        try {
          send(res, await handleResumeRequest(await readBody(req)))
        } catch (err) {
          console.error(err)
          send(res, { status: 500, body: { error: 'INTERNAL', message: '이력서 생성 중 오류가 발생했습니다.' } })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // .env 의 DATA_GO_KR_API_KEY, ANTHROPIC_API_KEY 를 로컬 API에서 읽을 수 있게 한다 (브라우저 번들에는 포함되지 않음).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    root: './src',
    plugins: [localApi()],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: './src/index.html',
          jobs: './src/jobs.html',
        },
      },
    },
    server: {
      port: 3000,
      open: '/jobs.html',
    },
    optimizeDeps: {
      include: ['jspdf', 'mammoth', 'chart.js', 'lodash'],
    },
  }
})
