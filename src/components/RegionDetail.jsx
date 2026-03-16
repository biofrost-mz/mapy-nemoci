import styles from './RegionDetail.module.css'
import { POPULATION } from '../data/regions'

export function RegionDetail({ regionName, dataset, displayMode }) {
  if (!regionName || !dataset) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🗺️</div>
        <p>Klikněte na kraj v mapě<br />pro zobrazení detailu</p>
      </div>
    )
  }

  const v = dataset.values?.[regionName] ?? {}
  const count = v.count !== '' ? Number(v.count) : null
  const rate  = v.rate  !== '' ? Number(v.rate)  : null
  const pop   = POPULATION[regionName]

  // National totals
  const allVals = Object.values(dataset.values ?? {})
  const totalCount = allVals.reduce((s, x) => s + (Number(x.count) || 0), 0)
  const shareStr = count !== null && totalCount > 0
    ? ((count / totalCount) * 100).toFixed(1) + ' %'
    : '—'

  // Average rate
  const rates = allVals.map(x => Number(x.rate)).filter(r => !isNaN(r) && r > 0)
  const avgRate = rates.length > 0 ? (rates.reduce((a, b) => a + b, 0) / rates.length) : null
  const vsAvg = rate !== null && avgRate !== null
    ? ((rate - avgRate) / avgRate * 100).toFixed(0)
    : null

  return (
    <div className={styles.card}>
      <div className={styles.regionName}>{regionName}</div>
      <div className={styles.datasetLabel}>{dataset.label || '—'} · {dataset.period || '—'}</div>

      <div className={styles.metrics}>
        {count !== null && (
          <div className={styles.metric}>
            <div className={styles.metricValue}>{count}</div>
            <div className={styles.metricLabel}>Počet případů</div>
          </div>
        )}
        {rate !== null && (
          <div className={styles.metric}>
            <div className={styles.metricValue}>{rate.toFixed(1)}</div>
            <div className={styles.metricLabel}>Nemocnost / 100 tis.</div>
          </div>
        )}
      </div>

      <div className={styles.rows}>
        {pop && (
          <div className={styles.row}>
            <span className={styles.rowKey}>Populace kraje</span>
            <span className={styles.rowVal}>{pop.toLocaleString('cs-CZ')}</span>
          </div>
        )}
        {totalCount > 0 && (
          <div className={styles.row}>
            <span className={styles.rowKey}>Podíl z celku ČR</span>
            <span className={styles.rowVal}>{shareStr}</span>
          </div>
        )}
        {vsAvg !== null && (
          <div className={styles.row}>
            <span className={styles.rowKey}>vs. průměr krajů</span>
            <span className={`${styles.rowVal} ${Number(vsAvg) > 0 ? styles.above : styles.below}`}>
              {Number(vsAvg) > 0 ? '+' : ''}{vsAvg} %
            </span>
          </div>
        )}
      </div>

      {dataset.source && (
        <div className={styles.source}>Zdroj: {dataset.source}</div>
      )}
    </div>
  )
}
