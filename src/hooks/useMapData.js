import { useState, useEffect, useCallback } from 'react'
import { emptyDataset, EXAMPLE_DATASET } from '../data/regions'

const STORAGE_KEY = 'avenier-epi-datasets'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveToStorage(datasets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets))
  } catch {}
}

function normalizeMode(mode) {
  return mode === 'count' ? 'count' : 'rate'
}

export function useMapData({
  initialDatasets = null,
  initialActiveDatasetId = null,
  persist = true,
  initialDisplayMode = 'rate',
} = {}) {
  const [datasets, setDatasets] = useState(() => {
    if (Array.isArray(initialDatasets) && initialDatasets.length > 0) {
      return initialDatasets
    }
    const stored = loadFromStorage()
    return stored && stored.length > 0 ? stored : [EXAMPLE_DATASET]
  })

  const [activeDatasetId, setActiveDatasetId] = useState(() => {
    if (initialActiveDatasetId) return initialActiveDatasetId
    if (Array.isArray(initialDatasets) && initialDatasets.length > 0) {
      return initialDatasets[0].id
    }
    const stored = loadFromStorage()
    return stored?.[0]?.id ?? EXAMPLE_DATASET.id
  })

  const [displayMode, setDisplayMode] = useState(normalizeMode(initialDisplayMode)) // 'count' | 'rate'
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingDatasetId, setEditingDatasetId] = useState(null)

  // Persist to localStorage whenever datasets change
  useEffect(() => {
    if (!persist) return
    saveToStorage(datasets)
  }, [datasets, persist])

  const activeDataset = datasets.find(d => d.id === activeDatasetId) ?? datasets[0]

  // ── Dataset CRUD ─────────────────────────────────────────────────────────

  const addDataset = useCallback(() => {
    const ds = emptyDataset()
    setDatasets(prev => [...prev, ds])
    setEditingDatasetId(ds.id)
    setActiveDatasetId(ds.id)
    setEditorOpen(true)
    return ds.id
  }, [])

  const updateDataset = useCallback((id, patch) => {
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }, [])

  const updateRegionValue = useCallback((datasetId, regionName, field, value) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d
      return {
        ...d,
        values: {
          ...d.values,
          [regionName]: {
            ...d.values[regionName],
            [field]: value === '' ? '' : Number(value),
          },
        },
      }
    }))
  }, [])

  const deleteDataset = useCallback((id) => {
    setDatasets(prev => {
      const next = prev.filter(d => d.id !== id)
      if (activeDatasetId === id && next.length > 0) {
        setActiveDatasetId(next[0].id)
      }
      return next.length > 0 ? next : [emptyDataset()]
    })
    setEditorOpen(false)
  }, [activeDatasetId])

  const duplicateDataset = useCallback((id) => {
    const src = datasets.find(d => d.id === id)
    if (!src) return
    const copy = { ...src, id: crypto.randomUUID(), label: src.label + ' (kopie)' }
    setDatasets(prev => [...prev, copy])
    setActiveDatasetId(copy.id)
    setEditingDatasetId(copy.id)
    setEditorOpen(true)
  }, [datasets])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const openEditor = useCallback((id) => {
    setEditingDatasetId(id)
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditingDatasetId(null)
  }, [])

  const editingDataset = datasets.find(d => d.id === editingDatasetId)

  // ── Computed value for active region display ──────────────────────────────

  const getDisplayValue = useCallback((regionName) => {
    if (!activeDataset) return null
    const v = activeDataset.values?.[regionName]
    if (!v) return null
    if (displayMode === 'rate') return v.rate === '' ? null : Number(v.rate)
    return v.count === '' ? null : Number(v.count)
  }, [activeDataset, displayMode])

  // Max value for color scale
  const maxValue = (() => {
    if (!activeDataset) return 1
    const vals = Object.values(activeDataset.values ?? {}).map(v =>
      displayMode === 'rate' ? Number(v.rate || 0) : Number(v.count || 0)
    )
    return Math.max(...vals, 1)
  })()

  return {
    // State
    datasets,
    activeDataset,
    activeDatasetId,
    displayMode,
    selectedRegion,
    editorOpen,
    editingDataset,
    maxValue,
    // Setters
    setActiveDatasetId,
    setDisplayMode,
    setSelectedRegion,
    // Actions
    addDataset,
    updateDataset,
    updateRegionValue,
    deleteDataset,
    duplicateDataset,
    openEditor,
    closeEditor,
    getDisplayValue,
  }
}
