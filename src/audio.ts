import { audioConfig } from './game/config.ts'
import type { Cue } from './game/core/world.ts'

export type SoundName =
  | Cue
  | 'game_over'
  | 'game_start'
  | 'game_pause'
  | 'game_resume'
  | 'ui_click'
  | 'ui_open'
  | 'ui_close'
  | 'ui_back'
  | 'ocean_ambience_loop'
  | 'ship_sailing_loop'

type Loop = { source: AudioBufferSourceNode; gain: GainNode }

const folder = `${import.meta.env.BASE_URL}assets/sounds`
const names: SoundName[] = [
  'cannon_fire_1',
  'cannon_fire_2',
  'cannon_fire_3',
  'cannon_broadside',
  'ship_wood_hit_1',
  'ship_wood_hit_2',
  'cannonball_water_hit_1',
  'cannonball_water_hit_2',
  'ship_collision',
  'ship_explosion_1',
  'ship_explosion_2',
  'score_point',
  'ship_sinking',
  'game_over',
  'game_complete',
  'time_warning',
  'health_low',
  'game_start',
  'game_pause',
  'game_resume',
  'ui_click',
  'ui_open',
  'ui_close',
  'ui_back',
  'ocean_ambience_loop',
  'ship_sailing_loop',
]
const gestures = ['mousedown', 'keydown', 'touchend'] as const
const { oceanVolume, sailVolume, fade } = audioConfig

const buffers = new Map<SoundName, AudioBuffer>()
const playing = new Set<AudioBufferSourceNode>()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let isMuted = false
let hasWarned = false
let ocean: Loop | null = null
let sailing: Loop | null = null

export function installAudio(): void {
  for (const type of gestures) window.addEventListener(type, unlock, true)
}

export function setMuted(muted: boolean): void {
  isMuted = muted
  if (master) master.gain.value = muted ? 0 : 1
}

export function play(name: SoundName): void {
  start(name, 0)
}

export function playCue(cue: Cue): void {
  track(start(cue, 0))
  if (cue !== 'ship_sinking') return
  track(start('game_over', buffers.get(cue)?.duration ?? 0))
}

export function ambience(isSailing: boolean): void {
  ocean ??= loop('ocean_ambience_loop', oceanVolume)
  if (isSailing) {
    sailing ??= loop('ship_sailing_loop', sailVolume)
    return
  }
  stopLoop(sailing)
  sailing = null
}

export function stopLoops(): void {
  stopLoop(ocean)
  stopLoop(sailing)
  ocean = null
  sailing = null
}

export function stopGame(): void {
  stopLoops()
  for (const source of playing) source.stop()
  playing.clear()
}

function unlock(event: Event): void {
  if (event instanceof KeyboardEvent && event.key === 'Escape') return
  const audio = ctx ?? open()
  void audio.resume().then(() => {
    if (audio.state !== 'running') return
    for (const type of gestures) window.removeEventListener(type, unlock, true)
  })
}

function open(): AudioContext {
  const audio = new AudioContext()
  master = audio.createGain()
  master.gain.value = isMuted ? 0 : 1
  master.connect(audio.destination)
  ctx = audio
  for (const name of names) {
    void fetch(`${folder}/${name}.wav`)
      .then((response) => {
        if (!response.ok) throw new Error(`${name}.wav: ${response.status}`)
        return response.arrayBuffer()
      })
      .then((data) => audio.decodeAudioData(data))
      .then((buffer) => buffers.set(name, buffer), warn)
  }
  return audio
}

function warn(error: unknown): void {
  if (hasWarned) return
  hasWarned = true
  console.warn('Could not load sounds', error)
}

function track(source: AudioBufferSourceNode | null): void {
  if (!source) return
  playing.add(source)
  source.addEventListener('ended', () => playing.delete(source))
}

function start(name: SoundName, delay: number): AudioBufferSourceNode | null {
  const buffer = buffers.get(name)
  if (!ctx || !master || !buffer) return null
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(master)
  source.addEventListener('ended', () => source.disconnect())
  source.start(ctx.currentTime + delay)
  return source
}

function loop(name: SoundName, volume: number): Loop | null {
  const buffer = buffers.get(name)
  if (!ctx || !master || !buffer) return null
  const gain = ctx.createGain()
  gain.gain.value = volume
  gain.connect(master)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.connect(gain)
  source.addEventListener('ended', () => {
    source.disconnect()
    gain.disconnect()
  })
  source.start()
  return { source, gain }
}

function stopLoop(sound: Loop | null): void {
  if (!sound || !ctx) return
  sound.gain.gain.setTargetAtTime(0, ctx.currentTime, fade)
  sound.source.stop(ctx.currentTime + fade * 4)
}
