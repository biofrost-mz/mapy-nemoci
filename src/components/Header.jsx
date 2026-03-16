import styles from './Header.module.css'

export function AvenierLogo({ size = 32 }) {
  return (
    <img
      src="/logo.png"
      alt="Avenier"
      style={{ height: `${size}px`, width: 'auto', display: 'block' }}
    />
  )
}

export function Header({
  datasets,
  activeDatasetId,
  onSelectDataset,
  onAddDataset,
  onOpenEditor,
  onOpenExport,
  onOpenEmbed,
  displayMode,
  onSetDisplayMode,
  activeDataset,
  embedMode,
}) {
  if (embedMode) {
    // Kompaktní header pro iframe embed
    return (
      <div className={styles.embedHeader}>
        <div className={styles.embedTitle}>
          {activeDataset?.label && <strong>{activeDataset.label}</strong>}
          {activeDataset?.period && <span> · {activeDataset.period}</span>}
        </div>
        <div className={styles.embedLogo}>
          <AvenierLogo size={20} />
        </div>
      </div>
    )
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <AvenierLogo size={30} />
        </div>
        <div className={styles.divider} />
        <div className={styles.appName}>
          <span className={styles.appNameMain}>Epidemiologická mapa</span>
          <span className={styles.appNameSub}>Česká republika · kraje</span>
        </div>
      </div>

      <div className={styles.center}>
        {/* Dataset selector */}
        <div className={styles.datasetTabs}>
          {datasets.map(ds => (
            <button
              key={ds.id}
              className={`${styles.datasetTab} ${ds.id === activeDatasetId ? styles.datasetTabActive : ''}`}
              onClick={() => onSelectDataset(ds.id)}
              title={ds.period}
            >
              <span className={styles.datasetTabLabel}>{ds.label || 'Bez názvu'}</span>
              {ds.period && <span className={styles.datasetTabPeriod}>{ds.period}</span>}
            </button>
          ))}
          <button className={styles.addDatasetBtn} onClick={onAddDataset} title="Přidat nový dataset">
            + Nový
          </button>
        </div>
      </div>

      <div className={styles.right}>
        {/* Display mode toggle */}
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${displayMode === 'count' ? styles.toggleActive : ''}`}
            onClick={() => onSetDisplayMode('count')}
          >
            Počet
          </button>
          <button
            className={`${styles.toggleBtn} ${displayMode === 'rate' ? styles.toggleActive : ''}`}
            onClick={() => onSetDisplayMode('rate')}
          >
            Nemocnost
          </button>
        </div>

        {/* Edit button */}
        {activeDataset && (
          <>
            <button
              className={styles.exportBtn}
              onClick={onOpenExport}
              title="Exportovat report"
            >
              <span className={styles.btnIcon} aria-hidden="true">⤓</span>
              <span>Export</span>
            </button>
            <button
              className={styles.shareBtn}
              onClick={onOpenEmbed}
              title="Vygenerovat iframe kód"
            >
              <span className={styles.btnIcon} aria-hidden="true">&lt;/&gt;</span>
              <span>Embed</span>
            </button>
            <button
              className={styles.editBtn}
              onClick={() => onOpenEditor(activeDatasetId)}
              title="Upravit data"
            >
              <span className={styles.btnIcon} aria-hidden="true">✎</span>
              <span>Upravit data</span>
            </button>
          </>
        )}
      </div>
    </header>
  )
}
