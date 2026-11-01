/* ═══════════════════════════════════════════════════════════════════════
   PERSONALE (nuova vista) — elenco dipendenti con saldo, giornate e
   scadenze; scheda con il conto del saldo spiegato, calendario presenze,
   commesse, pagamenti e scadenze dei documenti.
   Non sostituisce nulla: Scheda dipendente, Saldi, Pagamenti, Chiusura
   settimana restano schede dell'area Personale.

   NUMERI (motori di sempre): saldo = ricalcolaSaldi() (DB.saldi);
   giornate e importi = getTurniRaw (stesso conteggio del saldo); commessa del
   turno = codice commessa se c'è, altrimenti il nome. Periodo = barra in alto.
   Script classico, stesso scope globale del Gestionale.
   ═══════════════════════════════════════════════════════════════════════ */

const PE2 = { filtro:'attivi', q:'', scelto:null, tab:'panoramica', mese:null, dati:null, tot:null };

(function pe2Stile(){
  if(document.getElementById('pe2-css')) return;
  const s=document.createElement('style'); s.id='pe2-css';
  s.textContent=`
  #pe2-root{--p2-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--p2-soft:var(--td2,rgba(154,122,31,.06));--p2-sel:var(--td,rgba(154,122,31,.13));
    --p2-ok:var(--green,#2f7d4f);--p2-bad:var(--red,#b23a2e);--p2-warn:var(--gold,#c07d16)}
  #pe2-root .num{font-family:var(--p2-mono);font-variant-numeric:tabular-nums}
  .pe2-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .pe2-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .pe2-testa p{color:var(--text2);font-size:13px;margin-top:2px}
  .pe2-tot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .pe2-tot div{background:var(--card);padding:12px 16px;min-width:0}
  .pe2-tot small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .pe2-tot .num{font-size:19px;font-weight:600}
  .pe2-corpo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:14px;align-items:start}
  .pe2-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;min-width:0;overflow:hidden}
  .pe2-filtri{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border-bottom:1px solid var(--brd);background:var(--p2-soft)}
  .pe2-cerca{flex:1 1 200px;min-width:0;border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 11px;font:inherit;color:var(--text)}
  .pe2-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text)}
  .pe2-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .pe2-chip .n{font-family:var(--p2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .pe2-tabw{overflow-x:auto;max-height:70vh;overflow-y:auto}
  .pe2-t{width:100%;border-collapse:collapse}
  .pe2-t th{position:sticky;top:0;z-index:1;background:var(--card);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 10px;border-bottom:1px solid var(--brd);white-space:nowrap}
  .pe2-t td{padding:9px 10px;border-bottom:1px solid var(--brd);vertical-align:middle}
  .pe2-t .r{text-align:right;white-space:nowrap}
  .pe2-t tbody tr{cursor:pointer}
  .pe2-t tbody tr:hover{background:var(--p2-soft)}
  .pe2-t tbody tr.sel{background:var(--p2-sel)}
  .pe2-chi{display:flex;align-items:center;gap:10px;min-width:180px}
  .pe2-av{width:32px;height:32px;border-radius:50%;background:var(--teal);color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex:none}
  .pe2-av.off{background:var(--brd);color:var(--text2)}
  .pe2-nome{font-weight:600}
  .pe2-sub{font-size:12px;color:var(--text2)}
  .pe2-zero{color:var(--text2);opacity:.6}
  .pe2-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
  .pe2-b.ok{color:var(--p2-ok);background:color-mix(in srgb,var(--p2-ok) 12%,transparent)}
  .pe2-b.warn{color:var(--p2-warn);background:color-mix(in srgb,var(--p2-warn) 14%,transparent)}
  .pe2-b.bad{color:var(--p2-bad);background:color-mix(in srgb,var(--p2-bad) 12%,transparent)}
  .pe2-b.neu{color:var(--text2);border-color:var(--brd)}
  .pe2-sch-testa{padding:16px 18px 0;display:flex;gap:12px;align-items:center}
  .pe2-sch-testa .pe2-av{width:44px;height:44px;font-size:15px}
  .pe2-sch-testa h3{font-size:20px;font-weight:700}
  .pe2-tabs{display:flex;gap:2px;margin-top:12px;border-bottom:1px solid var(--brd);overflow-x:auto;padding:0 18px}
  .pe2-tabs button{all:unset;cursor:pointer;padding:9px 10px;font-size:13px;color:var(--text2);border-bottom:2px solid transparent;white-space:nowrap}
  .pe2-tabs button.on{color:var(--text);border-color:var(--teal);font-weight:600}
  .pe2-tabs .n{font-family:var(--p2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .pe2-pann{padding:16px 18px 22px;display:flex;flex-direction:column;gap:16px}
  .pe2-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;margin-bottom:6px}
  .pe2-conto{border:1px solid var(--brd);border-radius:10px;overflow:hidden}
  .pe2-conto div{display:flex;justify-content:space-between;gap:12px;padding:8px 12px;border-bottom:1px solid var(--brd);font-size:13.5px}
  .pe2-conto div:last-child{border-bottom:0;background:var(--p2-soft);font-weight:700;font-size:15px}
  .pe2-conto .seg{color:var(--text2);font-family:var(--p2-mono);width:14px;display:inline-block}
  .pe2-tre{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .pe2-cifra{border:1px solid var(--brd);border-radius:10px;padding:10px 12px;background:var(--p2-soft);display:flex;flex-direction:column;gap:2px;min-width:0}
  .pe2-cifra small{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text2);font-weight:700}
  .pe2-cifra .num{font-size:17px;font-weight:600}
  .pe2-cifra .def{font-size:11.5px;color:var(--text2)}
  .pe2-righe{border:1px solid var(--brd);border-radius:10px;overflow:hidden}
  .pe2-riga{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:4px 12px;align-items:center;padding:9px 12px;border-bottom:1px solid var(--brd)}
  .pe2-riga:last-child{border-bottom:0}
  .pe2-tit{min-width:0;overflow-wrap:anywhere}
  .pe2-cod{font-family:var(--p2-mono);font-size:12px;color:var(--text2)}
  .pe2-vuoto{color:var(--text2);font-size:13px;padding:12px}
  .pe2-nota{font-size:12.5px;color:var(--text2);border-left:3px solid var(--brd);padding:2px 0 2px 10px}
  .pe2-az{display:flex;gap:8px;flex-wrap:wrap}
  .pe2-cal-testa{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
  .pe2-cal-testa button{border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:4px 10px;cursor:pointer;color:var(--text)}
  .pe2-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
  .pe2-cal .gs{font-size:10.5px;text-align:center;color:var(--text2);text-transform:uppercase;letter-spacing:.05em}
  .pe2-cal .g{border:1px solid var(--brd);border-radius:7px;min-height:52px;padding:4px 5px;display:flex;flex-direction:column;gap:1px;font-size:11px;min-width:0;overflow:hidden}
  .pe2-cal .g .d{font-size:10.5px;color:var(--text2)}
  .pe2-cal .g .i{font-family:var(--p2-mono);font-weight:600;font-size:12px}
  .pe2-cal .g .c{font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pe2-cal .g.vuoto{border-style:dashed;opacity:.55}
  .pe2-cal .g.fuori{visibility:hidden}
  .pe2-cal .g.oggi{outline:2px solid var(--teal);outline-offset:-2px}
  @media (max-width:1150px){ .pe2-corpo{grid-template-columns:minmax(0,1fr)} .pe2-tabw{max-height:none} }
  @media (max-width:760px){ .pe2-tot{grid-template-columns:repeat(2,minmax(0,1fr))} .pe2-tre{grid-template-columns:1fr} .pe2-opz{display:none} .pe2-cal .g .c{display:none} }
  `;
  document.head.appendChild(s);
})();

const _p2fm = v => (Math.round((+v||0)*100)/100).toLocaleString('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2,useGrouping:'always'});
const _p2data = s => { if(!s) return ''; const d=new Date(String(s).length===10?s+'T12:00':s); return isNaN(d)?String(s):d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'}); };
const _p2iniz = n => String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('');
const _p2oggi = () => (typeof today==='function') ? today() : new Date().toISOString().slice(0,10);
const _p2piu = (d,g) => { const x=new Date(d+'T12:00'); x.setDate(x.getDate()+g); return x.toISOString().slice(0,10); };

// Scadenze sparse nell'anagrafica (personale.anagrafica/sicurezza) e nella scheda HR (personaleHR)
function _p2Scadenze(p, hr){
  const out=[], add=(tipo,data,dett)=>{ if(data && /^\d{4}-\d{2}-\d{2}/.test(String(data))) out.push({tipo, data:String(data).slice(0,10), dett:dett||''}); };
  const a=(p&&p.anagrafica)||{}, s=(p&&p.sicurezza)||{};
  add('Documento d\'identità', a.docScadenza, a.docTipo);
  if(a.permesso && typeof a.permesso==='object') add('Permesso di soggiorno', a.permesso.scadenza, a.permesso.tipo);
  add('Tessera sanitaria', a.tesseraSanitariaScad);
  if(s.visitaMedica && typeof s.visitaMedica==='object') add('Visita medica', s.visitaMedica.scadenza, s.visitaMedica.esito);
  (Array.isArray(s.corsi)?s.corsi:[]).forEach(c=>{ if(c&&typeof c==='object') add('Corso '+(c.nome||c.tipo||''), c.scadenza||c.scad); });
  if(hr){
    add('Contratto'+(hr.contrattoTipo?' '+hr.contrattoTipo:''), hr.contrattoScad);
    (Array.isArray(hr.visite)?hr.visite:[]).forEach(v=>v&&add('Visita '+(v.tipo||''), v.scad, v.esito));
    (Array.isArray(hr.corsi)?hr.corsi:[]).forEach(c=>c&&add('Corso '+(c.nome||''), c.scad));
  }
  // la stessa scadenza da due fonti si mostra una volta
  const visti=new Set(); return out.filter(x=>{ const k=x.tipo.toLowerCase()+'|'+x.data; if(visti.has(k)) return false; visti.add(k); return true; })
    .sort((x,y)=>x.data.localeCompare(y.data));
}
function _p2StatoScad(data){
  const oggi=_p2oggi(), tra30=_p2piu(oggi,30);
  if(data<oggi) return ['Scaduto','bad'];
  if(data<=tra30) return ['Entro 30 giorni','warn'];
  return ['In regola','ok'];
}

async function rPersonale(){
  const root=document.getElementById('pe2-root'); if(!root) return;
  pe2Calcola(); pe2Render();
}

function pe2Calcola(){
  try{ if(typeof ricalcolaSaldi==='function') ricalcolaSaldi(); }catch(e){}
  const saldoDi={}; (DB.saldi||[]).forEach(s=>{ if(s&&s.dipId) saldoDi[s.dipId]=s; });
  const hrDi={}; (DB.personaleHR||[]).forEach(h=>{ if(h&&h.id) hrDi[h.id]=h; });
  const nomeDaId={}; (DB.cantieri||[]).forEach(c=>{ if(c&&c.id) nomeDaId[c.id]=c.nome; });
  const oggi=_p2oggi(), tra30=_p2piu(oggi,30);
  const dati={};
  (DB.personale||[]).forEach(p=>{
    if(!p||!p.id) return;
    const hr=hrDi[p.id]||null;
    const statoHR=hr&&hr.stato ? String(hr.stato) : '';
    const cessato = p.stato==='cessato' || statoHR==='cessato';
    const giorni={}; let gPer=0, mPer=0, gTot=0, ultimo='';
    const perComm={};
    Object.keys(DB.presenze||{}).forEach(d=>{
      if(d.length!==10) return;
      const tt=(typeof getTurniRaw==='function') ? getTurniRaw(d,p.id) : [];
      if(!tt.length) return;
      let imp=0; const comm=[];
      tt.forEach(t=>{ const i=parseFloat(t.importo||0)||0; imp+=i; const n=(t.cantiereId&&nomeDaId[t.cantiereId])||t.cantiere||'(senza commessa)';
        if(!comm.includes(n)) comm.push(n); const pc=(perComm[n]=perComm[n]||{g:0,imp:0,gPer:0,ultimo:''}); pc.imp+=i; if(d>pc.ultimo) pc.ultimo=d; });
      comm.forEach(n=>{ perComm[n].g++; if(typeof inRange!=='function'||inRange(d)) perComm[n].gPer++; });
      giorni[d]={imp, comm};
      gTot++; if(d>ultimo) ultimo=d;
      if(typeof inRange!=='function' || inRange(d)){ gPer++; mPer+=imp; }
    });
    const sc=_p2Scadenze(p,hr);
    const scadute=sc.filter(x=>x.data<oggi).length, presto=sc.filter(x=>x.data>=oggi&&x.data<=tra30).length;
    const movAnt=(DB.anticipi||[]).filter(a=>a.dipId===p.id).map(a=>({tipo:a.metodo==='Anticipo da pagamento'?'Anticipo (dal pagamento)':'Anticipo', data:a.data, imp:+a.importo||0, note:a.note||'', metodo:a.metodo||''}));
    const movPag=(DB.pagamenti||[]).filter(x=>x.dipId===p.id).map(x=>({tipo:'Pagamento', data:x.data, imp:parseFloat(x.pagato||0)||0, note:x.note||'', periodo:(x.periodoDa&&x.periodoAl)?`${_p2data(x.periodoDa)} → ${_p2data(x.periodoAl)}`:'', metodo:x.metodo||''}));
    dati[p.id]={ p, hr, cessato, statoHR, s: saldoDi[p.id]||null, giorni, gPer, mPer, gTot, ultimo, perComm, sc, scadute, presto,
                 mov: movAnt.concat(movPag).sort((a,b)=>String(b.data||'').localeCompare(String(a.data||''))) };
  });
  const v=Object.values(dati), att=v.filter(d=>!d.cessato);
  PE2.dati=dati;
  PE2.tot={ attivi:att.length, daPagare:att.reduce((s,d)=>s+Math.max(0,(d.s&&d.s.saldo)||0),0), mPer:v.reduce((s,d)=>s+d.mPer,0), gPer:v.reduce((s,d)=>s+d.gPer,0),
    conto:{ attivi:att.length, pagare:att.filter(d=>((d.s&&d.s.saldo)||0)>0.5).length, scadenze:v.filter(d=>!d.cessato&&(d.scadute||d.presto)).length, cessati:v.length-att.length } };
}

function _p2Periodo(){
  if(typeof RANGE==='undefined' || !RANGE.from || !RANGE.to) return 'tutto lo storico';
  return `${_p2data(RANGE.from)} → ${_p2data(RANGE.to)}`;
}

function pe2Render(){
  const root=document.getElementById('pe2-root'); if(!root||!PE2.dati) return;
  const T=PE2.tot;
  const F=[['attivi','Attivi',T.conto.attivi],['pagare','Da pagare',T.conto.pagare],['scadenze','Scadenze',T.conto.scadenze],['cessati','Cessati',T.conto.cessati]];
  root.innerHTML=`
    <div class="pe2-testa">
      <div><h2>Personale</h2><p>Saldo, giornate, commesse, pagamenti e scadenze di ogni persona. Periodo: <b>${_p2Periodo()}</b> (si cambia dalla barra in alto).</p></div>
    </div>
    <div class="pe2-tot">
      <div><small>Persone attive</small><span class="num">${T.attivi}</span></div>
      <div><small>Da pagare oggi</small><span class="num">${_p2fm(T.daPagare)}</span></div>
      <div><small>Giornate nel periodo</small><span class="num">${T.gPer}</span></div>
      <div><small>Maturato nel periodo</small><span class="num">${_p2fm(T.mPer)}</span></div>
    </div>
    <div class="pe2-corpo">
      <section class="pe2-pan" aria-label="Elenco personale">
        <div class="pe2-filtri">
          <input class="pe2-cerca" type="search" placeholder="Cerca per nome o ruolo" value="${esc(PE2.q)}" oninput="PE2.q=this.value;pe2Elenco()">
          <div style="display:flex;gap:6px;flex-wrap:wrap">${F.map(([k,t,n])=>`<button class="pe2-chip ${PE2.filtro===k?'on':''}" onclick="PE2.filtro='${k}';pe2Render()">${t}<span class="n">${n}</span></button>`).join('')}</div>
        </div>
        <div class="pe2-tabw"><table class="pe2-t">
          <thead><tr><th>Persona</th><th class="r pe2-opz">Giornate<br><span class="pe2-sub" style="text-transform:none;letter-spacing:0">nel periodo</span></th><th class="r">Maturato<br><span class="pe2-sub" style="text-transform:none;letter-spacing:0">nel periodo</span></th><th class="r">Saldo</th><th>Scadenze</th></tr></thead>
          <tbody id="pe2-righe"></tbody>
        </table></div>
      </section>
      <section class="pe2-pan" id="pe2-scheda" aria-label="Scheda persona"></section>
    </div>`;
  pe2Elenco(); pe2Scheda();
}

function _p2Saldo(d){
  const v=(d.s&&d.s.saldo)||0;
  if(Math.abs(v)<0.5) return '<span class="pe2-zero">in pari</span>';
  return v>0 ? `<span class="num">${_p2fm(v)}</span><div class="pe2-sub">da pagare</div>` : `<span class="num" style="color:var(--p2-warn)">${_p2fm(-v)}</span><div class="pe2-sub">anticipato in più</div>`;
}
function _p2BadgeScad(d){
  if(d.scadute) return `<span class="pe2-b bad">${d.scadute} scadut${d.scadute===1?'a':'e'}</span>`;
  if(d.presto) return `<span class="pe2-b warn">${d.presto} entro 30 gg</span>`;
  if(d.sc.length) return '<span class="pe2-b ok">In regola</span>';
  return '<span class="pe2-zero">—</span>';
}

function pe2Elenco(){
  const tb=document.getElementById('pe2-righe'); if(!tb) return;
  const q=(PE2.q||'').trim().toLowerCase();
  let v=Object.values(PE2.dati);
  if(q) v=v.filter(d=>(d.p.nome+' '+(d.p.ruolo||'')+' '+((d.hr&&d.hr.squadra)||'')).toLowerCase().includes(q));
  else {
    const f=PE2.filtro;
    if(f==='attivi') v=v.filter(d=>!d.cessato);
    if(f==='pagare') v=v.filter(d=>!d.cessato && ((d.s&&d.s.saldo)||0)>0.5);
    if(f==='scadenze') v=v.filter(d=>!d.cessato && (d.scadute||d.presto));
    if(f==='cessati') v=v.filter(d=>d.cessato);
  }
  v.sort((a,b)=>(a.cessato-b.cessato) || (b.gPer-a.gPer) || a.p.nome.localeCompare(b.p.nome));
  if(!PE2.scelto || !PE2.dati[PE2.scelto] || !v.some(d=>d.p.id===PE2.scelto)) PE2.scelto = v.length ? v[0].p.id : PE2.scelto;
  tb.innerHTML = v.length ? v.map(d=>`
    <tr class="${d.p.id===PE2.scelto?'sel':''}" data-id="${esc(d.p.id)}" onclick="pe2Apri(this.dataset.id)">
      <td><div class="pe2-chi"><span class="pe2-av ${d.cessato?'off':''}">${esc(_p2iniz(d.p.nome))}</span>
        <div><div class="pe2-nome">${esc(d.p.nome)}</div><div class="pe2-sub">${esc(d.p.ruolo||'')}${d.cessato?' · cessato':(d.statoHR&&d.statoHR!=='attivo'?' · '+esc(d.statoHR):'')}${d.ultimo?' · ultimo giorno '+_p2data(d.ultimo):''}</div></div></div></td>
      <td class="r num pe2-opz">${d.gPer||'<span class="pe2-zero">0</span>'}</td>
      <td class="r num">${d.mPer?_p2fm(d.mPer):'<span class="pe2-zero">—</span>'}</td>
      <td class="r">${_p2Saldo(d)}</td>
      <td>${_p2BadgeScad(d)}</td></tr>`).join('')
    : `<tr><td colspan="5" class="pe2-vuoto">${q?'Nessuno corrisponde alla ricerca.':'Nessuno in questa vista.'}</td></tr>`;
}

function pe2Apri(id){ PE2.scelto=id; PE2.mese=null; document.querySelectorAll('#pe2-righe tr').forEach(tr=>tr.classList.toggle('sel', tr.dataset.id===id)); pe2Scheda();
  const el=document.getElementById('pe2-scheda'); if(el && window.innerWidth<1150) el.scrollIntoView({behavior:'smooth',block:'start'}); }
function pe2Tab(t){ PE2.tab=t; pe2Scheda(); }
function pe2Mese(delta){ const m=PE2.mese||_p2oggi().slice(0,7); const x=new Date(m+'-15T12:00'); x.setMonth(x.getMonth()+delta); PE2.mese=x.toISOString().slice(0,7); pe2Scheda(); }
function pe2ApriScheda(id){
  if(typeof menuApri==='function') menuApri('scheda-dip'); else nav('scheda-dip');
  const sel=document.getElementById('sd-sel'); if(sel){ sel.value=id; if(typeof loadSchedaDip==='function') loadSchedaDip(); }
}

function pe2Scheda(){
  const el=document.getElementById('pe2-scheda'); if(!el) return;
  const d=PE2.scelto && PE2.dati[PE2.scelto];
  if(!d){ el.innerHTML='<div class="pe2-vuoto">Scegli una persona dall\'elenco.</div>'; return; }
  const p=d.p, s=d.s||{maturato:0,apertura:0,anticipi:0,pagamenti:0,scalature:0,addebiti:0,saldo:0};
  const nComm=Object.keys(d.perComm).length;
  const TABS=[['panoramica','Panoramica',''],['presenze','Presenze',d.gTot||''],['commesse','Commesse',nComm||''],['pagamenti','Pagamenti',d.mov.length||''],['scadenze','Scadenze',d.sc.length||'']];
  el.innerHTML=`
    <div class="pe2-sch-testa"><span class="pe2-av ${d.cessato?'off':''}">${esc(_p2iniz(p.nome))}</span>
      <div><h3>${esc(p.nome)}</h3><div class="pe2-sub">${esc(p.ruolo||'')}${d.hr&&d.hr.squadra?' · squadra '+esc(d.hr.squadra):''}${d.hr&&d.hr.assunzione?' · assunto il '+_p2data(d.hr.assunzione):''}${d.cessato?' · <b>cessato</b>':''}</div></div></div>
    <div class="pe2-tabs" role="tablist">${TABS.map(([k,t,n])=>`<button role="tab" class="${PE2.tab===k?'on':''}" onclick="pe2Tab('${k}')">${t}${n!==''?`<span class="n">${n}</span>`:''}</button>`).join('')}</div>
    <div class="pe2-pann" id="pe2-pann"></div>`;
  const pn=document.getElementById('pe2-pann');
  const azioni=`<div class="pe2-az"><button class="bp" data-id="${esc(p.id)}" onclick="pe2ApriScheda(this.dataset.id)">Apri scheda dipendente →</button>
      ${typeof apriEstrattoConto==='function'?`<button class="bs" data-id="${esc(p.id)}" onclick="apriEstrattoConto(this.dataset.id)">📄 Estratto conto</button>`:''}</div>`;

  if(PE2.tab==='panoramica'){
    const ult=d.mov.find(m=>m.tipo==='Pagamento'), ultA=d.mov.find(m=>m.tipo!=='Pagamento');
    const prossima=d.sc.find(x=>x.data>=_p2oggi());
    pn.innerHTML=`
      <div><div class="pe2-h">Come si arriva al saldo (tutto lo storico)</div>
        <div class="pe2-conto">
          <div><span><span class="seg"></span>Maturato con le giornate</span><span class="num">${_p2fm(s.maturato)}</span></div>
          ${Math.abs(s.apertura||0)>0.005?`<div><span><span class="seg">+</span>Apertura e rettifiche</span><span class="num">${_p2fm(s.apertura)}</span></div>`:''}
          <div><span><span class="seg">−</span>Anticipi</span><span class="num">${_p2fm(s.anticipi)}</span></div>
          <div><span><span class="seg">−</span>Pagamenti</span><span class="num">${_p2fm(s.pagamenti)}</span></div>
          ${Math.abs(s.scalature||0)>0.005?`<div><span><span class="seg">−</span>Danni già trattenuti</span><span class="num">${_p2fm(s.scalature)}</span></div>`:''}
          <div><span><span class="seg">=</span>${s.saldo>=0?'Da pagare':'Anticipato in più'}</span><span class="num">${_p2fm(Math.abs(s.saldo||0))}</span></div>
        </div>
        ${(s.addebiti||0)>0.005?`<p class="pe2-nota" style="margin-top:8px">Danni ancora da trattenere: <b class="num">${_p2fm(s.addebiti)}</b> (non sono già scalati dal saldo).</p>`:''}
      </div>
      <div class="pe2-tre">
        <div class="pe2-cifra"><small>Nel periodo</small><span class="num">${d.gPer} giornate</span><span class="def">${_p2fm(d.mPer)} maturati · ${_p2Periodo()}</span></div>
        <div class="pe2-cifra"><small>Ultimo pagamento</small><span class="num">${ult?_p2fm(ult.imp):'—'}</span><span class="def">${ult?_p2data(ult.data)+(ult.periodo?' · '+ult.periodo:''):'nessuno'}</span></div>
        <div class="pe2-cifra" style="${d.scadute?'border-color:var(--p2-bad)':''}"><small>Scadenze</small><span class="num">${d.scadute?d.scadute+(d.scadute===1?' scaduta':' scadute'):(prossima?_p2data(prossima.data):'—')}</span><span class="def">${d.scadute?'da rinnovare':(prossima?esc(prossima.tipo):'nessuna registrata')}</span></div>
      </div>
      ${ultA?`<p class="pe2-nota">Ultimo anticipo: <b class="num">${_p2fm(ultA.imp)}</b> il ${_p2data(ultA.data)}${ultA.metodo?' · '+esc(ultA.metodo):''}.</p>`:''}
      ${azioni}`;
  } else if(PE2.tab==='presenze'){
    const m=PE2.mese || (d.ultimo?d.ultimo.slice(0,7):_p2oggi().slice(0,7));
    PE2.mese=m;
    const primo=new Date(m+'-01T12:00'), off=(primo.getDay()+6)%7, nG=new Date(primo.getFullYear(), primo.getMonth()+1, 0).getDate();
    const max=Math.max(1,...Object.keys(d.giorni).filter(x=>x.startsWith(m)).map(x=>d.giorni[x].imp));
    let tot=0, n=0; const celle=[];
    for(let i=0;i<off;i++) celle.push('<div class="g fuori"></div>');
    for(let g=1; g<=nG; g++){
      const ds=m+'-'+String(g).padStart(2,'0'), x=d.giorni[ds];
      if(x){ tot+=x.imp; n++; }
      const a=x?Math.max(.12, x.imp/max*.55):0;
      celle.push(x?`<div class="g ${ds===_p2oggi()?'oggi':''}" title="${esc(x.comm.join(', '))} — ${_p2fm(x.imp)}" style="background:color-mix(in srgb,var(--teal) ${Math.round(a*100)}%,transparent)"><span class="d">${g}</span><span class="i">${_p2fm(x.imp)}</span><span class="c">${esc(x.comm[0]||'')}${x.comm.length>1?' +'+(x.comm.length-1):''}</span></div>`
                  :`<div class="g vuoto ${ds===_p2oggi()?'oggi':''}"><span class="d">${g}</span></div>`);
    }
    const nomeMese=primo.toLocaleDateString('it-IT',{month:'long',year:'numeric'});
    pn.innerHTML=`
      <div><div class="pe2-cal-testa"><button onclick="pe2Mese(-1)" aria-label="Mese precedente">◀</button><b style="text-transform:capitalize">${nomeMese}</b><button onclick="pe2Mese(1)" aria-label="Mese successivo">▶</button></div>
        <div class="pe2-cal">${['lun','mar','mer','gio','ven','sab','dom'].map(x=>`<div class="gs">${x}</div>`).join('')}${celle.join('')}</div>
        <p class="pe2-nota" style="margin-top:10px">${n} giornate · <b class="num">${_p2fm(tot)}</b> nel mese. Il colore è più intenso dove la giornata vale di più; passa sopra un giorno per vedere le commesse.</p></div>
      ${azioni}`;
  } else if(PE2.tab==='commesse'){
    const cc=Object.entries(d.perComm).sort((a,b)=>b[1].ultimo.localeCompare(a[1].ultimo));
    pn.innerHTML=`<div><div class="pe2-h">Dove ha lavorato</div>${cc.length?`<div class="pe2-righe">${cc.map(([n,x])=>`
        <div class="pe2-riga"><span class="pe2-cod">${_p2data(x.ultimo)}</span><span class="pe2-tit">${esc(n)}<div class="pe2-sub">${x.g} ${x.g===1?'giornata':'giornate'}${x.gPer&&x.gPer!==x.g?` · ${x.gPer} nel periodo`:''}</div></span><span class="num">${_p2fm(x.imp)}</span><span></span></div>`).join('')}</div>`
      :'<div class="pe2-righe"><div class="pe2-vuoto">Nessuna giornata registrata.</div></div>'}</div>
      <p class="pe2-nota">In ordine dall'ultima commessa. Importi = valore delle giornate di questa persona.</p>${azioni}`;
  } else if(PE2.tab==='pagamenti'){
    pn.innerHTML=`<div><div class="pe2-h">Anticipi e pagamenti</div>${d.mov.length?`<div class="pe2-righe">${d.mov.map(x=>`
        <div class="pe2-riga"><span class="pe2-cod">${_p2data(x.data)}</span><span class="pe2-tit">${esc(x.tipo)}${x.periodo?` <span class="pe2-sub">· ${x.periodo}</span>`:''}${x.note?`<div class="pe2-sub">${esc(x.note)}</div>`:''}</span><span class="num">${_p2fm(x.imp)}</span><span class="pe2-sub">${esc(x.metodo||'')}</span></div>`).join('')}</div>`
      :'<div class="pe2-righe"><div class="pe2-vuoto">Nessun movimento.</div></div>'}</div>
      <p class="pe2-nota">"Anticipo (dal pagamento)" è la parte di un pagamento registrata come anticipo: non si conta due volte nel saldo.</p>${azioni}`;
  } else {
    pn.innerHTML=`<div><div class="pe2-h">Scadenze di documenti, visite, corsi e contratto</div>${d.sc.length?`<div class="pe2-righe">${d.sc.map(x=>{ const st=_p2StatoScad(x.data); return `
        <div class="pe2-riga"><span class="pe2-cod">${_p2data(x.data)}</span><span class="pe2-tit">${esc(x.tipo)}${x.dett?` <span class="pe2-sub">· ${esc(x.dett)}</span>`:''}</span><span></span><span class="pe2-b ${st[1]}">${st[0]}</span></div>`; }).join('')}</div>`
      :'<div class="pe2-righe"><div class="pe2-vuoto">Nessuna scadenza registrata.</div></div>'}</div>
      <p class="pe2-nota">Le date si modificano da Anagrafica e da Documenti, come prima.</p>${azioni}`;
  }
}
