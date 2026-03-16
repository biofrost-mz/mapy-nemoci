import { useEffect, useMemo, useState } from 'react'
import styles from './EmbedModal.module.css'
import { encodeShareState } from '../utils/shareSnapshot'

function recommendedHeight(mode) {
  return mode === 'embed' ? 560 : 860
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'absolute'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}

export function EmbedModal({ open, onClose, dataset, displayMode }) {
  const [mode, setMode] = useState('embed-full')
  const [display, setDisplay] = useState(displayMode === 'count' ? 'count' : 'rate')
  const [height, setHeight] = useState(recommendedHeight('embed-full'))
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!open) return
    setDisplay(displayMode === 'count' ? 'count' : 'rate')
  }, [open, displayMode])

  useEffect(() => {
    setHeight(recommendedHeight(mode))
  }, [mode])

  const shareToken = useMemo(() => {
    if (!dataset) return ''
    return encodeShareState({ dataset, mode, display })
  }, [dataset, mode, display])

  const embedUrl = useMemo(() => {
    if (!shareToken || typeof window === 'undefined') return ''
    const url = new URL('/', window.location.origin)
    url.searchParams.set('mode', mode)
    url.searchParams.set('display', display)
    url.searchParams.set('share', shareToken)
    return url.toString()
  }, [mode, display, shareToken])

  const iframeCode = useMemo(() => {
    if (!embedUrl) return ''
    return `<iframe
  src="${embedUrl}"
  title="Epidemiologická mapa ČR"
  loading="lazy"
  style="width:100%;height:${height}px;border:0;border-radius:12px;background:#fff;"
></iframe>`
  }, [embedUrl, height])

  if (!open || !dataset) return null

  const onCopyIframe = async () => {
    try {
      await copyText(iframeCode)
      setStatus('Iframe kód zkopírován.')
    } catch {
      setStatus('Kód se nepodařilo zkopírovat. Zkopírujte ho ručně z pole níže.')
    }
  }

  const onCopyUrl = async () => {
    try {
      await copyText(embedUrl)
      setStatus('URL adresa zkopírována.')
    } catch {
      setStatus('URL se nepodařilo zkopírovat. Zkopírujte ji ručně z pole níže.')
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Sdílet mapu (iframe)</div>
            <div className={styles.sub}>
              Generovaný odkaz obsahuje snapshot dat, takže starší vložené mapy zůstanou funkční.
            </div>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Zavřít">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.options}>
            <label className={styles.field}>
              <span>Varianta</span>
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="embed">Kompaktní (jen mapa)</option>
                <option value="embed-full">Rozšířená (mapa + detail + srovnání)</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Výchozí zobrazení</span>
              <select value={display} onChange={e => setDisplay(e.target.value)}>
                <option value="rate">Nemocnost</option>
                <option value="count">Počet případů</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Výška iframe (px)</span>
              <input
                type="number"
                min="320"
                max="2000"
                step="10"
                value={height}
                onChange={e => setHeight(Math.max(320, Number(e.target.value) || recommendedHeight(mode)))}
              />
            </label>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>URL pro sdílení</div>
            <textarea className={styles.code} readOnly value={embedUrl} rows={3} />
            <button className={styles.secondary} onClick={onCopyUrl}>Kopírovat URL</button>
          </div>

          <div className={styles.block}>
            <div className={styles.blockTitle}>Iframe kód</div>
            <textarea className={styles.code} readOnly value={iframeCode} rows={8} />
            <button className={styles.primary} onClick={onCopyIframe}>Kopírovat iframe kód</button>
          </div>

          {status && <div className={styles.status}>{status}</div>}
        </div>
      </div>
    </div>
  )
}
