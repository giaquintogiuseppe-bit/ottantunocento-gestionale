#!/usr/bin/env python3
"""Gancio "lavoro-leggero": riconosce il lavoro leggero e lo fa partire sul modello leggero.

Hook UserPromptSubmit, un solo file per Claude Code e Codex (JSON su stdin con
`prompt`, `session_id`, `transcript_path`, `cwd`; Codex aggiunge `model`).

Il gancio vede solo parole: il suo lavoro e' riconoscere dalle parole una
lettura, un controllo, una domanda di orientamento o un'operazione meccanica e
proporre all'agente, come scelta predefinita, di avviare da solo il modello leggero.
Il titolare non deve chiedere la delega ne' cambiare modello a mano. Il senso lo giudica
l'agente: se la risposta e' gia' in chat o il lavoro e' piu' grosso di come suona,
resta e lo dice in una riga. Su Codex il principale sceglie modello ed effort
sul lavoro concreto dal catalogo attuale, con orientamento al ragionamento alto.

Etichetta, mostrata solo dopo l'avvio accettato del delegato:

    🪶 Lavoro leggero → Haiku             (Claude Code)
    🪶 Lavoro leggero → <modello avviato>  (app OpenAI: scelta sul lavoro concreto)

Silenzio (nessun output) su: richieste pesanti (costruire, decidere, analizzare,
scrivere...), continuazioni ("si", "vai", "manda"), chiarimenti sul dialogo,
attese ("dimmi quando hai finito"), discussioni sul Tutor o sui modelli,
messaggi di sistema, richieste lunghe e, su Codex, quando il principale e' gia'
Luna. Non blocca mai (esce sempre 0), non tocca file, non riscrive la richiesta.

Senza classificatore il gancio non parla mai (regressione 0.5.5-0.5.7):
il comportamento visibile e' fissato in `tests/test_ganci.py`.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

# Azioni meccaniche; un sostantivo come "passaggio" non e' un ordine.
MECCANICI = (
    r"\bspost\w*", r"\brinomin\w*", r"\bcopi(a|are|ami|alo|ala)\b", r"\bpassa(re|lo|la|mi)?\b",
    r"\barchivi\w*", r"\belenc\w*", r"\blista\b", r"\bcancell\w*",
)

# Verbi e formule da lettura, controllo, orientamento.
LEGGERI = (
    r"\blegg(i|imi|ere|ilo|ila)\b", r"\bcontroll(a|ami|are|iamo)\b", r"\bverific(a|ami|are|hiamo)\b",
    r"\bguard(a|ami|are|iamo)\b", r"\bdimmi\b", r"\bmostra(mi)?\b", r"\bfammi vedere\b",
    r"\briassu\w*", r"\brecap\b", r"\briepilog\w*", r"\bresoconto\b", r"\bsituazione\b",
    r"\bstato (di|del|della|dei|delle)\b", r"\bcom'?e'? messo\b", r"\bcome siamo messi\b",
    r"\bche (cosa )?fa\b", r"\bcos'?e'?\b", r"\bche cos'?e'?\b", r"\bche vuol dire\b", r"\bche significa\b",
    r"\bquant[oaie]\b", r"\bquando\b", r"\bdove\b", r"\bchi e'?\b", r"\bqual[ei]\b",
    r"\bmi dai\b", r"\bmi puoi (leggere|dire|mostrare|controllare)\b", r"\bme lo (leggi|puoi leggere)\b",
    r"\bapri(mi)? (il|la|lo|l')\b", r"\bcerca (nel|nella|in|dentro)\b",
)

# Verbi di lavoro pesante: costruire, decidere, analizzare a fondo, produrre. Vincono sulle formule leggere.
PESANTI_VERBI = (
    r"\bcostru\w*", r"\bcre(a|are|iamo|ami|alo|ala)\b", r"\bprogett\w*", r"\bimplement\w*", r"\bsvilupp\w*",
    r"\brefactor\w*", r"\bdebug\w*", r"\bdecid\w*", r"\banali\w*", r"\bmont(a|are|aggio|iamo|alo)\b",
    r"\bedit\w*", r"\bscriv(i|ere|iamo|imi|ilo|ila)\b", r"\bprepar\w*", r"\bmiglior\w*", r"\bottimizz\w*",
    r"\bsistem(a|are|iamo|alo|ala)\b", r"\bcorregg\w*", r"\brifa(i|re|cciamo|llo|lla)\b", r"\bdisegn\w*",
    r"\btrascri\w*", r"\bpubblic\w*", r"\bprogramm(are|iamo|alo|ala|azione)\b", r"\bvalut\w*", r"\bconfront\w*",
)

# Sostantivi di lavoro pesante: contano solo se nessuna formula leggera li accompagna
# ("che fa questa skill?" resta una domanda di orientamento).
PESANTI_NOMI = (
    r"\bproposta\b", r"\bvideo\b", r"\bnewsletter\b", r"\bpagina\b", r"\bsito\b", r"\bskill\b", r"\bhook\b",
    r"\barchitettur\w*", r"\bstrategi\w*", r"\bpiano\b", r"\bbug\b", r"\binstall\w*", r"\bemail\b",
    r"\btutor\b", r"\bmodello\b", r"\bsubagent\b", r"\bsubagente\b",
)

CONTINUAZIONI = {
    "si", "sì", "ok", "okay", "va bene", "vai", "procedi", "manda", "fatto", "no", "esatto",
    "perfetto", "grazie", "continua", "avanti", "aspetta", "fermati", "stop",
}

# Chiarimenti e domande su cio' che l'agente ha appena fatto: la risposta e' gia' in chat.
CHIARIMENTI = (
    r"\bnon (?:ho|abbiamo) capito\b", r"\bnon capisco\b",
    r"\bspieg(?:a|ami|hi|are|amelo|amela)\b", r"\bpi[uù] semplice\b",
    r"\b(?:che (?:cosa )?|cosa )intendi\b",
    r"\b(?:hai|abbiamo) (?:appena )?(?:detto|scritto|spiegato|letto|verificato|creato|fatto|messo|salvato|mandato|finito)\b",
)

# Attese e avvisi: nessun lavoro nuovo da leggere o controllare.
ATTESA = (
    r"\bdimmi quando\b", r"\bfammi sapere\b", r"\bavvisami\b", r"\bavvertimi\b",
    r"\b(?:sei|siete) pronti?\b", r"\bci sei\b", r"\ba che punto (?:sei|siamo|siete)\b",
)

# Discussioni sul funzionamento del Tutor o sulla scelta dei modelli sono metodo e decisione.
META_METODO = (r"\btutor\b", r"\bmodello\b", r"\bsubagent\b", r"\bsubagente\b")

MAX_PAROLE = int(os.environ.get("CONSIGLIERE_LEGGERO_MAX_PAROLE", "80"))


def _norm(testo: str) -> str:
    testo = testo.lower().replace("’", "'").replace("è", "e'").replace("é", "e'")
    testo = re.sub(r"https?://\S+", " url ", testo)
    return re.sub(r"\s+", " ", testo).strip()


def _match(testo: str, pattern_list: tuple[str, ...]) -> str | None:
    for p in pattern_list:
        m = re.search(p, testo)
        if m:
            return m.group(0)
    return None


def classifica(prompt: str) -> tuple[str, str]:
    """Ritorna (classe, motivo). classe in {"meccanico", "leggero", "pesante", "silenzio"}."""
    if not prompt or not prompt.strip():
        return "silenzio", "vuoto"
    if prompt.lstrip().startswith("<"):
        return "silenzio", "messaggio di sistema"
    t = _norm(prompt)
    parole = t.split()
    if len(parole) < 3 or t.strip("!.,") in CONTINUAZIONI:
        return "silenzio", "continuazione"
    if len(parole) > MAX_PAROLE:
        return "silenzio", "richiesta lunga"
    if _match(t, CHIARIMENTI):
        return "silenzio", "chiarimento nel contesto corrente"
    if _match(t, ATTESA):
        return "silenzio", "attesa, nessun lavoro nuovo"
    meta = _match(t, META_METODO)
    if meta:
        return "pesante", meta
    verbo = _match(t, PESANTI_VERBI)
    if verbo:
        return "pesante", verbo
    mec = _match(t, MECCANICI)
    if mec:
        return "meccanico", f"un lavoro meccanico ({mec})"
    leg = _match(t, LEGGERI)
    if leg:
        return "leggero", f"una lettura o un controllo ({leg})"
    nome = _match(t, PESANTI_NOMI)
    if nome:
        return "pesante", nome
    return "silenzio", "non classificabile"


def motore(payload: dict) -> str:
    path = str(payload.get("transcript_path") or "").replace("\\", "/")
    if "/.claude/" in path:
        return "claude"
    if "/.codex/" in path or payload.get("codex") or os.environ.get("CODEX_HOME"):
        return "codex"
    return "claude"


def gia_leggero(payload: dict) -> bool:
    """Codex passa `model` al gancio: sulla corsia Luna il triage leggero resta in silenzio."""
    model = payload.get("model")
    return isinstance(model, str) and "luna" in model.lower()


def scheda_presente(payload: dict) -> bool:
    """Scheda `.claude/agents/lavoro-leggero.md` nel workspace: Haiku con ragionamento xhigh."""
    cwd = payload.get("cwd")
    return isinstance(cwd, str) and (Path(cwd) / ".claude" / "agents" / "lavoro-leggero.md").is_file()


def messaggio(payload: dict, classe: str, motivo: str) -> str:
    if motore(payload) == "codex":
        principale = str(payload.get("model") or "").lower()
        # Il gancio segnala un candidato; modello ed effort si scelgono sul risultato.
        # Il silenzio per una principale gia' Luna e' gestito da main().
        etichetta = "🪶 Lavoro leggero → <modello realmente avviato>"
        chi = f"Il tuo principale e' {principale}: " if principale else ""
        assetto = (
            f"{chi}questa richiesta e' candidata alla delega; scegli tu modello ed effort sul risultato concreto. "
            "Usa il catalogo disponibile e le fonti attuali: se hai dati attuali già verificati nella sessione, "
            "riusali senza ripetere la ricerca a ogni incarico. Confronta qualità, costo e tempo; qualità prima del risparmio. "
            "Per l'effort usa high come orientamento iniziale; aumenta a xhigh o superiore se il modello lo supporta "
            "e il caso richiede interpretazione, confronto di fonti, decisioni o verifiche. Sono orientamenti, nessun obbligo universale; "
            "non abbassare l'effort solo per una parola che sembra meccanica. "
            'Passa esplicitamente model e reasoning_effort scelti, fork_turns "none" se disponibile. '
            "Nell'etichetta sostituisci il segnaposto col modello realmente avviato dopo l'avvio accettato. "
            "La scelta della chat principale resta al titolare. "
        )
    else:
        etichetta = "🪶 Lavoro leggero → Haiku"
        if scheda_presente(payload):
            assetto = (
                "Assetto consigliato: subagente `lavoro-leggero` (scheda in .claude/agents: Haiku, ragionamento xhigh). "
            )
        else:
            assetto = (
                'Assetto consigliato: subagente con model "haiku" dallo strumento Agent '
                "(senza scheda il ragionamento resta quello della chat). "
            )
        # Escalation del lavoro: un passaggio da ragionare riparte su Opus a ragionamento max.
        assetto += (
            "Se il delegato scrive «SERVE PIU' RAGIONAMENTO: motivo», quel passaggio lo riavvii dallo strumento Agent "
            'con model "opus" ed effort "max". '
        )
    return (
        f"LAVORO LEGGERO (richiamo automatico): questa richiesta sembra {motivo}. "
        "Scelta predefinita: un solo delegato leggero, avviato subito da te; il titolare non chiede la delega ne' cambia modello a mano. "
        "Prima di avviarlo giudica nel contesto: se la risposta e' gia' in questa chat, se serve una decisione vera o se il lavoro "
        "e' piu' grosso di come suona, resta qui e dillo in una riga, senza etichetta. "
        "Una sola lettura piccola la fai tu direttamente, senza etichetta: il delegato conviene con piu' file, "
        "una cartella o un'operazione da eseguire e provare. "
        "Se sei gia' su Haiku, resta: sei gia' il modello leggero. "
        + assetto +
        "Mandato del delegato: richiesta, fonte minima, risultato atteso e limiti; niente ricognizione del workspace, niente altre deleghe; "
        "torna con esito, prove e lacune. Tu usi quel risultato senza rifare lo stesso controllo; riapri solo il punto con lacuna, "
        "contraddizione o verifica indipendente necessaria, dicendone il motivo. Risultato nel task corrente. "
        f"L'etichetta `{etichetta}` e' la ricevuta del delegato: prima riga della risposta solo dopo l'avvio accettato; "
        "se il lavoro lo fai tu, niente etichetta. "
        "Se durante il lavoro emergono costruzione, decisione o debug, dillo in una riga e procedi col motore normale. "
        "Un modello leggero avviato non prova un risparmio: senza confronto dei consumi resta non misurato."
    )


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (ValueError, UnicodeError):
        return 0
    if not isinstance(payload, dict):
        return 0
    prompt = payload.get("prompt") or payload.get("user_prompt") or payload.get("input") or payload.get("text")
    if not isinstance(prompt, str):
        return 0
    classe, motivo = classifica(prompt)
    if classe not in {"meccanico", "leggero"}:
        return 0
    m = motore(payload)
    if m == "codex" and gia_leggero(payload):
        return 0
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit", "additionalContext": messaggio(payload, classe, motivo),
    }}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
