#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   AGGIORNA VERSIONI — da eseguire prima di pubblicare (lo usa /pubblica).

   Confronta la cartella di lavoro con l'ultima versione pubblicata
   (predefinito: origin/main) e:
   • per ogni file .js locale modificato, aggiorna il "?v=" in tutte le pagine
     .html e nella lista di sw.js (formato aaaammgg, poi aaaammggb, c, d…);
   • se è cambiato qualcosa dell'app, alza di uno il CACHE_NAME di sw.js.
   È idempotente: un numero già aggiornato rispetto alla base non viene
   toccato di nuovo. Segnala anche .js nuovi non elencati in sw.js.

   Uso:  node strumenti/aggiorna-versioni.js [base] [--prova]
         --prova = mostra cosa cambierebbe senza scrivere
   ═══════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const RADICE = path.resolve(__dirname, '..');
const arg = process.argv.slice(2);
const soloProva = arg.includes('--prova');
const base = arg.find(a => !a.startsWith('--')) || 'origin/main';

const git = (...a) => { try { return execFileSync('git', a, { cwd: RADICE, encoding: 'utf8', maxBuffer: 64 << 20 }); } catch (e) { return null; } };
const leggi = f => fs.readFileSync(path.join(RADICE, f), 'utf8');
const leggiBase = f => git('show', `${base}:${f}`);

if (git('rev-parse', '--verify', base) === null) { console.error(`❌ Base "${base}" non trovata (prova: git fetch origin main)`); process.exit(1); }

const cambiati = new Set([
  ...(git('diff', '--name-only', base) || '').split('\n'),
  ...(git('ls-files', '--others', '--exclude-standard') || '').split('\n'),
].filter(Boolean));

const oggi = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date()).replace(/-/g, '');
function prossima(v) {
  if (!v.startsWith(oggi)) return oggi;
  const s = v.slice(oggi.length);
  if (!s) return oggi + 'b';
  return oggi + String.fromCharCode(s.charCodeAt(s.length - 1) + 1);
}

const pagine = fs.readdirSync(RADICE).filter(f => f.endsWith('.html'));
const testi = {};                                 // file → contenuto (modificato in memoria)
for (const f of [...pagine, 'sw.js']) testi[f] = leggi(f);
const note = [], avvisi = [];

// Versioni attuali per file .js locale (dalle pagine)
const versioni = {};                              // nome.js → versione attuale
for (const f of pagine) for (const m of testi[f].matchAll(/src="([\w.-]+\.js)\?v=([\w]+)"/g)) versioni[m[1]] = versioni[m[1]] || m[2];

for (const [js, attuale] of Object.entries(versioni)) {
  if (!cambiati.has(js)) continue;
  // già aggiornato rispetto alla base? (idempotenza)
  const inBase = pagine.map(p => leggiBase(p) || '').join('\n');
  const vBase = (inBase.match(new RegExp(js.replace(/\./g, '\\.') + '\\?v=(\\w+)')) || [])[1];
  if (!vBase) { note.push(`${js}: nuovo rispetto alla base, ?v=${attuale} già sufficiente`); continue; }
  if (vBase !== attuale) { note.push(`${js}: già a ?v=${attuale} (pubblicata ${vBase})`); continue; }
  const nuova = prossima(attuale);
  for (const f of Object.keys(testi)) testi[f] = testi[f].split(`${js}?v=${attuale}`).join(`${js}?v=${nuova}`);
  note.push(`${js}: ?v=${attuale} → ?v=${nuova}`);
}

// .js locali usati dalle pagine ma assenti dalla lista di sw.js
for (const js of Object.keys(versioni)) if (!testi['sw.js'].includes(`./${js}?v=`))
  avvisi.push(`${js} è usato dalle pagine ma non è nella lista di sw.js`);
// .js nella radice non caricati da nessuna pagina (la prova non li copre)
for (const f of fs.readdirSync(RADICE)) if (f.endsWith('.js') && f !== 'sw.js' && !versioni[f])
  avvisi.push(`${f} non è caricato da nessuna pagina con ?v= (la prova delle pagine non lo copre)`);

// CACHE_NAME
const appCambiata = [...cambiati].some(f => /\.(html|js|json|png|css)$/.test(f) && !f.startsWith('strumenti/') && !f.startsWith('.claude/'));
const rxCache = /(CACHE_NAME\s*=\s*'[\w-]*-v)(\d+)'/;
const cAtt = (testi['sw.js'].match(rxCache) || [])[2];
const cBase = ((leggiBase('sw.js') || '').match(rxCache) || [])[2];
if (appCambiata && cAtt) {
  if (cBase && cAtt !== cBase) note.push(`sw.js: CACHE_NAME già a v${cAtt} (pubblicata v${cBase})`);
  else { testi['sw.js'] = testi['sw.js'].replace(rxCache, (m, a, n) => `${a}${+n + 1}'`); note.push(`sw.js: CACHE_NAME v${cAtt} → v${+cAtt + 1}`); }
}

if (!soloProva) for (const [f, t] of Object.entries(testi)) if (t !== leggi(f)) fs.writeFileSync(path.join(RADICE, f), t);

console.log(`Base: ${base} · file cambiati: ${cambiati.size}${soloProva ? ' · (solo prova, nulla scritto)' : ''}`);
console.log(note.length ? note.map(n => '  • ' + n).join('\n') : '  • nessun numero di versione da aggiornare');
if (avvisi.length) console.log('⚠️  Avvisi:\n' + avvisi.map(a => '  • ' + a).join('\n'));
