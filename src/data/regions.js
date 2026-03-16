// Výchozí data pro 14 krajů ČR
// Klíče odpovídají poli "name" v kraje.json

export const REGIONS = [
  { id: 'CZ0100000000', name: 'Hlavní město Praha',   short: 'Praha',           nuts3: 'CZ010' },
  { id: 'CZ0200000000', name: 'Středočeský kraj',      short: 'Středočeský',     nuts3: 'CZ020' },
  { id: 'CZ0310000000', name: 'Jihočeský kraj',        short: 'Jihočeský',       nuts3: 'CZ031' },
  { id: 'CZ0320000000', name: 'Plzeňský kraj',         short: 'Plzeňský',        nuts3: 'CZ032' },
  { id: 'CZ0410000000', name: 'Karlovarský kraj',      short: 'Karlovarský',     nuts3: 'CZ041' },
  { id: 'CZ0420000000', name: 'Ústecký kraj',          short: 'Ústecký',         nuts3: 'CZ042' },
  { id: 'CZ0510000000', name: 'Liberecký kraj',        short: 'Liberecký',       nuts3: 'CZ051' },
  { id: 'CZ0520000000', name: 'Královéhradecký kraj',  short: 'Královéhradecký', nuts3: 'CZ052' },
  { id: 'CZ0530000000', name: 'Pardubický kraj',       short: 'Pardubický',      nuts3: 'CZ053' },
  { id: 'CZ0630000000', name: 'Kraj Vysočina',         short: 'Vysočina',        nuts3: 'CZ063' },
  { id: 'CZ0640000000', name: 'Jihomoravský kraj',     short: 'Jihomoravský',    nuts3: 'CZ064' },
  { id: 'CZ0710000000', name: 'Olomoucký kraj',        short: 'Olomoucký',       nuts3: 'CZ071' },
  { id: 'CZ0720000000', name: 'Zlínský kraj',          short: 'Zlínský',         nuts3: 'CZ072' },
  { id: 'CZ0800000000', name: 'Moravskoslezský kraj',  short: 'Moravskoslezský', nuts3: 'CZ080' },
]

// Populace krajů (zdroj: ČSÚ 2024)
export const POPULATION = {
  'Hlavní město Praha':   1393000,
  'Středočeský kraj':     1468000,
  'Jihočeský kraj':        654000,
  'Plzeňský kraj':         614000,
  'Karlovarský kraj':      293000,
  'Ústecký kraj':          808000,
  'Liberecký kraj':        449000,
  'Královéhradecký kraj':  556000,
  'Pardubický kraj':       530000,
  'Kraj Vysočina':         518000,
  'Jihomoravský kraj':    1228000,
  'Olomoucký kraj':        630000,
  'Zlínský kraj':          579000,
  'Moravskoslezský kraj': 1183000,
}

// Prázdná šablona datasetu
export const emptyDataset = () => ({
  id: crypto.randomUUID(),
  label: '',          // např. "Hepatitida A"
  code: '',           // např. "B15"
  period: '',         // např. "Leden 2026"
  unit: 'count',      // 'count' | 'rate' | 'both'
  source: 'SZÚ · ISIN',
  note: '',
  values: Object.fromEntries(
    REGIONS.map(r => [r.name, { count: '', rate: '' }])
  ),
})

// Příklad dat (Hepatitida A, leden 2026) — slouží jako ukázka
export const EXAMPLE_DATASET = {
  id: 'example-hep-a-2026-01',
  label: 'Hepatitida A',
  code: 'B15',
  period: 'Leden 2026',
  unit: 'both',
  source: 'SZÚ · ISIN (předběžná data k 2.2.2026)',
  note: 'Diagnóza B15',
  values: {
    'Hlavní město Praha':   { count: 89,  rate: 6.4 },
    'Středočeský kraj':     { count: 26,  rate: 1.8 },
    'Jihočeský kraj':       { count: 25,  rate: 3.8 },
    'Plzeňský kraj':        { count: 11,  rate: 1.8 },
    'Karlovarský kraj':     { count: 16,  rate: 5.5 },
    'Ústecký kraj':         { count: 23,  rate: 2.8 },
    'Liberecký kraj':       { count:  9,  rate: 2.0 },
    'Královéhradecký kraj': { count:  2,  rate: 0.4 },
    'Pardubický kraj':      { count:  5,  rate: 0.9 },
    'Kraj Vysočina':        { count:  3,  rate: 0.6 },
    'Jihomoravský kraj':    { count: 115, rate: 9.4 },
    'Olomoucký kraj':       { count:  2,  rate: 0.3 },
    'Zlínský kraj':         { count:  9,  rate: 1.6 },
    'Moravskoslezský kraj': { count: 35,  rate: 3.0 },
  },
}
