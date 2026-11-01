---
name: lavoro-leggero
description: Installa, controlla o rimuove Lavoro leggero, la beta per affidare a Haiku le letture e le operazioni semplici in Claude Code. Non produce analisi settimanali dei consumi.
metadata:
  version: 0.1.0-beta.1
---

# Lavoro leggero — beta

## Per te, una riga

Apri la cartella del pacchetto in Claude Code e scrivi: «Installa Lavoro leggero nel progetto che ti indico e verifica che funzioni».

## Istruzioni per la tua AI

### Missione

Aiuta a riservare il modello principale al lavoro che richiede ragionamento. Un richiamo legge le parole della richiesta e propone Haiku per letture, controlli e operazioni semplici; il principale giudica se conviene davvero. Non cambia il modello della chat, non rinomina la chat e non prepara il report del Tutor settimanale.

### Passi

1. Prima di installare mostra la cartella del progetto indicato dalla persona. Se manca, chiedi soltanto quale progetto. La richiesta di installazione autorizza la modifica locale in quella cartella; non estenderla a tutti i progetti.
2. Richiede Python 3.10+ e Claude Code aggiornato, con subagenti Haiku disponibili. Questa beta è confezionata per macOS/Linux; Windows e Codex non sono ancora provati.
3. Dalla cartella estratta esegui `python3 installa.py installa --progetto "PERCORSO_DEL_PROGETTO"`. Il pacchetto copia solo la propria skill, il richiamo e l'agente nel progetto e aggiunge un richiamo in `.claude/settings.json`. Se rileva la funzione già presente nel progetto, in un suo progetto padre o nelle impostazioni personali, o file omonimi incompatibili, si ferma senza sovrascriverli. Non occorre il Tutor settimanale.
4. Controlla il richiamo nel menu `/hooks` e verifica che `/agents` mostri la scheda; se Claude richiede di rivedere il nuovo richiamo, mostralo alla persona. Non dichiarare attivo un richiamo che il motore non ha ancora caricato.

### Prove

Chiedi una lettura breve di due file di prova, poi una richiesta che richieda una decisione. La prima può essere delegata ad Haiku; la seconda resta al modello adeguato. Se la lettura è minuscola o la risposta è già nella chat, il principale può rispondere direttamente.

La scritta «🪶 Lavoro leggero → Haiku» si mostra solo dopo che il delegato è realmente partito: un suggerimento del richiamo non prova l'avvio. Per verificare il modello guarda il delegato in `/tasks`. Un avvio leggero non dimostra da solo un risparmio: il consumo ufficiale resta nel pannello Claude e il beneficio dipende dall'attività.

### Alla fine

Riporta dove è installato, quali prove hai osservato e cosa resta da provare. Per rimuoverlo usa `python3 installa.py rimuovi --progetto "PERCORSO_DEL_PROGETTO"` dalla copia estratta; conserva il pacchetto finché serve per la rimozione. Se un suo file è stato modificato, la rimozione si ferma e lo segnala, senza cancellarlo.

### Scuola e fonti

Verificate il 30/10/2026: [richiami Claude Code](https://code.claude.com/docs/en/hooks), [subagenti](https://code.claude.com/docs/en/sub-agents), [skill](https://code.claude.com/docs/en/skills). Il richiamo aggiunge informazioni alla richiesta, il modello valuta la delega, l'agente ha `model: haiku`; i tre passaggi hanno prove distinte. Esempio: «Leggi questi due log» è candidato; «Leggi questi log e decidi come riparare il servizio» richiede ragionamento.

Beta. Distribuzione gratuita e licenza sono decisioni distinte: nessuna licenza open source è dichiarata in questo pacchetto.
