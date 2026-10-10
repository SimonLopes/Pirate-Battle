import {
  keepPreviousData,
  useQuery,
  type QueryKey,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState, type ReactNode } from 'react'
import type { MatchPage, MatchRecord, PageParams } from '../api/types.ts'
import { play } from '../audio.ts'
import { Button } from '../ui/Button.tsx'

const pageSize = 5
const prevArt = '/assets/png/default/ui/controls/icon_turn_left.png'
const nextArt = '/assets/png/default/ui/controls/icon_turn_right.png'

type Props = {
  name: string
  queryKey: QueryKey
  fetchPage: (params: PageParams, signal: AbortSignal) => Promise<MatchPage>
  caption: (data: MatchPage | undefined) => ReactNode
  columns: string[]
  tableClass?: string
  emptyText: string
  row: (record: MatchRecord, position: number) => ReactNode
}

export function MatchTable({
  name,
  queryKey,
  fetchPage,
  caption,
  columns,
  tableClass,
  emptyText,
  row,
}: Props) {
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: [...queryKey, { page, pageSize }],
    queryFn: ({ signal }) => fetchPage({ page, pageSize }, signal),
    placeholderData: keepPreviousData,
    retry: canRetry,
    refetchOnMount: 'always',
  })

  const data = query.data
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1
  const isBusy = query.isFetching
  const baseClass = tableClass ? `ranking-table ${tableClass}` : 'ranking-table'

  return (
    <div className="ranking" aria-busy={isBusy}>
      <p className="ranking-config">{caption(data)}</p>
      <p className="ranking-status" role="status">
        {statusText(name, query.isPending, isBusy)}
      </p>
      {query.isError && (
        <div className="ranking-error" role="alert">
          <p>
            {data
              ? `Could not refresh the ${name}. Showing the last loaded page.`
              : `Could not load the ${name}.`}
          </p>
          <Button compact onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className="menu-copy">{emptyText}</p>
      )}
      {data && data.items.length > 0 && (
        <>
          <table
            className={
              query.isPlaceholderData ? `${baseClass} ranking-stale` : baseClass
            }
          >
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((record, index) =>
                row(record, (data.page - 1) * pageSize + index),
              )}
            </tbody>
          </table>
          <nav className="ranking-pager" aria-label={pagerLabel(name)}>
            <button
              type="button"
              className="step-button ranking-step"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => {
                play('ui_click')
                setPage((current) => current - 1)
              }}
            >
              <img src={prevArt} alt="" draggable={false} />
            </button>
            <span>
              Page {Math.min(page, pages)} of {pages}
            </span>
            <button
              type="button"
              className="step-button ranking-step"
              aria-label="Next page"
              disabled={query.isPlaceholderData || page >= pages}
              onClick={() => {
                play('ui_click')
                setPage((current) => current + 1)
              }}
            >
              <img src={nextArt} alt="" draggable={false} />
            </button>
          </nav>
        </>
      )}
    </div>
  )
}

export function PlayedAt({ iso }: { iso: string }) {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day.toUpperCase()} · ${time}`
}

function statusText(
  name: string,
  isPending: boolean,
  isFetching: boolean,
): string {
  if (isPending) return `Loading ${name}…`
  if (isFetching) return 'Updating…'
  return ''
}

function pagerLabel(name: string): string {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} pages`
}

function canRetry(count: number, error: Error): boolean {
  if (count >= 2) return false
  if (!isAxiosError(error) || !error.response) return true
  return error.response.status >= 500
}
