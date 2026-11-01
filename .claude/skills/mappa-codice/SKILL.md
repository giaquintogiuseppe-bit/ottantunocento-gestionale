---
name: mappa-codice
description: Mappa del codice del Gestionale 81|00 — dove stanno sezioni, motori di calcolo, salvataggio, avvio e moduli esterni dentro index.html (≈14.700 righe, ≈940 KB) e nei file .js. Da usare PRIMA di leggere o modificare index.html, per cercare con grep e leggere solo le righe utili invece del file intero.
user-invocable: false
---

# Mappa del codice — Gestionale 81|00

**Regola d'oro: non leggere mai `index.html` per intero** (≈940 KB, costa centinaia di migliaia di
token). Cerca con Grep il nome della funzione o il titolo di sezione, poi leggi solo l'intervallo
(`Read` con `offset`/`limit`, 50–150 righe). Per ricerche larghe delega all'agente `cerca-codice`.

I numeri di riga sono indicativi (01/11/2026) e si spostano: **ritrova sempre con grep**, es.
`grep -n "function calcolaRicavoCantiere" index.html`.

## Struttura di index.html
| Righe ≈ | Contenuto |
|---|---|
| 19–21 | `azienda.js` (sempre per primo), xlsx e pdf.js da CDN |
| 23–334 | `<style>` principale |
| 346–563 | Login: sessione, rinnovo token, `fetch` patchato con il token, overlay, tasto Esci |
| 564–2550 | HTML delle pagine: ogni pagina è `<div class="pg" id="pg-NOME">` |
| 2551–14623 | **Script principale** (≈600 funzioni, tutte globali) |
| 14537 | **INIT**: `load()` → `sincronizzaPersonale()` → `sincronizzaCantieri()` → `initRange()` → `nav('dash')` → timer (documenti ricavo, cloud, Genya, `backupSnapshot`) |
| 14689–14698 | Moduli esterni, caricati **dopo** lo script principale |

Le sezioni dello script hanno titoli `// ═══ TITOLO ═══` o `// ── titolo ──`:
`grep -nE '^\s*//\s*[═─]{2,}' index.html` ne dà l'indice completo.

## Dati e salvataggio
- Tutto lo stato sta nell'oggetto globale **`DB`** (`const DB={}`, ≈2577), un unico blob
  salvato nella tabella Supabase **`gestionale_dati`** (riga `unico`). Chiavi principali:
  `presenze`, `cantieri` (= commesse), `personale`, `addebiti`, `budgetCantieri`, `incassi`,
  `pagamenti`, `clienti`, `speseCantiere`, `anticipi`, `carburante`, `saldi`, `scontrini`,
  `documenti`, `pagFornitori`, `saldiApertura`, `config`.
- `load()` (≈2578) legge la copia locale `localStorage['otto8100_v4']`; `save()` (≈2931) scrive
  la copia locale e chiama `cloudAutoSave()` (salvataggio cloud 3 s dopo).
- `window.save` è **ridefinita a catena** (es. ≈5740 azzera `_costiCache` e poi chiama
  l'originale): se aggiungi una cache, invalida così, non sostituire `save`.
- Cloud: `cloudSalva` (≈3228), `cloudCarica` (≈3357), `cloudControllaAlRientro`,
  `cloudVerificaConnessione`. **Lock ottimistico** su `versione` (trigger
  `trg_gestionale_dati_versione`): non si sovrascrive se un'altra app ha scritto nel frattempo.
- Lato database, trigger tengono allineate le tabelle-specchio del blob: `clienti`, `commesse`,
  `presenze_turni` (`select * from stato_specchi();`), e `trg_lega_commesse` aggiunge
  `cantiereId` ai turni. **Mai scrivere direttamente nelle tabelle-specchio.**
- `backupSnapshot(motivo)` (≈14559): istantanea all'apertura e ogni 15 minuti.

## Navigazione
- `nav(pg)` (≈3614) attiva `#pg-<pg>` e chiama `render(pg)`, che smista sulla funzione della
  pagina: `dash:rDash`, `presenze:rPres`, `cantieri:rCant`, `'dettaglio-cant':rDettCant`,
  `saldi:rSaldi`, `riepilogo:rRiepilogo`, `incassi:rIncassi`, `'posizione-clienti':rPosizioneClienti`,
  `clienti:rClienti`, `commesse:rCommesse`, `personale:rPersonale`, `fornitori:rFornitori`,
  `attrezzeria:rAttrezzeria`, `fisco` …
- Le funzioni dei moduli esterni si chiamano **in modo pigro** (`()=>rAttrezzeria()`): al
  momento della definizione non esistono ancora. Riferirle direttamente rompe l'avvio (caso v71).
- `menu.js` estende `nav()` (`_navBase` + `menuSegui`) e definisce **`MENU_AREE`**, l'unica mappa
  area→pagine: **ogni pagina nuova va aggiunta lì** (la prova lo verifica).

## Motori di calcolo (fonte unica — riusali, non riscriverli)
| Funzione | ≈Riga | Cosa fa |
|---|---|---|
| `calcolaRicavoCantiere(c)` | 2830 | Ricavo dai documenti: consuntivo se c'è, altrimenti preventivo accettato; + consuntivi orfani + periodi di fatturazione |
| allocazioni fatture→consuntivi | 2717 | "Da fatturare" = imponibile − allocato |
| IVA | 2911 | Budget/ricavo sono **netti**, le fatture nel DB sono **lorde** |
| `getTurniRaw(data, dipId)`, `nextDay` | 5612, 5548 | Turni del giorno (vecchio formato → turno virtuale) |
| `_getCostiCantiere(nome)`, `_buildCostiCache()` | 5658, 5688 | Costi per commessa (presenze, spese, carburante); usa `cantiereId` quando c'è |
| `ricalcolaSaldi()` | 7341 | Saldi dei dipendenti |
| `_pcCompute()` | 12695 | Posizione clienti: fatturato, incassato, residuo (usa `fatture.cliente_id`) |
| Fonte unica incassi | 10762 | Unico punto da cui leggere gli incassi |

Utilità comuni: `fmt(n)` (€ it-IT), `fmtE(n)`, `esc(s)` (HTML), `uid()`, `today()`/`isoLocale(d)`
(date **locali**, non `toISOString`), `toast(msg)`, `openModal(id)`/`closeModal(id)`.
Supabase: `SUPABASE_URL`, `SUPABASE_KEY` (da `window.AZIENDA`).

## Moduli esterni (.js)
| File | Contenuto | Funzione d'ingresso |
|---|---|---|
| `azienda.js` | Dati della società (`window.AZIENDA`), blocco se c'è un'altra azienda nel browser | — |
| `menu.js` | Menu a 8 aree, `MENU_AREE`, estensione di `nav()` | `menuDisegna` |
| `clienti.js` | Area Clienti (prefisso `cli2`) | `rClienti` |
| `commesse.js` | Vista Commesse (prefissi `cm2`, `_m2`) | `rCommesse` |
| `personale.js` | Vista Personale (prefissi `pe2`, `_p2`) | `rPersonale` |
| `fornitori.js` | Vista Fornitori (prefisso `fo2`) | `rFornitori` |
| `attrezzeria.js` | Attrezzeria + import fatture attrezzatura | `rAttrezzeria` |
| `fisco.js` | Quadro fiscale, import Genya (IIFE, prefisso `_f`/`fisco`) | `fiscoCarica` |
| `selettore-commessa.js` | Selettore commessa riutilizzabile (IIFE) | — |

Un modulo nuovo: caricalo in fondo a `index.html` con `?v=`, aggiungilo alla lista di `sw.js`,
usa un prefisso proprio, chiamalo in modo pigro da `render()`. Poi `node strumenti/prova-pagine.js`.

## Trappole note
- Costi legati alla commessa per **nome** nei dati vecchi: rinominare stacca i costi (il trigger
  `trg_lega_commesse` ora li riallinea, ma il codice deve preferire `cantiereId`).
- Il service worker del Gestionale **non è registrato**: l'aggiornamento reale passa da
  `_gestControllaVersione` (≈3481, confronta Last-Modified).
- Tutto è globale: prima di creare un nome nuovo, `grep -n "nomeFunzione" *.js index.html`.
