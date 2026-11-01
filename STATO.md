# STATO 81|00 — aggiornato nov 2026

Riepilogo per ripartire in una nuova chat. Tutto il lavoro è su `main` (repo = fonte di verità) e su Supabase (progetto `xqbhujcnjvwbwzpwjujf`).

## In produzione
- **Gestionale** (`ottantunocento-gestionale`, SW v71):
  - Ricavo del cantiere **calcolato dai documenti** (mai a mano): per ogni preventivo accettato vale il suo consuntivo se c'è, altrimenti il preventivo; i consuntivi orfani si aggiungono; i **periodi di fatturazione** contano come i consuntivi (Strada A). Funzione unica `calcolaRicavoCantiere`.
  - **Allocazione fatture→consuntivi** (tabella `allocazioni_fatture`): una fattura copre più consuntivi o parti; "da fatturare" = residuo (imponibile − allocato); stato **"Fatturato" automatico** a residuo 0. Pannello in scheda cantiere "💠 Allocazione fatture → consuntivi".
  - Box scheda cantiere: **Ricavo totale** (+ fonte) · **Fatturato** · **Da fatturare**.
  - Sezione **Attrezzeria** estratta in `attrezzeria.js` (alleggerimento, pilota riuscito).
  - **SW v72** — fix avvio: dalla v71 il router puntava a `rAttrezzeria` prima che `attrezzeria.js` fosse caricato → l'INIT si interrompeva a `nav('dash')` (niente caricamento cloud all'avvio, niente protezione modifiche non salvate, niente snapshot). Ora il riferimento è pigro.
  - **Configurazione per azienda** (`azienda.js`, fase 1 del doppio accesso 81|00 / Aurica): tutti i dati della società (ragione sociale, marchio, P.IVA, Supabase, login, link app) stanno lì; il codice legge `window.AZIENDA`. Testi statici via attributi `data-az`, `data-az-href`, `data-az-content`. Protezione: se nello stesso browser/origine c'è già un'altra azienda, l'app si blocca (chiave locale `azienda_attiva`). `manifest.json` resta per installazione.
- **Amministrazione** (`preventivi`, SW v19):
  - Certifica ricavo = somma consuntivi senza preventivo; "Da fatturare" nella scheda referente (col **residuo**); **cantiere obbligatorio** al salvataggio consuntivo; avviso se consuntivo ≠ preventivo; stato "Fatturato".

## Riconciliazioni dati fatte
- **GAETA** (`mqldv7z16ss`): creati periodi Giugno (6.500, fatt. 169) e Luglio (13.707,59, fatt. 196); scollegate dal cantiere le fatture **126** e **226** (periodi precedenti / Procult per errore). Ricavo documentale 32.457,59 · da fatturare 710 (CONS-2026-005, ottobre).
- **Affissioni Safeguard** (`ag649dd9cd35`): fattura 270 allocata a CONS-2026-007 (18.980) → da fatturare 0; CONS-2026-007 messo a "Fatturato"; le due bozze vecchie CONS-2026-003/004 **annullate** (non cancellate).

## In sospeso (funzionale)
1. **226 Procult** — riassegnarla al suo vero cantiere/cliente (ora `cantiere_id` = null).
2. **Piedimonte Matese** — due preventivi accettati identici da 2.500 (PREV-2026-007 e PREV-2026-019), ora sommati a 5.000: verificare se uno è la ri-quotazione dell'altro (nel caso mettere in bozza/annullato quello vecchio).
3. **Scheda referente arricchita con le commesse**.

## Decisioni / note
- **Aurica S.r.l.**: società indipendente, nessun dato in comune con 81|00 (rapporti solo cliente/fornitore). Stesso codice, **database Supabase separato** (account intestato ad Aurica), **indirizzo web separato** (mai stessa origine: cache e sessione locali non devono mescolarsi).
- **Fase 0 (fatta)**: revocato EXECUTE ad `anon`/`authenticated` su `agente_aggiungi_spesa` e `agente_registra_acconto` (erano chiamabili senza login); il connettore usa la service role e continua a funzionare.
- **Prossimo**: fase 2 = spostare gli archivi dal blob `gestionale_dati` a tabelle vere, uno alla volta.
- **Alleggerimento codice: IN PAUSA.** Incassato il taglio Attrezzeria; il resto del gestionale è troppo intrecciato (helper condivisi in mezzo, agganci all'avvio, globali interdipendenti) → rischio/guadagno sfavorevole. Estrarre altro solo opportunisticamente.
- Modello di flusso confermato dall'utente: preventivo (con revisioni) → cantiere/commessa (condiviso planning/gestionale) → consuntivo (ultima parola sul ricavo) → fattura (può coprire più consuntivi o parti).
- GAETA: ~5.000 di "fatturato maturato oltre il documentato" residuo = metà maggio dentro la fattura 169 (non separabile), esclusa su richiesta.

## Dove si pubblica
- **Prima di ogni pubblicazione: `node strumenti/prova-pagine.js` deve dare ✅ OK** (regola in `CLAUDE.md`).
- Entrambe le app: GitHub Pages da `main`. Dopo un push ricordarsi di **bumpare il SW** e di **riavviare la PWA** sul telefono per prendere la nuova versione.
- **Gestionale: il service worker NON è registrato** (nessun `serviceWorker.register` in index.html): il numero in `sw.js` non arriva ai dispositivi. L'aggiornamento reale è il controllo automatico `_gestControllaVersione` (al ritorno sull'app confronta Last-Modified e ricarica). In intestazione compare **"versione gg/mm/aa hh:mm"** = data di pubblicazione della pagina in uso.
