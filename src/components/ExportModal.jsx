import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { Map } from './Map'
import { RegionDetail } from './RegionDetail'
import { BarChart } from './BarChart'
import styles from './ExportModal.module.css'

function safeName(value) {
  return String(value ?? 'export')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getTopRegion(dataset, displayMode) {
  if (!dataset?.values) return null
  let bestRegion = null
  let bestValue = -1
  for (const [name, values] of Object.entries(dataset.values)) {
    const value = displayMode === 'rate' ? Number(values?.rate || 0) : Number(values?.count || 0)
    if (value > bestValue) {
      bestValue = value
      bestRegion = name
    }
  }
  return bestRegion
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function ExportModal({
  open,
  onClose,
  dataset,
  displayMode,
  selectedRegion,
  onSelectRegion,
  getDisplayValue,
  maxValue,
}) {
  const exportRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [opts, setOpts] = useState({
    header: true,
    map: true,
    legend: true,
    detail: true,
    chart: true,
    source: true,
    countInLabels: false,
    highlightRegion: false,
  })

  const detailRegion = useMemo(() => {
    return selectedRegion || getTopRegion(dataset, displayMode)
  }, [selectedRegion, dataset, displayMode])

  const exportRegion = useMemo(() => {
    if (!opts.highlightRegion) return null
    return detailRegion
  }, [opts.highlightRegion, detailRegion])

  if (!open || !dataset) return null

  const filenameBase = safeName(`${dataset.label || 'dataset'}-${dataset.period || 'export'}`) || 'export'

  const setOpt = (key, value) => {
    setOpts(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'map' && !value) next.legend = false
      return next
    })
  }

  const exportNode = async (format) => {
    if (!exportRef.current) return
    setBusy(true)
    setError('')

    try {
      const imageOptions = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      }

      const pngUrl = await toPng(exportRef.current, imageOptions)
      if (format === 'png') {
        downloadDataUrl(pngUrl, `${filenameBase}.png`)
        return
      }

      if (format === 'pdf') {
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = pngUrl
        })
        const orientation = img.width >= img.height ? 'landscape' : 'portrait'
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [img.width, img.height],
          compress: true,
        })
        pdf.addImage(pngUrl, 'PNG', 0, 0, img.width, img.height, undefined, 'FAST')
        pdf.save(`${filenameBase}.pdf`)
      }
    } catch (err) {
      setError('Export se nezdařil. Zkuste prosím jiný formát nebo menší rozsah.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.left}>
          <div className={styles.title}>Export reportu</div>
          <div className={styles.subTitle}>Zvolte obsah výstupu a formát.</div>

          <div className={styles.options}>
            <label><input type="checkbox" checked={opts.header} onChange={e => setOpt('header', e.target.checked)} /> Hlavička</label>
            <label><input type="checkbox" checked={opts.map} onChange={e => setOpt('map', e.target.checked)} /> Mapa</label>
            <label><input type="checkbox" checked={opts.legend} disabled={!opts.map} onChange={e => setOpt('legend', e.target.checked)} /> Legenda</label>
            <label><input type="checkbox" checked={opts.highlightRegion} onChange={e => setOpt('highlightRegion', e.target.checked)} /> Zvýraznit 1 kraj</label>
            <label><input type="checkbox" checked={opts.detail} onChange={e => setOpt('detail', e.target.checked)} /> Detail kraje</label>
            <label><input type="checkbox" checked={opts.chart} onChange={e => setOpt('chart', e.target.checked)} /> Srovnání krajů</label>
            <label><input type="checkbox" checked={opts.source} onChange={e => setOpt('source', e.target.checked)} /> Zdroj + poznámka</label>
            <label><input type="checkbox" checked={opts.countInLabels} onChange={e => setOpt('countInLabels', e.target.checked)} /> Počet u názvu kraje</label>
          </div>

          <div className={styles.meta}>
            <div><strong>Dataset:</strong> {dataset.label || '—'}</div>
            <div><strong>Období:</strong> {dataset.period || '—'}</div>
            <div><strong>Vybraný kraj:</strong> {detailRegion || 'žádný'}</div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button className={styles.primary} disabled={busy} onClick={() => exportNode('png')}>Export PNG</button>
            <button className={styles.secondary} disabled={busy} onClick={() => exportNode('pdf')}>Export PDF</button>
          </div>

          <button className={styles.close} disabled={busy} onClick={onClose}>Zavřít</button>
        </div>

        <div className={styles.right}>
          <div className={styles.previewWrap}>
            <div ref={exportRef} className={styles.previewPaper}>
              {opts.header && (
                <div className={styles.previewHeader}>
                  <h2>{dataset.label || 'Epidemiologický přehled'}</h2>
                  <div>{dataset.period || '—'} · {displayMode === 'rate' ? 'Nemocnost' : 'Absolutní počty'}</div>
                </div>
              )}

              {opts.map && (
                <div className={styles.previewMap}>
                  <Map
                    getDisplayValue={getDisplayValue}
                    maxValue={maxValue}
                    selectedRegion={exportRegion}
                    onSelectRegion={onSelectRegion}
                    displayMode={displayMode}
                    dataset={dataset}
                    hideLegend={!opts.legend}
                    hideHint
                    showCountInLabels={opts.countInLabels}
                  />
                </div>
              )}

              {(opts.detail || opts.chart) && (
                <div className={styles.previewBottom}>
                  {opts.detail && (
                    <RegionDetail
                      regionName={detailRegion}
                      dataset={dataset}
                      displayMode={displayMode}
                    />
                  )}
                  {opts.chart && (
                    <BarChart
                      dataset={dataset}
                      displayMode={displayMode}
                      selectedRegion={detailRegion}
                      onSelectRegion={onSelectRegion}
                    />
                  )}
                </div>
              )}

              {opts.source && (
                <div className={styles.previewFooter}>
                  Zdroj: {dataset.source || '—'}
                  {dataset.note ? ` · ${dataset.note}` : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
