/* ═══════════════════════════════════════════════════════════════════════
   AREA CLIENTI (nuova) — elenco + scheda unica del cliente.
   Sostituisce, quando approvata, le pagine Gestione clienti, Posizione
   clienti, Incassi clienti e Referenti.

   I NUMERI vengono dallo stesso motore di "Posizione clienti" (_pcCompute):
   fatturato / incassato / da incassare / da fatturare sono identici.
   Collegamenti documento→cliente: fatture.cliente_id e preventivi.cliente_id
   (tabella clienti, allineata dal blob). Anagrafica: DB.clienti (blob).
   Script classico, stesso scope globale del Gestionale.
   ═══════════════════════════════════════════════════════════════════════ */

const CLI2 = { filtro:'attivi', q:'', scelto:null, tab:'panoramica', dati:null, tot:null, prev:{} };

(function cli2Stile(){
  if(document.getElementById('cli2-css')) return;
  const s=document.createElement('style'); s.id='cli2-css';
  s.textContent=`
  #cli2-root{--c2-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--c2-soft:var(--td2,rgba(154,122,31,.06));--c2-sel:var(--td,rgba(154,122,31,.13));
    --c2-ok:var(--green,#2f7d4f);--c2-bad:var(--red,#b23a2e);--c2-warn:var(--gold,#c07d16)}
  #cli2-root .num{font-family:var(--c2-mono);font-variant-numeric:tabular-nums}
  .cli2-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .cli2-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .cli2-testa p{color:var(--text2);font-size:13px;margin-top:2px}
  .cli2-az{display:flex;gap:8px;flex-wrap:wrap}
  .cli2-tot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .cli2-tot div{background:var(--card);padding:12px 16px}
  .cli2-tot small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .cli2-tot .num{font-size:20px;font-weight:600}
  .cli2-tot .bad{color:var(--c2-bad)}
  .cli2-corpo{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:14px;align-items:start}
  .cli2-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;min-width:0;overflow:hidden}
  .cli2-filtri{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border-bottom:1px solid var(--brd);background:var(--c2-soft)}
  .cli2-cerca{flex:1 1 220px;min-width:0;border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 11px;font:inherit;color:var(--text)}
  .cli2-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text)}
  .cli2-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .cli2-chip .n{font-family:var(--c2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .cli2-tabw{overflow-x:auto;max-height:68vh;overflow-y:auto}
  .cli2-t{width:100%;border-collapse:collapse}
  .cli2-t th{position:sticky;top:0;background:var(--card);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 10px;border-bottom:1px solid var(--brd);white-space:nowrap}
  .cli2-t td{padding:10px;border-bottom:1px solid var(--brd);vertical-align:middle}
  .cli2-t td:first-child{min-width:210px}
  .cli2-t td.num,.cli2-t td.r{white-space:nowrap}
  .cli2-t .r{text-align:right}
  .cli2-t tbody tr{cursor:pointer}
  .cli2-t tbody tr:hover{background:var(--c2-soft)}
  .cli2-t tbody tr.sel{background:var(--c2-sel)}
  .cli2-nome{font-weight:600}
  .cli2-sub{font-size:12px;color:var(--text2)}
  .cli2-zero{color:var(--text2);opacity:.6}
  .cli2-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
  .cli2-b.ok{color:var(--c2-ok);background:color-mix(in srgb,var(--c2-ok) 12%,transparent)}
  .cli2-b.warn{color:var(--c2-warn);background:color-mix(in srgb,var(--c2-warn) 14%,transparent)}
  .cli2-b.bad{color:var(--c2-bad);background:color-mix(in srgb,var(--c2-bad) 12%,transparent)}
  .cli2-b.neu{color:var(--text2);border-color:var(--brd)}
  .cli2-sch-testa{padding:16px 18px 0}
  .cli2-sch-testa h3{font-size:20px;font-weight:700}
  .cli2-meta{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--text2);font-size:12.5px;margin-top:4px}
  .cli2-tabs{display:flex;gap:2px;margin-top:12px;border-bottom:1px solid var(--brd);overflow-x:auto;padding:0 18px}
  .cli2-tabs button{all:unset;cursor:pointer;padding:9px 10px;font-size:13px;color:var(--text2);border-bottom:2px solid transparent;white-space:nowrap}
  .cli2-tabs button.on{color:var(--text);border-color:var(--teal);font-weight:600}
  .cli2-tabs .n{font-family:var(--c2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .cli2-corpo-sch{padding:16px 18px 22px;display:flex;flex-direction:column;gap:16px}
  .cli2-cifre{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .cli2-cifra{border:1px solid var(--brd);border-radius:10px;padding:10px 12px;background:var(--c2-soft)}
  .cli2-cifra small{display:block;font-size:11px;color:var(--text2)}
  .cli2-cifra .num{font-size:16px;font-weight:600}
  .cli2-cifra.evid{border-color:var(--teal)}
  .cli2-barra{height:8px;border-radius:99px;background:var(--c2-soft);border:1px solid var(--brd);overflow:hidden;display:flex}
  .cli2-barra i{display:block;height:100%}
  .cli2-leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--text2);margin-top:6px}
  .cli2-leg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px}
  .cli2-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;margin-bottom:6px}
  .cli2-righe{border:1px solid var(--brd);border-radius:10px;overflow:hidden}
  .cli2-riga{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:4px 12px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--brd)}
  .cli2-riga:last-child{border-bottom:0}
  .cli2-riga.click{cursor:pointer}.cli2-riga.click:hover{background:var(--c2-soft)}
  .cli2-cod{font-family:var(--c2-mono);font-size:12px;color:var(--text2)}
  .cli2-tit{min-width:0;overflow-wrap:anywhere}
  .cli2-anag{display:grid;grid-template-columns:150px minmax(0,1fr);gap:8px 14px;font-size:13.5px}
  .cli2-anag dt{color:var(--text2)}
  .cli2-anag dd{overflow-wrap:anywhere}
  .cli2-vuoto{color:var(--text2);font-size:13px;padding:12px}
  .cli2-nota{font-size:12.5px;color:var(--text2);border-left:3px solid var(--brd);padding:2px 0 2px 10px}
  .cli2-gruppo{border:1px dashed var(--teal);border-radius:10px;padding:10px 12px;font-size:13px}
  .cli2-flusso{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .cli2-step{border:1px solid var(--brd);border-radius:10px;padding:10px 12px;background:var(--c2-soft);display:flex;flex-direction:column;gap:3px;min-width:0}
  .cli2-step small{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);font-weight:700}
  .cli2-step .num{font-size:18px;font-weight:600}
  .cli2-step .def{font-size:11.5px;color:var(--text2);line-height:1.35}
  .cli2-step.s1{border-top:3px solid var(--brd)} .cli2-step.s2{border-top:3px solid var(--c2-warn)} .cli2-step.s3{border-top:3px solid var(--c2-ok)}
  .cli2-iva{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 6px;border-radius:99px;border:1px solid var(--brd);color:var(--text2);vertical-align:1px;white-space:nowrap}
  .cli2-soc{width:100%;border-collapse:collapse;font-size:13px}
  .cli2-soc th{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);font-weight:600;text-align:right;padding:6px 8px;border-bottom:1px solid var(--brd);vertical-align:bottom}
  .cli2-soc th:first-child,.cli2-soc td:first-child{text-align:left}
  .cli2-soc td{padding:8px;border-bottom:1px solid var(--brd);text-align:right;white-space:nowrap}
  .cli2-soc td:first-child{white-space:normal;min-width:140px}
  .cli2-soc tr.click{cursor:pointer}.cli2-soc tr.click:hover td{background:var(--c2-soft)}
  .cli2-soc tfoot td{font-weight:700;border-bottom:0}
  @media (max-width:700px){ .cli2-flusso{grid-template-columns:1fr} }
  @media (max-width:1100px){ .cli2-corpo{grid-template-columns:minmax(0,1fr)} .cli2-tabw{max-height:none} }
  @media (max-width:700px){ .cli2-tot,.cli2-cifre{grid-template-columns:repeat(2,minmax(0,1fr))} .cli2-anag{grid-template-columns:1fr} .cli2-opz{display:none} }
  `;
  document.head.appendChild(s);
})();

const _c2fm = v => (Math.round((+v||0)*100)/100).toLocaleString('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0,useGrouping:'always'});
const _c2data = s => s ? new Date(s).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '';
const _c2oggi = () => (typeof today==='function') ? today() : new Date().toISOString().slice(0,10);

async function rClienti(){
  const root=document.getElementById('cli2-root'); if(!root) return;
  if(!CLI2.dati) root.innerHTML='<div class="cli2-vuoto">Carico fatture, commesse e documenti…</div>';
  try{ await _fattureCarica(); }catch(e){}
  try{ if(typeof _pcCaricaPeriodi==='function') await _pcCaricaPeriodi(); }catch(e){}
  try{ await caricaDocumentiRicavo(); }catch(e){}
  if((typeof REF==='undefined' || !REF || !REF.length) && typeof refLoad==='function'){ try{ await refLoad(); }catch(e){} }
  cli2Calcola(); cli2Render();
}

// Numeri per cliente dal motore di Posizione clienti (stessi totali), più commesse e scadenze.
function cli2Calcola(){
  const pos=_pcCompute();
  const oggi=_c2oggi();
  const socIdx={};
  (pos.list||[]).forEach(e=>Object.keys(e.perSoc||{}).forEach(soc=>{ socIdx[_pcNorm(soc)]={e, ps:e.perSoc[soc]}; }));
  const fattByCant={};
  (_fatture||[]).forEach(f=>{ if(f.stato==='annullata'||(f.tipo!=='unica'&&f.tipo!=='acconto')) return; if(f.cantiere_id) fattByCant[f.cantiere_id]=(fattByCant[f.cantiere_id]||0)+(+f.importo||0); });
  const dati={};
  const refById={}; (typeof REF!=='undefined' && Array.isArray(REF) ? REF : []).forEach(x=>{ if(x&&x.id) refById[x.id]=x.nome||''; });
  (DB.clienti||[]).forEach(c=>{
    if(!c || !c.id || c.unitoA) return;                       // i doppioni uniti non si mostrano
    const k=_pcNorm(c.ragioneSociale);
    const hit=socIdx[k];
    const ps=hit ? hit.ps : {fatturato:0,incassato:0,daIncassare:0,daFatturare:0};
    const fatt=(_fatture||[]).filter(f=>f.cliente_id===c.id && f.stato!=='annullata');
    const scaduto=fatt.filter(f=>f.stato==='emessa' && f.scadenza && f.scadenza<oggi).reduce((s,f)=>s+Math.max(0,(+f.importo||0)-_pcAcc(f)),0);
    const cant=(DB.cantieri||[]).filter(x=>x && (x.clienteId===c.id || (!x.clienteId && k && _pcNorm(x.committente)===k)));
    const aperte=cant.filter(x=>x.stato!=='concluso' && x.stato!=='perso').length;
    const membri = hit && hit.e && (hit.e.gruppo) ? Object.keys(hit.e.membri||{}) : [];
    const refNome = c.referenteId ? (refById[c.referenteId]||'') : '';
    const daFattList = hit ? (hit.e.daFatt||[]).filter(x=>_pcNorm(x.soc)===k) : [];
    const aperteList = fatt.filter(f=>f.stato==='emessa' && ((+f.importo||0)-_pcAcc(f))>0.01);
    const daEmettere = fatt.filter(f=>f.stato==='da_emettere');
    dati[c.id]={c, ps, fatt, scaduto, cant, aperte, fattByCant, refNome, daFattList, aperteList, daEmettere, gruppo: membri.length>1 ? hit.e : null};
  });
  // Referenti / gruppi: stesse posizioni aggregate di "Posizione clienti" (bucket ref:<id> o grp:<nome>)
  CLI2.gruppi=(pos.list||[]).filter(e=>e.gruppo).map(e=>({key:e.key, nome:e.gruppo, membri:Object.keys(e.membri||{}),
    fatturato:e.fatturato||0, incassato:e.incassato||0, residuo:e.residuo||0, daFatt:e.daFattTot||0, e, tipo:String(e.key).startsWith('ref:')?'Referente':'Gruppo'}))
    .sort((a,b)=>(b.residuo+b.daFatt)-(a.residuo+a.daFatt) || a.nome.localeCompare(b.nome));
  const v=Object.values(dati), att=v.filter(d=>!d.c.archiviato);
  CLI2.dati=dati;
  CLI2.tot={
    attivi: att.length, archiviati: v.length-att.length,
    daFatturare: (pos.tot && pos.tot.daFatt) || 0,
    daIncassare: (pos.tot && pos.tot.residuo) || 0,
    scaduto: v.reduce((s,d)=>s+d.scaduto,0),
    conto: { referenti: CLI2.gruppi.length, fatturare: att.filter(d=>d.ps.daFatturare>1).length, incassare: att.filter(d=>d.ps.daIncassare>1).length, scaduti: v.filter(d=>d.scaduto>1).length }
  };
}

function _cli2Stato(d){
  if(d.c.archiviato) return '<span class="cli2-b neu">In archivio</span>';
  if(d.scaduto>1) return '<span class="cli2-b bad">Pagamento scaduto</span>';
  if(d.ps.daFatturare>1) return '<span class="cli2-b warn">Da fatturare</span>';
  if(d.ps.daIncassare>1) return '<span class="cli2-b neu">In attesa di incasso</span>';
  if(d.aperte>0) return '<span class="cli2-b ok">In regola</span>';
  return '<span class="cli2-b neu">Nessuna commessa aperta</span>';
}

function cli2Render(){
  const root=document.getElementById('cli2-root'); if(!root||!CLI2.dati) return;
  const T=CLI2.tot;
  const FILTRI=[['attivi','Attivi',T.attivi],['fatturare','Da fatturare',T.conto.fatturare],['incassare','Da incassare',T.conto.incassare],['scaduti','Pagamenti scaduti',T.conto.scaduti],['referenti','Per referente',T.conto.referenti],['archivio','Archivio',T.archiviati]];
  root.innerHTML=`
    <div class="cli2-testa">
      <div><h2>Clienti</h2><p>Anagrafica, commesse, documenti e soldi di ogni cliente in un'unica scheda.</p></div>
      <div class="cli2-az">
        <button class="bs" onclick="openExportModal&&openExportModal()">📊 Esporta Excel</button>
        <button class="bs" onclick="document.getElementById('gcli-import-file').click()">📥 Importa Excel</button>
        <button class="bs" onclick="apriModalReferente()">+ Nuovo referente</button>
        <button class="bp" onclick="apriModalClienteGest()">+ Nuovo cliente</button>
      </div>
    </div>
    <div class="cli2-tot">
      <div><small>Clienti attivi</small><span class="num">${T.attivi}</span></div>
      <div><small>Da fatturare · imponibile</small><span class="num">${_c2fm(T.daFatturare)}</span></div>
      <div><small>Da incassare · IVA inclusa</small><span class="num">${_c2fm(T.daIncassare)}</span></div>
      <div><small>Di cui scaduto</small><span class="num ${T.scaduto>1?'bad':''}">${_c2fm(T.scaduto)}</span></div>
    </div>
    <div class="cli2-corpo">
      <section class="cli2-pan" aria-label="Elenco clienti">
        <div class="cli2-filtri">
          <input class="cli2-cerca" id="cli2-q" type="search" placeholder="Cerca per nome, P.IVA o città (anche in archivio)" value="${esc(CLI2.q)}" oninput="CLI2.q=this.value;cli2Elenco()">
          <div style="display:flex;gap:6px;flex-wrap:wrap">${FILTRI.map(([k,t,n])=>`<button class="cli2-chip ${CLI2.filtro===k?'on':''}" onclick="CLI2.filtro='${k}';cli2Render()">${t}<span class="n">${n}</span></button>`).join('')}</div>
        </div>
        <div id="cli2-ref"></div>
        <div class="cli2-tabw"><table class="cli2-t">
          <thead id="cli2-thead"><tr><th>Cliente</th><th class="r cli2-opz" title="Commesse aperte">Commesse</th><th class="r">Da fatturare</th><th class="r">Da incassare</th><th>Stato</th></tr></thead>
          <tbody id="cli2-righe"></tbody>
        </table></div>
      </section>
      <section class="cli2-pan" id="cli2-scheda" aria-label="Scheda cliente"></section>
    </div>`;
  cli2Elenco(); cli2Scheda();
}

function cli2Elenco(){
  const tb=document.getElementById('cli2-righe'); if(!tb) return;
  const q=(CLI2.q||'').trim().toLowerCase();
  const boxRef=document.getElementById('cli2-ref');
  if(boxRef) boxRef.innerHTML = q ? _cli2RefCard(q) : '';
  if(!q && CLI2.filtro==='referenti'){ _cli2Referenti(tb); return; }
  const th=document.getElementById('cli2-thead'); if(th) th.innerHTML='<tr><th>Cliente</th><th class="r cli2-opz" title="Commesse aperte">Commesse</th><th class="r" title="Lavoro non ancora fatturato, IVA esclusa">Da fatturare<br><span class="cli2-iva">imponibile</span></th><th class="r" title="Fatture emesse non ancora pagate, IVA inclusa">Da incassare<br><span class="cli2-iva">IVA incl.</span></th><th>Stato</th></tr>';
  let v=Object.values(CLI2.dati);
  if(q){ v=v.filter(d=>(d.c.ragioneSociale+' '+(d.c.piva||'')+' '+(d.c.cf||'')+' '+(d.c.indirizzo||'')+' '+(d.c.referente||'')+' '+(d.refNome||'')+' '+(d.c.gruppo||'')).toLowerCase().includes(q)); }
  else {
    const f=CLI2.filtro;
    v=v.filter(d=> f==='archivio' ? !!d.c.archiviato : !d.c.archiviato);
    if(f==='fatturare') v=v.filter(d=>d.ps.daFatturare>1);
    if(f==='incassare') v=v.filter(d=>d.ps.daIncassare>1);
    if(f==='scaduti')   v=v.filter(d=>d.scaduto>1);
  }
  v.sort((a,b)=> (b.scaduto-a.scaduto) || ((b.ps.daFatturare+b.ps.daIncassare)-(a.ps.daFatturare+a.ps.daIncassare)) || (b.aperte-a.aperte) || a.c.ragioneSociale.localeCompare(b.c.ragioneSociale));
  if(!CLI2.scelto || !CLI2.dati[CLI2.scelto]) CLI2.scelto = v.length ? v[0].c.id : null;
  const citta = s => { const p=String(s||'').split(',').map(x=>x.trim()).filter(Boolean); return p.length>=3 ? p[p.length-3] : (p[1]||''); };
  tb.innerHTML = v.length ? v.map(d=>`
    <tr class="${d.c.id===CLI2.scelto?'sel':''}" onclick="cli2Apri('${esc(d.c.id)}')">
      <td><div class="cli2-nome">${esc(d.c.ragioneSociale)}</div><div class="cli2-sub">${esc(citta(d.c.indirizzo))}${d.c.piva?` · P.IVA <span class="num">${esc(d.c.piva)}</span>`:''}${d.refNome?` · 🔗 ${esc(d.refNome)}`:(d.c.gruppo?` · 🔗 ${esc(d.c.gruppo)}`:'')}</div></td>
      <td class="r num cli2-opz">${d.aperte||'<span class="cli2-zero">0</span>'}</td>
      <td class="r num">${d.ps.daFatturare>1?_c2fm(d.ps.daFatturare):'<span class="cli2-zero">—</span>'}</td>
      <td class="r num">${d.ps.daIncassare>1?_c2fm(d.ps.daIncassare):'<span class="cli2-zero">—</span>'}</td>
      <td>${_cli2Stato(d)}</td></tr>`).join('')
    : `<tr><td colspan="5" class="cli2-vuoto">${q?'Nessun cliente corrisponde alla ricerca.':'Nessun cliente in questa vista.'}</td></tr>`;
}

function cli2Apri(id){ CLI2.scelto=id; CLI2.gruppoSel=null; document.querySelectorAll('#cli2-righe tr').forEach(tr=>tr.classList.toggle('sel', tr.getAttribute('onclick')===`cli2Apri('${id}')`)); cli2Scheda(); }
function cli2Tab(t){ CLI2.tab=t; cli2Scheda(); }

async function _cli2Preventivi(id){
  if(CLI2.prev[id]) return CLI2.prev[id];
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/preventivi?select=id,numero,data,oggetto,imponibile,totale,stato,rev,cantiere_id&cliente_id=eq.'+encodeURIComponent(id)+'&order=data.desc',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},cache:'no-cache'});
    CLI2.prev[id] = r.ok ? await r.json() : [];
  }catch(e){ CLI2.prev[id]=[]; }
  return CLI2.prev[id];
}

function _c2statoFatt(f){
  const res=Math.max(0,(+f.importo||0)-_pcAcc(f));
  if(f.stato==='pagata' || res<=0.01) return '<span class="cli2-b ok">Incassata</span>';
  if(f.stato==='da_emettere') return '<span class="cli2-b neu">Da emettere</span>';
  if(f.scadenza && f.scadenza<_c2oggi()) return `<span class="cli2-b bad">Scaduta ${_c2data(f.scadenza)}</span>`;
  return `<span class="cli2-b neu">${f.scadenza?'Scade '+_c2data(f.scadenza):'Emessa'}</span>`;
}
function _c2statoComm(x){
  if(x.stato==='concluso') return '<span class="cli2-b neu">Conclusa</span>';
  if(x.stato==='perso') return '<span class="cli2-b neu">Persa</span>';
  if(x.stato==='fermo') return '<span class="cli2-b warn">Ferma</span>';
  return '<span class="cli2-b ok">In corso</span>';
}

async function cli2Scheda(){
  const el=document.getElementById('cli2-scheda'); if(!el) return;
  if(CLI2.gruppoSel){ const g=(CLI2.gruppi||[]).find(x=>x.key===CLI2.gruppoSel); if(g){ el.innerHTML=_cli2SchedaGruppo(g); return; } CLI2.gruppoSel=null; }
  const d=CLI2.scelto && CLI2.dati[CLI2.scelto];
  if(!d){ el.innerHTML='<div class="cli2-vuoto">Scegli un cliente dall\'elenco.</div>'; return; }
  const c=d.c, ps=d.ps, id=c.id;
  const prev = CLI2.prev[id];
  const TABS=[['panoramica','Panoramica',''],['commesse','Commesse',d.cant.length],['preventivi','Preventivi',prev?prev.length:''],['fatture','Fatture e incassi',d.fatt.length],['banca','Dalla banca',''],['anagrafica','Anagrafica','']];
  const pag = c.tipoPagamento ? esc(c.tipoPagamento) : '';
  el.innerHTML=`
    <div class="cli2-sch-testa">
      <h3>${esc(c.ragioneSociale)}</h3>
      <div class="cli2-meta">${c.archiviato?'<span class="cli2-b neu">In archivio</span>':''}${c.piva?`<span>P.IVA <span class="num">${esc(c.piva)}</span></span>`:''}${pag?`<span>${pag}</span>`:''}${c.referente?`<span>Contatto: ${esc(c.referente)}</span>`:''}${(d.refNome||c.gruppo)?`<span>Fa capo a: <a href="#" style="color:var(--teal);font-weight:600" onclick="event.preventDefault();cli2CercaReferente(this.dataset.n)" data-n="${esc(d.refNome||c.gruppo)}">🔗 ${esc(d.refNome||c.gruppo)}</a></span>`:''}</div>
    </div>
    <div class="cli2-tabs" role="tablist">${TABS.map(([k,t,n])=>`<button role="tab" class="${CLI2.tab===k?'on':''}" onclick="cli2Tab('${k}')">${t}${n!==''?`<span class="n">${n}</span>`:''}</button>`).join('')}</div>
    <div class="cli2-corpo-sch" id="cli2-pann"></div>`;
  const p=document.getElementById('cli2-pann');
  const commesse = list => list.length ? `<div class="cli2-righe">${list.map(x=>{ const r=_pcRicavo(x); const ft=d.fattByCant[x.id]||0; return `
      <div class="cli2-riga click" onclick="(typeof cm2ApriDa==='function'?cm2ApriDa:apriDett)('${esc(x.id)}')"><span class="cli2-cod">${esc(x.codice||'')}</span><span class="cli2-tit">${esc(x.nome||'')}${ft?`<div class="cli2-sub">fatturato ${_c2fm(ft)}</div>`:''}</span><span class="num">${r?_c2fm(r):'—'}</span>${_c2statoComm(x)}</div>`; }).join('')}</div>`
      : '<div class="cli2-righe"><div class="cli2-vuoto">Nessuna commessa per questo cliente.</div></div>';
  const fatture = list => list.length ? `<div class="cli2-righe">${list.map(f=>{ const acc=_pcAcc(f); return `
      <div class="cli2-riga"><span class="cli2-cod">Fatt. ${esc(f.numero||'')}</span><span class="cli2-tit">del ${_c2data(f.data_fattura)}${f.cantiere_nome?` · ${esc(f.cantiere_nome)}`:''}${acc>0&&f.stato!=='pagata'?`<div class="cli2-sub">acconti ${_c2fm(acc)}</div>`:''}</span><span class="num">${_c2fm(f.importo)}</span>${_c2statoFatt(f)}</div>`; }).join('')}</div>`
      : '<div class="cli2-righe"><div class="cli2-vuoto">Nessuna fattura.</div></div>';
  const fattOrd = d.fatt.slice().sort((a,b)=>String(b.data_fattura||'').localeCompare(String(a.data_fattura||'')));

  if(CLI2.tab==='panoramica'){
    const g=d.gruppo;
    p.innerHTML=_cli2Soldi({ daFatt:ps.daFatturare, daFattList:d.daFattList, daIncassare:ps.daIncassare, scaduto:d.scaduto,
        aperteList:d.aperteList, incassato:ps.incassato, fatturato:ps.fatturato, daEmettereList:d.daEmettere })
      + (g?`<div class="cli2-gruppo"><b>Fa parte del gruppo ${esc(g.gruppo)}</b> con ${Object.keys(g.membri).filter(n=>_pcNorm(n)!==_pcNorm(c.ragioneSociale)).map(esc).join(', ')}.
          <a href="#" style="color:var(--teal);font-weight:600" onclick="event.preventDefault();cli2ApriGruppo(this.dataset.k)" data-k="${esc(g.key)}">Apri la scheda del gruppo →</a></div>`:'')
      + `<div><div class="cli2-h">Commesse</div>${commesse(d.cant.slice(0,6))}</div>`;
  } else if(CLI2.tab==='commesse'){
    p.innerHTML=`<div><div class="cli2-h">Tutte le commesse</div>${commesse(d.cant)}</div><p class="cli2-nota">Clic su una commessa per aprirne la scheda.</p>`;
  } else if(CLI2.tab==='preventivi'){
    p.innerHTML='<div class="cli2-vuoto">Carico i preventivi…</div>';
    const lista=await _cli2Preventivi(id);
    if(CLI2.scelto!==id || CLI2.tab!=='preventivi') return;
    const sb = s => s==='accettato'?'<span class="cli2-b ok">Accettato</span>':s==='rifiutato'?'<span class="cli2-b bad">Rifiutato</span>':`<span class="cli2-b neu">${esc(s||'bozza')}</span>`;
    p.innerHTML = `<div><div class="cli2-h">Preventivi</div>${lista.length?`<div class="cli2-righe">${lista.map(x=>`
      <div class="cli2-riga"><span class="cli2-cod">${esc(x.numero||'')}${x.rev?` r${x.rev}`:''}</span><span class="cli2-tit">${esc(x.oggetto||'')}<div class="cli2-sub">${_c2data(x.data)}</div></span><span class="num">${_c2fm(x.imponibile||x.totale)}</span>${sb(x.stato)}</div>`).join('')}</div>`
      : '<div class="cli2-righe"><div class="cli2-vuoto">Nessun preventivo collegato.</div></div>'}</div><p class="cli2-nota">Importi imponibili. I preventivi si creano e modificano nell'app Amministrazione.</p>`;
    const b=document.querySelector('#cli2-scheda .cli2-tabs button:nth-child(3)'); if(b) b.innerHTML=`Preventivi<span class="n">${lista.length}</span>`;
  } else if(CLI2.tab==='fatture'){
    const totF=d.fatt.filter(f=>f.stato!=='da_emettere').reduce((s,f)=>s+(+f.importo||0),0);
    p.innerHTML=`
      <div class="cli2-cifre">
        <div class="cli2-cifra"><small>Fatture emesse · IVA incl.</small><span class="num">${_c2fm(totF)}</span></div>
        <div class="cli2-cifra"><small>Incassato</small><span class="num">${_c2fm(ps.incassato)}</span></div>
        <div class="cli2-cifra"><small>Da incassare</small><span class="num">${_c2fm(ps.daIncassare)}</span></div>
        <div class="cli2-cifra"><small>Scaduto</small><span class="num" style="${d.scaduto>1?'color:var(--c2-bad)':''}">${_c2fm(d.scaduto)}</span></div>
      </div>
      <div><div class="cli2-h">Fatture</div>${fatture(fattOrd)}</div>
      <p class="cli2-nota">Gli acconti e gli incassi si registrano come oggi da Fatture &amp; Scadenze e da Incassi clienti.</p>`;
  } else if(CLI2.tab==='banca'){
    p.innerHTML='<div class="cli2-vuoto">Carico i movimenti dalla banca…</div>';
    if(typeof _bncPann==='function') _bncPann('cli2-pann', c.ragioneSociale, 'cli', ()=>CLI2.scelto===id && CLI2.tab==='banca');
    else p.innerHTML='<div class="cli2-vuoto">Modulo banca non disponibile.</div>';
  } else {
    const riga=(t,v,mono)=>`<dt>${t}</dt><dd${mono?' class="num"':''}>${v?esc(v):'—'}</dd>`;
    const refNome = c.referenteId && typeof REF!=='undefined' ? ((REF||[]).find(r=>r.id===c.referenteId)||{}).nome : '';
    p.innerHTML=`
      <dl class="cli2-anag">
        ${riga('Ragione sociale',c.ragioneSociale)}${riga('P.IVA',c.piva,1)}${riga('Codice fiscale',c.cf,1)}${riga('Indirizzo',c.indirizzo)}
        ${riga('PEC',c.pec)}${riga('Email',c.email)}${riga('Telefono',c.telefono)}${c.cellulare?riga('Cellulare',c.cellulare):''}
        ${riga('Pagamento',c.tipoPagamento)}${riga('IBAN',c.iban,1)}${riga('Contatto',c.referente)}${riga('Fa capo a (referente)',refNome)}${riga('Gruppo',c.gruppo)}
        ${riga('Note',c.note)}${riga('Creato il',c.dataCreazione?_c2data(c.dataCreazione):'')}
        ${c.archiviato?riga('In archivio dal',(c.archiviatoIl?_c2data(c.archiviatoIl):'')+(c.archiviatoMotivo?' · '+c.archiviatoMotivo:'')):''}
      </dl>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="bp" onclick="apriModalClienteGest('${esc(id)}')">✏️ Modifica</button>
        <button class="bs" onclick="apriReportCliente('${esc(id)}')">📊 Report</button>
        ${c.archiviato?`<button class="bs" onclick="cli2Archivia('${esc(id)}',false)">↩ Riporta tra gli attivi</button>`:`<button class="bs" onclick="cli2Archivia('${esc(id)}',true)">🗄 Metti in archivio</button>`}
      </div>
      <p class="cli2-nota">Un cliente in archivio non si perde: resta collegato a commesse e documenti e si ritrova con la ricerca.</p>`;
  }
}

function cli2Archivia(id, si){
  const c=(DB.clienti||[]).find(x=>x.id===id); if(!c) return;
  if(si){ c.archiviato=true; c.archiviatoIl=_c2oggi(); c.archiviatoMotivo='Archiviato a mano'; }
  else { delete c.archiviato; delete c.archiviatoIl; delete c.archiviatoMotivo; }
  save(); cloudSalva(true);
  cli2Calcola(); cli2Render();
  toast(si ? `🗄 ${c.ragioneSociale} in archivio` : `↩ ${c.ragioneSociale} tra gli attivi`);
}

// Dopo una modifica dal modulo cliente, se l'area Clienti è aperta si aggiorna.
function cli2DopoModifica(){ if(typeof curPg!=='undefined' && curPg==='clienti' && CLI2.dati){ cli2Calcola(); cli2Render(); } }

// ── Referenti / gruppi (come in Posizione clienti) ──────────────────────
function _cli2RefCard(q){
  const gg=(CLI2.gruppi||[]).filter(g=>g.nome.toLowerCase().includes(q));
  if(!gg.length) return '';
  return '<div style="display:flex;flex-direction:column;gap:8px;padding:12px;border-bottom:1px solid var(--brd)">'+gg.slice(0,3).map(g=>`
    <div class="cli2-gruppo"><b>🔗 ${esc(g.nome)}</b> <span class="cli2-sub">${g.tipo} · ${g.membri.length} società</span>
      <div class="cli2-sub" style="margin-top:2px">${g.membri.map(esc).join(' · ')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px;font-size:13px">
        <span>Fatturato <b class="num">${_c2fm(g.fatturato)}</b></span><span>Incassato <b class="num">${_c2fm(g.incassato)}</b></span>
        <span>Da incassare <b class="num">${_c2fm(g.residuo)}</b></span><span>Da fatturare <b class="num">${_c2fm(g.daFatt)}</b> <span class="cli2-iva">imponibile</span></span></div>
      <button class="bs" style="margin-top:8px;font-size:12px;padding:5px 10px" data-k="${esc(g.key)}" onclick="cli2ApriGruppo(this.dataset.k)">Apri la scheda del gruppo →</button></div>`).join('')+'</div>';
}
function _cli2Referenti(tb){
  const th=document.getElementById('cli2-thead');
  if(th) th.innerHTML='<tr><th>Referente / gruppo</th><th class="r cli2-opz">Società</th><th class="r">Da fatturare<br><span class="cli2-iva">imponibile</span></th><th class="r">Da incassare<br><span class="cli2-iva">IVA incl.</span></th><th class="r cli2-opz">Fatturato<br><span class="cli2-iva">IVA incl.</span></th></tr>';
  const gg=CLI2.gruppi||[];
  tb.innerHTML = gg.length ? gg.map(g=>`
    <tr class="${CLI2.gruppoSel===g.key?'sel':''}" data-k="${esc(g.key)}" onclick="cli2ApriGruppo(this.dataset.k)">
      <td><div class="cli2-nome">🔗 ${esc(g.nome)}</div><div class="cli2-sub">${g.tipo} · ${g.membri.slice(0,4).map(esc).join(' · ')}${g.membri.length>4?' …':''}</div></td>
      <td class="r num cli2-opz">${g.membri.length}</td>
      <td class="r num">${g.daFatt>1?_c2fm(g.daFatt):'<span class="cli2-zero">—</span>'}</td>
      <td class="r num">${g.residuo>1?_c2fm(g.residuo):'<span class="cli2-zero">—</span>'}</td>
      <td class="r num cli2-opz">${_c2fm(g.fatturato)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="cli2-vuoto">Nessun referente o gruppo con movimenti.</td></tr>';
}
function cli2CercaReferente(nome){ CLI2.q=nome||''; CLI2.scelto=null; cli2Render(); }

function cli2ApriGruppo(key){
  CLI2.gruppoSel=key;
  document.querySelectorAll('#cli2-righe tr').forEach(tr=>tr.classList.toggle('sel', tr.dataset.k===key));
  cli2Scheda();
  const el=document.getElementById('cli2-scheda'); if(el && window.innerWidth<1100) el.scrollIntoView({behavior:'smooth',block:'start'});
}

// Perché una voce è "da fatturare": consuntivo, periodi di fatturazione o ricavo della commessa non ancora fatturato
function _cli2Motivo(x){
  if(x.consuntivi && x.consuntivi.length) return 'Consuntivo '+x.consuntivi.map(esc).join(', ')+' non ancora fatturato';
  if(x.periodi) return x.periodi+(x.periodi===1?' periodo di fatturazione aperto':' periodi di fatturazione aperti');
  return 'Ricavo della commessa meno quanto già fatturato';
}

// Blocco soldi: le tre tappe lavoro → fattura → incasso, ognuna con cosa contiene e il dettaglio
function _cli2Soldi(o){
  const iva=(typeof _ivaStd==='function')?_ivaStd():0.22;
  const conIva=o.daFatt*(1+iva);
  const totApert=(o.aperteList||[]).reduce((s,f)=>s+Math.max(0,(+f.importo||0)-_pcAcc(f)),0);
  const oggi=_c2oggi();
  const daF=(o.daFattList||[]).slice().sort((a,b)=>b.r-a.r);
  const ap=(o.aperteList||[]).slice().sort((a,b)=>String(a.scadenza||'').localeCompare(String(b.scadenza||'')));
  const em=o.daEmettereList||[];
  const righeDaF = daF.length ? `<div class="cli2-righe">${daF.map(x=>`
      <div class="cli2-riga click" onclick="(typeof cm2ApriDa==='function'?cm2ApriDa:apriDett)('${esc(x.c.id)}')"><span class="cli2-cod">${esc(x.c.codice||'')}</span>
        <span class="cli2-tit">${esc(x.c.nome||'')}<div class="cli2-sub">${_cli2Motivo(x)}${o.mostraSoc&&x.soc?` · da intestare a <b>${esc(x.soc)}</b>`:''}</div></span>
        <span class="num">${_c2fm(x.r)}</span><span class="cli2-iva">imponibile</span></div>`).join('')}</div>`
    : '<div class="cli2-righe"><div class="cli2-vuoto">Niente da fatturare.</div></div>';
  const righeAp = ap.length ? `<div class="cli2-righe">${ap.map(f=>{ const res=Math.max(0,(+f.importo||0)-_pcAcc(f)); const scad=f.scadenza&&f.scadenza<oggi; return `
      <div class="cli2-riga"><span class="cli2-cod">Fatt. ${esc(f.numero||'')}</span>
        <span class="cli2-tit">del ${_c2data(f.data_fattura)}${o.mostraSoc?` · ${esc(f.cliente||'')}`:''}${f.cantiere_nome?` · ${esc(f.cantiere_nome)}`:''}<div class="cli2-sub">importo ${_c2fm(f.importo)}${_pcAcc(f)>0?` · già incassati ${_c2fm(_pcAcc(f))}`:''}</div></span>
        <span class="num">${_c2fm(res)}</span>${scad?`<span class="cli2-b bad">Scaduta ${_c2data(f.scadenza)}</span>`:`<span class="cli2-b neu">${f.scadenza?'Scade '+_c2data(f.scadenza):'Emessa'}</span>`}</div>`; }).join('')}</div>`
    : '<div class="cli2-righe"><div class="cli2-vuoto">Nessuna fattura da incassare.</div></div>';
  return `
    <div class="cli2-flusso">
      <div class="cli2-step s1"><small>1 · Da fatturare</small><span class="num">${_c2fm(o.daFatt)}</span>
        <span class="def">Lavoro fatto o accettato, non ancora in fattura. <b>Imponibile, IVA esclusa</b>${o.daFatt>1?` (circa ${_c2fm(conIva)} con IVA)`:''}.</span></div>
      <div class="cli2-step s2"><small>2 · Fatturato, da incassare</small><span class="num" style="${o.scaduto>1?'color:var(--c2-bad)':''}">${_c2fm(o.daIncassare)}</span>
        <span class="def">Fatture emesse non ancora pagate. <b>IVA inclusa</b>.${o.scaduto>1?` Di cui <b style="color:var(--c2-bad)">scaduto ${_c2fm(o.scaduto)}</b>.`:''}</span></div>
      <div class="cli2-step s3"><small>3 · Incassato</small><span class="num">${_c2fm(o.incassato)}</span>
        <span class="def">Già pagato: fatture saldate, acconti e incassi registrati. <b>IVA inclusa</b>.</span></div>
    </div>
    <p class="cli2-nota">Fatturato in tutto: <b class="num">${_c2fm(o.fatturato)}</b> IVA inclusa (= fatture emesse e saldate + fatture da incassare).${(o.compensato||0)>0?` Compensazioni: ${_c2fm(o.compensato)}.`:''}</p>
    <div><div class="cli2-h">1 · Da fatturare: da dove viene</div>${righeDaF}</div>
    <div><div class="cli2-h">2 · Fatture da incassare${Math.abs(totApert-o.daIncassare)>1&&ap.length?' (residuo per fattura)':''}</div>${righeAp}</div>
    ${em.length?`<div><div class="cli2-h">Fatture preparate, non ancora emesse</div><div class="cli2-righe">${em.map(f=>`<div class="cli2-riga"><span class="cli2-cod">${esc(f.numero||'bozza')}</span><span class="cli2-tit">${esc(f.cantiere_nome||f.descrizione||'')}</span><span class="num">${_c2fm(f.importo)}</span><span class="cli2-b neu">Da emettere</span></div>`).join('')}</div></div>`:''}`;
}

// Scheda del referente / gruppo: società per società, poi il dettaglio di cosa è da fatturare e da incassare
function _cli2SchedaGruppo(g){
  const e=g.e||{};
  const ps=e.perSoc||{};
  const idPer=n=>{ const k=_pcNorm(n); const d=Object.values(CLI2.dati||{}).find(x=>_pcNorm(x.c.ragioneSociale)===k); return d?d.c.id:''; };
  const soc=Object.keys(ps).sort((a,b)=>((ps[b].daFatturare+ps[b].daIncassare)-(ps[a].daFatturare+ps[a].daIncassare))||a.localeCompare(b));
  const t=soc.reduce((s,n)=>({f:s.f+ps[n].fatturato,i:s.i+ps[n].incassato,r:s.r+ps[n].daIncassare,d:s.d+ps[n].daFatturare}),{f:0,i:0,r:0,d:0});
  const oggi=_c2oggi();
  const scaduto=(e.fattAperte||[]).filter(f=>f.scadenza&&f.scadenza<oggi).reduce((s,f)=>s+Math.max(0,(+f.importo||0)-_pcAcc(f)),0);
  return `
    <div class="cli2-sch-testa">
      <h3>🔗 ${esc(g.nome)}</h3>
      <div class="cli2-meta"><span>${g.tipo}</span><span>${soc.length} società</span><span>Stessi numeri di Posizione clienti</span></div>
    </div>
    <div class="cli2-corpo-sch">
      <div><div class="cli2-h">Società per società</div>
        <div style="overflow-x:auto"><table class="cli2-soc">
          <thead><tr><th>Società</th><th>Da fatturare<br><span class="cli2-iva">imponibile</span></th><th>Da incassare<br><span class="cli2-iva">IVA incl.</span></th><th>Incassato<br><span class="cli2-iva">IVA incl.</span></th><th>Fatturato<br><span class="cli2-iva">IVA incl.</span></th></tr></thead>
          <tbody>${soc.map(n=>{ const id=idPer(n); return `<tr class="${id?'click':''}" ${id?`onclick="cli2Apri('${esc(id)}')" title="Apri la scheda della società"`:''}>
            <td>${esc(n)}</td><td class="num">${ps[n].daFatturare>1?_c2fm(ps[n].daFatturare):'—'}</td><td class="num">${ps[n].daIncassare>1?_c2fm(ps[n].daIncassare):'—'}</td>
            <td class="num">${_c2fm(ps[n].incassato)}</td><td class="num">${_c2fm(ps[n].fatturato)}</td></tr>`; }).join('')}</tbody>
          <tfoot><tr><td>Totale società</td><td class="num">${_c2fm(t.d)}</td><td class="num">${_c2fm(t.r)}</td><td class="num">${_c2fm(t.i)}</td><td class="num">${_c2fm(t.f)}</td></tr></tfoot>
        </table></div>
        ${(e.compensato||0)>0?`<p class="cli2-nota" style="margin-top:8px">Compensazioni registrate sul gruppo: ${_c2fm(e.compensato)} (riducono il da incassare del gruppo: ${_c2fm(g.residuo)}).</p>`:''}
      </div>
      ${_cli2Soldi({ daFatt:g.daFatt, daFattList:e.daFatt, daIncassare:g.residuo, scaduto, aperteList:e.fattAperte, incassato:g.incassato,
                    fatturato:g.fatturato, daEmettereList:e.daEmettere, mostraSoc:true, compensato:e.compensato })}
    </div>`;
}
