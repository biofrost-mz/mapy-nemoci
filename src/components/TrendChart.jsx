import styles from './TrendChart.module.css'
import { POPULATION } from '../data/regions'

const MONTH_NAME_SHORT = [
  'Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn',
  'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro',
]

const MONTH_MAP = {
  leden: 0,
  unor: 1,
  brezen: 2,
  duben: 3,
  kveten: 4,
  cerven: 5,
  cervenec: 6,
  srpen: 7,
  zari: 8,
  rijen: 9,
  listopad: 10,
  prosinec: 11,
}

const TOTAL_POPULATION = Object.values(POPULATION).reduce((sum, value) => sum + Number(value || 0), 0)

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parsePeriod(periodText) {
  const text = normalizeText(periodText)
  if (!text) return null

  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? Number(yearMatch[0]) : null

  let month = null
  for (const [monthName, monthIndex] of Object.entries(MONTH_MAP)) {
    if (text.includes(monthName)) {
      month = monthIndex
      break
    }
  }

  if (year === null) return null
  return { year, month: month ?? 0 }
}

function formatPeriod(periodText, fallbackIndex) {
  const parsed = parsePeriod(periodText)
  if (!parsed) return periodText || `Období ${fallbackIndex + 1}`
  const month = MONTH_NAME_SHORT[parsed.month] ?? ''
  return `${month} ${String(parsed.year).slice(-2)}`
}

function getDiseaseKey(dataset) {
  const code = normalizeText(dataset?.code)
  const label = normalizeText(dataset?.label)
  return {
    code,
    label,
  }
}

function computeTotalCount(dataset) {
  return Object.values(dataset?.values ?? {}).reduce((sum, regionData) => {
    const value = Number(regionData?.count)
    return Number.isFinite(value) ? sum + value : sum
  }, 0)
}

function computeRateForChart(dataset) {
  const totalCount = computeTotalCount(dataset)
  if (totalCount > 0 && TOTAL_POPULATION > 0) {
    return Number(((totalCount / TOTAL_POPULATION) * 100000).toFixed(1))
  }

  const rates = Object.values(dataset?.values ?? {})
    .map(regionData => Number(regionData?.rate))
    .filter(value => Number.isFinite(value) && value > 0)
  if (rates.length === 0) return null

  const avg = rates.reduce((sum, value) => sum + value, 0) / rates.length
  return Number(avg.toFixed(1))
}

function getSeriesValue(dataset, mode) {
  if (mode === 'count') return computeTotalCount(dataset)
  return computeRateForChart(dataset)
}

function matchesActiveDisease(dataset, activeKey) {
  const dsCode = normalizeText(dataset?.code)
  const dsLabel = normalizeText(dataset?.label)

  if (activeKey.code) {
    if (dsCode && dsCode === activeKey.code) return true
    if (!dsCode && activeKey.label && dsLabel === activeKey.label) return true
    return false
  }

  if (!activeKey.label) return false
  return dsLabel === activeKey.label
}

function buildTrendSeries(datasets, activeDataset, mode) {
  if (!activeDataset) return []
  const activeKey = getDiseaseKey(activeDataset)

  const rows = datasets
    .filter(ds => matchesActiveDisease(ds, activeKey))
    .map((ds, index) => {
      const parsed = parsePeriod(ds.period)
      const order = parsed ? (parsed.year * 100 + parsed.month) : Number.MAX_SAFE_INTEGER
      return {
        id: ds.id,
        period: ds.period || '',
        value: getSeriesValue(ds, mode),
        order,
        rawIndex: index,
      }
    })
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      return a.rawIndex - b.rawIndex
    })

  return rows.map((row, index) => ({
    ...row,
    shortPeriod: formatPeriod(row.period, index),
  }))
}

function formatValue(value, mode) {
  if (value === null || value === undefined) return '—'
  if (mode === 'count') return Number(value).toLocaleString('cs-CZ')
  return Number(value).toFixed(1)
}

export function TrendChart({
  datasets,
  activeDataset,
  activeDatasetId,
  displayMode,
  onSelectDataset,
}) {
  if (!activeDataset) return null

  const series = buildTrendSeries(datasets, activeDataset, displayMode)
  const titleUnit = displayMode === 'count' ? 'Celkem případů v ČR' : 'Nemocnost v ČR / 100 tis.'

  if (series.length < 2) {
    return (
      <div className={styles.wrap}>
        <div className={styles.title}>Trend v čase</div>
        <div className={styles.sub}>{titleUnit}</div>
        <div className={styles.empty}>
          Pro trend je potřeba alespoň 2 období stejné diagnózy.
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...series.map(point => Number(point.value || 0)), 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Trend v čase</div>
      <div className={styles.sub}>
        {activeDataset.label || 'Diagnóza'} · {titleUnit}
      </div>

      <div className={styles.hint}>Klik na sloupec přepne období</div>

      <div className={styles.scroll}>
        <div className={styles.chart}>
          {series.map(point => {
            const value = Number(point.value || 0)
            const heightPct = point.value === null ? 3 : Math.max(6, (value / maxValue) * 100)
            const selected = point.id === activeDatasetId

            return (
              <button
                key={point.id}
                className={`${styles.col} ${selected ? styles.colSelected : ''}`}
                onClick={() => onSelectDataset(point.id)}
                title={`${point.period || point.shortPeriod}: ${formatValue(point.value, displayMode)}`}
                type="button"
              >
                <div className={styles.barTrack}>
                  <div className={styles.bar} style={{ height: `${heightPct}%` }} />
                </div>
                <div className={styles.period}>{point.shortPeriod}</div>
                <div className={styles.value}>
                  {formatValue(point.value, displayMode)}
                  {displayMode === 'rate' && point.value !== null ? <span>/100 tis.</span> : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
