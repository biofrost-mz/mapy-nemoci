import styles from './BarChart.module.css'
import { REGIONS } from '../data/regions'

const BAR_COLOR_SCALE = ['#d4eaaa', '#aad46a', '#78be20', '#4d9e00', '#006778', '#004d5c']

function barColor(value, max) {
  if (!value || max === 0) return '#e6e6e6'
  const t = Math.min(value / max, 1)
  const idx = Math.floor(t * (BAR_COLOR_SCALE.length - 1))
  return BAR_COLOR_SCALE[idx]
}

export function BarChart({ dataset, displayMode, selectedRegion, onSelectRegion }) {
  if (!dataset) return null

  const entries = REGIONS.map(r => ({
    name: r.name,
    short: r.short,
    value: displayMode === 'rate'
      ? (dataset.values?.[r.name]?.rate !== '' ? Number(dataset.values?.[r.name]?.rate) : null)
      : (dataset.values?.[r.name]?.count !== '' ? Number(dataset.values?.[r.name]?.count) : null),
  })).sort((a, b) => (b.value ?? -1) - (a.value ?? -1))

  const max = Math.max(...entries.map(e => e.value ?? 0), 1)
  const unit = displayMode === 'rate' ? '/100 tis.' : 'př.'

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>
        {displayMode === 'rate' ? 'Nemocnost na 100 000 obyvatel' : 'Absolutní počty případů'}
      </div>
      <div className={styles.chart}>
        {entries.map(e => {
          const pct = e.value !== null ? (e.value / max) * 100 : 0
          const isSelected = e.name === selectedRegion
          return (
            <div
              key={e.name}
              className={`${styles.row} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelectRegion(e.name === selectedRegion ? null : e.name)}
              title={e.name}
            >
              <div className={styles.label}>{e.short}</div>
              <div className={styles.barWrap}>
                <div
                  className={styles.bar}
                  style={{
                    width: `${pct}%`,
                    background: barColor(e.value, max),
                  }}
                />
              </div>
              <div className={styles.value}>
                {e.value !== null ? (
                  <>{displayMode === 'rate' ? e.value.toFixed(1) : e.value} <span>{unit}</span></>
                ) : (
                  <span className={styles.nodata}>—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
