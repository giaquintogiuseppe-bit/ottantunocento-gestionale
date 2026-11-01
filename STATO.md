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
- **Clienti (fase 2, primo archivio) — 01/11/2026**:
  - Tabella `clienti` = **specchio** di `dati->clienti` del blob (fonte di verità resta il blob finché Mobile/Planning/Amministrazione/connettore non migrano), allineata dal trigger `trg_clienti_da_blob` su `gestionale_dati`. Mai scriverci direttamente.
  - `fatture.cliente_id`, `preventivi.cliente_id`, `clienti_preventivi.cliente_id`: collegamento al cliente (283/283, 87/87). Il nome sul documento resta quello emesso. Nuovi documenti: abbinamento automatico dal trigger `trg_collega_cliente` (`trova_cliente_id`: P.IVA univoca, poi nome normalizzato `norm_cliente`).
  - **Archivio**: 359 clienti con `archiviato:true` (+ `archiviatoIl`, `archiviatoMotivo`) — mai cancellati, consultabili. Doppioni uniti con `unitoA:<id>` (3 coppie). 21 clienti creati dai documenti, 4 dalla rubrica Preventivi. Le scelte sui casi ambigui (omonimi, P.IVA diverse dello stesso gruppo) sono state fatte con Giuseppe e stanno nei dati, non qui.
  - Backup: `archivio._bak_*_20261101`.
  - Gestionale: nuova area **Clienti** (`clienti.js`, voce "Clienti NUOVO" in Finanze): elenco + scheda (panoramica, commesse, preventivi, fatture e incassi, anagrafica) + archivio. Numeri dal motore di Posizione clienti (`_pcCompute`), che ora usa `cliente_id` delle fatture (le fatture con nome scritto male confluiscono nel cliente giusto). Fix: la modifica di un cliente non cancella più PEC/CF/IBAN/pagamento/archivio (merge invece di sostituzione); modulo con CF, PEC, pagamento.
  - Le vecchie pagine (Gestione clienti, Posizione clienti, Incassi, Referenti) restano finché Giuseppe non approva la nuova area.
- **Scritture sul DB**: le conferme del connettore Supabase per UPDATE/DELETE non arrivano a Giuseppe → per modifiche di dati preparare uno script SQL (tutto in una transazione) da far eseguire a lui nell'SQL Editor; verificarlo prima in sola lettura. **Mai salvare nel repo (pubblico) script o file con dati di clienti/persone.**
- **Menu a 8 aree** (`menu.js`, 01/11/2026): Cruscotto, Commesse, Clienti, Fornitori, Personale, Mezzi e attrezzature, Fisco e documenti, Impostazioni. Le pagine di prima sono schede in alto (`#area-tabs`); nessuna pagina tolta. `menu.js` estende `nav()` (non la sostituisce); `MENU_AREE` è l'unica mappa area→pagine: **ogni pagina nuova va aggiunta lì** (la prova pagine fallisce se una pagina non ha area). Le voci statiche del vecchio menu restano in `#sb-aree` solo come riserva.
- **Prossimo**: poi gli altri archivi del blob (cantieri, presenze, personale…), uno alla volta, e migrazione delle altre app alla tabella `clienti`.
- **Alleggerimento codice: IN PAUSA.** Incassato il taglio Attrezzeria; il resto del gestionale è troppo intrecciato (helper condivisi in mezzo, agganci all'avvio, globali interdipendenti) → rischio/guadagno sfavorevole. Estrarre altro solo opportunisticamente.
- Modello di flusso confermato dall'utente: preventivo (con revisioni) → cantiere/commessa (condiviso planning/gestionale) → consuntivo (ultima parola sul ricavo) → fattura (può coprire più consuntivi o parti).
- GAETA: ~5.000 di "fatturato maturato oltre il documentato" residuo = metà maggio dentro la fattura 169 (non separabile), esclusa su richiesta.

## Dove si pubblica
- **Prima di ogni pubblicazione: `node strumenti/prova-pagine.js` deve dare ✅ OK** (regola in `CLAUDE.md`).
- Entrambe le app: GitHub Pages da `main`. Dopo un push ricordarsi di **bumpare il SW** e di **riavviare la PWA** sul telefono per prendere la nuova versione.
- **Gestionale: il service worker NON è registrato** (nessun `serviceWorker.register` in index.html): il numero in `sw.js` non arriva ai dispositivi. L'aggiornamento reale è il controllo automatico `_gestControllaVersione` (al ritorno sull'app confronta Last-Modified e ricarica). In intestazione compare **"versione gg/mm/aa hh:mm"** = data di pubblicazione della pagina in uso.
