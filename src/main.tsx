import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { worker } from './mocks/browser.ts'

const queryClient = new QueryClient()

async function start(): Promise<void> {
  await worker
    .start({
      onUnhandledFrame: 'bypass',
      //quiet: true,
      serviceWorker: {
        url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      },
    })
    .catch(() => undefined)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void start()
