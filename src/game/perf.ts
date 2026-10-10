export const isPerfMode =
  new URLSearchParams(window.location.search).get('perf') === '1'

export type PerfReport = {
  frames: number
  seconds: number
  avgFps: number
  p95FrameMs: number
  peakEntities: number
}

export type PerfRecorder = {
  frame(ms: number, entities: number): void
  report(): PerfReport
}

export function createPerf(): PerfRecorder {
  const times: number[] = []
  let total = 0
  let peak = 0

  return {
    frame(ms, entities) {
      times.push(ms)
      total += ms
      if (entities > peak) peak = entities
    },
    report() {
      const sorted = [...times].sort((a, b) => a - b)
      const p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0
      return {
        frames: times.length,
        seconds: round(total / 1000),
        avgFps: total > 0 ? round((times.length * 1000) / total) : 0,
        p95FrameMs: round(p95),
        peakEntities: peak,
      }
    },
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
