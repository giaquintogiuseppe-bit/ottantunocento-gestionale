#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   CONTROLLI AUTOMATICI PER CLAUDE CODE (hook PreToolUse, .claude/settings.json)

   Fa rispettare le regole di CLAUDE.md senza affidarsi alla memoria:
   1. git push           → prima esegue strumenti/prova-pagine.js; se non dà
                           OK il push viene bloccato.
   2. git commit         → blocca se tra i file da salvare ci sono esportazioni
                           (.sql, .csv, .xlsx…), codici fiscali, IBAN, P.IVA, o
                           dati della società scritti fuori da azienda.js.
   3. scritture su main via connettore GitHub (push_files, create_or_update_file,
      delete_file) → bloccate: su main si pubblica solo con git push, che passa
      dalla prova.

   Eccezione voluta (solo con l'OK di Giuseppe): aggiungere il commento
   "dato-ammesso" sulla stessa riga.

   Uscita 0 = via libera; uscita 2 = bloccato (il motivo va a Claude su stderr).
   Si può provare a mano:
     echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m x"}}' | node strumenti/controlli-claude.js
   ═══════════════════════════════════════════════════════════════════════ */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const RADICE = path.resolve(__dirname, '..');

function blocca(motivo) {
  process.stderr.write('⛔ BLOCCATO dai controlli del Gestionale (strumenti/controlli-claude.js)\n' + motivo + '\n');
  process.exit(2);
}
function git(...a) {
  try { return execFileSync('git', a, { cwd: RADICE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return ''; }
}

let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch (e) {}
let ev = {};
try { ev = JSON.parse(input || '{}'); } catch (e) { process.exit(0); }
const tool = ev.tool_name || '';
const ti = ev.tool_input || {};

// ── 3. Connettore GitHub: niente scritture dirette su main ────────────────
if (/^mcp__github__(push_files|create_or_update_file|delete_file)$/.test(tool)) {
  const ramo = String(ti.branch || '');
  if (!ramo || ramo === 'main' || ramo === 'master')
    blocca(`Scrittura su "${ramo || 'ramo predefinito'}" tramite connettore GitHub: main è la produzione.\n` +
           'Pubblica con git push dal repository locale, così passa prima la prova delle pagine.');
  process.exit(0);
}
if (tool !== 'Bash') process.exit(0);
const cmd = String(ti.command || '');

const vuolePush = /\bgit\b[^;&|\n]*?\bpush\b/.test(cmd);
const vuoleCommit = /\bgit\b[^;&|\n]*?\bcommit\b/.test(cmd);

// ── 2. Commit: dati personali, esportazioni, dati della società ──────────
if (vuoleCommit) {
  const ESTENSIONI_VIETATE = /\.(sql|csv|tsv|xls|xlsx|ods|xml|p7m|dump|bak)$/i;
  const RIGA_AMMESSA = /dato-ammesso/;

  // File coinvolti: già preparati + (prudenza: il comando può contenere "git add" o "-a")
  // modificati non preparati + nuovi non ignorati.
  const preparati = git('diff', '--cached', '--name-only', '--diff-filter=ACMR').split('\n').filter(Boolean);
  const modificati = git('diff', '--name-only', '--diff-filter=ACMR').split('\n').filter(Boolean);
  const nuovi = git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean);
  const tutti = [...new Set([...preparati, ...modificati, ...nuovi])];

  const problemi = [];
  for (const f of tutti) if (ESTENSIONI_VIETATE.test(f))
    problemi.push(`${f}: file di dati/esportazione — va tenuto fuori dal repository (pubblico) e consegnato in chat`);

  // Righe aggiunte: dai diff (preparati e non) + contenuto intero dei file nuovi
  const aggiunte = [];          // { file, riga }
  function daDiff(testo) {
    let file = null;
    for (const r of testo.split('\n')) {
      if (r.startsWith('+++ ')) { file = r.replace(/^\+\+\+ (b\/)?/, ''); continue; }
      if (file && r.startsWith('+') && !r.startsWith('+++')) aggiunte.push({ file, riga: r.slice(1) });
    }
  }
  daDiff(git('diff', '--cached', '-U0', '--no-color'));
  daDiff(git('diff', '-U0', '--no-color'));
  for (const f of nuovi) {
    const p = path.join(RADICE, f);
    try {
      if (fs.statSync(p).size > 5 * 1024 * 1024) continue;
      const t = fs.readFileSync(p, 'utf8');
      if (t.includes('\u0000')) continue;                  // binario
      t.split('\n').forEach(riga => aggiunte.push({ file: f, riga }));
    } catch (e) {}
  }

  // Valori della società letti da azienda.js (non duplicati qui)
  let az = '';
  try { az = fs.readFileSync(path.join(RADICE, 'azienda.js'), 'utf8'); } catch (e) {}
  const valoreAz = k => { const m = az.match(new RegExp(k + "\\s*:\\s*['\"]([^'\"]+)['\"]")); return m ? m[1] : null; };
  const supaUrl = valoreAz('url');
  const datiSocieta = [
    ['P.IVA della società', valoreAz('piva')],
    ['ragione sociale', valoreAz('ragioneSociale')],
    ['indirizzo Supabase', supaUrl],
    ['progetto Supabase', supaUrl && (supaUrl.match(/https:\/\/([a-z0-9]+)\.supabase/) || [])[1]],
    ['chiave Supabase', valoreAz('anonKey')],
    ['email di accesso', valoreAz('emailPin')],
    ['link alle app', (az.match(/https:\/\/[\w.-]+\.github\.io\//) || [])[0]],
  ].filter(([, v]) => v && v.length >= 6);
  const FILE_CODICE = /\.(js|html|json|css)$/i;
  const ESCLUSI_SOCIETA = /(^|\/)(azienda\.js|manifest\.json|controlli-claude\.js)$/;

  const RX = [
    ['codice fiscale di persona', /\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/],
    ['IBAN', /\bIT\d{2}[A-Z]\d{10}[0-9A-Z]{12}\b/i],
    ['P.IVA o numero di 11 cifre', /(^|[^\d.])\d{11}(?!\d)/],
  ];

  for (const { file, riga } of aggiunte) {
    if (RIGA_AMMESSA.test(riga)) continue;
    if (/base64,/.test(riga)) continue;                  // immagini incorporate: falsi positivi
    if (/(^|\/)azienda\.js$/.test(file)) continue;
    for (const [nome, rx] of RX) if (rx.test(riga))
      problemi.push(`${file}: ${nome} → «${riga.trim().slice(0, 120)}»`);
    if (FILE_CODICE.test(file) && !ESCLUSI_SOCIETA.test(file))
      for (const [nome, v] of datiSocieta) if (riga.includes(v))
        problemi.push(`${file}: ${nome} scritto nel codice — va letto da window.AZIENDA (o attributi data-az) → «${riga.trim().slice(0, 120)}»`);
  }

  if (problemi.length) {
    const unici = [...new Set(problemi)];
    blocca('Commit fermato: possibili dati personali/aziendali nel repository PUBBLICO (regole in CLAUDE.md).\n' +
      unici.slice(0, 25).map(p => '  • ' + p).join('\n') + (unici.length > 25 ? `\n  … e altri ${unici.length - 25}` : '') +
      '\nCorreggi, oppure — solo con l\'OK esplicito di Giuseppe — aggiungi il commento "dato-ammesso" sulla riga.');
  }
}

// ── 1. Push: prima la prova delle pagine ─────────────────────────────────
if (vuolePush) {
  const r = spawnSync('node', [path.join(RADICE, 'strumenti', 'prova-pagine.js')],
                      { cwd: RADICE, encoding: 'utf8', timeout: 150000 });
  const uscita = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.status !== 0)
    blocca('Push fermato: la prova delle pagine non dà OK. Correggi prima di pubblicare.\n' +
           (uscita || (r.error ? r.error.message : 'nessun output')));
  process.stdout.write(uscita + '\n');      // l'esito OK resta visibile nella trascrizione
}
process.exit(0);
