# Gestionale 81|00 — istruzioni per Claude

Stato del progetto, decisioni e cose in sospeso: vedi `STATO.md`.

## Regola: prova in browser PRIMA di ogni pubblicazione

`main` è la produzione (GitHub Pages pubblica in automatico a ogni push).
Prima di ogni push su `main` esegui:

```
node strumenti/prova-pagine.js
```

- Apre il Gestionale in Chromium headless, visita **tutte** le pagine e `reset.html`, e fallisce
  su qualunque errore JavaScript. La rete esterna è bloccata: non tocca i dati di produzione.
- **Si pubblica solo con esito `✅ OK`.** Se fallisce, si corregge prima di pubblicare.
- `node --check` **non basta**: controlla la sintassi, non l'ordine di caricamento. Il caso v71
  (1/11/2026) lo dimostra: la sintassi era corretta, ma `rAttrezzeria` veniva usata prima che
  `attrezzeria.js` fosse caricato e l'avvio si interrompeva a metà.
- Se aggiungi un file `.js` esterno o una pagina nuova, verifica che la prova li copra
  (ed estendila se serve).
- Riporta a Giuseppe l'esito della prova e, dopo la pubblicazione, l'orario: in intestazione
  l'app mostra "versione gg/mm/aa hh:mm" = data di pubblicazione della pagina in uso.

## Regola: niente dati dell'azienda scritti nel codice

Ragione sociale, marchio, P.IVA, sede, Supabase, login e link alle app stanno **solo** in
`azienda.js` e si leggono da `window.AZIENDA`. Nei testi statici usa gli attributi
`data-az`, `data-az-href`, `data-az-content`. Serve per far girare lo stesso codice per
più società (81|00, Aurica) con database separati.

## Regola: niente dati personali o di clienti nel repository

Il repository è **pubblico**. Script SQL, esportazioni, elenchi con nomi di clienti, P.IVA di persone,
dati di dipendenti non vanno mai committati: tenerli fuori dal repo (cartella temporanea) e
consegnarli a Giuseppe in chat.
