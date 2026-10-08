import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const sheets = [
  'public/assets/spritesheet/ships_miscellaneous_sheet.xml',
  'public/assets/spritesheet/ships_miscellaneous_sheet_retina.xml',
]

const baseSize = pngSize(
  join(root, 'public/assets/spritesheet/ships_miscellaneous_sheet.png'),
)

for (const sheet of sheets) convert(sheet)

function convert(xmlRel) {
  const xmlPath = join(root, xmlRel)
  const xml = readFileSync(xmlPath, 'utf8')
  const atlas = xml.match(/<TextureAtlas\b([^>]*)>/)
  if (!atlas) throw new Error(`${xmlRel}: missing TextureAtlas`)

  const atlasAttrs = attrsFrom(atlas[1])
  const image = atlasAttrs.imagePath
  if (!image) throw new Error(`${xmlRel}: missing imagePath`)

  const size = pngSize(join(dirname(xmlPath), image))
  const frames = {}

  for (const match of xml.matchAll(/<SubTexture\b([^>]*)\/>/g)) {
    const attrs = attrsFrom(match[1])
    if (!attrs.name) throw new Error(`${xmlRel}: SubTexture is missing name`)
    frames[attrs.name] = frameFrom(attrs, xmlRel)
  }

  if (Object.keys(frames).length === 0) throw new Error(`${xmlRel}: no frames`)

  const scale =
    size.w === baseSize.w * 2 && size.h === baseSize.h * 2 ? '2' : '1'
  const sheet = {
    frames,
    meta: {
      image,
      format: 'RGBA8888',
      size,
      scale,
    },
  }

  writeFileSync(
    xmlPath.replace(/\.xml$/, '.json'),
    `${JSON.stringify(sheet, null, 2)}\n`,
  )
}

function frameFrom(attrs, file) {
  const x = integer(attrs, 'x', file)
  const y = integer(attrs, 'y', file)
  const w = integer(attrs, 'width', file)
  const h = integer(attrs, 'height', file)
  const frameX = optionalInteger(attrs, 'frameX', file) ?? 0
  const frameY = optionalInteger(attrs, 'frameY', file) ?? 0
  const frameWidth = optionalInteger(attrs, 'frameWidth', file) ?? w
  const frameHeight = optionalInteger(attrs, 'frameHeight', file) ?? h
  const trimmed =
    frameX !== 0 || frameY !== 0 || frameWidth !== w || frameHeight !== h

  return {
    frame: { x, y, w, h },
    rotated: attrs.rotated === 'true' || attrs.rotated === '90',
    trimmed,
    spriteSourceSize: {
      x: trimmed ? -frameX : 0,
      y: trimmed ? -frameY : 0,
      w,
      h,
    },
    sourceSize: {
      w: trimmed ? frameWidth : w,
      h: trimmed ? frameHeight : h,
    },
  }
}

function pngSize(file) {
  const buf = readFileSync(file)
  const isPng = buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG'
  if (!isPng || buf.length < 24) throw new Error(`${file} is not a PNG`)
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

function attrsFrom(source) {
  const attrs = {}
  for (const match of source.matchAll(/([\w:]+)="([^"]*)"/g)) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

function integer(attrs, key, file) {
  const value = optionalInteger(attrs, key, file)
  if (value === undefined) {
    throw new Error(
      `${file}: SubTexture "${attrs.name ?? '?'}" is missing ${key}`,
    )
  }
  return value
}

function optionalInteger(attrs, key, file) {
  const raw = attrs[key]
  if (raw === undefined) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value)) {
    throw new Error(
      `${file}: SubTexture "${attrs.name ?? '?'}" has invalid ${key}`,
    )
  }
  return value
}
