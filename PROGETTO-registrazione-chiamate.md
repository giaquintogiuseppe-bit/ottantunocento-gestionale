# Progetto — Registrazione chiamate telefoniche di Giuseppe

**Stato: DA FARE.** Analisi completata, nessuna riga di codice ancora scritta.
Sospeso il 22/08/2026 su richiesta. Niente è stato modificato: su Supabase sono
state fatte solo letture, nessuna tabella creata, nessuna Edge Function toccata.

---

## 1. Obiettivo

Registrare le telefonate di Giuseppe **mentre sono in corso** (non i messaggi in
segreteria), archiviarle, trascriverle e sintetizzarle dentro l'ecosistema
aziendale.

## 2. Vincolo di partenza (già verificato, non si scappa)

Una app installata sull'iPhone che registri le chiamate **non è realizzabile**:
iOS non espone alcuna API sull'audio della chiamata, e nessuna app di terze parti
può accedervi. Vale anche per Android dal 2019 (audio chiamata riservato alle app
di sistema) e dal 2022 le policy Play vietano la via dell'API di accessibilità.

L'unica strada praticabile è **registrare lato centralino**: le chiamate passano
per Twilio, che le registra. Quindi si registra tutto ciò che transita da Twilio,
e **nulla** di ciò che parte o arriva direttamente sulla SIM personale.

## 3. Decisioni prese da Giuseppe

| Tema | Scelta |
|---|---|
| Copertura | Tutte le chiamate, entrata e uscita |
| Telefono | iPhone |
| Chiamate in uscita | **Softphone SIP** sull'iPhone (Zoiper / Acrobits / Linphone) registrato sul SIP Domain Twilio. Si compone da lì, non dal telefono nativo. |
| Avviso di registrazione | **Nessun avviso** (né messaggio né beep) |

Conseguenza operativa da tenere presente: se si compone dal dialer nativo iOS, la
chiamata **non** viene registrata. Nessuna eccezione tecnica possibile.

## 4. Cosa esiste già (grande vantaggio: metà lavoro è fatto)

Progetto Supabase **`xqbhujcnjvwbwzpwjujf`** ("Gestione", eu-west-1, attivo).

- **Numero Twilio**: `+39 0823 1650213`
- **Edge Function `segreteria-voce`** (v8) — assistente AI conversazionale che
  risponde alle chiamate. Contiene già: validazione firma Twilio (`firmaValida`),
  generazione TwiML, lookup rubrica, voce `Polly.Adriano-Neural`.
- **Edge Function `segreteria-elabora`** (v8) — pipeline completa già funzionante:
  download audio da Twilio (`scaricaAudio`), trascrizione Whisper (`trascrivi`),
  sintesi GPT strutturata (`sintetizza`), notifica Telegram, rubrica
  auto-apprendente, creazione automatica di `richieste` commerciali.
- **Tabella `chiamate_segreteria`** (367 righe) — ha già le colonne giuste:
  `call_sid`, `recording_sid`, `durata_sec`, `audio_url`, `trascrizione`,
  `sintesi`, `urgenza`, `categoria`, `gestita`, `nome_chiamante`.
- **Tabella `rubrica_segreteria`** (6.113 contatti) — identificazione chiamanti.
- **Tabella `dialoghi_segreteria`** (672 turni).

Tutta la parte audio → trascrizione → sintesi → notifica è **riusabile così com'è**.

## 5. Architettura da realizzare

### 5.1 Tabella nuova `chiamate_registrate`

Separata da `chiamate_segreteria` perché la semantica è diversa (conversazione a
due con Giuseppe, non messaggio lasciato all'assistente).

Campi previsti: `id`, `call_sid` (unique), `parent_call_sid`, `direzione`
(entrata/uscita), `controparte`, `nome_controparte`, `iniziata_il`, `durata_sec`,
`recording_sid`, `audio_path`, `trascrizione`, `sintesi`, `punti` (jsonb),
`impegni` (jsonb — chi fa cosa entro quando), `categoria`, `urgenza`, `esito`
(completata / non_risposta / passata_a_segreteria), `gestita`, `note`.

RLS da allineare alla convenzione esistente:
`policy "operativo" for all to authenticated using (e_admin() OR ha_area('operativo'))`.

### 5.2 Storage

Bucket privato `registrazioni-chiamate`. L'audio va copiato da Twilio a Supabase:
gli URL Twilio richiedono Basic auth e non sono riproducibili in un `<audio>` del
browser (motivo per cui oggi `audio_url` in `chiamate_segreteria` di fatto non è
ascoltabile dall'app).

### 5.3 Edge Function `chiamate-voce` (TwiML, `verify_jwt: false`)

- `?fase=entrata` — webhook Voice del numero Twilio. `<Dial record="record-from-answer-dual" timeout="20">` verso `<Sip>` del softphone di Giuseppe, con `recordingStatusCallback` → `chiamate-registra`, e `action` → `?fase=esito-entrata`.
- `?fase=esito-entrata` — se `DialCallStatus` è `no-answer`/`busy`/`failed`, `<Redirect>` a `segreteria-voce`: **l'assistente AI resta il fallback e continua a funzionare esattamente come oggi**.
- `?fase=uscita` — Voice URL del SIP Domain, si attiva quando Giuseppe compone dal softphone. Estrae il numero dallo user della SIP URI `To`, normalizza in E.164 (gestire i numeri italiani digitati senza `+39`), poi `<Dial callerId="+3908231650213" record="record-from-answer-dual">`.

### 5.4 Edge Function `chiamate-registra` (`verify_jwt: false`)

recordingStatusCallback + statusCallback. Riusa `scaricaAudio`, `trascrivi`,
`sintetizza`, `telegram`, `cercaNome`, `aggiungiInRubrica` da `segreteria-elabora`.
In più: copia l'audio nel bucket, e la sintesi estrae anche gli **impegni presi**
in chiamata (l'informazione di valore per il gestionale).

Limite noto da accettare: la registrazione è dual-channel ma Whisper riceve il
mix; l'attribuzione delle battute (Giuseppe / controparte) la fa GPT dal contesto,
non è una diarizzazione vera.

### 5.5 Edge Function `chiamate-audio`

Restituisce una signed URL temporanea del file nel bucket privato, così la pagina
può riprodurre l'audio senza esporre il bucket.

### 5.6 Pagina `chiamate.html` (questo repo, GitHub Pages)

Single-file HTML come le altre app, design system del gestionale già rilevato:
palette navy/teal (`--navy:#0a1628`, `--teal:#00b4a6`), font Inter + DM Mono,
chiamate REST dirette con anon key (nessuna libreria Supabase, nessun auth flow —
è il pattern di `index.html`).

Contenuto: elenco chiamate con filtri (direzione, periodo, categoria, urgenza,
da gestire), player audio, trascrizione, sintesi, impegni, ricerca full-text,
flag "gestita", collegamento a cliente/cantiere.

## 6. Configurazione Twilio (da fare a mano in console — non automatizzabile da qui)

1. Creare un **SIP Domain** con **SIP Registration abilitata**.
2. Creare una **Credential List** con l'utenza di Giuseppe, mapparla al dominio.
3. Voice URL del SIP Domain → `chiamate-voce?fase=uscita`.
4. Voice URL del numero `+39 0823 1650213` → `chiamate-voce?fase=entrata`
   (oggi punta a `segreteria-voce`, che diventa il fallback).
5. Softphone su iPhone: registrazione al dominio `<nome>.sip.<edge>.twilio.com`,
   scegliendo l'edge europeo più vicino (Dublino/Francoforte) per la latenza.
6. **Deviazione di chiamata incondizionata** dalla SIM personale al numero Twilio
   — da verificare con l'operatore: il ritorno di chiamata NON deve tornare sulla
   SIM (si genererebbe un loop), per questo il recapito è il softphone SIP.

### Punti da verificare prima di partire
- Costo della deviazione incondizionata sul piano tariffario della SIM: alcuni
  operatori la fatturano come chiamata in uscita, e su volumi alti pesa.
- Con la deviazione attiva il telefono non squilla più via SIM: se il softphone è
  offline (niente dati) le chiamate finiscono all'assistente AI. È un fallback
  accettabile, ma va saputo.

## 7. Segnalazione di sicurezza (indipendente da questo progetto)

`segreteria-voce` e `segreteria-elabora` contengono **credenziali in chiaro nel
codice sorgente** come valore di fallback: Twilio Account SID e Auth Token, chiave
API OpenAI, token del bot Telegram. Vanno spostate su secret delle Edge Function e
**le chiavi vanno ruotate**, perché sono già state esposte. Le nuove funzioni di
questo progetto useranno esclusivamente `Deno.env.get()`.

## 8. Nota legale

Registrare una conversazione a cui si partecipa è lecito in Italia: per la
Cassazione non è intercettazione ma prova documentale ("memoria dell'accaduto").
Le cautele riguardano il trattamento successivo: essendo una registrazione
aziendale e sistematica, servono informativa, base giuridica, tempi di
conservazione e accesso limitato ai sensi del GDPR. Da predisporre con la skill
`consulente-legale-81100` prima della messa in esercizio.

## 9. Riferimenti tecnici verificati

- Twilio SIP Registration: https://www.twilio.com/docs/voice/api/sip-registration
- TwiML `<Dial record>` e canali: https://www.twilio.com/docs/voice/twiml/dial
