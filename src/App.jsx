import { useMemo, useState } from 'react'
import { useMapData } from './hooks/useMapData'
import { Header, AvenierLogo } from './components/Header'
import { Map, ColorLegend } from './components/Map'
import { RegionDetail } from './components/RegionDetail'
import { BarChart } from './components/BarChart'
import { DataEditor } from './components/DataEditor'
import { ExportModal } from './components/ExportModal'
import { EmbedModal } from './components/EmbedModal'
import { decodeShareState } from './utils/shareSnapshot'
import styles from './App.module.css'

// Read URL params — podporované parametry:
// ?mode=embed          → čistá karta (jen mapa + legenda + popis)
// ?mode=embed-full     → karta + barchart + detail pod mapou
// ?mode=full           → plná verze s editací (výchozí)
// ?display=rate|count  → výchozí zobrazení
function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    mode: params.get('mode'),
    display: params.get('display'),
    share: params.get('share'),
  }
}

export default function App() {
  const urlParams = useMemo(() => getUrlParams(), [])
  const sharedState = useMemo(() => decodeShareState(urlParams.share), [urlParams.share])
  const resolvedMode = urlParams.mode ?? sharedState?.mode ?? 'full'
  const initialDisplay = urlParams.display ?? sharedState?.display ?? 'rate'
  const sharedDataset = sharedState?.dataset ?? null

  const embedMode = resolvedMode === 'embed'
  const embedFull = resolvedMode === 'embed-full'
  const isEmbed = embedMode || embedFull
  const [exportOpen, setExportOpen] = useState(false)
  const [embedOpen, setEmbedOpen] = useState(false)

  const {
    datasets, activeDataset, activeDatasetId,
    displayMode, selectedRegion,
    editorOpen, editingDataset, maxValue,
    setActiveDatasetId, setDisplayMode, setSelectedRegion,
    addDataset, updateDataset, updateRegionValue,
    deleteDataset, duplicateDataset,
    openEditor, closeEditor, getDisplayValue,
  } = useMapData({
    initialDatasets: sharedDataset ? [sharedDataset] : null,
    initialActiveDatasetId: sharedDataset?.id ?? null,
    persist: !sharedDataset,
    initialDisplayMode: initialDisplay,
  })

  const effectiveDisplayMode = displayMode
  const detailRegion = selectedRegion || getTopRegion(activeDataset, effectiveDisplayMode)

  // ── Embed card layout ──────────────────────────────────────────────────────
  if (isEmbed) {
    return (
      <div className={styles.embedWrap}>
        <div className={styles.card}>

          {/* Card header: title + logo */}
          <div className={styles.cardHeader}>
            <div className={styles.cardMeta}>
              <h2 className={styles.cardTitle}>{activeDataset?.label || '—'}</h2>
              {activeDataset?.period && (
                <div className={styles.cardPeriod}>{activeDataset.period}</div>
              )}
              {activeDataset?.note && (
                <div className={styles.cardDesc}>{activeDataset.note}</div>
              )}
            </div>
            <div className={styles.cardLogo}>
              <AvenierLogo size={24} />
            </div>
          </div>

          {/* Controls row: display toggle + legend */}
          <div className={styles.cardControls}>
            <div className={styles.cardToggle}>
              <button
                className={`${styles.cardToggleBtn} ${effectiveDisplayMode === 'count' ? styles.cardToggleActive : ''}`}
                onClick={() => setDisplayMode('count')}
              >Počet</button>
              <button
                className={`${styles.cardToggleBtn} ${effectiveDisplayMode === 'rate' ? styles.cardToggleActive : ''}`}
                onClick={() => setDisplayMode('rate')}
              >Nemocnost</button>
            </div>
            <div className={styles.cardLegendWrap}>
              <ColorLegend maxValue={maxValue} displayMode={effectiveDisplayMode} />
            </div>
          </div>

          {/* Map */}
          <div className={styles.cardMap}>
            <Map
              getDisplayValue={getDisplayValue}
              maxValue={maxValue}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              displayMode={effectiveDisplayMode}
              dataset={activeDataset}
              hideLegend
            />
          </div>

          {/* embed-full: detail + barchart below map */}
          {embedFull && (
            <div className={styles.cardSidebar}>
              <RegionDetail
                regionName={selectedRegion}
                dataset={activeDataset}
                displayMode={effectiveDisplayMode}
              />
              <BarChart
                dataset={activeDataset}
                displayMode={effectiveDisplayMode}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
              />
            </div>
          )}

          {/* Card footer: source */}
          {activeDataset?.source && (
            <div className={styles.cardFooter}>
              Zdroj dat: <span>{activeDataset.source}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Full app layout ────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>

      <Header
        datasets={datasets}
        activeDatasetId={activeDatasetId}
        onSelectDataset={setActiveDatasetId}
        onAddDataset={addDataset}
        onOpenEditor={openEditor}
        onOpenExport={() => setExportOpen(true)}
        onOpenEmbed={() => setEmbedOpen(true)}
        displayMode={effectiveDisplayMode}
        onSetDisplayMode={setDisplayMode}
        activeDataset={activeDataset}
        embedMode={false}
      />

      <main className={styles.main}>

        <section className={styles.mapSection}>
          {activeDataset && (
            <KpiRow dataset={activeDataset} displayMode={effectiveDisplayMode} />
          )}
          <Map
            getDisplayValue={getDisplayValue}
            maxValue={maxValue}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            displayMode={effectiveDisplayMode}
            dataset={activeDataset}
          />
          <div className={styles.mapDetailUnder}>
            <RegionDetail
              regionName={detailRegion}
              dataset={activeDataset}
              displayMode={effectiveDisplayMode}
            />
          </div>
        </section>

        <aside className={styles.sidebar}>
          <BarChart
            dataset={activeDataset}
            displayMode={effectiveDisplayMode}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
        </aside>
      </main>

      {activeDataset?.source && (
        <footer className={styles.footer}>
          <span>Zdroj: {activeDataset.source}</span>
          {activeDataset.note && <span> · {activeDataset.note}</span>}
          <span className={styles.footerRight}>© Avenier</span>
        </footer>
      )}

      {editorOpen && editingDataset && (
        <DataEditor
          dataset={editingDataset}
          onUpdate={updateDataset}
          onUpdateValue={updateRegionValue}
          onDelete={deleteDataset}
          onDuplicate={duplicateDataset}
          onClose={closeEditor}
        />
      )}

      {exportOpen && activeDataset && (
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          dataset={activeDataset}
          displayMode={effectiveDisplayMode}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          getDisplayValue={getDisplayValue}
          maxValue={maxValue}
        />
      )}

      {embedOpen && activeDataset && (
        <EmbedModal
          open={embedOpen}
          onClose={() => setEmbedOpen(false)}
          dataset={activeDataset}
          displayMode={effectiveDisplayMode}
        />
      )}
    </div>
  )
}

function getTopRegion(dataset, mode) {
  if (!dataset?.values) return null
  let best = null
  let bestValue = -1
  for (const [regionName, values] of Object.entries(dataset.values)) {
    const v = mode === 'rate' ? Number(values?.rate || 0) : Number(values?.count || 0)
    if (v > bestValue) {
      bestValue = v
      best = regionName
    }
  }
  return best
}

// KPI summary row
function KpiRow({ dataset, displayMode }) {
  const values = Object.values(dataset.values ?? {})
  const counts = values.map(v => Number(v.count || 0))
  const rates  = values.map(v => Number(v.rate  || 0)).filter(r => r > 0)

  const totalCount = counts.reduce((a, b) => a + b, 0)
  const maxRate    = Math.max(...rates, 0)
  const avgRate    = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length) : 0

  const pills = [
    { label: 'Celkem případů ČR', value: totalCount || '—' },
    { label: 'Průměr nemocnosti', value: avgRate ? avgRate.toFixed(1) : '—' },
    { label: 'Maximum nemocnosti', value: maxRate ? maxRate.toFixed(1) : '—' },
  ]

  return (
    <div className={styles.kpiRow}>
      {pills.map(p => (
        <div key={p.label} className={styles.kpi}>
          <div className={styles.kpiValue}>{p.value}</div>
          <div className={styles.kpiLabel}>{p.label}</div>
        </div>
      ))}
      <div className={styles.kpiMeta}>
        <strong>{dataset.label}</strong>
        {dataset.period && <span> · {dataset.period}</span>}
        {dataset.code && <span className={styles.kpiCode}>{dataset.code}</span>}
      </div>
    </div>
  )
}
