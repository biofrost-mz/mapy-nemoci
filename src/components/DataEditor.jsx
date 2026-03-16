import { useState } from 'react'
import { POPULATION, REGIONS } from '../data/regions'
import styles from './DataEditor.module.css'

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseMaybeNumber(value, isCount) {
  if (value === undefined || value === null || value === '') return ''
  const str = String(value).trim().replace(/\s/g, '').replace(',', '.')
  if (str === '') return ''
  const num = Number(str)
  if (!Number.isFinite(num)) return null
  return isCount ? Math.max(0, Math.round(num)) : Math.max(0, Number(num.toFixed(1)))
}

const HEADER_ALIAS = {
  kraj: 'region',
  nazev: 'region',
  region: 'region',
  name: 'region',
  county: 'region',
  okres: 'region',
  pocet: 'count',
  count: 'count',
  cases: 'count',
  absolutnipocet: 'count',
  absolutne: 'count',
  nemocnost: 'rate',
  incidence: 'rate',
  rate: 'rate',
  na100tis: 'rate',
  na100000: 'rate',
}

const REGION_LOOKUP = (() => {
  const map = new Map()
  for (const r of REGIONS) {
    const aliases = [
      r.name,
      r.short,
      r.name.replace(' kraj', ''),
      r.name.replace('Kraj ', ''),
      r.name.replace('Hlavní město ', ''),
      r.nuts3,
    ]
    for (const alias of aliases) map.set(normalizeText(alias), r.name)
  }
  map.set('praha', 'Hlavní město Praha')
  map.set('hlavnimestopraha', 'Hlavní město Praha')
  return map
})()

function parseDelimitedRows(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const sep = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',')
  const headers = lines[0]
    .split(sep)
    .map(h => HEADER_ALIAS[normalizeText(h)] ?? normalizeText(h))

  return lines.slice(1).map(line => {
    const cells = line.split(sep).map(c => c.trim())
    const row = {}
    headers.forEach((h, idx) => { row[h] = cells[idx] })
    return row
  })
}

function parseImportRows(rawText) {
  const text = rawText.trim()
  if (!text) return []

  if (text.startsWith('{') || text.startsWith('[')) {
    const parsed = JSON.parse(text)

    if (Array.isArray(parsed)) return parsed

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([region, value]) => {
        if (value && typeof value === 'object') return { region, ...value }
        return { region, count: value }
      })
    }
  }

  return parseDelimitedRows(text)
}

function parseUzisNumber(value, { isCount = true } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const normalized = raw
    .replace(/\u00a0/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/nd\d*/g, '')

  if (!normalized || normalized === '-' || normalized === '.') return null

  const cleaned = normalized.replace(/^>/, '').replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.') return null

  const num = Number(cleaned)
  if (!Number.isFinite(num)) return null
  return isCount ? Math.max(0, Math.round(num)) : Math.max(0, Number(num.toFixed(1)))
}

function rowText(cols) {
  return cols.map(c => c.str).join(' ').replace(/\s+/g, ' ').trim()
}

function buildRowsByY(textItems) {
  const rows = new Map()
  for (const item of textItems) {
    const str = String(item.str ?? '').trim()
    if (!str) continue
    const x = Number(item.transform?.[4] ?? 0)
    const y = Number(item.transform?.[5] ?? 0)
    const key = Math.round(y * 10) / 10
    if (!rows.has(key)) rows.set(key, [])
    rows.get(key).push({ str, x, y: key })
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, cols]) => cols.sort((a, b) => a.x - b.x))
}

function extractUzisYearRowsFromPages(pages) {
  let yearColumns = []
  const parsedRows = []

  for (const page of pages) {
    for (const cols of page.rows) {
      if (!cols.length) continue

      const hasHeader = cols.some(c => c.str === 'Kód') && cols.some(c => c.str.startsWith('Diagnóza'))
      if (hasHeader) {
        yearColumns = cols
          .filter(c => /^\d{4}$/.test(c.str))
          .map(c => ({ year: c.str, x: c.x }))
          .sort((a, b) => a.x - b.x)
        continue
      }
      if (!yearColumns.length) continue

      const leftText = cols.filter(c => c.x < 70).map(c => c.str).join(' ').trim()
      const codeMatch = leftText.match(/[A-Z]\d{2}(?:\.\d+)?/)
      if (!codeMatch) continue
      const code = codeMatch[0]

      const diagnosis = cols
        .filter(c => c.x >= 70 && c.x < 230)
        .map(c => c.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!diagnosis) continue

      const values = {}
      for (let i = 0; i < yearColumns.length; i += 1) {
        const col = yearColumns[i]
        const next = yearColumns[i + 1]
        const start = col.x - 6
        const end = next ? next.x - 6 : Infinity
        const cell = cols
          .filter(c => c.x >= start && c.x < end)
          .map(c => c.str)
          .join(' ')
          .trim()
        values[col.year] = parseUzisNumber(cell, { isCount: true })
      }

      parsedRows.push({
        id: `${code}|${diagnosis}`,
        code,
        diagnosis,
        values,
      })
    }
  }

  const unique = new Map()
  for (const row of parsedRows) {
    if (!unique.has(row.id)) unique.set(row.id, row)
  }
  return [...unique.values()]
}

const UZIS_REGION_ORDER = REGIONS.map(r => r.name)
const UZIS_METRIC_KEY = {
  absolutnipocet: 'absoluteCount',
  nemocnost: 'incidence',
  kumulativnipocet: 'cumulativeCount',
  kumulativninemocnost: 'cumulativeIncidence',
}

function extractUzisPeriod(text) {
  const match = text.match(/,\s*([a-zá-ž]+)\s+((?:19|20)\d{2})/i)
  if (!match) return ''
  const month = match[1]
  const normalized = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()
  return `${normalized} ${match[2]}`
}

function parseRegionalDiagnosis(cols) {
  const left = cols.filter(c => c.x < 80).map(c => c.str).join(' ').trim()
  if (!left) return null

  const leftNorm = normalizeText(left)
  if (leftNorm === 'diagnozakraj') return null
  if (UZIS_METRIC_KEY[leftNorm]) return null

  const line = rowText(cols)
  const codeMatch = line.match(/\b([A-Z]\d{2}(?:\.\d+)?)\b/)
  if (!codeMatch) return null
  const code = codeMatch[1]

  const prefix = line.slice(0, codeMatch.index).trim()
  let diagnosis = cols
    .filter(c => c.x >= 80 && c.x < 260)
    .map(c => c.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!diagnosis) {
    diagnosis = line.slice((codeMatch.index ?? 0) + code.length)
      .replace(/^[\s.†)]+/, '')
      .trim()
  }

  if (!diagnosis) return null
  if (normalizeText(prefix) === 'ztoho' && !normalizeText(diagnosis).startsWith('ztoho')) {
    diagnosis = `z toho ${diagnosis}`
  }
  return { code, diagnosis }
}

function parseRegionalMetric(cols) {
  const label = cols
    .filter(c => c.x < 120)
    .map(c => c.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const metricKey = UZIS_METRIC_KEY[normalizeText(label)]
  if (!metricKey) return null

  const isCount = metricKey === 'absoluteCount' || metricKey === 'cumulativeCount'
  const values = cols
    .filter(c => c.x >= 120)
    .map(c => parseUzisNumber(c.str, { isCount }))
    .filter(v => v !== null)

  if (values.length < UZIS_REGION_ORDER.length) return null

  const byRegion = {}
  UZIS_REGION_ORDER.forEach((regionName, idx) => {
    const val = values[idx]
    if (val !== null && val !== undefined) byRegion[regionName] = val
  })

  return {
    metricKey,
    byRegion,
    total: values[UZIS_REGION_ORDER.length] ?? null,
  }
}

function scoreRegionalRow(row) {
  const keys = ['absoluteCount', 'incidence', 'cumulativeCount', 'cumulativeIncidence']
  return keys.reduce((sum, key) => (row[key] ? sum + 1 : sum), 0)
}

function extractUzisRegionalRowsFromPages(pages) {
  let period = ''
  let current = null
  const rows = []

  const flush = () => {
    if (!current) return
    if (scoreRegionalRow(current) > 0) rows.push(current)
    current = null
  }

  for (const page of pages) {
    for (const cols of page.rows) {
      if (!cols.length) continue
      const text = rowText(cols)

      if (!period && /podle kraj[uů]/i.test(text)) period = extractUzisPeriod(text)

      const diagnosis = parseRegionalDiagnosis(cols)
      if (diagnosis) {
        flush()
        current = {
          id: `${diagnosis.code}|${diagnosis.diagnosis}`,
          code: diagnosis.code,
          diagnosis: diagnosis.diagnosis,
          absoluteCount: null,
          incidence: null,
          cumulativeCount: null,
          cumulativeIncidence: null,
        }
        continue
      }

      const metric = parseRegionalMetric(cols)
      if (!metric || !current) continue
      current[metric.metricKey] = {
        byRegion: metric.byRegion,
        total: metric.total,
      }
    }
  }
  flush()

  const unique = new Map()
  for (const row of rows) {
    const existing = unique.get(row.id)
    if (!existing || scoreRegionalRow(row) > scoreRegionalRow(existing)) {
      unique.set(row.id, row)
    }
  }

  return {
    format: 'regional',
    period,
    rows: [...unique.values()],
  }
}

function detectUzisFormat(pages) {
  for (const page of pages) {
    for (const cols of page.rows) {
      const text = rowText(cols)
      if (normalizeText(text) === 'diagnozakraj') return 'regional'
      if (cols.some(c => c.str === 'Kód') && cols.some(c => c.str.startsWith('Diagnóza'))) return 'yearly'
    }
  }
  return 'unknown'
}

async function loadPdfJsLib() {
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs')
  } catch {
    return import('pdfjs-dist/build/pdf.mjs')
  }
}

async function readFileToUint8Array(file) {
  try {
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    // Fallback for browsers/filesystems that occasionally throw NotReadableError.
  }

  try {
    const fromReader = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error || new Error('Soubor nelze přečíst.'))
      reader.onload = () => resolve(new Uint8Array(reader.result))
      reader.readAsArrayBuffer(file)
    })
    return fromReader
  } catch {
    // Continue to object URL fallback.
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const res = await fetch(objectUrl)
    if (!res.ok) throw new Error(`Soubor se nepodařilo načíst (HTTP ${res.status}).`)
    return new Uint8Array(await res.arrayBuffer())
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function parseUzisPdf(file) {
  const pdfjsLib = await loadPdfJsLib()
  const buffer = await readFileToUint8Array(file)
  const task = pdfjsLib.getDocument({
    data: buffer,
    disableWorker: true,
    useSystemFonts: true,
    disableFontFace: true,
    stopAtErrors: false,
  })
  const pdf = await task.promise
  const pages = []

  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p)
    const text = await page.getTextContent()
    pages.push({ page: p, rows: buildRowsByY(text.items) })
    if (p % 2 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  const format = detectUzisFormat(pages)
  if (format === 'regional') return extractUzisRegionalRowsFromPages(pages)
  if (format === 'yearly') return { format: 'yearly', period: '', rows: extractUzisYearRowsFromPages(pages) }
  return { format: 'unknown', period: '', rows: [] }
}

function distributeToRegionsByPopulation(total) {
  const regions = REGIONS.map(r => r.name).filter(name => POPULATION[name])
  const popSum = regions.reduce((s, name) => s + POPULATION[name], 0)
  const out = {}

  let used = 0
  regions.forEach((name, idx) => {
    let count = 0
    if (idx === regions.length - 1) {
      count = Math.max(0, total - used)
    } else {
      count = Math.max(0, Math.round((total * POPULATION[name]) / popSum))
      used += count
    }
    const rate = Number(((count / POPULATION[name]) * 100000).toFixed(1))
    out[name] = { count, rate }
  })

  return out
}

export function DataEditor({ dataset, onUpdate, onUpdateValue, onDelete, onClose, onDuplicate }) {
  const [tab, setTab] = useState('meta') // 'meta' | 'values'
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importInfo, setImportInfo] = useState('')
  const [pdfRows, setPdfRows] = useState([])
  const [pdfRowId, setPdfRowId] = useState('')
  const [pdfFormat, setPdfFormat] = useState('')
  const [pdfPeriod, setPdfPeriod] = useState('')
  const [pdfYear, setPdfYear] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfMode, setPdfMode] = useState('meta') // regions | population | meta
  const [pdfMetric, setPdfMetric] = useState('cumulative') // cumulative | monthly
  const [pdfInfo, setPdfInfo] = useState('')

  if (!dataset) return null

  const handleMeta = (field, value) => {
    onUpdate(dataset.id, { [field]: value })
  }

  const handleImport = () => {
    try {
      const rows = parseImportRows(importText)
      if (rows.length === 0) {
        setImportInfo('Import: nenalezena žádná data.')
        return
      }

      const nextValues = { ...(dataset.values ?? {}) }
      let matched = 0
      const unknown = new Set()

      for (const row of rows) {
        const rawRegion = row.region ?? row.kraj ?? row.name ?? row.nazev ?? row.nuts3
        const regionName = REGION_LOOKUP.get(normalizeText(rawRegion))
        if (!regionName) {
          if (rawRegion) unknown.add(rawRegion)
          continue
        }

        const parsedCount = parseMaybeNumber(
          row.count ?? row.pocet ?? row.cases ?? row.absolutnipocet,
          true,
        )
        const parsedRate = parseMaybeNumber(
          row.rate ?? row.nemocnost ?? row.incidence ?? row.na100tis ?? row.na100000,
          false,
        )

        if (
          (parsedCount === null || parsedCount === '') &&
          (parsedRate === null || parsedRate === '')
        ) continue

        nextValues[regionName] = {
          ...(nextValues[regionName] ?? { count: '', rate: '' }),
          ...(parsedCount !== null && parsedCount !== '' ? { count: parsedCount } : {}),
          ...(parsedRate !== null && parsedRate !== '' ? { rate: parsedRate } : {}),
        }
        matched += 1
      }

      onUpdate(dataset.id, { values: nextValues })
      setImportInfo(
        `Importováno ${matched} krajů${unknown.size ? ` · nerozpoznáno: ${[...unknown].slice(0, 3).join(', ')}${unknown.size > 3 ? '…' : ''}` : ''}`,
      )
    } catch (err) {
      setImportInfo('Import se nezdařil: zkontrolujte JSON/CSV formát.')
    }
  }

  const handlePdfUpload = async (file) => {
    if (!file) return
    if (file.size === 0) {
      setPdfInfo('Vybraný PDF soubor má 0 B. Otevřete ho lokálně (stáhněte z cloudu) a nahrajte znovu.')
      return
    }
    setPdfBusy(true)
    setPdfInfo('')
    try {
      const parsed = await parseUzisPdf(file)
      const rows = parsed.rows ?? []
      if (!rows.length) {
        setPdfRows([])
        setPdfRowId('')
        setPdfFormat('')
        setPdfPeriod('')
        setPdfYear('')
        setPdfInfo('V PDF nebyly nalezeny použitelné řádky diagnóz.')
        return
      }

      setPdfRows(rows)
      setPdfRowId(rows[0].id)
      setPdfFormat(parsed.format)
      setPdfPeriod(parsed.period ?? '')
      setPdfMetric('cumulative')

      if (parsed.format === 'yearly') {
        const years = Object.keys(rows[0].values ?? {}).sort()
        const latestYear = years[years.length - 1] ?? ''
        setPdfYear(latestYear)
        setPdfMode('population')
        setPdfInfo(`Načteno ${rows.length} diagnóz z PDF (souhrnná tabulka za roky).`)
      } else if (parsed.format === 'regional') {
        setPdfYear('')
        setPdfMode('regions')
        setPdfInfo(
          `Načteno ${rows.length} diagnóz z PDF (krajská tabulka${parsed.period ? ` · ${parsed.period}` : ''}).`,
        )
      } else {
        setPdfYear('')
        setPdfMode('meta')
        setPdfInfo('PDF bylo načteno, ale formát tabulky nebyl rozpoznán.')
      }
    } catch (err) {
      console.error(err)
      const details = err?.message || 'zkontrolujte, že jde o tabulku ÚZIS.'
      const hint = /permission|read|NotReadable/i.test(details)
        ? ' (Tip: otevřete PDF lokálně z disku, ne přímo z cloudového umístění.)'
        : ''
      setPdfInfo(`PDF import selhal: ${details}${hint}`)
    } finally {
      setPdfBusy(false)
    }
  }

  const applyPdfRow = () => {
    const row = pdfRows.find(r => r.id === pdfRowId)
    if (!row) {
      setPdfInfo('Nejprve vyberte řádek diagnózy.')
      return
    }

    if (pdfFormat === 'regional') {
      const metricCfg = pdfMetric === 'monthly'
        ? {
            countKey: 'absoluteCount',
            rateKey: 'incidence',
            title: 'měsíční',
            countLabel: 'absolutní počet',
          }
        : {
            countKey: 'cumulativeCount',
            rateKey: 'cumulativeIncidence',
            title: 'kumulativní',
            countLabel: 'kumulativní počet',
          }

      const countMetric = row[metricCfg.countKey]
      const rateMetric = row[metricCfg.rateKey]
      const total = countMetric?.total

      if (pdfMode === 'regions' && (!countMetric || !countMetric.byRegion)) {
        setPdfInfo(`V řádku chybí hodnoty pro ${metricCfg.countLabel}.`)
        return
      }

      const patch = {
        label: row.diagnosis,
        code: row.code,
        period: pdfPeriod || dataset.period,
        source: 'ÚZIS PDF import',
        note: `Import z PDF ÚZIS (${metricCfg.title})${Number.isFinite(total) ? ` · ČR celkem ${Number(total).toLocaleString('cs-CZ')}` : ''}`,
      }

      if (pdfMode === 'regions') {
        const nextValues = { ...(dataset.values ?? {}) }
        REGIONS.forEach(region => {
          const count = countMetric?.byRegion?.[region.name]
          const rate = rateMetric?.byRegion?.[region.name]
          nextValues[region.name] = {
            ...(nextValues[region.name] ?? { count: '', rate: '' }),
            ...(count !== null && count !== undefined ? { count } : {}),
            ...(rate !== null && rate !== undefined ? { rate } : {}),
          }
        })
        patch.values = nextValues
      }

      onUpdate(dataset.id, patch)
      setPdfInfo(
        pdfMode === 'regions'
          ? `Krajské hodnoty byly importovány (${metricCfg.title} data).`
          : 'Do datasetu byla nastavena diagnóza + metadata (bez změny hodnot krajů).',
      )
      return
    }

    const total = row.values?.[pdfYear]
    if (total === null || total === undefined || Number.isNaN(total)) {
      setPdfInfo(`Pro rok ${pdfYear} není v řádku dostupná číselná hodnota.`)
      return
    }

    const patch = {
      label: row.diagnosis,
      code: row.code,
      period: pdfYear ? `Leden–únor ${pdfYear}` : dataset.period,
      source: 'ÚZIS PDF import',
      note: `Import z PDF ÚZIS · celkem ČR ${Number(total).toLocaleString('cs-CZ')}`,
    }

    if (pdfMode === 'population') {
      const dist = distributeToRegionsByPopulation(Number(total))
      const nextValues = { ...(dataset.values ?? {}) }
      for (const regionName of Object.keys(dist)) {
        nextValues[regionName] = {
          ...(nextValues[regionName] ?? { count: '', rate: '' }),
          count: dist[regionName].count,
          rate: dist[regionName].rate,
        }
      }
      patch.values = nextValues
    }

    onUpdate(dataset.id, patch)
    setPdfInfo(
      pdfMode === 'population'
        ? 'Řádek byl promítnut do krajů poměrem podle populace (orientační rozpad).'
        : 'Do datasetu byla nastavena diagnóza + metadata (bez změny hodnot krajů).',
    )
  }

  const totalCount = Object.values(dataset.values ?? {})
    .reduce((s, v) => s + (Number(v.count) || 0), 0)
  const pdfYears = pdfFormat === 'yearly' && pdfRows.length > 0
    ? Object.keys(pdfRows[0].values ?? {}).sort()
    : []

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.headerTitle}>
              {dataset.label || 'Nový dataset'}
            </div>
            <div className={styles.headerSub}>Editor dat</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Zavřít">✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'meta' ? styles.tabActive : ''}`}
            onClick={() => setTab('meta')}
          >
            Informace
          </button>
          <button
            className={`${styles.tab} ${tab === 'values' ? styles.tabActive : ''}`}
            onClick={() => setTab('values')}
          >
            Data krajů
            <span className={styles.tabBadge}>{totalCount > 0 ? totalCount : ''}</span>
          </button>
        </div>

        <div className={styles.body}>
          {tab === 'meta' && (
            <div className={styles.metaForm}>
              <Field label="Název (diagnóza / ukazatel)" required>
                <input
                  type="text"
                  value={dataset.label}
                  onChange={e => handleMeta('label', e.target.value)}
                  placeholder="např. Hepatitida A"
                />
              </Field>
              <div className={styles.row2}>
                <Field label="Kód diagnózy">
                  <input
                    type="text"
                    value={dataset.code}
                    onChange={e => handleMeta('code', e.target.value)}
                    placeholder="např. B15"
                  />
                </Field>
                <Field label="Období">
                  <input
                    type="text"
                    value={dataset.period}
                    onChange={e => handleMeta('period', e.target.value)}
                    placeholder="např. Leden 2026"
                  />
                </Field>
              </div>
              <Field label="Zobrazované hodnoty">
                <select
                  value={dataset.unit}
                  onChange={e => handleMeta('unit', e.target.value)}
                >
                  <option value="both">Počet i nemocnost</option>
                  <option value="count">Pouze absolutní počet</option>
                  <option value="rate">Pouze nemocnost</option>
                </select>
              </Field>
              <Field label="Zdroj dat">
                <input
                  type="text"
                  value={dataset.source}
                  onChange={e => handleMeta('source', e.target.value)}
                  placeholder="např. SZÚ · ISIN"
                />
              </Field>
              <Field label="Poznámka">
                <textarea
                  value={dataset.note}
                  onChange={e => handleMeta('note', e.target.value)}
                  placeholder="Volitelná poznámka…"
                  rows={2}
                />
              </Field>
            </div>
          )}

          {tab === 'values' && (
            <div className={styles.valuesForm}>
              <div className={styles.importBox}>
                <div className={styles.importTop}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setImportOpen(v => !v)}
                    type="button"
                  >
                    {importOpen ? 'Skrýt import' : 'Import CSV / JSON'}
                  </button>
                  {importInfo && <span className={styles.importInfo}>{importInfo}</span>}
                </div>

                {importOpen && (
                  <>
                    <textarea
                      className={styles.importArea}
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={'CSV: kraj;count;rate\\nPraha;89;6.4\\n...\\n\\nJSON: {\"Hlavní město Praha\": {\"count\": 89, \"rate\": 6.4}}'}
                      rows={5}
                    />
                    <div className={styles.importActions}>
                      <button className={styles.btnPrimary} onClick={handleImport} type="button">
                        Načíst do datasetu
                      </button>
                      <button
                        className={styles.btnSecondary}
                        type="button"
                        onClick={() => {
                          setImportText('')
                          setImportInfo('')
                        }}
                      >
                        Vyčistit
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.pdfBox}>
                <div className={styles.pdfTop}>
                  <label className={styles.fileBtn}>
                    {pdfBusy ? 'Načítám PDF…' : 'Nahrát PDF (ÚZIS)'}
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={pdfBusy}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        handlePdfUpload(file)
                        // Allow selecting the same file again after a failed attempt.
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {pdfInfo && <span className={styles.pdfInfo}>{pdfInfo}</span>}
                </div>

                {pdfRows.length > 0 && (
                  <div className={styles.pdfControls}>
                    <select value={pdfRowId} onChange={e => setPdfRowId(e.target.value)}>
                      {pdfRows.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.code} · {r.diagnosis}
                        </option>
                      ))}
                    </select>

                    {pdfFormat === 'yearly' && (
                      <select value={pdfYear} onChange={e => setPdfYear(e.target.value)}>
                        {pdfYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}

                    {pdfFormat === 'regional' && (
                      <select value={pdfMetric} onChange={e => setPdfMetric(e.target.value)}>
                        <option value="cumulative">Kumulativní hodnoty (doporučeno)</option>
                        <option value="monthly">Měsíční hodnoty</option>
                      </select>
                    )}

                    <select value={pdfMode} onChange={e => setPdfMode(e.target.value)}>
                      {pdfFormat === 'regional' && (
                        <option value="regions">Promítnout do krajů (přímo z PDF)</option>
                      )}
                      {pdfFormat === 'yearly' && (
                        <option value="population">Promítnout do krajů (podle populace)</option>
                      )}
                      <option value="meta">Jen metadata (bez změny krajů)</option>
                    </select>

                    <button className={styles.btnPrimary} onClick={applyPdfRow} type="button">
                      Použít vybraný řádek
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.valuesHeader}>
                <span className={styles.colKraj}>Kraj</span>
                <span className={styles.colNum}>Počet případů</span>
                <span className={styles.colNum}>Nemocnost<br/><small>/100 tis.</small></span>
              </div>
              {REGIONS.map(r => {
                const v = dataset.values?.[r.name] ?? { count: '', rate: '' }
                return (
                  <div key={r.name} className={styles.valueRow}>
                    <span className={styles.colKraj}>{r.short}</span>
                    <input
                      className={styles.colNum}
                      type="number"
                      min="0"
                      step="1"
                      value={v.count}
                      placeholder="—"
                      onChange={e => onUpdateValue(dataset.id, r.name, 'count', e.target.value)}
                    />
                    <input
                      className={styles.colNum}
                      type="number"
                      min="0"
                      step="0.1"
                      value={v.rate}
                      placeholder="—"
                      onChange={e => onUpdateValue(dataset.id, r.name, 'rate', e.target.value)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button className={styles.btnDanger} onClick={() => {
              if (window.confirm('Opravdu smazat tento dataset?')) onDelete(dataset.id)
            }}>
              Smazat
            </button>
            <button className={styles.btnSecondary} onClick={() => onDuplicate(dataset.id)}>
              Duplikovat
            </button>
          </div>
          <button className={styles.btnPrimary} onClick={onClose}>
            Hotovo
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}{required && <span className={styles.required}> *</span>}
      </label>
      {children}
    </div>
  )
}
