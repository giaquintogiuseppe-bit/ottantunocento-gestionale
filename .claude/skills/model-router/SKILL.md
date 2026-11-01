---
name: model-router
description: Instradamento dei compiti al modello più economico adeguato (Haiku / Sonnet / Opus / Fable) tramite subagent. Da usare all'INIZIO di ogni compito di Giuseppe, prima di leggere file o fare ricerche, per decidere cosa delegare e a quale modello.
---

# Model router — partire basso, salire solo se serve

All'inizio di ogni compito classificalo e decidi **chi** lo fa. La sessione principale coordina,
decide e scrive le risposte; le parti meccaniche vanno a subagent più economici.

## 1. Delegare o no?
- **≤ 3 chiamate a strumenti** → fallo direttamente, non delegare (il passaggio costa più del lavoro).
- Il compito richiede il contesto della conversazione o una decisione dell'utente → resta qui.
- Più parti indipendenti → subagent in parallelo, nello stesso messaggio.

## 2. Quale modello
| Tipo di lavoro | Modello | Come |
|---|---|---|
| Lettura, ricerca nel codice o nei documenti, estrazione, elenchi, formattazione, riassunti di file | **Haiku** | agente `cerca-codice` (Gestionale) o `Explore` / `general-purpose` con `model: haiku` |
| Lavoro standard: modifiche di codice ben definite, pagine, script, testi, analisi ordinarie | **Sonnet** | `general-purpose` con `model: sonnet` |
| Decisioni critiche: **fisco, contratti, legale, finanza/importi, architettura, debug complesso**, script SQL sui dati di produzione | **Opus** | sessione principale, o agente `revisore-sql` / `general-purpose` con `model: opus` |
| Solo se Opus ha fallito sullo stesso problema | **Fable** | **chiedi prima conferma a Giuseppe**, spiegando perché |

Regole:
- Parti dal livello più basso plausibile. Se il risultato è incompleto o sbagliato, **sali di un
  livello** e rilancia con quello che hai imparato — non ripetere lo stesso tentativo.
- I risultati di un modello economico su temi critici (importi, fisco, dati di produzione) vanno
  **verificati** dal livello Opus prima di usarli.
- Brief dei subagent: obiettivo, file da guardare, cosa è già escluso, formato della risposta
  (breve, con `file:riga`). Il subagent sa solo quello che gli scrivi.

## 3. Il modello della sessione
Non puoi cambiare da solo il modello della sessione principale. Se è sproporzionato rispetto al
compito (es. sessione Opus per sole letture e formattazioni lunghe, o sessione Haiku/Sonnet per
una decisione fiscale), dillo a Giuseppe in una riga suggerendo `/model <nome>` (`haiku`,
`sonnet`, `opus`).

## 4. Nel Gestionale 81|00
- Prima di toccare `index.html` (≈940 KB) carica la skill `mappa-codice`; le ricerche larghe
  vanno a `cerca-codice` (Haiku), mai lettura del file intero.
- Ogni script SQL che modifica dati passa da `revisore-sql` (Opus) prima della consegna.
- Le pubblicazioni passano da `/pubblica` (la prova delle pagine è obbligatoria).
