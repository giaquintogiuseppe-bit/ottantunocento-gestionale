/* ═══════════════════════════════════════════════════════════════════════
   FORNITORI (nuova vista) — elenco fornitori con quanto resta da pagare e
   scheda con il debito spiegato, fatture, commesse e pagamenti senza fattura.
   Non sostituisce nulla: Fatture fornitori, Posizione fornitori e Scontrini
   restano schede dell'area Fornitori.

   NUMERI: stesso motore di "Posizione fornitori" (_pfCompute) sulle fatture
   ricevute (tabella fatture_acquisto) e sui pagamenti/compensazioni senza
   fattura (DB.pagFornitori). Importi delle fatture IVA inclusa; il costo sulle
   commesse è al netto (come nei costi commessa). Script classico, scope globale.
   ═══════════════════════════════════════════════════════════════════════ */

const FO2 = { filtro:'dapagare', q:'', scelto:null, tab:'panoramica', dati:null, tot:null };

(function fo2Stile(){
  if(document.getElementById('fo2-css')) return;
  const s=document.createElement('style'); s.id='fo2-css';
  s.textContent=`
  #fo2-root{--f2-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--f2-soft:var(--td2,rgba(154,122,31,.06));--f2-sel:var(--td,rgba(154,122,31,.13));
    --f2-ok:var(--green,#2f7d4f);--f2-bad:var(--red,#b23a2e);--f2-warn:var(--gold,#c07d16)}
  #fo2-root .num{font-family:var(--f2-mono);font-variant-numeric:tabular-nums}
  .fo2-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .fo2-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .fo2-testa p{color:var(--text2);font-size:13px;margin-top:2px}
  .fo2-tot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .fo2-tot div{background:var(--card);padding:12px 16px;min-width:0}
  .fo2-tot small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .fo2-tot .num{font-size:19px;font-weight:600}
  .fo2-corpo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:14px;align-items:start}
  .fo2-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;min-width:0;overflow:hidden}
  .fo2-filtri{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border-bottom:1px solid var(--brd);background:var(--f2-soft)}
  .fo2-cerca{flex:1 1 200px;min-width:0;border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 11px;font:inherit;color:var(--text)}
  .fo2-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text)}
  .fo2-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .fo2-chip .n{font-family:var(--f2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .fo2-tabw{overflow-x:auto;max-height:70vh;overflow-y:auto}
  .fo2-t{width:100%;border-collapse:collapse}
  .fo2-t th{position:sticky;top:0;z-index:1;background:var(--card);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 10px;border-bottom:1px solid var(--brd);white-space:nowrap}
  .fo2-t td{padding:9px 10px;border-bottom:1px solid var(--brd);vertical-align:middle}
  .fo2-t td:first-child{min-width:190px}
  .fo2-t .r{text-align:right;white-space:nowrap}
  .fo2-t tbody tr{cursor:pointer}
  .fo2-t tbody tr:hover{background:var(--f2-soft)}
  .fo2-t tbody tr.sel{background:var(--f2-sel)}
  .fo2-nome{font-weight:600}
  .fo2-sub{font-size:12px;color:var(--text2)}
  .fo2-zero{color:var(--text2);opacity:.6}
  .fo2-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
  .fo2-b.ok{color:var(--f2-ok);background:color-mix(in srgb,var(--f2-ok) 12%,transparent)}
  .fo2-b.warn{color:var(--f2-warn);background:color-mix(in srgb,var(--f2-warn) 14%,transparent)}
  .fo2-b.bad{color:var(--f2-bad);background:color-mix(in srgb,var(--f2-bad) 12%,transparent)}
  .fo2-b.neu{color:var(--text2);border-color:var(--brd)}
  .fo2-iva{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 6px;border-radius:99px;border:1px solid var(--brd);color:var(--text2);vertical-align:1px;white-space:nowrap}
  .fo2-sch-testa{padding:16px 18px 0}
  .fo2-sch-testa h3{font-size:20px;font-weight:700}
  .fo2-tabs{display:flex;gap:2px;margin-top:12px;border-bottom:1px solid var(--brd);overflow-x:auto;padding:0 18px}
  .fo2-tabs button{all:unset;cursor:pointer;padding:9px 10px;font-size:13px;color:var(--text2);border-bottom:2px solid transparent;white-space:nowrap}
  .fo2-tabs button.on{color:var(--text);border-color:var(--teal);font-weight:600}
  .fo2-tabs .n{font-family:var(--f2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .fo2-pann{padding:16px 18px 22px;display:flex;flex-direction:column;gap:16px}
  .fo2-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;margin-bottom:6px}
  .fo2-conto{border:1px solid var(--brd);border-radius:10px;overflow:hidden}
  .fo2-conto div{display:flex;justify-content:space-between;gap:12px;padding:8px 12px;border-bottom:1px solid var(--brd);font-size:13.5px}
  .fo2-conto div:last-child{border-bottom:0;background:var(--f2-soft);font-weight:700;font-size:15px}
  .fo2-conto .seg{color:var(--text2);font-family:var(--f2-mono);width:14px;display:inline-block}
  .fo2-righe{border:1px solid var(--brd);border-radius:10px;overflow:hidden}
  .fo2-riga{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:4px 12px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--brd)}
  .fo2-riga:last-child{border-bottom:0}
  .fo2-tit{min-width:0;overflow-wrap:anywhere}
  .fo2-cod{font-family:var(--f2-mono);font-size:12px;color:var(--text2)}
  .fo2-vuoto{color:var(--text2);font-size:13px;padding:12px}
  .fo2-nota{font-size:12.5px;color:var(--text2);border-left:3px solid var(--brd);padding:2px 0 2px 10px}
  .fo2-az{display:flex;gap:8px;flex-wrap:wrap}
  .fo2-mini{font-size:11.5px;padding:3px 8px;border-radius:7px;border:1px solid var(--brd);background:var(--card);cursor:pointer;color:var(--text);white-space:nowrap}
  .fo2-mini:hover{border-color:var(--f2-ok);color:var(--f2-ok)}
  @media (max-width:1150px){ .fo2-corpo{grid-template-columns:minmax(0,1fr)} .fo2-tabw{max-height:none} }
  @media (max-width:760px){ .fo2-tot{grid-template-columns:repeat(2,minmax(0,1fr))} .fo2-opz{display:none} }
  `;
  document.head.appendChild(s);
})();

const _f2fm = v => (Math.round((+v||0)*100)/100).toLocaleString('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2,useGrouping:'always'});
const _f2data = s => { if(!s) return ''; const d=new Date(String(s).length===10?s+'T12:00':s); return isNaN(d)?String(s):d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'}); };
const _f2oggi = () => (typeof today==='function') ? today() : new Date().toISOString().slice(0,10);
const _f2gg = d => d ? Math.round((new Date(_f2oggi()+'T12:00') - new Date(String(d).slice(0,10)+'T12:00'))/864e5) : null;
const _F2_STATI = { pagata_confermata:['Pagata','ok'], aperta:['Da pagare','warn'], parziale:['Acconto versato','warn'],
  da_verificare:['Da verificare','neu'], probabile_pagata_da_confermare:['Pagata? da confermare','neu'], doppione:['Doppione','neu'] };

async function rFornitori(){
  const root=document.getElementById('fo2-root'); if(!root) return;
  if(!FO2.dati) root.innerHTML='<div class="fo2-vuoto">Carico le fatture fornitori…</div>';
  try{ if(typeof _ensureFaRows==='function') await _ensureFaRows(); }catch(e){}
  fo2Calcola(); fo2Render();
}

function fo2Calcola(){
  const { list, tot } = _pfCompute();
  const dati={};
  list.forEach(e=>{
    const ff=(e.fatture||[]).filter(f=>f.stato_verificato!=='doppione');
    const aperte=ff.filter(f=>f.stato_verificato==='aperta'||f.stato_verificato==='parziale');
    const piuVecchia=aperte.reduce((m,f)=>(!m||String(f.data_fattura||'')<m)?String(f.data_fattura||''):m,'');
    const ultima=ff.reduce((m,f)=>String(f.data_fattura||'')>m?String(f.data_fattura||''):m,'');
    const perCant={};
    ff.forEach(f=>{ const n=f.cantiere_nome||''; if(!n) return; const x=(perCant[n]=perCant[n]||{n:0,netto:0,lordo:0}); x.n++; x.lordo+=_pfNum(f.importo); x.netto+=_netIVA(_pfNum(f.importo)); });
    const senzaCant=ff.filter(f=>!f.cantiere_nome && !f.cantiere_id).length;
    dati[e.nome]={ e, ff, aperte, piuVecchia, ultima, perCant, senzaCant, daConf:ff.filter(f=>_pfDaConfermare(f.stato_verificato||'')) };
  });
  const v=Object.values(dati);
  FO2.dati=dati;
  FO2.tot={ debito:tot.debito||0, aperte:(tot.apertaN||0)+(tot.parzN||0), confR:tot.confR||0, fornitori:v.length,
    conto:{ dapagare:v.filter(d=>d.e.debito>0.5).length, confermare:v.filter(d=>d.daConf.length).length,
            vecchie:v.filter(d=>d.aperte.length && _f2gg(d.piuVecchia)>90).length, tutti:v.length } };
}

function fo2Render(){
  const root=document.getElementById('fo2-root'); if(!root||!FO2.dati) return;
  const T=FO2.tot;
  const F=[['dapagare','Da pagare',T.conto.dapagare],['vecchie','Aperte da più di 90 giorni',T.conto.vecchie],['confermare','Da confermare',T.conto.confermare],['tutti','Tutti',T.conto.tutti]];
  root.innerHTML=`
    <div class="fo2-testa">
      <div><h2>Fornitori</h2><p>Quanto resta da pagare a ogni fornitore, con le fatture che lo compongono.</p></div>
      <div class="fo2-az"><button class="bs" onclick="apriPagFornitore()">💸 Pagamento senza fattura</button><button class="bs" onclick="apriCompensazione()">🔁 Compensazione</button></div>
    </div>
    <div class="fo2-tot">
      <div><small>Da pagare · IVA inclusa</small><span class="num">${_f2fm(T.debito)}</span></div>
      <div><small>Fatture aperte</small><span class="num">${T.aperte}</span></div>
      <div><small>Da confermare</small><span class="num">${_f2fm(T.confR)}</span></div>
      <div><small>Fornitori</small><span class="num">${T.fornitori}</span></div>
    </div>
    <div class="fo2-corpo">
      <section class="fo2-pan" aria-label="Elenco fornitori">
        <div class="fo2-filtri">
          <input class="fo2-cerca" type="search" placeholder="Cerca fornitore" value="${esc(FO2.q)}" oninput="FO2.q=this.value;fo2Elenco()">
          <div style="display:flex;gap:6px;flex-wrap:wrap">${F.map(([k,t,n])=>`<button class="fo2-chip ${FO2.filtro===k?'on':''}" onclick="FO2.filtro='${k}';fo2Render()">${t}<span class="n">${n}</span></button>`).join('')}</div>
        </div>
        <div class="fo2-tabw"><table class="fo2-t">
          <thead><tr><th>Fornitore</th><th class="r fo2-opz">Fatture</th><th class="r">Da pagare<br><span class="fo2-iva">IVA incl.</span></th><th class="r fo2-opz">Totale fatture<br><span class="fo2-iva">IVA incl.</span></th></tr></thead>
          <tbody id="fo2-righe"></tbody>
        </table></div>
      </section>
      <section class="fo2-pan" id="fo2-scheda" aria-label="Scheda fornitore"></section>
    </div>`;
  fo2Elenco(); fo2Scheda();
}

function fo2Elenco(){
  const tb=document.getElementById('fo2-righe'); if(!tb) return;
  const q=(FO2.q||'').trim().toLowerCase();
  let v=Object.values(FO2.dati);
  if(q) v=v.filter(d=>d.e.nome.toLowerCase().includes(q));
  else {
    if(FO2.filtro==='dapagare') v=v.filter(d=>d.e.debito>0.5);
    if(FO2.filtro==='vecchie') v=v.filter(d=>d.aperte.length && _f2gg(d.piuVecchia)>90);
    if(FO2.filtro==='confermare') v=v.filter(d=>d.daConf.length);
  }
  v.sort((a,b)=>(b.e.debito-a.e.debito) || (b.daConf.length-a.daConf.length) || String(b.ultima).localeCompare(String(a.ultima)) || a.e.nome.localeCompare(b.e.nome));
  if(!FO2.scelto || !FO2.dati[FO2.scelto] || !v.some(d=>d.e.nome===FO2.scelto)) FO2.scelto = v.length ? v[0].e.nome : FO2.scelto;
  tb.innerHTML = v.length ? v.map(d=>{ const gg=_f2gg(d.piuVecchia); return `
    <tr class="${d.e.nome===FO2.scelto?'sel':''}" data-n="${esc(d.e.nome)}" onclick="fo2Apri(this.dataset.n)">
      <td><div class="fo2-nome">${esc(d.e.nome)}</div><div class="fo2-sub">${d.ultima?'ultima fattura '+_f2data(d.ultima):'nessuna fattura'}${d.aperte.length?` · ${d.aperte.length} apert${d.aperte.length===1?'a':'e'}${gg!=null?`, la più vecchia da ${gg} gg`:''}`:''}${d.daConf.length?' · '+d.daConf.length+' da confermare':''}</div></td>
      <td class="r num fo2-opz">${d.ff.length}</td>
      <td class="r">${d.e.debito>0.5?`<span class="num" style="${gg>90?'color:var(--f2-bad)':''}">${_f2fm(d.e.debito)}</span>`:'<span class="fo2-zero">—</span>'}</td>
      <td class="r num fo2-opz">${_f2fm(d.e.importo)}</td></tr>`; }).join('')
    : `<tr><td colspan="4" class="fo2-vuoto">${q?'Nessun fornitore corrisponde alla ricerca.':'Nessun fornitore in questa vista.'}</td></tr>`;
}

function fo2Apri(nome){ FO2.scelto=nome; document.querySelectorAll('#fo2-righe tr').forEach(tr=>tr.classList.toggle('sel', tr.dataset.n===nome)); fo2Scheda();
  const el=document.getElementById('fo2-scheda'); if(el && window.innerWidth<1150) el.scrollIntoView({behavior:'smooth',block:'start'}); }
function fo2Tab(t){ FO2.tab=t; fo2Scheda(); }
function fo2VaiFatture(nome){
  if(typeof menuApri==='function') menuApri('fatture-fornitori'); else nav('fatture-fornitori');
  const q=document.getElementById('fff-q'); if(q){ q.value=nome; if(typeof fffRender==='function') fffRender(); }
}
// Segna una fattura fornitore pagata (stessa scrittura della pagina Fatture fornitori)
async function fo2Pagata(id){
  const r=(_faRows||[]).find(x=>String(x.id)===String(id)); if(!r) return;
  if(!confirm('Segnare come PAGATA la fattura '+(r.rif_fornitore||r.numero||'')+' di '+(r.fornitore||'')+' da '+_f2fm(r.importo)+'?')) return;
  const body={ stato_verificato:'pagata_confermata', stato_smart:'Pagata', residuo:0, aggiornato_il:new Date().toISOString() };
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/fatture_acquisto?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    Object.assign(r, body);
    if(typeof _fffRows!=='undefined' && Array.isArray(_fffRows) && _fffRows!==_faRows){ const x=_fffRows.find(y=>String(y.id)===String(id)); if(x) Object.assign(x, body); }
    if(typeof invalidaCache==='function') invalidaCache();
    toast('✓ Segnata pagata'); fo2Calcola(); fo2Render();
  }catch(e){ toast('⚠ Non salvata: '+(e.message||e)); }
}

function fo2Scheda(){
  const el=document.getElementById('fo2-scheda'); if(!el) return;
  const d=FO2.scelto && FO2.dati[FO2.scelto];
  if(!d){ el.innerHTML='<div class="fo2-vuoto">Scegli un fornitore dall\'elenco.</div>'; return; }
  const e=d.e, nComm=Object.keys(d.perCant).length, nExtra=(e.extraList||[]).length;
  const TABS=[['panoramica','Panoramica',''],['fatture','Fatture',d.ff.length],['commesse','Commesse',nComm||''],['pagamenti','Pagamenti senza fattura',nExtra||'']];
  el.innerHTML=`
    <div class="fo2-sch-testa"><h3>${esc(e.nome)}</h3><div class="fo2-sub">${d.ff.length} fatture · ${_f2fm(e.importo)} in tutto (IVA inclusa)${d.ultima?' · ultima il '+_f2data(d.ultima):''}</div></div>
    <div class="fo2-tabs" role="tablist">${TABS.map(([k,t,n])=>`<button role="tab" class="${FO2.tab===k?'on':''}" onclick="fo2Tab('${k}')">${t}${n!==''?`<span class="n">${n}</span>`:''}</button>`).join('')}</div>
    <div class="fo2-pann" id="fo2-pann"></div>`;
  const pn=document.getElementById('fo2-pann');
  const azioni=`<div class="fo2-az">
      <button class="bp" data-n="${esc(e.nome)}" onclick="fo2VaiFatture(this.dataset.n)">Gestisci le fatture →</button>
      <button class="bs" data-n="${esc(e.nome)}" onclick="apriPagFornitore(this.dataset.n)">💸 Pagamento senza fattura</button>
      <button class="bs" data-n="${esc(e.nome)}" onclick="apriCompensazione(this.dataset.n)">🔁 Compensazione</button></div>`;
  const rigaF=f=>{ const st=_F2_STATI[f.stato_verificato]||[f.stato_verificato||'—','neu']; const res=_pfNum(f.residuo); const gg=_f2gg(f.data_fattura);
    const aperta=f.stato_verificato==='aperta'||f.stato_verificato==='parziale'||_pfDaConfermare(f.stato_verificato||'');
    return `<div class="fo2-riga"><span class="fo2-cod">${_f2data(f.data_fattura)}</span>
      <span class="fo2-tit">${esc(f.rif_fornitore||f.numero||'—')}${f.cantiere_nome?` · ${esc(f.cantiere_nome)}`:''}<div class="fo2-sub">importo ${_f2fm(f.importo)}${res>0&&res<_pfNum(f.importo)?` · resta ${_f2fm(res)}`:''}${aperta&&gg!=null?` · da ${gg} giorni`:''}${f.metodo_pagamento?' · '+esc(f.metodo_pagamento):''}</div></span>
      <span class="fo2-b ${st[1]}" ${aperta&&gg>90&&st[1]==='warn'?'style="color:var(--f2-bad);background:color-mix(in srgb,var(--f2-bad) 12%,transparent)"':''}>${st[0]}</span>
      ${aperta?`<button class="fo2-mini" data-id="${esc(f.id)}" onclick="fo2Pagata(this.dataset.id)">Segna pagata</button>`:'<span></span>'}</div>`; };

  if(FO2.tab==='panoramica'){
    const aperteR=e.apertaR||0, parzR=e.parzR||0, comp=e.compensato||0;
    const ap=d.aperte.slice().sort((a,b)=>String(a.data_fattura||'').localeCompare(String(b.data_fattura||'')));
    pn.innerHTML=`
      <div><div class="fo2-h">Come si arriva al debito <span class="fo2-iva">IVA inclusa</span></div>
        <div class="fo2-conto">
          <div><span><span class="seg"></span>Fatture da pagare (${e.apertaN||0})</span><span class="num">${_f2fm(aperteR)}</span></div>
          ${parzR>0.005?`<div><span><span class="seg">+</span>Resto delle fatture con acconto (${e.parzN||0})</span><span class="num">${_f2fm(parzR)}</span></div>`:''}
          ${comp>0.005?`<div><span><span class="seg">−</span>Compensazioni registrate</span><span class="num">${_f2fm(comp)}</span></div>`:''}
          <div><span><span class="seg">=</span>Da pagare</span><span class="num">${_f2fm(e.debito)}</span></div>
        </div>
        ${(e.confN||0)?`<p class="fo2-nota" style="margin-top:8px"><b>${e.confN}</b> fatture per <b class="num">${_f2fm(e.confR)}</b> sono probabilmente pagate ma da confermare: non sono nel debito.</p>`:''}
        ${(e.pagatoExtra||0)>0.005?`<p class="fo2-nota" style="margin-top:8px">Pagamenti senza fattura: <b class="num">${_f2fm(e.pagatoExtra)}</b> (non riducono il debito delle fatture).</p>`:''}
      </div>
      <div><div class="fo2-h">Fatture da pagare, dalla più vecchia</div>${ap.length?`<div class="fo2-righe">${ap.map(rigaF).join('')}</div>`:'<div class="fo2-righe"><div class="fo2-vuoto">Nessuna fattura da pagare.</div></div>'}</div>
      ${d.daConf.length?`<div><div class="fo2-h">Da confermare</div><div class="fo2-righe">${d.daConf.map(rigaF).join('')}</div></div>`:''}
      ${azioni}`;
  } else if(FO2.tab==='fatture'){
    const ff=d.ff.slice().sort((a,b)=>String(b.data_fattura||'').localeCompare(String(a.data_fattura||'')));
    pn.innerHTML=`<div><div class="fo2-h">Tutte le fatture <span class="fo2-iva">IVA inclusa</span></div>${ff.length?`<div class="fo2-righe">${ff.map(rigaF).join('')}</div>`:'<div class="fo2-righe"><div class="fo2-vuoto">Nessuna fattura.</div></div>'}</div>
      ${d.senzaCant?`<p class="fo2-nota">${d.senzaCant===1?'1 fattura non è assegnata':d.senzaCant+' fatture non sono assegnate'} a una commessa: il costo non entra nei margini. Si assegnano da "Gestisci le fatture".</p>`:''}${azioni}`;
  } else if(FO2.tab==='commesse'){
    const cc=Object.entries(d.perCant).sort((a,b)=>b[1].netto-a[1].netto);
    pn.innerHTML=`<div><div class="fo2-h">Su quali commesse pesa <span class="fo2-iva">costo netto, IVA esclusa</span></div>${cc.length?`<div class="fo2-righe">${cc.map(([n,x])=>`
        <div class="fo2-riga"><span></span><span class="fo2-tit">${esc(n)}<div class="fo2-sub">${x.n} ${x.n===1?'fattura':'fatture'} · ${_f2fm(x.lordo)} IVA inclusa</div></span><span class="num">${_f2fm(x.netto)}</span><span></span></div>`).join('')}</div>`
      :'<div class="fo2-righe"><div class="fo2-vuoto">Nessuna fattura assegnata a una commessa.</div></div>'}</div>
      ${d.senzaCant?`<p class="fo2-nota">${d.senzaCant===1?'1 fattura':d.senzaCant+' fatture'} di questo fornitore senza commessa.</p>`:''}${azioni}`;
  } else {
    const ex=(e.extraList||[]).slice().sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
    pn.innerHTML=`<div><div class="fo2-h">Pagamenti e compensazioni senza fattura</div>${ex.length?`<div class="fo2-righe">${ex.map(p=>{ const comp=p.comp===true||p.metodo==='compensazione'; return `
        <div class="fo2-riga"><span class="fo2-cod">${_f2data(p.data)}</span><span class="fo2-tit">${comp?'🔁 Compensazione':'💸 '+esc(p.metodo||'Pagamento')}${p.cantiereName?' · '+esc(p.cantiereName):''}${p.note?`<div class="fo2-sub">${esc(p.note)}</div>`:''}</span><span class="num">${_f2fm(p.importo)}</span><span></span></div>`; }).join('')}</div>`
      :'<div class="fo2-righe"><div class="fo2-vuoto">Nessuno.</div></div>'}</div>${azioni}`;
  }
}
