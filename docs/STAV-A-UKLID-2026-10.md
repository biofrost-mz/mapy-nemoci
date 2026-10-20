# Mapy nemocí (Avenier – epidemiologická mapa ČR) – stav a úklid (říjen 2026)

## Shrnutí

| | |
|---|---|
| Účel | Interaktivní mapa krajů ČR s epidemiologickými daty SZÚ (nemocnost / počty), embed do článků |
| Stack | React 18, Vite 5, d3 (geo projekce), CSS Modules, jsPDF + html-to-image, pdfjs-dist |
| Backend | žádný – datasety v `localStorage`, sdílení přes `?share=<base64url>` |
| Hosting | Netlify – https://resonant-lamington-2dfbd8.netlify.app/ |
| Viditelnost repa | **veřejné** |
| Historie | 7 commitů, vše 16. 3. 2026; od té doby bez vývoje |
| Příbuzné repo | `avenier-epi-graf` (grafy), `vyhledavani-svet-nemoci` + `avenier-destination-map` (světová mapa) |

## Architektura

- `useMapData` drží seznam datasetů (diagnóza, období, hodnoty za 14 krajů) a ukládá je do `localStorage`.
- `Map.jsx` načte `public/kraje.json` (GeoJSON krajů), vykreslí choropleth přes d3 a tooltipy.
- `DataEditor.jsx` – ruční zadání dat a import PDF tabulek SZÚ (pdfjs, worker vypnutý kvůli MIME na Netlify).
- `TrendChart.jsx` – vývoj vybrané nemoci napříč obdobími (víc datasetů se stejnou diagnózou).
- `EmbedModal.jsx` + `utils/shareSnapshot.js` – stabilní snapshot datasetu zakódovaný do URL; embed tak
  nezávisí na `localStorage` čtenáře.
- Režimy `?mode=full | embed | embed-full`, `?display=rate | count`.

## Provedený úklid (větev `claude/awesome-ride-6kb6m0`)

- `npm audit fix` – opravena **kritická** zranitelnost `jspdf` a moderate `dompurify`/`fflate`
  (produkční závislosti nyní bez známých zranitelností).
- Smazán nepoužívaný `public/czech_republic.json` (3,2 MB; aplikace načítá jen `kraje.json`).
- Přidán favicon (`logo.png`) do `index.html`.
- Přidán Vitest a testy `shareSnapshot` (encode/decode, sanitizace, neplatné tokeny) – `npm test`.
- README doplněn o testy a aktuální strukturu komponent.

## Zjištěná rizika a dluh

1. Hlavní bundle ~660 kB (jsPDF, html2canvas) – export lze načítat líně (`import()` až při kliknutí).
2. Data existují jen v `localStorage` prohlížeče redaktora – při vymazání prohlížeče se ztratí.
   Pro trvalost exportovat JSON nebo uložit datasety do repa / CMS.
3. Žádný lint ani CI (Netlify jen builduje).
4. Doménu Avenier (vlastní subdoména) README zmiňuje jen obecně – produkční URL je `*.netlify.app`.

## Úkoly pro vlastníka

- [ ] Mergnout větev `claude/awesome-ride-6kb6m0` do `main` (Netlify pak automaticky přebuilduje).
- [ ] Rozhodnout, zda mapu dál používat; pokud ne, archivovat repo na GitHubu.
- [ ] Případně nastavit vlastní doménu (např. `mapa.avenier.cz`) v Netlify.
