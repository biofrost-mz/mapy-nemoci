# Avenier – Epidemiologická mapa ČR

Interaktivní webová aplikace pro vizualizaci epidemiologických dat SZÚ podle krajů ČR.

---

## Rychlý start

```bash
# 1. Nainstaluj závislosti
npm install

# 2. Spusť vývojový server
npm run dev
# → http://localhost:5173 (nebo 5174 pokud 5173 je obsazený)

# 3. Build pro produkci
npm run build
# → výstup v adresáři dist/
```

---

## Struktura projektu

```
avenier-epi-map/
├── public/
│   ├── kraje.json            ← GeoJSON hranic 14 krajů ČR
│   └── czech_republic.json   ← GeoJSON hranice ČR
├── src/
│   ├── components/
│   │   ├── Map.jsx           ← D3 + GeoJSON mapa
│   │   ├── RegionDetail.jsx  ← Detail vybraného kraje
│   │   ├── BarChart.jsx      ← Sloupcový přehled krajů
│   │   ├── DataEditor.jsx    ← Formulář pro ruční zadání dat
│   │   └── Header.jsx        ← Navigace + přepínače
│   ├── data/
│   │   └── regions.js        ← Definice krajů + příkladová data
│   ├── hooks/
│   │   └── useMapData.js     ← State management + localStorage
│   ├── styles/
│   │   └── avenier.css       ← Brand barvy, fonty, CSS proměnné
│   ├── App.jsx               ← Hlavní layout + URL parametry
│   └── main.jsx              ← Entry point
├── netlify.toml              ← Konfigurace Netlify
└── vite.config.js
```

---

## Jak zadávat data

1. Klikni na **„✏ Upravit data"** v pravém horním rohu
2. Záložka **„Informace"** – vyplň název diagnózy, kód, období, zdroj
3. Záložka **„Data krajů"** – zadej počet případů a/nebo nemocnost pro každý kraj
4. Klikni **„Hotovo"** – data se automaticky uloží do localStorage prohlížeče

---

## URL parametry pro iframe embed

| URL | Popis |
|-----|-------|
| `/?mode=full` | Plná verze (výchozí) – mapa + sidebar + editor |
| `/?mode=embed` | Kompaktní iframe – pouze mapa + legenda |
| `/?mode=embed-full` | Iframe s mapou + barchart + detail kraje |
| `/?display=rate` | Výchozí zobrazení: nemocnost (výchozí) |
| `/?display=count` | Výchozí zobrazení: absolutní počty |

### Příklady vložení do článku (iframe)

```html
<!-- Kompaktní mapa -->
<iframe
  src="https://tvoje-domena.netlify.app/?mode=embed"
  width="100%"
  height="480"
  frameborder="0"
  style="border-radius: 8px;"
></iframe>

<!-- Rozšířená verze s grafy -->
<iframe
  src="https://tvoje-domena.netlify.app/?mode=embed-full"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius: 8px;"
></iframe>
```

---

## Nasazení na Netlify

### Možnost A – přes GitHub (doporučeno)

1. Pushni projekt na GitHub
2. Na [netlify.com](https://netlify.com) → **„Add new site" → „Import from Git"**
3. Vyber repozitář
4. Nastav:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Klikni **„Deploy"**

Netlify při každém `git push` automaticky přebuilduje a nasadí.

### Možnost B – manuální upload

```bash
npm run build
# Nahraj obsah složky dist/ přes Netlify Drop na netlify.com/drop
```

### Vlastní doména

V Netlify → Site settings → Domain management → Add custom domain.

---

## Logo

Aplikace obsahuje SVG aproximaci loga Avenier.  
Až budeš mít finální SVG soubor loga, nahraď komponentu `AvenierLogo` v `Header.jsx`:

```jsx
import logo from '../assets/avenier-logo.svg'

// Místo inline SVG:
<img src={logo} alt="Avenier" height={30} />
```

---

## Technologie

- **React 18** + **Vite**
- **D3.js** – mapová projekce a GeoJSON rendering
- **CSS Modules** – scopované styly
- **localStorage** – perzistence dat bez backendu
- Fonty: **Saira** + **Open Sans** (Google Fonts, dle brandmanuálu)
