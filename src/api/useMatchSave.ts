import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { saveMatch } from './client.ts'
import {
  dropPending,
  enqueuePending,
  flushPending,
  isQueued,
  isSending,
  sendPending,
  settleSend,
} from './pending.ts'
import type { MatchRecord } from './types.ts'

export type RecordStatus = 'saving' | 'saved' | 'failed'

export function useMatchSave() {
  const queryClient = useQueryClient()
  const { mutate, variables, isError, isSuccess } = useMutation({
    mutationFn: async (record: MatchRecord) => {
      try {
        return await saveMatch(record)
      } finally {
        settleSend(record.matchId)
      }
    },
    retry: false,
    onSuccess: (_saved, record) => {
      dropPending(record.matchId)
      void queryClient.invalidateQueries({ queryKey: ['ranking'] })
      void queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  useEffect(() => {
    flushPending((record) => {
      mutate(record)
    })
  }, [mutate])

  const submit = (record: MatchRecord) => {
    enqueuePending(record)
    sendPending(record, mutate)
  }

  const retry = (record: MatchRecord) => {
    enqueuePending(record)
    sendPending(record, mutate)
  }

  const statusFor = (record: MatchRecord): RecordStatus => {
    if (variables?.matchId === record.matchId) {
      if (isError) return 'failed'
      if (isSuccess) return 'saved'
      return 'saving'
    }
    if (!isQueued(record.matchId)) return 'saved'
    if (isSending(record.matchId)) return 'saving'
    return 'failed'
  }

  return { submit, retry, statusFor }
}
