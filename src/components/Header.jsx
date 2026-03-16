import styles from './Header.module.css'

// Avenier logo jako inline SVG (aproximace z brandmanuálu)
// Nahraď skutečným SVG souborem až ho budeš mít k dispozici
export function AvenierLogo({ size = 32 }) {
  return (
    <svg width={size * 2.8} height={size} viewBox="0 0 112 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Symbol – srdce s figurkou */}
      <g transform="translate(0, 0)">
        {/* Srdce */}
        <path
          d="M20 34C20 34 6 24 6 14C6 9.58 9.58 6 14 6C16.4 6 18.56 7.06 20 8.76C21.44 7.06 23.6 6 26 6C30.42 6 34 9.58 34 14C34 24 20 34 20 34Z"
          stroke="#78be20" strokeWidth="2.2" fill="none" strokeLinejoin="round"
        />
        {/* Hlava */}
        <circle cx="20" cy="13" r="3.2" stroke="#78be20" strokeWidth="2" fill="none" />
        {/* Tělo */}
        <path d="M14 24C14 20.69 16.69 18 20 18C23.31 18 26 20.69 26 24" stroke="#78be20" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* Wordmark */}
      <text
        x="42" y="27"
        fontFamily="'Saira', Arial, sans-serif"
        fontWeight="600"
        fontSize="18"
        letterSpacing="2"
        fill="#3c3c3c"
      >AVENIER</text>
    </svg>
  )
}

export function Header({
  datasets,
  activeDatasetId,
  onSelectDataset,
  onAddDataset,
  onOpenEditor,
  onOpenExport,
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
              ⭳ Export
            </button>
            <button
              className={styles.editBtn}
              onClick={() => onOpenEditor(activeDatasetId)}
              title="Upravit data"
            >
              ✏ Upravit data
            </button>
          </>
        )}
      </div>
    </header>
  )
}
