import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import styles from './Map.module.css'

// Brand-aligned color scale: světle zelená → zelená → petrolejová → tmavá
const COLOR_EMPTY   = '#f0f5e8'
const COLOR_SCALE   = ['#d4eaaa', '#aad46a', '#78be20', '#4d9e00', '#006778', '#004d5c']
const LABEL_OFFSETS = {
  'Středočeský kraj': [0, 14],
  'Hlavní město Praha': [0, -10],
}
let GEO_CACHE = null
let GEO_PROMISE = null

function getColor(value, max) {
  if (value === null || value === undefined || value === '') return COLOR_EMPTY
  if (max === 0) return COLOR_EMPTY
  const t = Math.min(value / max, 1)
  // Map t to 6-step scale
  const idx = Math.floor(t * (COLOR_SCALE.length - 1))
  const lo = COLOR_SCALE[Math.min(idx, COLOR_SCALE.length - 1)]
  return lo
}

function ringArea(ring) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    area += (xj * yi) - (xi * yj)
  }
  return area / 2
}

function normalizePolygonWinding(rings = []) {
  if (!Array.isArray(rings) || rings.length === 0) return rings

  return rings.map((ring, index) => {
    const isClockwise = ringArea(ring) < 0
    const shouldBeClockwise = index === 0
    return isClockwise === shouldBeClockwise ? ring : [...ring].reverse()
  })
}

function normalizeGeoWinding(geojson) {
  if (!geojson?.features) return geojson

  return {
    ...geojson,
    features: geojson.features.map(feature => {
      const geom = feature.geometry
      if (!geom) return feature

      if (geom.type === 'Polygon') {
        return {
          ...feature,
          geometry: {
            ...geom,
            coordinates: normalizePolygonWinding(geom.coordinates),
          },
        }
      }

      if (geom.type === 'MultiPolygon') {
        return {
          ...feature,
          geometry: {
            ...geom,
            coordinates: geom.coordinates.map(polygon => normalizePolygonWinding(polygon)),
          },
        }
      }

      return feature
    }),
  }
}

function shortRegionName(name) {
  return name
    .replace('Hlavní město ', '')
    .replace(' kraj', '')
    .replace('Kraj ', '')
}

function loadGeoData() {
  if (GEO_CACHE) return Promise.resolve(GEO_CACHE)
  if (!GEO_PROMISE) {
    GEO_PROMISE = fetch('/kraje.json')
      .then(r => r.json())
      .then(normalizeGeoWinding)
      .then(data => {
        GEO_CACHE = data
        return data
      })
  }
  return GEO_PROMISE
}

export { ColorLegend }

export function Map({
  getDisplayValue,
  maxValue,
  selectedRegion,
  onSelectRegion,
  displayMode,
  dataset,
  hideLegend,
  hideHint = false,
  showCountInLabels = false,
}) {
  const svgRef = useRef(null)
  const [geo, setGeo] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: '', value: null })

  // Load GeoJSON once
  useEffect(() => {
    loadGeoData()
      .then(setGeo)
      .catch(err => console.error('GeoJSON load error:', err))
  }, [])

  // Track container width via ResizeObserver
  useEffect(() => {
    if (!svgRef.current) return
    const container = svgRef.current.parentElement
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w && w > 0) setContainerWidth(w)
    })
    obs.observe(container)
    // Set initial value if already laid out
    if (container.clientWidth > 0) setContainerWidth(container.clientWidth)
    return () => obs.disconnect()
  }, [])

  // Draw / update map
  useEffect(() => {
    if (!geo || !svgRef.current) return

    const container = svgRef.current.parentElement
    const W = containerWidth || container.clientWidth || 700
    if (W === 0) return
    const H = Math.round(W * 0.52)

    const svg = d3.select(svgRef.current)
    // Set explicit height to prevent CSS flex/grid from stretching the SVG
    svg
      .attr('viewBox', `0 0 ${W} ${H}`)
      .style('height', `${H}px`)

    const proj = d3.geoMercator().fitSize([W, H], geo)
    const pathGen = d3.geoPath().projection(proj)
    // Draw large regions first, then tiny regions (Praha) on top.
    const featuresForDraw = [...geo.features].sort((a, b) => pathGen.area(b) - pathGen.area(a))
    const regionsLayer = svg.selectAll('g.regions-layer')
      .data([null])
      .join('g')
      .attr('class', 'regions-layer')
    const hitLayer = svg.selectAll('g.hit-layer')
      .data([null])
      .join('g')
      .attr('class', 'hit-layer')
    const labelsLayer = svg.selectAll('g.labels-layer')
      .data([null])
      .join('g')
      .attr('class', 'labels-layer')

    // Bind data
    const paths = regionsLayer.selectAll('path.region')
      .data(featuresForDraw, d => d.id)

    paths.join(
      enter => enter.append('path')
        .attr('class', 'region')
        .attr('d', pathGen)
        .attr('data-name', d => d.name)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .style('cursor', 'pointer'),
      update => update.attr('d', pathGen)
    )
    .attr('aria-label', d => {
      const value = getDisplayValue(d.name)
      if (value === null || value === '') return `${d.name}: bez dat`
      return displayMode === 'rate'
        ? `${d.name}: ${Number(value).toFixed(1)} nemocí na 100 tisíc`
        : `${d.name}: ${value} případů`
    })
    .attr('fill', d => getColor(getDisplayValue(d.name), maxValue))
    .attr('stroke', d => d.name === selectedRegion ? '#003f4b' : '#fff')
    .attr('stroke-width', d => d.name === selectedRegion ? 3.8 : 0.9)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .attr('vector-effect', 'non-scaling-stroke')
    .style('shape-rendering', 'geometricPrecision')
    .style('filter', d => d.name === selectedRegion ? 'drop-shadow(0 3px 10px rgba(0,77,92,0.55))' : 'none')
    .style('opacity', d => selectedRegion && d.name !== selectedRegion ? 0.28 : 1)

    // Extra hit areas for tiny regions (mainly Praha), improves click/tap usability.
    const tinyRegionThreshold = Math.max(140, (W * H) * 0.0008)
    const tinyRegions = featuresForDraw.filter(d => pathGen.area(d) < tinyRegionThreshold)
    hitLayer.selectAll('circle.region-hit')
      .data(tinyRegions, d => d.id)
      .join(
        enter => enter.append('circle')
          .attr('class', 'region-hit')
          .style('fill', 'transparent')
          .style('cursor', 'pointer'),
        update => update
      )
      .attr('cx', d => pathGen.centroid(d)[0])
      .attr('cy', d => pathGen.centroid(d)[1])
      .attr('r', d => d.name === 'Hlavní město Praha' ? 13 : 10)

    // Labels
    const labels = labelsLayer.selectAll('text.region-label')
      .data(geo.features, d => d.id)

    labels.join(
      enter => enter.append('text').attr('class', 'region-label'),
      update => update
    )
    .attr('transform', d => {
      const [cx, cy] = pathGen.centroid(d)
      const [dx, dy] = LABEL_OFFSETS[d.name] ?? [0, 0]
      return `translate(${cx + dx},${cy + dy})`
    })
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-family', "'Saira', sans-serif")
    .style('font-size', `${Math.max(9, W * 0.0125)}px`)
    .style('font-weight', d => d.name === selectedRegion ? '700' : '600')
    .style('fill', d => d.name === selectedRegion ? '#004d5c' : '#3c3c3c')
    .style('paint-order', 'stroke')
    .style('stroke', 'rgba(255,255,255,0.85)')
    .style('stroke-width', '2px')
    .style('stroke-linejoin', 'round')
    .style('pointer-events', 'none')
    .style('user-select', 'none')
    .text(d => {
      if (!showCountInLabels) return shortRegionName(d.name)
      const count = dataset?.values?.[d.name]?.count
      if (count === '' || count === null || count === undefined) return shortRegionName(d.name)
      return `${shortRegionName(d.name)} (${Number(count)})`
    })

    labelsLayer.raise()

    const showTooltip = (d) => {
      const rect = svgRef.current.getBoundingClientRect()
      const [cx, cy] = pathGen.centroid(d)
      const scaleX = rect.width / W
      const scaleY = rect.height / H
      setTooltip({
        visible: true,
        x: cx * scaleX,
        y: cy * scaleY - 14,
        name: d.name,
        value: getDisplayValue(d.name),
      })
    }

    const regionPathById = (regionId) =>
      regionsLayer.selectAll('path.region').filter(p => p.id === regionId)

    const highlightRegion = (d) => {
      const isSelected = d.name === selectedRegion
      regionPathById(d.id)
        .attr('stroke', '#003f4b')
        .attr('stroke-width', isSelected ? 4.3 : 2.6)
        .style('filter', 'drop-shadow(0 3px 10px rgba(0,77,92,0.55))')
      labelsLayer.raise()
    }

    const resetRegion = (d) => {
      const isSelected = d.name === selectedRegion
      regionPathById(d.id)
        .attr('stroke', isSelected ? '#003f4b' : '#fff')
        .attr('stroke-width', isSelected ? 3.8 : 0.9)
        .style('filter', isSelected ? 'drop-shadow(0 3px 10px rgba(0,77,92,0.55))' : 'none')
    }

    const bindRegionEvents = (selection) => {
      selection
        .on('click', (event, d) => {
          event.stopPropagation()
          onSelectRegion(d.name)
          showTooltip(d)
          highlightRegion(d)
        })
        .on('keydown', (event, d) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onSelectRegion(d.name)
          showTooltip(d)
          highlightRegion(d)
        })
        .on('mouseenter', (event, d) => {
          showTooltip(d)
          highlightRegion(d)
        })
        .on('mouseleave', (event, d) => {
          setTooltip(t => ({ ...t, visible: false }))
          resetRegion(d)
        })
    }

    // Events
    bindRegionEvents(regionsLayer.selectAll('path.region'))
    bindRegionEvents(hitLayer.selectAll('circle.region-hit'))

  }, [geo, getDisplayValue, maxValue, selectedRegion, onSelectRegion, containerWidth, displayMode, dataset, showCountInLabels])

  const unitLabel = displayMode === 'rate' ? 'nem. / 100 tis.' : 'počet případů'
  const selectedValue = selectedRegion ? getDisplayValue(selectedRegion) : null

  return (
    <div className={styles.mapWrap}>
      <div className={styles.svgContainer} style={{ position: 'relative' }}>
        <svg ref={svgRef} className={styles.svg} />

        {!hideHint && (
          <div className={styles.mapHint}>
            {selectedRegion
              ? (
                <>
                  <strong>{shortRegionName(selectedRegion)}</strong>
                  <span>
                    {selectedValue !== null && selectedValue !== ''
                      ? (displayMode === 'rate'
                        ? `${Number(selectedValue).toFixed(1)} nem./100 tis.`
                        : `${selectedValue} případů`)
                      : 'bez dat'}
                  </span>
                </>
              )
              : <span>Klikni na kraj v mapě pro detail</span>}
          </div>
        )}

        {!hideHint && selectedRegion && (
          <button
            className={styles.clearSelectionBtn}
            onClick={() => {
              onSelectRegion(null)
              setTooltip(t => ({ ...t, visible: false }))
            }}
            type="button"
          >
            Zrušit výběr
          </button>
        )}

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className={styles.tooltip}
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className={styles.ttName}>{tooltip.name}</div>
            <div className={styles.ttValue}>
              {tooltip.value !== null && tooltip.value !== ''
                ? <><strong>{displayMode === 'rate' ? tooltip.value?.toFixed(1) : tooltip.value}</strong> <span>{unitLabel}</span></>
                : <span className={styles.ttEmpty}>— bez dat</span>
              }
            </div>
          </div>
        )}
      </div>

      {/* Color legend */}
      {!hideLegend && <ColorLegend maxValue={maxValue} displayMode={displayMode} />}
    </div>
  )
}

function ColorLegend({ maxValue, displayMode }) {
  const unit = displayMode === 'rate' ? '/100 tis.' : 'případů'

  return (
    <div className={styles.legend}>
      <div className={styles.legendTrack}>
        <div
          className={styles.legendGradient}
          style={{ background: `linear-gradient(to right, ${COLOR_EMPTY}, ${COLOR_SCALE.join(', ')})` }}
        />
        <div className={styles.legendLabels}>
          <span>0</span>
          <span>{Math.round(maxValue / 2)}</span>
          <span>{maxValue}</span>
        </div>
      </div>
      <div className={styles.legendUnit}>{unit}</div>
    </div>
  )
}
