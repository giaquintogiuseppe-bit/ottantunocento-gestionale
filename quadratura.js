/* ═══════════════════════════════════════════════════════════════════════
   QUADRATURA (Fisco e documenti) — un posto solo per far tornare i conti
   Per ogni fattura di Genya (fisco_fatture) mette a confronto:
     • il documento nel gestionale: Clienti → Fatture e scadenze (tabella fatture)
       oppure Fornitori → Fatture fornitori (tabella fatture_acquisto);
     • i pagamenti trovati in banca (riconciliazione di Fisco: bancaRiconcilia).
   Da qui si sistemano le differenze: aggiungi al gestionale, registra il pagamento
   visto in banca. Le scritture vanno nelle tabelle del gestionale, così le pagine
   Clienti e Fornitori mostrano gli stessi numeri.
   Script classico, caricato dopo fisco.js.
   ═══════════════════════════════════════════════════════════════════════ */

const QD = { lato:'cli', flt:'da_fare', q:'', anno:'', dati:null, righe:[] };

(function qdStile(){
  if(document.getElementById('qd-css')) return;
  const s=document.createElement('style'); s.id='qd-css';
  s.textContent=`
  .qd{--qd-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--qd-soft:var(--td2,rgba(154,122,31,.06));--qd-ok:var(--green,#2f7d4f);--qd-bad:var(--red,#b23a2e);--qd-warn:var(--gold,#c07d16)}
  .qd .num{font-family:var(--qd-mono);font-variant-numeric:tabular-nums}
  .qd-intro{font-size:13px;color:var(--text2);margin:4px 0 12px;max-width:900px}
  .qd-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
  .qd-cerca{flex:1 1 240px;min-width:0;border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 11px;font:inherit;font-size:13px;color:var(--text)}
  .qd-sel{border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;color:var(--text)}
  .qd-tot{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:12px}
  .qd-tot button{all:unset;cursor:pointer;background:var(--card);padding:11px 14px;display:flex;flex-direction:column;gap:2px;min-width:0}
  .qd-tot button:hover{background:var(--qd-soft)}
  .qd-tot button.on{box-shadow:inset 0 -3px 0 var(--teal);background:var(--qd-soft)}
  .qd-tot small{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text2)}
  .qd-tot .num{font-size:19px;font-weight:600}
  .qd-tot .sub{font-size:11.5px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .qd-tot .warn .num,.qd-tot button.warn .num{color:var(--qd-warn)}
  .qd-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;overflow:hidden}
  .qd-pan-h{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--brd);background:var(--qd-soft);font-size:13px}
  .qd-tw{overflow:auto;max-height:70vh}
  .qd-t{width:100%;border-collapse:collapse;font-size:13px}
  .qd-t th{position:sticky;top:0;background:var(--card);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:8px 10px;border-bottom:1px solid var(--brd);white-space:nowrap;z-index:1}
  .qd-t td{padding:8px 10px;border-bottom:1px solid var(--brd);vertical-align:top}
  .qd-t .r{text-align:right;white-space:nowrap}
  .qd-t tr:hover td{background:var(--qd-soft)}
  .qd-sub{font-size:11.5px;color:var(--text2)}
  .qd-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap}
  .qd-b.ok{color:var(--qd-ok);background:color-mix(in srgb,var(--qd-ok) 12%,transparent)}
  .qd-b.warn{color:var(--qd-warn);background:color-mix(in srgb,var(--qd-warn) 14%,transparent)}
  .qd-b.bad{color:var(--qd-bad);background:color-mix(in srgb,var(--qd-bad) 12%,transparent)}
  .qd-b.neu{color:var(--text2);border:1px solid var(--brd)}
  .qd-az{display:flex;flex-direction:column;gap:4px;align-items:flex-start}
  .qd-az button{font-size:11.5px;padding:4px 9px;white-space:nowrap}
  .qd-mov{font-size:11.5px;color:var(--text2);margin-top:3px}
  .qd-vuoto{padding:18px;color:var(--text2);font-size:13px;text-align:center}
  @media (max-width:900px){ .qd-tot{grid-template-columns:repeat(2,minmax(0,1fr))} }
  `;
  document.head.appendChild(s);
})();

/* ── aiuti ── */
const _qdEur=n=>(typeof fmtE==='function')?fmtE(n):('€ '+(Number(n)||0).toFixed(2));
const _qdEsc=s=>(typeof esc==='function')?esc(s):String(s==null?'':s);
const _qdData=d=>d?String(d).slice(0,10).split('-').reverse().join('/'):'—';
const _qdN=v=>{ const n=parseFloat(v); return isFinite(n)?n:0; };
const _qdTol=t=>Math.max(1, Math.abs(t)*0.005);   // tolleranza: 1 € o mezzo punto percentuale

async function _qdCaricaGest(){
  if(typeof _fattureCarica==='function') await _fattureCarica();
  const r=await fetch(SUPABASE_URL+'/rest/v1/fatture_acquisto?select=*',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},cache:'no-cache'});
  if(!r.ok) throw new Error('fatture fornitori HTTP '+r.status);
  const fa=await r.json();
  try{ _faRows=fa; if(typeof _fffRows!=='undefined') _fffRows=fa; }catch(e){}
  return { fatt:(typeof _fatture!=='undefined'&&Array.isArray(_fatture))?_fatture:[], fa:Array.isArray(fa)?fa:[] };
}

// Movimenti di banca attribuiti a ciascuna fattura Genya
function _qdMovPerFattura(mov,R){
  const out={};
  (mov||[]).forEach(m=>{ const info=R.movInfo&&R.movInfo[m.chiave]; if(!info) return;
    info.fatt.forEach(a=>{ (out[a.f.id]=out[a.f.id]||[]).push({data:m.data, imp:_qdN(a.imp), tipo:info.tipo, chiave:m.chiave, testo:((m.operazione||'')+' '+(m.dettagli||'')).trim()}); }); });
  return out;
}

// Abbinamento documento Genya ↔ gestionale
function _qdNumAnnoEmessa(g){
  const n=String(g.numero||'').trim(); const m=n.match(/^\s*(\d+)/); if(!m) return null;
  const y=(n.match(/\/\s*(\d{4})/)||[])[1] || (g.data_fattura?String(g.data_fattura).slice(0,4):'');
  return m[1].replace(/^0+(?=\d)/,'')+'|'+y;
}
function _qdNumAnnoRicevuta(a){ const m=String(a.numero||'').match(/^(\d{4})\/(\d+)$/); return m?(m[2]+'|'+m[1]):null; }

function _qdStatoGestCli(g){
  if(!g) return {k:'assente',t:'—'};
  if(g.stato==='annullata') return {k:'annullata',t:'annullata'};
  const acc=(Array.isArray(g.acconti)?g.acconti:[]).reduce((s,a)=>s+_qdN(a&&a.importo),0);
  if(g.stato==='pagata') return {k:'pagata',t:'pagata'+(g.data_pagamento?' il '+_qdData(g.data_pagamento):''),incassato:_qdN(g.importo)};
  if(acc>0.009) return {k:'parziale',t:'acconti '+_qdEur(acc),incassato:acc};
  return {k:'aperta',t:g.stato==='da_emettere'?'da emettere':'da incassare',incassato:0};
}
function _qdStatoGestForn(a){
  if(!a) return {k:'assente',t:'—'};
  const s=a.stato_verificato||'';
  if(s==='doppione') return {k:'doppione',t:'segnata doppione'};
  if(s==='pagata_confermata') return {k:'pagata',t:'pagata',incassato:_qdN(a.importo)};
  if(s==='parziale'){ const res=_qdN(a.residuo); return {k:'parziale',t:'parziale (residuo '+_qdEur(res)+')',incassato:Math.max(0,_qdN(a.importo)-res)}; }
  if(s==='probabile_pagata_da_confermare') return {k:'aperta',t:'probabile pagata, da confermare',incassato:0};
  return {k:'aperta',t:s==='da_verificare'?'da verificare':'da pagare',incassato:0};
}

// Calcolo di tutte le righe della quadratura per il lato scelto
function qdCalcola(){
  const D=QD.dati; if(!D) return [];
  const cli=QD.lato==='cli';
  const docs=D.rows.filter(f=>f.tipo===(cli?'emessa':'ricevuta'));
  const movF=_qdMovPerFattura(D.mov,D.R);
  // indice gestionale
  const idx={};
  if(cli) D.fatt.filter(g=>g.tipo!=='nota di credito').forEach(g=>{ const k=_qdNumAnnoEmessa(g); if(k) (idx[k]=idx[k]||[]).push(g); });
  else D.fa.forEach(a=>{ const k=_qdNumAnnoRicevuta(a); if(k) (idx[k]=idx[k]||[]).push(a); });
  return docs.map(f=>{
    const tot=_qdN(f.totale);
    const k=cli ? (String(f.numero||'').replace(/^0+(?=\d)/,'')+'|'+(f.anno||'')) : (String(f.numero_protocollo||'')+'|'+(f.anno||''));
    const cands=idx[k]||[];
    const g=cands.slice().sort((a,b)=>Math.abs(_qdN(a.importo)-tot)-Math.abs(_qdN(b.importo)-tot))[0]||null;
    const st=cli?_qdStatoGestCli(g):_qdStatoGestForn(g);
    const movs=movF[f.id]||[]; const banca=movs.reduce((s,m)=>s+m.imp,0);
    const bancaPag=banca>=tot-_qdTol(tot), bancaParz=banca>0.009&&!bancaPag;
    let esito, eTesto, eClasse;
    if(!g){ esito='manca'; eTesto='manca nel gestionale'; eClasse='bad'; }
    else if(st.k==='annullata'||st.k==='doppione'){ esito='ok'; eTesto=st.k==='annullata'?'annullata nel gestionale':'doppione nel gestionale'; eClasse='neu'; }
    else if(Math.abs(_qdN(g.importo)-tot)>_qdTol(tot)){ esito='importo'; eTesto='importo diverso ('+_qdEur(_qdN(g.importo)-tot)+')'; eClasse='warn'; }
    else if((bancaPag||bancaParz) && (st.k==='aperta' || (st.k==='parziale' && banca>(st.incassato||0)+0.5))){ esito='pagamento'; eTesto=bancaPag?'pagata in banca, aperta nel gestionale':'acconto in banca non registrato'; eClasse='warn'; }
    else if(st.k==='pagata' && !movs.length){ esito='senzabanca'; eTesto='pagata, ma movimento non trovato in banca'; eClasse='neu'; }
    else { esito='ok'; eTesto=st.k==='pagata'?'pagata · tutto torna':(st.k==='parziale'?'acconti · tutto torna':'aperta · tutto torna'); eClasse='ok'; }
    return { f, g, st, movs, banca, tot, esito, eTesto, eClasse,
      cerca:((f.numero||'')+' '+(f.numero_protocollo||'')+' '+(f.controparte_nome||'')+' '+(f.oggetto||'')).toLowerCase() };
  }).sort((a,b)=>String(b.f.data_fattura||'').localeCompare(String(a.f.data_fattura||'')));
}

/* ── disegno ── */
async function quadApri(ricarica){
  const box=document.getElementById('qd-corpo'); if(box && (!QD.dati||ricarica)) box.innerHTML='<div class="qd-vuoto">Carico fatture, banca e gestionale…</div>';
  try{
    if(!QD.dati || ricarica){
      const [F,G]=await Promise.all([fiscoQuadDati(!!ricarica), _qdCaricaGest()]);
      QD.dati={rows:F.rows, mov:F.mov, R:F.R, fatt:G.fatt, fa:G.fa};
    }
    // anni disponibili
    const sel=document.getElementById('qd-anno');
    if(sel && !sel.options.length){ const anni=[...new Set(QD.dati.rows.map(f=>f.anno).filter(Boolean))].sort().reverse();
      sel.innerHTML='<option value="">Tutti gli anni</option>'+anni.map(a=>`<option value="${a}">${a}</option>`).join(''); }
    quadRender();
  }catch(e){ if(box) box.innerHTML='<div class="qd-vuoto">⚠ Non riesco a caricare i dati: '+_qdEsc(e.message||e)+'</div>'; }
}
function quadLato(l){ QD.lato=l; document.querySelectorAll('[data-qd-lato]').forEach(b=>b.classList.toggle('on',b.dataset.qdLato===l)); quadRender(); }
function quadFiltra(f){ QD.flt=f; quadRender(); }

function quadRender(){
  const box=document.getElementById('qd-corpo'), tot=document.getElementById('qd-tot'); if(!box||!QD.dati) return;
  QD.q=(document.getElementById('qd-q')||{}).value||''; QD.anno=(document.getElementById('qd-anno')||{}).value||'';
  let tutte=qdCalcola(); if(QD.anno) tutte=tutte.filter(r=>String(r.f.anno)===String(QD.anno));
  QD.righe=tutte;
  const conta=k=>tutte.filter(r=>r.esito===k), somma=a=>a.reduce((s,r)=>s+r.tot,0);
  const manca=conta('manca'), pag=conta('pagamento'), imp=conta('importo'), senza=conta('senzabanca'), ok=conta('ok');
  const daFare=manca.length+pag.length+imp.length;
  const cella=(k,tit,arr,sub,warn)=>`<button class="${QD.flt===k?'on':''} ${warn&&arr.length?'warn':''}" onclick="quadFiltra('${k}')"><small>${tit}</small><span class="num">${arr.length}</span><span class="sub">${sub}</span></button>`;
  if(tot) tot.innerHTML=
    `<button class="${QD.flt==='da_fare'?'on':''} ${daFare?'warn':''}" onclick="quadFiltra('da_fare')"><small>Da sistemare</small><span class="num">${daFare}</span><span class="sub">su ${tutte.length} documenti</span></button>`+
    cella('manca','Mancano nel gestionale',manca,_qdEur(somma(manca)),true)+
    cella('pagamento',QD.lato==='cli'?'Incassate in banca, aperte':'Pagate in banca, aperte',pag,_qdEur(pag.reduce((s,r)=>s+r.banca,0))+' visti in banca',true)+
    cella('importo','Importo diverso',imp,'da controllare a mano',true)+
    cella('ok','Tutto torna',ok,senza.length?senza.length+' pagate senza movimento in banca':'documento, importo e pagamento');
  let rows = QD.flt==='da_fare' ? tutte.filter(r=>['manca','pagamento','importo'].includes(r.esito))
           : QD.flt==='ok' ? tutte.filter(r=>r.esito==='ok'||r.esito==='senzabanca') : tutte.filter(r=>r.esito===QD.flt);
  const q=QD.q.trim().toLowerCase(); if(q) rows=rows.filter(r=>r.cerca.includes(q));
  const cli=QD.lato==='cli';
  const intest=`<div class="qd-pan-h"><span><b>${rows.length}</b> documenti${q?' · ricerca «'+_qdEsc(q)+'»':''}</span>
    <span style="display:flex;gap:6px;flex-wrap:wrap">
      ${(QD.flt==='manca'||QD.flt==='da_fare')&&manca.length?`<button class="bs" style="font-size:12px;padding:5px 11px" onclick="quadAggiungiTutte()">+ Aggiungi tutte le mancanti (${manca.length})</button>`:''}
      ${(QD.flt==='pagamento'||QD.flt==='da_fare')&&pag.length?`<button class="bs" style="font-size:12px;padding:5px 11px" onclick="quadPagamentiTutti()">✓ Registra i pagamenti certi (${pag.filter(_qdCerto).length})</button>`:''}
    </span></div>`;
  if(!rows.length){ box.innerHTML=`<div class="qd-pan">${intest}<div class="qd-vuoto">${QD.flt==='da_fare'?'Niente da sistemare: Genya, banca e gestionale tornano. ✓':'Nessun documento in questo gruppo.'}</div></div>`; return; }
  box.innerHTML=`<div class="qd-pan">${intest}<div class="qd-tw"><table class="qd-t"><thead><tr>
      <th>Data</th><th>Documento</th><th>${cli?'Cliente':'Fornitore'}</th><th class="r">Totale Genya</th>
      <th>Nel gestionale</th><th class="r">${cli?'Incassato':'Pagato'} in banca</th><th>Esito</th><th></th></tr></thead><tbody>
    ${rows.slice(0,800).map(r=>{
      const f=r.f, g=r.g;
      const numDoc=cli?(f.numero+'/'+f.anno+(f.suffisso?String(f.suffisso).trim():'')):(f.numero||'');
      const gest=g?`<div class="num">${_qdEur(g.importo)}</div><div class="qd-sub">${_qdEsc(r.st.t)}</div>`:'<span class="qd-sub">—</span>';
      const mv=r.movs.length?`<div class="num">${_qdEur(r.banca)}</div><div class="qd-mov">${r.movs.slice(0,3).map(m=>_qdData(m.data)+' '+({num:'🔗',nome:'≈',manuale:'📌'}[m.tipo]||'')).join(' · ')}${r.movs.length>3?' …':''}</div>`:'<span class="qd-sub">—</span>';
      const az=[];
      if(r.esito==='manca') az.push(`<button class="bs" onclick="quadAggiungi('${f.id}')">+ Aggiungi al gestionale</button>`);
      if(r.esito==='pagamento') az.push(`<button class="bp" onclick="quadRegistra('${f.id}')">✓ Registra ${cli?'incasso':'pagamento'}</button>`);
      if(r.esito==='importo') az.push(`<button class="bs" onclick="quadApriGest('${f.id}')">Apri nel gestionale</button>`);
      return `<tr>
        <td class="num" style="white-space:nowrap">${_qdData(f.data_fattura)}</td>
        <td><div class="num">${_qdEsc(numDoc)}</div>${!cli&&f.numero_protocollo?`<div class="qd-sub">prot. ${_qdEsc(f.numero_protocollo)}</div>`:''}</td>
        <td><div>${_qdEsc(f.controparte_nome||'—')}</div><div class="qd-sub" title="${_qdEsc(f.oggetto||'')}">${_qdEsc(String(f.oggetto||'').slice(0,60))}</div></td>
        <td class="r num">${_qdEur(r.tot)}</td>
        <td>${gest}</td>
        <td class="r">${mv}</td>
        <td><span class="qd-b ${r.eClasse}">${_qdEsc(r.eTesto)}</span></td>
        <td><div class="qd-az">${az.join('')}</div></td></tr>`; }).join('')}
    </tbody></table></div>${rows.length>800?'<div class="qd-vuoto">Mostrati i primi 800: usa la ricerca o l\'anno per restringere.</div>':''}</div>`;
}

/* ── azioni (scrivono nelle tabelle del gestionale) ── */
const _qdH=()=>({apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=representation'});
const _qdRiga=id=>(QD.righe||[]).find(r=>String(r.f.id)===String(id)) || qdCalcola().find(r=>String(r.f.id)===String(id));
// pagamento "certo": tutti i movimenti abbinati per numero di fattura o a mano (non solo per nome)
const _qdCerto=r=>r.esito==='pagamento' && r.movs.length && r.movs.every(m=>m.tipo==='num'||m.tipo==='manuale');

function _qdNuovoGest(r){
  const f=r.f;
  if(QD.lato==='cli') return { numero:f.numero+'/'+f.anno, data_fattura:f.data_fattura||null, cliente:f.controparte_nome||null,
    descrizione:f.oggetto?String(f.oggetto).slice(0,300):null, importo:_qdN(f.totale), tipo:'unica', stato:'emessa',
    scadenza:f.data_scadenza||null, note:'Aggiunta dalla Quadratura (Genya)', acconti:[], aggiornato_il:new Date().toISOString() };
  return { numero:f.anno+'/'+f.numero_protocollo, rif_fornitore:f.numero||null, fornitore:f.controparte_nome||'—',
    data_fattura:f.data_fattura||null, importo:_qdN(f.totale), stato_verificato:'aperta', residuo:_qdN(f.totale),
    note:'Aggiunta dalla Quadratura (Genya)', aggiornato_il:new Date().toISOString() };
}
async function _qdInserisci(r){
  const tab=QD.lato==='cli'?'fatture':'fatture_acquisto';
  const res=await fetch(SUPABASE_URL+'/rest/v1/'+tab,{method:'POST',headers:_qdH(),body:JSON.stringify(_qdNuovoGest(r))});
  if(!res.ok){ let t=''; try{ t=(await res.json()).message||''; }catch(e){} throw new Error('HTTP '+res.status+(t?' – '+t:'')); }
  const row=(await res.json())[0];
  if(QD.lato==='cli') QD.dati.fatt.push(row); else QD.dati.fa.push(row);
  return row;
}
async function quadAggiungi(id){
  const r=_qdRiga(id); if(!r||r.esito!=='manca') return;
  if(QD.lato==='fornitori'||QD.lato==='forn'){ if(!r.f.numero_protocollo){ toast('⚠ Manca il numero di protocollo Genya'); return; } }
  try{ await _qdInserisci(r); toast('✓ Aggiunta in '+(QD.lato==='cli'?'Fatture e scadenze':'Fatture fornitori')); _qdDopo(); quadRender(); }
  catch(e){ toast('⚠ Non aggiunta: '+(e.message||e)); }
}
async function quadAggiungiTutte(){
  const arr=(QD.righe||[]).filter(r=>r.esito==='manca' && (QD.lato==='cli'||r.f.numero_protocollo));
  if(!arr.length) return;
  if(!confirm('Aggiungere '+arr.length+' documenti di Genya a '+(QD.lato==='cli'?'Clienti → Fatture e scadenze':'Fornitori → Fatture fornitori')+'?\n\nEntrano come '+(QD.lato==='cli'?'"da incassare"':'"da pagare"')+'; i pagamenti visti in banca si registrano dopo, dal gruppo "'+(QD.lato==='cli'?'Incassate':'Pagate')+' in banca, aperte".')) return;
  let n=0, err=0; for(const r of arr){ try{ await _qdInserisci(r); n++; }catch(e){ err++; } }
  toast('✓ Aggiunte '+n+(err?' · ⚠ '+err+' non riuscite':'')); _qdDopo(); quadRender();
}

// Registra nel gestionale il pagamento visto in banca
async function _qdScriviPagamento(r){
  const cli=QD.lato==='cli', g=r.g, tot=_qdN(g.importo);
  if(cli){
    const acc=Array.isArray(g.acconti)?g.acconti.slice():[];
    const gia=new Set(acc.map(a=>a&&a.mov).filter(Boolean));
    r.movs.forEach(m=>{ if(!gia.has(m.chiave)) acc.push({data:m.data, importo:Math.round(m.imp*100)/100, metodo:'bonifico', nota:'da banca (Quadratura): '+m.testo.slice(0,80), mov:m.chiave}); });
    // se prima non c'erano acconti e la banca copre tutto, basta "pagata" (gli acconti restano come traccia)
    const somma=acc.reduce((s,a)=>s+_qdN(a&&a.importo),0);
    const body={acconti:acc, aggiornato_il:new Date().toISOString()};
    if(somma>=tot-_qdTol(tot)){ body.stato='pagata'; body.data_pagamento=r.movs.map(m=>m.data).sort().pop()||null; }
    const res=await fetch(SUPABASE_URL+'/rest/v1/fatture?id=eq.'+encodeURIComponent(g.id),{method:'PATCH',headers:_qdH(),body:JSON.stringify(body)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    Object.assign(g,body);
  } else {
    const pagato=r.banca, res0=Math.max(0, Math.round((tot-pagato)*100)/100);
    const body= res0<=_qdTol(tot)
      ? {stato_verificato:'pagata_confermata', stato_smart:'Pagata', residuo:0, fonte_conferma:'banca (Quadratura) '+r.movs.map(m=>_qdData(m.data)).join(', '), aggiornato_il:new Date().toISOString()}
      : {stato_verificato:'parziale', residuo:res0, fonte_conferma:'banca (Quadratura) '+r.movs.map(m=>_qdData(m.data)).join(', '), aggiornato_il:new Date().toISOString()};
    const res=await fetch(SUPABASE_URL+'/rest/v1/fatture_acquisto?id=eq.'+encodeURIComponent(g.id),{method:'PATCH',headers:_qdH(),body:JSON.stringify(body)});
    if(!res.ok) throw new Error('HTTP '+res.status);
    Object.assign(g,body);
  }
}
async function quadRegistra(id){
  const r=_qdRiga(id); if(!r||r.esito!=='pagamento') return;
  const cli=QD.lato==='cli';
  const elenco=r.movs.map(m=>'• '+_qdData(m.data)+'  '+_qdEur(m.imp)+'  '+({num:'(abbinato per numero)',nome:'(abbinato per nome e importo — controlla)',manuale:'(abbinato a mano)'}[m.tipo]||'')).join('\n');
  if(!confirm((cli?'Registrare l\'incasso':'Registrare il pagamento')+' della fattura '+(r.f.numero||'')+' di '+(r.f.controparte_nome||'')+'?\n\nMovimenti in banca:\n'+elenco+'\n\nTotale '+_qdEur(r.banca)+' su '+_qdEur(r.g.importo)+'.')) return;
  try{ await _qdScriviPagamento(r); toast('✓ Registrato in '+(cli?'Fatture e scadenze':'Fatture fornitori')); _qdDopo(); quadRender(); }
  catch(e){ toast('⚠ Non registrato: '+(e.message||e)); }
}
async function quadPagamentiTutti(){
  const arr=(QD.righe||[]).filter(_qdCerto);
  if(!arr.length){ toast('Nessun pagamento certo da registrare: quelli abbinati solo per nome vanno confermati uno a uno'); return; }
  if(!confirm('Registrare '+arr.length+' '+(QD.lato==='cli'?'incassi':'pagamenti')+' visti in banca?\n\nSolo quelli abbinati per numero di fattura o a mano. Quelli abbinati solo per nome e importo restano da confermare uno a uno.')) return;
  let n=0, err=0; for(const r of arr){ try{ await _qdScriviPagamento(r); n++; }catch(e){ err++; } }
  toast('✓ Registrati '+n+(err?' · ⚠ '+err+' non riusciti':'')); _qdDopo(); quadRender();
}
function quadApriGest(id){
  const r=_qdRiga(id); if(!r||!r.g) return;
  if(QD.lato==='cli'){ if(typeof menuApri==='function') menuApri('fatture'); else nav('fatture'); if(typeof renderFatture==='function') renderFatture(); }
  else { if(typeof menuApri==='function') menuApri('fatture-fornitori'); else nav('fatture-fornitori'); }
  toast('Cerca la fattura '+(r.g.numero||'')+' — Genya: '+_qdEur(r.tot)+', gestionale: '+_qdEur(r.g.importo));
}
// dopo una scrittura: i calcoli del gestionale (posizioni, cruscotto, commesse) si rifanno
function _qdDopo(){ try{ if(typeof invalidaCache==='function') invalidaCache(); }catch(e){} }

/* ═══════════════════════════════════════════════════════════════════════
   PAGAMENTI DALLA BANCA PER CONTROPARTE — riuso del motore Quadratura dentro
   le schede Clienti e Fornitori. Solo lettura (nessuna scrittura).
   Risponde a: "i pagamenti che vedo in Fisco/Banca non compaiono nella
   scheda cliente/fornitore". Qui li mostriamo, raggruppati per controparte.
   ═══════════════════════════════════════════════════════════════════════ */
// Carica (una volta, poi in cache) i dati che servono: fatture Genya, banca, gestionale.
async function _bncDati(force){
  if(!QD.dati || force){
    const [F,G]=await Promise.all([fiscoQuadDati(!!force), _qdCaricaGest()]);
    QD.dati={rows:F.rows, mov:F.mov, R:F.R, fatt:G.fatt, fa:G.fa};
  }
  return QD.dati;
}
// Normalizza una ragione sociale (tolgo accenti, punteggiatura e forme giuridiche) — autonomo,
// perché _cNorm/_bNomeMatch sono privati dentro l'IIFE di fisco.js.
function _bncNorm(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(s r l s|s r l|srls|srl|s p a|spa|s n c|snc|s a s|sas|s c a r l|scarl|societa|soc|coop)\b/g,' ')
    .replace(/\s+/g,' ').trim();
}
function _bncMatch(a,b){ a=_bncNorm(a); b=_bncNorm(b); if(!a||!b) return false; return a===b; }
// Righe della Quadratura filtrate su una controparte (per nome normalizzato). lato: 'cli' | 'forn'.
function _bncRighe(nome, lato){
  if(!QD.dati) return [];
  const prev=QD.lato; QD.lato=(lato==='cli')?'cli':'forn';
  let out=[];
  try{ out=qdCalcola().filter(r=>_bncMatch(r.f.controparte_nome, nome)); }catch(e){ out=[]; }
  QD.lato=prev;
  return out;
}
// Riepilogo banca per una controparte: movimenti abbinati a fatture, movimenti "da spiegare",
// e fatture che risultano pagate/incassate in banca ma ancora aperte nel gestionale.
function _bncScheda(nome, lato){
  const vuoto={attr:[], daSpiegare:[], pagateAperte:[], totAttr:0, totSpiegare:0};
  if(!QD.dati) return vuoto;
  const segno=(lato==='cli')?'entrata':'uscita';
  const righe=_bncRighe(nome, lato);
  const R=QD.dati.R||{movInfo:{}}, mov=QD.dati.mov||[];
  const attr=[]; const chiaviAttr=new Set();
  righe.forEach(r=>(r.movs||[]).forEach(m=>{ attr.push({data:m.data, imp:+m.imp||0, tipo:m.tipo, fnum:r.f.numero, fanno:r.f.anno}); chiaviAttr.add(m.chiave); }));
  const daSpiegare=[];
  mov.forEach(m=>{
    if(m.segno!==segno) return;
    if(chiaviAttr.has(m.chiave)) return;
    if(R.movInfo && R.movInfo[m.chiave]) return;           // già abbinato ad altra controparte
    const cp=m.controparte_estratta||'';
    if(!cp || !_bncMatch(cp,nome)) return;
    daSpiegare.push({data:m.data, imp:+m.importo||0, testo:((m.operazione||'')+' '+(m.dettagli||'')).trim()});
  });
  const pagateAperte=righe.filter(r=>r.esito==='pagamento');
  return { attr, daSpiegare, pagateAperte,
    totAttr:attr.reduce((s,m)=>s+m.imp,0), totSpiegare:daSpiegare.reduce((s,m)=>s+m.imp,0) };
}
// HTML del blocco "Pagamenti dalla banca" — stile proprio, uguale nelle due schede.
function _bncHTML(nome, lato){
  const S=_bncScheda(nome, lato), cli=(lato==='cli');
  const eur=v=>(typeof _qdEur==='function')?_qdEur(v):('€ '+(Math.round((+v||0)*100)/100).toLocaleString('it-IT'));
  const dat=s=>(typeof _qdData==='function')?_qdData(s):String(s||'');
  const E=(typeof esc==='function')?esc:(s=>String(s==null?'':s));
  const t2='var(--text2)', brd='var(--brd)', warn='var(--gold,#c07d16)', ok='var(--green,#2f7d4f)';
  const tagTipo={num:'🔗 per numero',nome:'≈ per nome',manuale:'📌 a mano'};
  const invLbl=(num,anno)=>{ const s=String(num||''); return s+((anno && !/\//.test(s))?'/'+anno:''); };
  let h='<div style="display:flex;flex-direction:column;gap:14px">';
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap">'
    +'<div style="flex:1;min-width:130px;border:1px solid '+brd+';border-radius:10px;padding:10px 12px"><small style="color:'+t2+';font-size:11px;letter-spacing:.05em;text-transform:uppercase">'+(cli?'Incassato':'Pagato')+' in banca</small><div class="num" style="font-size:18px;font-weight:600">'+eur(S.totAttr+S.totSpiegare)+'</div></div>'
    +'<div style="flex:1;min-width:130px;border:1px solid '+brd+';border-radius:10px;padding:10px 12px"><small style="color:'+t2+';font-size:11px;letter-spacing:.05em;text-transform:uppercase">Non abbinato a fattura</small><div class="num" style="font-size:18px;font-weight:600;'+(S.totSpiegare>0.5?'color:'+warn:'')+'">'+eur(S.totSpiegare)+'</div></div>'
  +'</div>';
  if(S.pagateAperte.length){
    const n=S.pagateAperte.length;
    const verbo=cli?(n===1?'incassata':'incassate'):(n===1?'pagata':'pagate');
    h+='<div style="border:1px solid '+warn+';background:color-mix(in srgb,'+warn+' 10%,transparent);border-radius:10px;padding:10px 12px">'
      +'<b style="font-size:13px;color:'+warn+'">⚠ '+n+' fattur'+(n===1?'a':'e')+' '+verbo+' in banca ma apert'+(n===1?'a':'e')+' nel gestionale</b>'
      +'<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px">'
      +S.pagateAperte.map(r=>'<div style="font-size:12.5px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span>Fatt. '+E(invLbl(r.f.numero,r.f.anno))+' · <span style="color:'+t2+'">banca '+eur(r.banca)+' su '+eur(r.tot)+'</span></span>'
        +'<button onclick="_bncRegistra(\''+E(String(r.f.id))+'\',\''+lato+'\')" style="font-size:11.5px;padding:3px 10px;border:1px solid '+warn+';background:var(--card);color:'+warn+';border-radius:7px;cursor:pointer;white-space:nowrap">✓ Registra '+(cli?'incasso':'pagamento')+'</button></div>').join('')
      +'</div><div style="font-size:11.5px;color:'+t2+';margin-top:6px">Registra col pulsante «✓ Registra '+(cli?'incasso':'pagamento')+'» qui sopra, oppure da <b>Fisco e documenti → Quadratura</b>.</div></div>';
  }
  h+='<div><div style="font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:'+t2+';font-weight:600;margin-bottom:6px">Movimenti abbinati a fatture</div>';
  h+=S.attr.length
    ? '<div style="border:1px solid '+brd+';border-radius:10px;overflow:hidden">'+S.attr.slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(m=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid '+brd+';font-size:13px"><span>'+dat(m.data)+' · <span style="color:'+t2+'">Fatt. '+E(invLbl(m.fnum,m.fanno))+'</span> <span style="font-size:11px;color:'+t2+'">'+(tagTipo[m.tipo]||'')+'</span></span><span class="num" style="color:'+ok+'">'+eur(m.imp)+'</span></div>').join('')+'</div>'
    : '<div style="color:'+t2+';font-size:13px;padding:6px 0">Nessun pagamento dalla banca abbinato a una fattura di questa controparte.</div>';
  h+='</div>';
  if(S.daSpiegare.length){
    h+='<div><div style="font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:'+t2+';font-weight:600;margin-bottom:6px">Movimenti della banca non abbinati</div>'
      +'<div style="border:1px solid '+brd+';border-radius:10px;overflow:hidden">'+S.daSpiegare.slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(m=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid '+brd+';font-size:13px"><span>'+dat(m.data)+' · <span style="color:'+t2+'">'+E(String(m.testo||'').slice(0,42))+'</span></span><span class="num">'+eur(m.imp)+'</span></div>').join('')+'</div>'
      +'<div style="font-size:11.5px;color:'+t2+';margin-top:6px">Risultano di questa controparte ma non legati a una fattura: si abbinano da <b>Fisco e documenti → Banca</b>.</div></div>';
  }
  h+='</div>';
  return h;
}
// Riempie il pannello "Dalla banca" di una scheda (Clienti o Fornitori), caricando i dati se serve.
// contId = id del contenitore; stillHere = funzione che dice se l'utente è ancora su questa scheda/tab.
async function _bncPann(contId, nome, lato, stillHere){
  const pn=document.getElementById(contId); if(!pn) return;
  pn.innerHTML='<div style="color:var(--text2);padding:12px">Carico i movimenti dalla banca…</div>';
  try{
    await _bncDati(false);
    if(typeof stillHere==='function' && !stillHere()) return;
    pn.innerHTML=_bncHTML(nome, lato);
  }catch(e){ pn.innerHTML='<div style="color:var(--text2);padding:12px">⚠ Non riesco a caricare i movimenti dalla banca: '+((typeof esc==='function')?esc(e.message||e):(e.message||e))+'</div>'; }
}
// Registra sul gestionale il pagamento/incasso visto in banca per una fattura (riuso _qdScriviPagamento),
// con conferma. Dopo la scrittura ricalcola e ridisegna la scheda (Clienti o Fornitori).
async function _bncRegistra(fid, lato){
  if(!QD.dati){ if(typeof toast==='function') toast('Dati banca non caricati'); return; }
  const prev=QD.lato; QD.lato=(lato==='cli')?'cli':'forn';
  let r=null;
  try{ r=qdCalcola().find(x=>String(x.f.id)===String(fid)); }catch(e){}
  if(!r || r.esito!=='pagamento' || !r.g){ QD.lato=prev; if(typeof toast==='function') toast('Nulla da registrare per questa fattura'); return; }
  const cli=(lato==='cli');
  const righe=(r.movs||[]).map(m=>'• '+_qdData(m.data)+'  '+_qdEur(m.imp)+'  '+({num:'(abbinato per numero)',nome:'(abbinato per nome e importo — controlla)',manuale:'(abbinato a mano)'}[m.tipo]||'')).join('\n');
  const ok=(typeof confirm==='function')?confirm((cli?'Registrare l\'incasso':'Registrare il pagamento')+' della fattura '+(r.f.numero||'')+' di '+(r.f.controparte_nome||'')+'?\n\nMovimenti in banca:\n'+righe+'\n\nTotale '+_qdEur(r.banca)+' su '+_qdEur(r.g.importo)+'.'):true;
  if(!ok){ QD.lato=prev; return; }
  try{
    await _qdScriviPagamento(r);
    if(typeof _qdDopo==='function') _qdDopo();
    QD.lato=prev;
    if(typeof toast==='function') toast('✓ Registrato in '+(cli?'Fatture e scadenze':'Fatture fornitori'));
    if(cli){ if(typeof cli2Calcola==='function') cli2Calcola(); if(typeof cli2Render==='function') cli2Render(); }
    else { if(typeof fo2Calcola==='function') fo2Calcola(); if(typeof fo2Render==='function') fo2Render(); }
  }catch(e){ QD.lato=prev; if(typeof toast==='function') toast('⚠ Non registrato: '+(e.message||e)); }
}
