#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   PROVA PAGINE — da eseguire PRIMA di ogni pubblicazione su main.
   Apre il Gestionale in un browser vero (Chromium headless), visita tutte
   le pagine e la pagina di reset password, e fallisce se c'è anche un solo
   errore JavaScript. Le chiamate verso l'esterno (Supabase, CDN) sono
   bloccate: la prova non tocca mai i dati di produzione.

   Uso (dalla cartella del repository):   node strumenti/prova-pagine.js
   Esito: "OK" e codice 0, oppure l'elenco degli errori e codice 1.
   ═══════════════════════════════════════════════════════════════════════ */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const RADICE = path.resolve(__dirname, '..');
const TIPI = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
               '.json':'application/json', '.png':'image/png', '.css':'text/css', '.svg':'image/svg+xml' };

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u.endsWith('/')) u += 'index.html';
  const f = path.join(RADICE, u);
  if (!f.startsWith(RADICE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream',
                       'Last-Modified': fs.statSync(f).mtime.toUTCString() });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const errori = [];
  let pagineProvate = 0;

  async function apri(file, prova) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route(url => !url.href.startsWith(base), r => r.abort());   // niente rete esterna
    const p = await ctx.newPage();
    p.on('pageerror', e => errori.push(`${file}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errori.push(`${file} (console): ${m.text()}`); });
    await p.goto(base + file, { waitUntil: 'load' });
    await p.waitForTimeout(2500);                       // lascia girare l'avvio (timer di INIT)
    if (prova) await prova(p);
    await ctx.close();
  }

  await apri('index.html', async p => {
    const base = await p.evaluate(() => ({
      azienda: !!(window.AZIENDA && AZIENDA.supabase && AZIENDA.supabase.url),
      intestazione: !!document.getElementById('hdr-logo'),
      nav: typeof nav === 'function',
    }));
    if (!base.azienda) errori.push('index.html: window.AZIENDA mancante o incompleto (azienda.js non caricato?)');
    if (!base.intestazione) errori.push('index.html: intestazione #hdr-logo mancante');
    if (!base.nav) { errori.push('index.html: funzione nav() assente, impossibile visitare le pagine'); return; }
    const pagine = await p.evaluate(() => [...new Set([...document.querySelectorAll('.pg')].map(e => e.id.replace(/^pg-/, '')))]);
    for (const pg of pagine) {
      const e = await p.evaluate(x => { try { nav(x); return null; } catch (err) { return err.message; } }, pg);
      if (e) errori.push(`index.html → pagina "${pg}": ${e}`);
      pagineProvate++;
    }
    await p.waitForTimeout(500);
  });
  await apri('reset.html');

  await browser.close(); server.close();
  if (errori.length) {
    console.log(`❌ PROVA FALLITA — ${errori.length} errore/i (${pagineProvate} pagine visitate):`);
    [...new Set(errori)].forEach(e => console.log('  • ' + e));
    process.exit(1);
  }
  console.log(`✅ OK — ${pagineProvate} pagine del Gestionale + reset.html aperte senza errori JavaScript.`);
})().catch(e => { console.error('❌ La prova non è partita:', e.message); process.exit(1); });
