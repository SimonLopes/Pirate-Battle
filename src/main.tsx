import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { worker } from './mocks/browser.ts'

const queryClient = new QueryClient()

async function start(): Promise<void> {
  let isApiReady = true
  try {
    await worker.start({
      onUnhandledFrame: 'bypass',
      serviceWorker: {
        url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      },
    })
  } catch {
    isApiReady = false
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        {!isApiReady && (
          <p className="api-notice" role="alert">
            Offline API unavailable
          </p>
        )}
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void start()
