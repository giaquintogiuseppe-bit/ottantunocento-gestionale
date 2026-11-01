#!/usr/bin/env python3
"""Installa o rimuove soltanto Lavoro leggero nel progetto indicato."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

HERE = Path(__file__).resolve().parent
NOME = "lavoro-leggero"
FILES = ("SKILL.md", "installa.py", "lavoro_leggero.py", "lavoro_leggero_agente.md", "MANIFEST.json")


def digest(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def config(path: Path) -> dict:
    if path.is_symlink():
        raise ValueError(f"Impostazioni collegate altrove: non modifico {path}")
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise ValueError(f"JSON non valido: {path}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("hooks", {}), dict):
        raise ValueError(f"Struttura impostazioni non valida: {path}")
    groups = data.get("hooks", {}).get("UserPromptSubmit", [])
    if not isinstance(groups, list) or any(not isinstance(g, dict) or not isinstance(g.get("hooks", []), list) or any(not isinstance(h, dict) for h in g.get("hooks", [])) for g in groups):
        raise ValueError(f"Struttura richiami non valida: {path}")
    return data


def richiami(cfg: dict):
    for group in cfg.get("hooks", {}).get("UserPromptSubmit", []):
        yield from group.get("hooks", [])


def gia_presente(cfg: dict) -> bool:
    return any("lavoro_leggero.py" in json.dumps(h) or "lavoro-leggero" in json.dumps(h) for h in richiami(cfg))


def scrivi_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".lavoro-leggero-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def percorsi(ws: Path):
    skill = ws / ".claude/skills/lavoro-leggero"
    agent = ws / ".claude/agents/lavoro-leggero.md"
    settings = ws / ".claude/settings.json"
    for path in (ws / ".claude", skill.parent, agent.parent, skill, agent):
        if path.is_symlink():
            raise ValueError(f"Destinazione collegata altrove: non modifico {path}")
    return skill, agent, settings


def ricevuta(skill: Path) -> dict | None:
    path = skill / "installazione.json"
    if not path.exists():
        return None
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict) or value.get("nome") != NOME:
        raise ValueError("Ricevuta di installazione non riconosciuta")
    return value


def verifica_file(ws: Path, rec: dict) -> None:
    expected = {f".claude/skills/{NOME}/{name}" for name in FILES} | {".claude/agents/lavoro-leggero.md"}
    if set(rec.get("file", {})) != expected:
        raise ValueError("Ricevuta incoerente: non modifico file")
    for rel, sha in rec["file"].items():
        p = ws / rel
        if p.is_symlink() or not p.is_file() or digest(p.read_bytes()) != sha:
            raise ValueError(f"File assente o modificato: {p}. Non lo sovrascrivo né lo rimuovo.")


def installa(ws: Path) -> str:
    skill, agent, settings = percorsi(ws)
    cfg = config(settings)
    rec = ricevuta(skill)
    if rec:
        verifica_file(ws, rec)
        if sum(h == rec["hook"] for h in richiami(cfg)) != 1:
            raise ValueError("Richiamo installato modificato o assente: controllare /hooks")
        return "Lavoro leggero è già installato: nessuna modifica."
    for p in (settings, ws / ".claude/settings.local.json"):
        if gia_presente(config(p)):
            raise ValueError(f"Lavoro leggero è già presente in {p}: non aggiungo un doppione.")
    personal = Path(os.environ.get("CLAUDE_CONFIG_DIR", str(Path.home() / ".claude")))
    scopes = [personal / "settings.json", personal / "settings.local.json"]
    for parent in ws.parents:
        scopes.extend((parent / ".claude/settings.json", parent / ".claude/settings.local.json"))
    for p in scopes:
        if p != settings and gia_presente(config(p)):
            raise ValueError(f"Lavoro leggero è già presente in {p}: non aggiungo un doppione.")
    if skill.exists() or agent.exists():
        raise ValueError("Skill o agente omonimo già presente: non lo sovrascrivo.")
    manifest = json.loads((HERE / "MANIFEST.json").read_text(encoding="utf-8"))
    bodies = {name: (HERE / name).read_bytes() for name in FILES}
    for name, sha in manifest["file"].items():
        if name not in bodies or digest(bodies[name]) != sha:
            raise ValueError(f"Pacchetto modificato o incompleto: {name}")
    hook = {"type": "command", "command": sys.executable, "args": [str(skill / "lavoro_leggero.py")], "timeout": 10, "statusMessage": "Lavoro leggero: controllo della richiesta"}
    out = copy.deepcopy(cfg)
    out.setdefault("hooks", {}).setdefault("UserPromptSubmit", []).append({"hooks": [hook]})
    rec = {"nome": NOME, "versione": manifest["versione"], "hook": hook,
           "hooks_esisteva": "hooks" in cfg, "evento_esisteva": "UserPromptSubmit" in cfg.get("hooks", {}),
           "settings_esisteva": settings.exists(),
           "file": {f".claude/skills/{NOME}/{name}": digest(body) for name, body in bodies.items()}}
    rec["file"][".claude/agents/lavoro-leggero.md"] = digest(bodies["lavoro_leggero_agente.md"])
    skill.mkdir(parents=True)
    try:
        for name, body in bodies.items():
            (skill / name).write_bytes(body)
        agent.parent.mkdir(parents=True, exist_ok=True)
        agent.write_bytes(bodies["lavoro_leggero_agente.md"])
        scrivi_json(skill / "installazione.json", rec)
        scrivi_json(settings, out)
    except Exception:
        if agent.exists() and digest(agent.read_bytes()) == rec["file"][".claude/agents/lavoro-leggero.md"]:
            agent.unlink()
        shutil.rmtree(skill)
        raise
    return f"Lavoro leggero installato in {ws}. Verifica /hooks, controlla la scheda in /agents e controlla il delegato in /tasks."


def rimuovi(ws: Path) -> str:
    skill, agent, settings = percorsi(ws)
    rec = ricevuta(skill)
    if rec is None:
        return "Nessuna installazione autonoma di Lavoro leggero da rimuovere."
    verifica_file(ws, rec)
    extras = set(p.name for p in skill.iterdir()) - set(FILES) - {"installazione.json"}
    if extras:
        raise ValueError("File aggiunti nella skill: non rimuovo la cartella.")
    cfg = config(settings)
    if sum(h == rec["hook"] for h in richiami(cfg)) != 1:
        raise ValueError("Richiamo modificato o assente: non rimuovo file.")
    groups = []
    for group in cfg["hooks"]["UserPromptSubmit"]:
        kept = [h for h in group.get("hooks", []) if h != rec["hook"]]
        if kept or group.get("hooks") != [rec["hook"]]:
            groups.append({**group, "hooks": kept})
    cfg["hooks"]["UserPromptSubmit"] = groups
    if not groups and not rec["evento_esisteva"]:
        del cfg["hooks"]["UserPromptSubmit"]
    if not cfg["hooks"] and not rec["hooks_esisteva"]:
        del cfg["hooks"]
    if not cfg and not rec["settings_esisteva"]:
        settings.unlink()
    else:
        scrivi_json(settings, cfg)
    agent.unlink()
    shutil.rmtree(skill)
    return "Lavoro leggero rimosso; impostazioni e agenti preesistenti conservati."


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("azione", choices=("installa", "rimuovi"))
    ap.add_argument("--progetto", type=Path, required=True)
    args = ap.parse_args()
    try:
        ws = args.progetto.expanduser().resolve(strict=True)
        if not ws.is_dir():
            raise ValueError("Il progetto deve essere una cartella esistente")
        print(installa(ws) if args.azione == "installa" else rimuovi(ws))
        return 0
    except (ValueError, OSError, KeyError) as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
