/* ═══════════════════════════════════════════════════════════════════════
   COMMESSE (nuova vista) — elenco con lo stato economico di ogni commessa
   e scheda con ricavo, costi, margine, fatturazione, documenti e squadra.
   Non sostituisce nulla: il dettaglio completo di sempre si apre dalla
   scheda ("Apri dettaglio completo"), l'elenco classico resta come scheda.

   NUMERI (stessi motori di sempre, nessun calcolo nuovo):
   - ricavo      = calcolaRicavoCantiere (documenti: consuntivi, preventivi, periodi) — imponibile
   - costi       = _getCostiCantiere (personale, oneri, carburante, spese, fatture fornitori) — netti
   - da fatturare= motore di Posizione clienti (_pcCompute) — imponibile
   - fatturato   = fatture con cantiere_id — IVA inclusa (e l'equivalente netto per il confronto)
   Script classico, stesso scope globale del Gestionale.
   ═══════════════════════════════════════════════════════════════════════ */

const CM2 = { filtro:'attive', q:'', scelto:null, tab:'panoramica', dati:null, tot:null };

(function cm2Stile(){
  if(document.getElementById('cm2-css')) return;
  const s=document.createElement('style'); s.id='cm2-css';
  s.textContent=`
  #cm2-root{--m2-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--m2-soft:var(--td2,rgba(154,122,31,.06));--m2-sel:var(--td,rgba(154,122,31,.13));
    --m2-ok:var(--green,#2f7d4f);--m2-bad:var(--red,#b23a2e);--m2-warn:var(--gold,#c07d16);
    --m2-pers:#9a7a1f;--m2-oneri:#c9a94e;--m2-carb:#3f6ea8;--m2-spese:#8a6fb0;--m2-forn:#4c8c7a}
  #cm2-root .num{font-family:var(--m2-mono);font-variant-numeric:tabular-nums}
  .cm2-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .cm2-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .cm2-testa p{color:var(--text2);font-size:13px;margin-top:2px}
  .cm2-tot{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .cm2-tot div{background:var(--card);padding:12px 16px;min-width:0}
  .cm2-tot small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .cm2-tot .num{font-size:19px;font-weight:600}
  .cm2-corpo{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:14px;align-items:start}
  .cm2-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;min-width:0;overflow:hidden}
  .cm2-filtri{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border-bottom:1px solid var(--brd);background:var(--m2-soft)}
  .cm2-cerca{flex:1 1 220px;min-width:0;border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 11px;font:inherit;color:var(--text)}
  .cm2-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text)}
  .cm2-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .cm2-chip .n{font-family:var(--m2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .cm2-tabw{overflow-x:auto;max-height:70vh;overflow-y:auto}
  .cm2-t{width:100%;border-collapse:collapse}
  .cm2-t th{position:sticky;top:0;z-index:1;background:var(--card);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 10px;border-bottom:1px solid var(--brd);white-space:nowrap}
  .cm2-t td{padding:10px;border-bottom:1px solid var(--brd);vertical-align:middle}
  .cm2-t td:first-child{min-width:230px}
  .cm2-t .r{text-align:right;white-space:nowrap}
  .cm2-t tbody tr{cursor:pointer}
  .cm2-t tbody tr:hover{background:var(--m2-soft)}
  .cm2-t tbody tr.sel{background:var(--m2-sel)}
  .cm2-nome{font-weight:600;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .cm2-nome .cm2-b{font-weight:600}
  .cm2-dot{width:9px;height:9px;border-radius:50%;flex:none}
  .cm2-sub{font-size:12px;color:var(--text2)}
  .cm2-cod{font-family:var(--m2-mono);font-size:11.5px;color:var(--text2)}
  .cm2-zero{color:var(--text2);opacity:.6}
  .cm2-pos{color:var(--m2-ok)} .cm2-neg{color:var(--m2-bad)}
  .cm2-mini{width:90px;height:6px;border-radius:99px;background:var(--m2-soft);border:1px solid var(--brd);overflow:hidden;display:inline-block;vertical-align:middle}
  .cm2-mini i{display:block;height:100%;background:var(--m2-ok)}
  .cm2-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
  .cm2-b.ok{color:var(--m2-ok);background:color-mix(in srgb,var(--m2-ok) 12%,transparent)}
  .cm2-b.warn{color:var(--m2-warn);background:color-mix(in srgb,var(--m2-warn) 14%,transparent)}
  .cm2-b.bad{color:var(--m2-bad);background:color-mix(in srgb,var(--m2-bad) 12%,transparent)}
  .cm2-b.neu{color:var(--text2);border-color:var(--brd)}
  .cm2-b.blu{color:#3f6ea8;background:rgba(63,110,168,.12)}
  .cm2-iva{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 6px;border-radius:99px;border:1px solid var(--brd);color:var(--text2);vertical-align:1px;white-space:nowrap}
  .cm2-sch-testa{padding:16px 18px 0}
  .cm2-sch-testa h3{font-size:20px;font-weight:700}
  .cm2-meta{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--text2);font-size:12.5px;margin-top:4px;align-items:center}
  .cm2-tabs{display:flex;gap:2px;margin-top:12px;border-bottom:1px solid var(--brd);overflow-x:auto;padding:0 18px}
  .cm2-tabs button{all:unset;cursor:pointer;padding:9px 10px;font-size:13px;color:var(--text2);border-bottom:2px solid transparent;white-space:nowrap}
  .cm2-tabs button.on{color:var(--text);border-color:var(--teal);font-weight:600}
  .cm2-tabs .n{font-family:var(--m2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .cm2-pann{padding:16px 18px 22px;display:flex;flex-direction:column;gap:16px}
  .cm2-tre{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .cm2-cifra{border:1px solid var(--brd);border-radius:10px;padding:10px 12px;background:var(--m2-soft);display:flex;flex-direction:column;gap:2px;min-width:0}
  .cm2-cifra small{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);font-weight:700}
  .cm2-cifra .num{font-size:18px;font-weight:600}
  .cm2-cifra .def{font-size:11.5px;color:var(--text2);line-height:1.35}
  .cm2-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;margin-bottom:6px}
  .cm2-barra{position:relative;height:16px;border-radius:6px;background:var(--m2-soft);border:1px solid var(--brd);overflow:hidden;display:flex}
  .cm2-barra i{display:block;height:100%}
  .cm2-leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--text2);margin-top:6px}
  .cm2-leg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px}
  .cm2-righe{border:1px solid var(--brd);border-radius:10px;overflow:hidden}
  .cm2-riga{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:4px 12px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--brd)}
  .cm2-riga:last-child{border-bottom:0}
  .cm2-tit{min-width:0;overflow-wrap:anywhere}
  .cm2-vuoto{color:var(--text2);font-size:13px;padding:12px}
  .cm2-nota{font-size:12.5px;color:var(--text2);border-left:3px solid var(--brd);padding:2px 0 2px 10px}
  .cm2-az{display:flex;gap:8px;flex-wrap:wrap}
  .cm2-costi{width:100%;border-collapse:collapse;font-size:13px}
  .cm2-costi td{padding:8px;border-bottom:1px solid var(--brd)}
  .cm2-costi td.r{text-align:right;white-space:nowrap}
  .cm2-costi tfoot td{font-weight:700;border-bottom:0}
  @media (max-width:1150px){ .cm2-corpo{grid-template-columns:minmax(0,1fr)} .cm2-tabw{max-height:none} }
  @media (max-width:760px){ .cm2-tot{grid-template-columns:repeat(2,minmax(0,1fr))} .cm2-tre{grid-template-columns:1fr} .cm2-opz{display:none} }
  `;
  document.head.appendChild(s);
})();

const _m2fm = v => (Math.round(+v||0)).toLocaleString('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0,useGrouping:'always'});
const _m2data = s => { if(!s) return ''; const d=new Date(s); return isNaN(d)?String(s):d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'}); };
const _m2norm = s => String(s||'').toLowerCase().trim().replace(/\s+/g,' ');
const _M2_COSTI=[['personale','Personale','--m2-pers'],['oneri','Oneri','--m2-oneri'],['carburante','Carburante','--m2-carb'],['spese','Spese di cantiere','--m2-spese'],['fornitori','Fatture fornitori','--m2-forn']];

function _m2Categoria(c, archIds){
  const s=String(c.stato||'').toLowerCase();
  if(archIds.has(c.id)) return 'archivio';
  if(s.includes('perso')) return 'persa';
  if(s.includes('conclus')) return 'conclusa';
  if(s.includes('fermo')) return 'ferma';
  if(c.tipo==='lungo_periodo' || c.continuativa===true) return 'continuativa';
  if(s.includes('corso')) return 'in corso';
  return 'da confermare';
}
const _M2_STATO = {
  'in corso':['In corso','ok','var(--m2-ok)'], 'da confermare':['Da confermare','warn','var(--m2-warn)'],
  'continuativa':['Continuativa','blu','#3f6ea8'], 'ferma':['Ferma','warn','var(--m2-warn)'],
  'conclusa':['Conclusa','neu','var(--text2)'], 'persa':['Persa','neu','var(--text2)'], 'archivio':['In archivio','neu','var(--brd)']
};

async function rCommesse(){
  const root=document.getElementById('cm2-root'); if(!root) return;
  if(!CM2.dati) root.innerHTML='<div class="cm2-vuoto">Carico documenti, fatture e costi…</div>';
  try{ await _fattureCarica(); }catch(e){}
  try{ await caricaDocumentiRicavo(); }catch(e){}
  try{ if(typeof _pcCaricaPeriodi==='function') await _pcCaricaPeriodi(); }catch(e){}
  try{ if(typeof _ensureFaRows==='function') await _ensureFaRows(); }catch(e){}
  cm2Calcola(); cm2Render();
}

function cm2Calcola(){
  if(typeof invalidaCache==='function') invalidaCache();
  if(typeof _buildCostiCache==='function') _buildCostiCache();
  const archIds=new Set(DB._cantieriArchiviati||[]);
  // da fatturare per commessa: dal motore di Posizione clienti
  const daFattBy={};
  try{ (_pcCompute().list||[]).forEach(e=>(e.daFatt||[]).forEach(x=>{ if(x&&x.c&&x.c.id) daFattBy[x.c.id]=(daFattBy[x.c.id]||0)+(+x.r||0); })); }catch(e){}
  // fatture per commessa
  const fattBy={};
  (_fatture||[]).forEach(f=>{ if(!f.cantiere_id || f.stato==='annullata' || (f.tipo!=='unica'&&f.tipo!=='acconto')) return; (fattBy[f.cantiere_id]=fattBy[f.cantiere_id]||[]).push(f); });
  // squadra: giornate per commessa (le presenze indicano il cantiere per nome)
  const sq={};
  const nomeDaId={}; (DB.cantieri||[]).forEach(c=>{ if(c&&c.id) nomeDaId[c.id]=c.nome; });
  Object.keys(DB.presenze||{}).forEach(d=>{
    if(d.length!==10) return;
    Object.keys(DB.presenze[d]||{}).forEach(dip=>{
      const visti=new Set();
      (typeof getTurniRaw==='function' ? getTurniRaw(d,dip) : []).forEach(t=>{
        const k=_m2norm((t.cantiereId && nomeDaId[t.cantiereId]) || t.cantiere); if(!k || visti.has(k)) return; visti.add(k);
        const x=(sq[k]=sq[k]||{giorni:new Set(),pg:0,persone:{},ultimo:''});
        x.giorni.add(d); x.pg++; x.persone[dip]=(x.persone[dip]||0)+1; if(d>x.ultimo) x.ultimo=d;
      });
    });
  });
  const cliById={}; (DB.clienti||[]).forEach(c=>{ if(c&&c.id) cliById[c.id]=c; });
  const dati={};
  (DB.cantieri||[]).forEach(c=>{
    if(!c || !c.id) return;
    const R=calcolaRicavoCantiere(c), ricavo=+R.valore||0;
    const co=(typeof _getCostiCantiere==='function' ? _getCostiCantiere(c.nome) : null) || {personale:0,oneri:0,carburante:0,spese:0,fornitori:0,totale:0};
    const ff=fattBy[c.id]||[];
    const emesse=ff.filter(f=>f.stato!=='da_emettere');
    const fatturato=emesse.reduce((s,f)=>s+(+f.importo||0),0);
    const incassato=emesse.reduce((s,f)=>s+(f.stato==='pagata'?(+f.importo||0):_pcAcc(f)),0);
    const cli=c.clienteId ? cliById[c.clienteId] : null;
    const cat=_m2Categoria(c, archIds);
    const s=sq[_m2norm(c.nome)];
    dati[c.id]={ c, cat, R, ricavo, co, costi:+co.totale||0, margine:ricavo-(+co.totale||0),
      fatture:ff, fatturato, fatturatoNetto:_netIVA(fatturato), incassato, daFatt:daFattBy[c.id]||0,
      cliente: cli ? cli.ragioneSociale : (c.clienteNome||c.committente||''), clienteId: cli ? cli.id : '',
      giorni: s ? s.giorni.size : 0, pg: s ? s.pg : 0, persone: s ? s.persone : {}, ultimo: s ? s.ultimo : '' };
  });
  const v=Object.values(dati), att=v.filter(d=>!['conclusa','persa','archivio'].includes(d.cat));
  CM2.dati=dati;
  CM2.tot={
    attive:att.length, ricavo:att.reduce((s,d)=>s+d.ricavo,0), costi:att.reduce((s,d)=>s+d.costi,0),
    daFatt:v.reduce((s,d)=>s+d.daFatt,0),
    conto:{ attive:att.length, fatturare:v.filter(d=>d.daFatt>1).length, perdita:v.filter(d=>d.ricavo>0 && d.margine<0).length,
            senzaRicavo:att.filter(d=>d.ricavo<=0).length, concluse:v.filter(d=>d.cat==='conclusa'||d.cat==='persa').length, archivio:v.filter(d=>d.cat==='archivio').length }
  };
}

function cm2Render(){
  const root=document.getElementById('cm2-root'); if(!root||!CM2.dati) return;
  const T=CM2.tot, marg=T.ricavo-T.costi;
  const F=[['attive','Attive',T.conto.attive],['fatturare','Da fatturare',T.conto.fatturare],['perdita','In perdita',T.conto.perdita],
           ['senza','Senza ricavo',T.conto.senzaRicavo],['concluse','Concluse',T.conto.concluse],['archivio','Archivio',T.conto.archivio]];
  root.innerHTML=`
    <div class="cm2-testa">
      <div><h2>Commesse</h2><p>Ricavo, costi, margine e fatturazione di ogni commessa a colpo d'occhio.</p></div>
      <div class="cm2-az"><button class="bs" onclick="nav('cantieri')">Elenco classico</button></div>
    </div>
    <div class="cm2-tot">
      <div><small>Commesse attive</small><span class="num">${T.attive}</span></div>
      <div><small>Ricavo attive · imponibile</small><span class="num">${_m2fm(T.ricavo)}</span></div>
      <div><small>Costi attive · netti</small><span class="num">${_m2fm(T.costi)}</span></div>
      <div><small>Margine attive</small><span class="num ${marg<0?'cm2-neg':''}">${_m2fm(marg)}</span></div>
      <div><small>Da fatturare · imponibile</small><span class="num">${_m2fm(T.daFatt)}</span></div>
    </div>
    <div class="cm2-corpo">
      <section class="cm2-pan" aria-label="Elenco commesse">
        <div class="cm2-filtri">
          <input class="cm2-cerca" id="cm2-q" type="search" placeholder="Cerca per nome, codice, cliente o luogo" value="${esc(CM2.q)}" oninput="CM2.q=this.value;cm2Elenco()">
          <div style="display:flex;gap:6px;flex-wrap:wrap">${F.map(([k,t,n])=>`<button class="cm2-chip ${CM2.filtro===k?'on':''}" onclick="CM2.filtro='${k}';cm2Render()">${t}<span class="n">${n}</span></button>`).join('')}</div>
        </div>
        <div class="cm2-tabw"><table class="cm2-t">
          <thead><tr><th>Commessa</th><th class="r">Ricavo<br><span class="cm2-iva">imponibile</span></th><th class="r cm2-opz">Costi<br><span class="cm2-iva">netti</span></th><th class="r">Margine</th><th class="cm2-opz">Fatturato</th></tr></thead>
          <tbody id="cm2-righe"></tbody>
        </table></div>
      </section>
      <section class="cm2-pan" id="cm2-scheda" aria-label="Scheda commessa"></section>
    </div>`;
  cm2Elenco(); cm2Scheda();
}

function _m2Margine(d){
  if(d.ricavo<=0 && d.costi<=0) return '<span class="cm2-zero">—</span>';
  if(d.ricavo<=0) return `<span class="cm2-neg num">${_m2fm(-d.costi)}</span><div class="cm2-sub">senza ricavo</div>`;
  const p=Math.round(d.margine/d.ricavo*100);
  return `<span class="num ${d.margine<0?'cm2-neg':'cm2-pos'}">${_m2fm(d.margine)}</span><div class="cm2-sub">${p}%</div>`;
}
function _m2Avanz(d){
  if(d.ricavo<=0) return d.fatturato>0 ? `<span class="cm2-sub">${_m2fm(d.fatturato)} IVA incl.</span>` : '<span class="cm2-zero">—</span>';
  const p=Math.max(0,Math.min(100,Math.round(d.fatturatoNetto/d.ricavo*100)));
  return `<span class="cm2-mini" title="Fatturato ${p}% del ricavo (confronto al netto IVA)"><i style="width:${p}%"></i></span> <span class="cm2-sub num">${p}%</span>`;
}
function _m2Stato(d){ const s=_M2_STATO[d.cat]||['—','neu']; return `<span class="cm2-b ${s[1]}">${s[0]}</span>`; }

function cm2Elenco(){
  const tb=document.getElementById('cm2-righe'); if(!tb) return;
  const q=(CM2.q||'').trim().toLowerCase();
  let v=Object.values(CM2.dati);
  if(q) v=v.filter(d=>(d.c.nome+' '+(d.c.codice||'')+' '+d.cliente+' '+(d.c.luogo||'')+' '+(d.c.committente||'')).toLowerCase().includes(q));
  else {
    const f=CM2.filtro, aperta=d=>!['conclusa','persa','archivio'].includes(d.cat);
    if(f==='attive') v=v.filter(aperta);
    if(f==='fatturare') v=v.filter(d=>d.daFatt>1);
    if(f==='perdita') v=v.filter(d=>d.ricavo>0 && d.margine<0);
    if(f==='senza') v=v.filter(d=>aperta(d) && d.ricavo<=0);
    if(f==='concluse') v=v.filter(d=>d.cat==='conclusa'||d.cat==='persa');
    if(f==='archivio') v=v.filter(d=>d.cat==='archivio');
  }
  const ord={'in corso':0,'continuativa':1,'ferma':2,'da confermare':3,'conclusa':4,'persa':5,'archivio':6};
  v.sort((a,b)=> (ord[a.cat]-ord[b.cat]) || (b.daFatt-a.daFatt) || String(b.c.periodoInizio||'').localeCompare(String(a.c.periodoInizio||'')) || a.c.nome.localeCompare(b.c.nome));
  if(!CM2.scelto || !CM2.dati[CM2.scelto] || !v.some(d=>d.c.id===CM2.scelto)) CM2.scelto = v.length ? v[0].c.id : CM2.scelto;
  const per = c => { const a=_m2data(c.periodoInizio), b=_m2data(c.periodoFine); return a&&b&&a!==b ? `${a} → ${b}` : (a||b||''); };
  tb.innerHTML = v.length ? v.map(d=>{ const st=_M2_STATO[d.cat]||['','neu','var(--brd)']; return `
    <tr class="${d.c.id===CM2.scelto?'sel':''}" data-id="${esc(d.c.id)}" onclick="cm2Apri(this.dataset.id)">
      <td><div class="cm2-nome"><span class="cm2-dot" style="background:${st[2]}" title="${st[0]}"></span>${esc(d.c.nome)} ${_m2Stato(d)}</div>
        <div class="cm2-sub">${d.c.codice?`<span class="cm2-cod">${esc(d.c.codice)}</span> · `:''}${esc(d.cliente||'senza cliente')}${d.c.luogo?' · '+esc(d.c.luogo):''}${per(d.c)?' · '+per(d.c):''}</div></td>
      <td class="r num">${d.ricavo>0?_m2fm(d.ricavo):'<span class="cm2-zero">—</span>'}</td>
      <td class="r num cm2-opz">${d.costi>0?_m2fm(d.costi):'<span class="cm2-zero">—</span>'}</td>
      <td class="r">${_m2Margine(d)}</td>
      <td class="cm2-opz">${_m2Avanz(d)}${d.daFatt>1?`<div class="cm2-sub">da fatturare <b class="num">${_m2fm(d.daFatt)}</b></div>`:''}</td></tr>`; }).join('')
    : `<tr><td colspan="5" class="cm2-vuoto">${q?'Nessuna commessa corrisponde alla ricerca.':'Nessuna commessa in questa vista.'}</td></tr>`;
}

function cm2Apri(id){ CM2.scelto=id; document.querySelectorAll('#cm2-righe tr').forEach(tr=>tr.classList.toggle('sel', tr.dataset.id===id)); cm2Scheda();
  const el=document.getElementById('cm2-scheda'); if(el && window.innerWidth<1150) el.scrollIntoView({behavior:'smooth',block:'start'}); }
function cm2Tab(t){ CM2.tab=t; cm2Scheda(); }
// Da altre pagine (es. scheda cliente): apre la commessa nella nuova vista
function cm2ApriDa(id){ CM2.scelto=id; CM2.q=''; CM2.filtro='attive'; CM2.tab='panoramica';
  const d=CM2.dati&&CM2.dati[id]; if(d && ['conclusa','persa'].includes(d.cat)) CM2.filtro='concluse'; if(d && d.cat==='archivio') CM2.filtro='archivio';
  if(typeof menuApri==='function') menuApri('commesse'); else nav('commesse'); }
function cm2ApriCliente(id){
  if(typeof CLI2==='undefined' || !id) return;
  CLI2.scelto=id; CLI2.gruppoSel=null; CLI2.tab='panoramica'; CLI2.q=''; CLI2.filtro='attivi';
  if(typeof menuApri==='function') menuApri('clienti'); else nav('clienti');
}

function cm2Scheda(){
  const el=document.getElementById('cm2-scheda'); if(!el) return;
  const d=CM2.scelto && CM2.dati[CM2.scelto];
  if(!d){ el.innerHTML='<div class="cm2-vuoto">Scegli una commessa dall\'elenco.</div>'; return; }
  const c=d.c;
  const prev=(PREVENTIVI||[]).filter(x=>x && (x.cantiere_id===c.id || x.cantiere_ref===c.id || (c.preventivoId && x.numero===c.preventivoId)));
  const cons=(CONSUNTIVI||[]).filter(x=>x && x.cantiere_id===c.id);
  const per=(PERIODI||[]).filter(p=>p && p.commessa_id===c.id && !p.cancellato_il);
  const nDoc=prev.length+cons.length+d.fatture.length+per.length;
  const TABS=[['panoramica','Panoramica',''],['costi','Costi',''],['documenti','Documenti',nDoc],['squadra','Squadra',d.giorni||'']];
  const st=_M2_STATO[d.cat]||['—','neu'];
  el.innerHTML=`
    <div class="cm2-sch-testa">
      <h3>${esc(c.nome)}</h3>
      <div class="cm2-meta"><span class="cm2-b ${st[1]}">${st[0]}</span>${c.codice?`<span class="cm2-cod">${esc(c.codice)}</span>`:''}
        ${d.clienteId?`<a href="#" style="color:var(--teal);font-weight:600" data-id="${esc(d.clienteId)}" onclick="event.preventDefault();cm2ApriCliente(this.dataset.id)">👥 ${esc(d.cliente)}</a>`:(d.cliente?`<span>${esc(d.cliente)}</span>`:'')}
        ${c.luogo?`<span>📍 ${esc(c.luogo)}</span>`:''}${c.periodoInizio?`<span>📅 ${_m2data(c.periodoInizio)}${c.periodoFine&&c.periodoFine!==c.periodoInizio?' → '+_m2data(c.periodoFine):''}</span>`:''}</div>
    </div>
    <div class="cm2-tabs" role="tablist">${TABS.map(([k,t,n])=>`<button role="tab" class="${CM2.tab===k?'on':''}" onclick="cm2Tab('${k}')">${t}${n!==''?`<span class="n">${n}</span>`:''}</button>`).join('')}</div>
    <div class="cm2-pann" id="cm2-pann"></div>`;
  const p=document.getElementById('cm2-pann');
  const azioni=`<div class="cm2-az"><button class="bp" data-id="${esc(c.id)}" onclick="apriDett(this.dataset.id)">Apri dettaglio completo →</button>
      <button class="bs" data-id="${esc(c.id)}" onclick="apriModificaCantiere(this.dataset.id)">✏️ Modifica</button></div>`;

  if(CM2.tab==='panoramica'){
    const base=Math.max(d.ricavo,d.costi,1);
    const segs=_M2_COSTI.map(([k,t,col])=>({k,t,col,v:+d.co[k]||0})).filter(x=>x.v>0);
    const pF=d.ricavo>0?Math.max(0,Math.min(100,d.fatturatoNetto/d.ricavo*100)):0, pD=d.ricavo>0?Math.max(0,Math.min(100-pF,d.daFatt/d.ricavo*100)):0;
    p.innerHTML=`
      <div class="cm2-tre">
        <div class="cm2-cifra"><small>Ricavo</small><span class="num">${_m2fm(d.ricavo)}</span><span class="def">Imponibile, ${esc(d.R.fonte||'')}.</span></div>
        <div class="cm2-cifra"><small>Costi</small><span class="num">${_m2fm(d.costi)}</span><span class="def">Netti: personale, oneri, carburante, spese, fornitori.</span></div>
        <div class="cm2-cifra" style="${d.margine<0?'border-color:var(--m2-bad)':''}"><small>Margine</small><span class="num ${d.margine<0?'cm2-neg':'cm2-pos'}">${_m2fm(d.margine)}</span>
          <span class="def">${d.ricavo>0?Math.round(d.margine/d.ricavo*100)+'% del ricavo':'Ricavo non ancora definito: mancano preventivo o consuntivo.'}</span></div>
      </div>
      <div><div class="cm2-h">Ricavo e costi a confronto</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:grid;grid-template-columns:60px minmax(0,1fr);gap:8px;align-items:center"><span class="cm2-sub">Ricavo</span>
            <div class="cm2-barra"><i style="width:${d.ricavo/base*100}%;background:var(--teal)"></i></div></div>
          <div style="display:grid;grid-template-columns:60px minmax(0,1fr);gap:8px;align-items:center"><span class="cm2-sub">Costi</span>
            <div class="cm2-barra">${segs.map(x=>`<i title="${x.t}: ${_m2fm(x.v)}" style="width:${x.v/base*100}%;background:var(${x.col})"></i>`).join('')}</div></div>
        </div>
        <div class="cm2-leg">${segs.length?segs.map(x=>`<span><i style="background:var(${x.col})"></i>${x.t} ${_m2fm(x.v)}</span>`).join(''):'<span>Nessun costo registrato.</span>'}</div></div>
      <div><div class="cm2-h">Fatturazione</div>
        ${d.ricavo>0?`<div class="cm2-barra" title="Confronto al netto IVA"><i style="width:${pF}%;background:var(--m2-ok)"></i><i style="width:${pD}%;background:var(--m2-warn)"></i></div>
        <div class="cm2-leg"><span><i style="background:var(--m2-ok)"></i>Fatturato ${Math.round(pF)}% (${_m2fm(d.fatturatoNetto)} netti)</span><span><i style="background:var(--m2-warn)"></i>Da fatturare ${_m2fm(d.daFatt)} <span class="cm2-iva">imponibile</span></span></div>`:''}
        <p class="cm2-nota" style="margin-top:8px">Fatture emesse: <b class="num">${_m2fm(d.fatturato)}</b> IVA inclusa · incassato <b class="num">${_m2fm(d.incassato)}</b> · da incassare <b class="num">${_m2fm(Math.max(0,d.fatturato-d.incassato))}</b>.</p></div>
      ${azioni}`;
  } else if(CM2.tab==='costi'){
    const righe=_M2_COSTI.map(([k,t,col])=>({t,col,v:+d.co[k]||0}));
    p.innerHTML=`<div><div class="cm2-h">Costi della commessa <span class="cm2-iva">netti, IVA esclusa</span></div>
      <table class="cm2-costi"><tbody>${righe.map(x=>`<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(${x.col});margin-right:8px"></span>${x.t}</td>
        <td class="r num">${x.v?_m2fm(x.v):'—'}</td><td class="r cm2-sub">${d.costi>0&&x.v?Math.round(x.v/d.costi*100)+'%':''}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Totale costi</td><td class="r num">${_m2fm(d.costi)}</td><td></td></tr></tfoot></table></div>
      <p class="cm2-nota">Personale e oneri vengono dalle giornate registrate su questa commessa; carburante e spese dalle registrazioni; fornitori dalle fatture ricevute assegnate alla commessa.</p>${azioni}`;
  } else if(CM2.tab==='documenti'){
    const sp = s => s==='accettato'||s==='convertito'?'<span class="cm2-b ok">Accettato</span>':`<span class="cm2-b neu">${esc(s||'bozza')}</span>`;
    const sc = s => s==='fatturato'?'<span class="cm2-b ok">Fatturato</span>':(s==='definitivo'||s==='inviato')?'<span class="cm2-b warn">Da fatturare</span>':`<span class="cm2-b neu">${esc(s||'bozza')}</span>`;
    const sf = f => f.stato==='pagata'?'<span class="cm2-b ok">Incassata</span>':f.stato==='da_emettere'?'<span class="cm2-b neu">Da emettere</span>':(f.scadenza&&f.scadenza<today())?'<span class="cm2-b bad">Scaduta</span>':'<span class="cm2-b neu">Emessa</span>';
    const blocco=(tit,arr,fn,vuoto)=>`<div><div class="cm2-h">${tit}</div>${arr.length?`<div class="cm2-righe">${arr.map(fn).join('')}</div>`:`<div class="cm2-righe"><div class="cm2-vuoto">${vuoto}</div></div>`}</div>`;
    p.innerHTML =
      blocco('Preventivi <span class="cm2-iva">imponibile</span>', prev, x=>`<div class="cm2-riga"><span class="cm2-cod">${esc(x.numero||'')}${x.rev?' r'+x.rev:''}</span><span class="cm2-tit cm2-sub">${_m2data(x.data)}</span><span class="num">${_m2fm(x.imponibile)}</span>${sp(x.stato)}</div>`, 'Nessun preventivo collegato.')+
      blocco('Consuntivi <span class="cm2-iva">imponibile</span>', cons, x=>`<div class="cm2-riga"><span class="cm2-cod">${esc(x.numero||'')}</span><span class="cm2-tit cm2-sub">${_m2data(x.data)}${x.preventivo_numero?' · da '+esc(x.preventivo_numero):''}</span><span class="num">${_m2fm(x.imponibile)}</span>${sc(x.stato)}</div>`, 'Nessun consuntivo.')+
      (per.length?blocco('Periodi di fatturazione <span class="cm2-iva">imponibile</span>', per, x=>`<div class="cm2-riga"><span class="cm2-cod">${esc(x.numero||'')}</span><span class="cm2-tit"></span><span class="num">${_m2fm(x.importo)}</span>${x.fatturato||x.stato==='fatturato'?'<span class="cm2-b ok">Fatturato</span>':'<span class="cm2-b warn">Da fatturare</span>'}</div>`,''):'')+
      blocco('Fatture <span class="cm2-iva">IVA inclusa</span>', d.fatture.slice().sort((a,b)=>String(b.data_fattura||'').localeCompare(String(a.data_fattura||''))), f=>`<div class="cm2-riga"><span class="cm2-cod">${esc(f.numero||'')}</span><span class="cm2-tit">${_m2data(f.data_fattura)} · ${esc(f.cliente||'')}</span><span class="num">${_m2fm(f.importo)}</span>${sf(f)}</div>`, 'Nessuna fattura agganciata.')+
      azioni;
  } else {
    const nomi={}; (DB.personale||[]).forEach(x=>{ if(x&&x.id) nomi[x.id]=x.nome||x.id; });
    const pers=Object.entries(d.persone).sort((a,b)=>b[1]-a[1]);
    p.innerHTML=`
      <div class="cm2-tre">
        <div class="cm2-cifra"><small>Giorni di lavoro</small><span class="num">${d.giorni}</span><span class="def">Date con almeno una persona.</span></div>
        <div class="cm2-cifra"><small>Giornate-uomo</small><span class="num">${d.pg}</span><span class="def">Somma delle persone per giorno.</span></div>
        <div class="cm2-cifra"><small>Ultimo giorno</small><span class="num">${d.ultimo?_m2data(d.ultimo):'—'}</span><span class="def">Costo personale ${_m2fm(d.co.personale||0)}.</span></div>
      </div>
      <div><div class="cm2-h">Chi ci ha lavorato</div>${pers.length?`<div class="cm2-righe">${pers.map(([id,n])=>`<div class="cm2-riga"><span></span><span class="cm2-tit">${esc(nomi[id]||id)}</span><span class="num">${n}</span><span class="cm2-sub">${n===1?'giornata':'giornate'}</span></div>`).join('')}</div>`:'<div class="cm2-righe"><div class="cm2-vuoto">Nessuna giornata registrata su questa commessa.</div></div>'}</div>
      ${azioni}`;
  }
}
