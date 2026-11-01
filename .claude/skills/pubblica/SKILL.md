---
name: pubblica
description: Pubblica il Gestionale in produzione (main → GitHub Pages) con tutti i passaggi in ordine — numeri di versione, prova delle pagine, STATO.md, commit, push e orario di pubblicazione. Solo su richiesta di Giuseppe.
disable-model-invocation: true
argument-hint: "[cosa si pubblica, in breve]"
---

# /pubblica — pubblicazione del Gestionale

`main` è la produzione: ogni push lo pubblica su GitHub Pages. Segui i passaggi **in ordine**
e fermati al primo che non va, spiegando a Giuseppe cosa è successo.

Descrizione della pubblicazione (se data): $ARGUMENTS

## 1. Allinea e controlla cosa parte
```bash
git fetch origin main
git status -sb
git log --oneline origin/main..HEAD
git diff --stat origin/main
```
- Se `origin/main` contiene commit che il ramo non ha, allinea prima (`git rebase origin/main`
  oppure `git merge --ff-only origin/main`) — un'altra sessione può aver pubblicato nel frattempo.
- Se tra le modifiche ci sono file estranei al lavoro fatto, chiedi a Giuseppe prima di includerli.

## 2. Numeri di versione
```bash
node strumenti/aggiorna-versioni.js
```
Aggiorna i `?v=` dei `.js` modificati in tutte le pagine e in `sw.js`, e il `CACHE_NAME`.
È idempotente: si può rilanciare. Leggi gli **avvisi**:
- `.js` usato dalle pagine ma assente da `sw.js` → aggiungilo alla lista di `sw.js`;
- `.js` non caricato da nessuna pagina → la prova non lo copre: caricalo o estendi la prova.

## 3. Prova in browser (obbligatoria)
```bash
node strumenti/prova-pagine.js
```
Si pubblica **solo con `✅ OK`**. Se fallisce: correggi, poi torna al passo 2.
(`node --check` non basta — vedi il caso v71 in CLAUDE.md.) Una pagina nuova va aggiunta a
`MENU_AREE` in `menu.js`, altrimenti la prova la segnala come senza area.

## 4. STATO.md
Se la modifica cambia cosa c'è in produzione, una decisione o le cose in sospeso, aggiorna
`STATO.md` (breve). **Mai** nomi di clienti, P.IVA di persone o dati di dipendenti: il
repository è pubblico.

## 5. Commit
Messaggio in italiano nello stile del repository (`Area: cosa cambia per chi usa l'app`).
L'hook dei controlli blocca il commit se trova esportazioni, codici fiscali, IBAN, P.IVA o dati
della società scritti fuori da `azienda.js`: correggi, non aggirarlo.

## 6. Push
- Se questa sessione ha un **ramo di lavoro assegnato** diverso da `main`: fai push su quel ramo
  e chiedi a Giuseppe se portarlo su `main` (non farlo da solo).
- Altrimenti: `git push origin HEAD:main`.
L'hook rilancia la prova prima del push e lo blocca se non dà OK.

## 7. Conferma a Giuseppe
Dopo circa un minuto (tempo di GitHub Pages) leggi l'orario della pagina pubblicata
(l'indirizzo è `app.gestionale` in `azienda.js`):
```bash
curl -sI "<indirizzo del gestionale>index.html" | grep -i last-modified
```
Convertilo in ora italiana e riferisci in poche righe:
- esito della prova (`✅ OK — N pagine …`);
- cosa è stato pubblicato e i numeri di versione cambiati;
- **"versione gg/mm/aa hh:mm"**: è quella che deve comparire nell'intestazione dell'app;
- promemoria: sul telefono chiudere e riaprire la PWA per prendere la nuova versione.
Se `curl` non raggiunge il sito (rete bloccata), riferisci l'orario del push e dillo.
