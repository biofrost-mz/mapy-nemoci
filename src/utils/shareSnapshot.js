import { REGIONS } from '../data/regions'

const VERSION = 1

function ensureString(value) {
  return String(value ?? '').trim()
}

function ensureMode(value) {
  return value === 'count' ? 'count' : 'rate'
}

function ensureUnit(value) {
  if (value === 'count' || value === 'rate' || value === 'both') return value
  return 'both'
}

function ensureNumberOrEmpty(value, decimals = null) {
  if (value === '' || value === null || value === undefined) return ''
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return ''
  if (decimals === null) return Math.round(num)
  return Number(num.toFixed(decimals))
}

function toBase64Url(json) {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(token) {
  const base64 = token
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded = base64 + '==='.slice((base64.length + 3) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function normalizeValues(values) {
  const normalized = {}
  for (const region of REGIONS) {
    const raw = values?.[region.name] ?? {}
    normalized[region.name] = {
      count: ensureNumberOrEmpty(raw.count, null),
      rate: ensureNumberOrEmpty(raw.rate, 1),
    }
  }
  return normalized
}

export function sanitizeDatasetForShare(dataset) {
  const id = ensureString(dataset?.id) || `shared-${Date.now()}`
  return {
    id,
    label: ensureString(dataset?.label),
    code: ensureString(dataset?.code),
    period: ensureString(dataset?.period),
    unit: ensureUnit(dataset?.unit),
    source: ensureString(dataset?.source),
    note: ensureString(dataset?.note),
    values: normalizeValues(dataset?.values),
  }
}

export function encodeShareState({ dataset, mode = 'embed-full', display = 'rate' }) {
  const payload = {
    v: VERSION,
    mode: mode === 'embed' ? 'embed' : 'embed-full',
    display: ensureMode(display),
    dataset: sanitizeDatasetForShare(dataset),
    createdAt: new Date().toISOString(),
  }
  return toBase64Url(JSON.stringify(payload))
}

export function decodeShareState(token) {
  if (!token) return null
  try {
    const parsed = JSON.parse(fromBase64Url(token))
    if (!parsed || parsed.v !== VERSION || !parsed.dataset) return null
    return {
      ...parsed,
      mode: parsed.mode === 'embed' ? 'embed' : 'embed-full',
      display: ensureMode(parsed.display),
      dataset: sanitizeDatasetForShare(parsed.dataset),
    }
  } catch {
    return null
  }
}
