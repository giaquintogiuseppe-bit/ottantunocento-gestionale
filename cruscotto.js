/* ═══════════════════════════════════════════════════════════════════════
   CRUSCOTTO (nuova pagina d'apertura) — in una schermata: i soldi in
   sospeso, le cose che richiedono attenzione, le commesse attive e
   l'andamento degli ultimi mesi. Ogni numero porta alla vista che lo spiega.

   NESSUN CALCOLO NUOVO: riusa i calcoli delle viste Clienti (cli2Calcola),
   Commesse (cm2Calcola), Personale (pe2Calcola), Fornitori (fo2Calcola),
   che a loro volta usano i motori di sempre (_pcCompute, _pfCompute,
   ricalcolaSaldi, calcolaRicavoCantiere, _getCostiCantiere).
   Script classico, stesso scope globale del Gestionale.
   ═══════════════════════════════════════════════════════════════════════ */

const CZ = { pronto:false };

(function czStile(){
  if(document.getElementById('cz-css')) return;
  const s=document.createElement('style'); s.id='cz-css';
  s.textContent=`
  #cz-root{--z-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--z-soft:var(--td2,rgba(154,122,31,.06));
    --z-ok:var(--green,#2f7d4f);--z-bad:var(--red,#b23a2e);--z-warn:var(--gold,#c07d16);--z-blu:#3f6ea8}
  #cz-root .num{font-family:var(--z-mono);font-variant-numeric:tabular-nums}
  .cz-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:8px 16px;margin-bottom:14px}
  .cz-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .cz-testa p{color:var(--text2);font-size:13px;margin-top:2px}
  .cz-soldi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:14px}
  .cz-card{background:var(--card);border:1px solid var(--brd);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:3px;min-width:0;cursor:pointer;text-align:left;font:inherit;color:inherit}
  .cz-card:hover{border-color:var(--teal)}
  .cz-card:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
  .cz-card small{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:700}
  .cz-card .num{font-size:21px;font-weight:600}
  .cz-card .def{font-size:12px;color:var(--text2);line-height:1.35}
  .cz-card.netto{background:var(--z-soft);cursor:default}
  .cz-iva{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 6px;border-radius:99px;border:1px solid var(--brd);color:var(--text2);vertical-align:1px;white-space:nowrap;text-transform:none}
  .cz-griglia{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
  .cz-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;padding:14px 16px;min-width:0}
  .cz-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:700;margin-bottom:10px;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
  .cz-h a{font-size:12px;text-transform:none;letter-spacing:0;color:var(--teal);font-weight:600;cursor:pointer}
  .cz-att{display:flex;flex-direction:column}
  .cz-voce{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 4px;border-bottom:1px solid var(--brd);cursor:pointer;border-radius:6px}
  .cz-voce:last-child{border-bottom:0}
  .cz-voce:hover{background:var(--z-soft)}
  .cz-voce .p{width:10px;height:10px;border-radius:50%}
  .cz-voce .t{min-width:0}
  .cz-voce .t b{font-weight:600}
  .cz-voce .t div{font-size:12px;color:var(--text2)}
  .cz-voce .v{font-family:var(--z-mono);font-weight:600;white-space:nowrap}
  .cz-ok{color:var(--z-ok);font-size:13px;padding:8px 4px}
  .cz-comm{width:100%;border-collapse:collapse;font-size:13px}
  .cz-comm th{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;text-align:right;padding:5px 6px;border-bottom:1px solid var(--brd)}
  .cz-comm th:first-child,.cz-comm td:first-child{text-align:left}
  .cz-comm td{padding:7px 6px;border-bottom:1px solid var(--brd);text-align:right;white-space:nowrap}
  .cz-comm td:first-child{white-space:normal;min-width:150px}
  .cz-comm tr{cursor:pointer}.cz-comm tbody tr:hover td{background:var(--z-soft)}
  .cz-mbar{display:inline-block;width:70px;height:6px;border-radius:99px;background:var(--z-soft);border:1px solid var(--brd);overflow:hidden;vertical-align:middle;margin-right:6px}
  .cz-mbar i{display:block;height:100%}
  .cz-graf{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:8px;align-items:end;height:150px;padding-top:6px}
  .cz-col{display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end;min-width:0}
  .cz-bars{display:flex;gap:3px;align-items:flex-end;height:110px;width:100%;justify-content:center}
  .cz-bars i{display:block;width:42%;max-width:22px;border-radius:4px 4px 0 0;min-height:2px}
  .cz-col span{font-size:10.5px;color:var(--text2);white-space:nowrap}
  .cz-leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--text2);margin-top:8px}
  .cz-leg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px}
  .cz-nota{font-size:12px;color:var(--text2);margin-top:8px}
  .cz-vuoto{color:var(--text2);font-size:13px;padding:8px 0}
  @media (max-width:1250px){ .cz-soldi{grid-template-columns:repeat(3,minmax(0,1fr))} }
  @media (max-width:1050px){ .cz-griglia{grid-template-columns:minmax(0,1fr)} }
  @media (max-width:640px){ .cz-soldi{grid-template-columns:repeat(2,minmax(0,1fr))} .cz-opz{display:none} }
  `;
  document.head.appendChild(s);
})();

const _zfm = v => (Math.round(+v||0)).toLocaleString('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0,useGrouping:'always'});
const _zoggi = () => (typeof today==='function') ? today() : new Date().toISOString().slice(0,10);
const _zgg = d => d ? Math.round((new Date(_zoggi()+'T12:00') - new Date(String(d).slice(0,10)+'T12:00'))/864e5) : 0;

async function rCruscottoOggi(){
  const root=document.getElementById('cz-root'); if(!root) return;
  if(!CZ.pronto) root.innerHTML='<div class="cz-vuoto">Preparo il cruscotto…</div>';
  const passi=[()=>_fattureCarica(), ()=>caricaDocumentiRicavo(), ()=>(typeof _pcCaricaPeriodi==='function'?_pcCaricaPeriodi():null),
               ()=>(typeof _ensureFaRows==='function'?_ensureFaRows():null),
               ()=>((typeof REF==='undefined'||!REF||!REF.length)&&typeof refLoad==='function'?refLoad():null)];
  for(const p of passi){ try{ await p(); }catch(e){} }
  try{ if(typeof cli2Calcola==='function') cli2Calcola(); }catch(e){}
  try{ if(typeof cm2Calcola==='function') cm2Calcola(); }catch(e){}
  try{ if(typeof pe2Calcola==='function') pe2Calcola(); }catch(e){}
  try{ if(typeof fo2Calcola==='function') fo2Calcola(); }catch(e){}
  CZ.pronto=true;
  czRender();
}

// Vai a una vista con un filtro già scelto
function czVai(area, filtro){
  try{
    if(area==='clienti' && typeof CLI2!=='undefined'){ CLI2.filtro=filtro||'attivi'; CLI2.q=''; CLI2.gruppoSel=null; }
    if(area==='commesse' && typeof CM2!=='undefined'){ CM2.filtro=filtro||'attive'; CM2.q=''; }
    if(area==='personale' && typeof PE2!=='undefined'){ PE2.filtro=filtro||'attivi'; PE2.q=''; }
    if(area==='fornitori' && typeof FO2!=='undefined'){ FO2.filtro=filtro||'dapagare'; FO2.q=''; }
  }catch(e){}
  if(typeof menuApri==='function') menuApri(area); else nav(area);
}
function czApriCommessa(id){ if(typeof cm2ApriDa==='function') cm2ApriDa(id); else if(typeof apriDett==='function') apriDett(id); }

function _czMesi(n){ const out=[], d=new Date(_zoggi()+'T12:00'); d.setDate(1); for(let i=n-1;i>=0;i--){ const x=new Date(d); x.setMonth(d.getMonth()-i); out.push(x.toISOString().slice(0,7)); } return out; }
function _czLunedi(ds){ const x=new Date(ds+'T12:00'); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x.toISOString().slice(0,10); }

function czRender(){
  const root=document.getElementById('cz-root'); if(!root) return;
  const oggi=_zoggi();
  const C=(typeof CLI2!=='undefined'&&CLI2.tot)?CLI2.tot:null, M=(typeof CM2!=='undefined'&&CM2.tot)?CM2.tot:null;
  const P=(typeof PE2!=='undefined'&&PE2.tot)?PE2.tot:null, F=(typeof FO2!=='undefined'&&FO2.tot)?FO2.tot:null;
  const daInc=C?C.daIncassare:0, scad=C?C.scaduto:0, daFatt=C?C.daFatturare:0, forn=F?F.debito:0, dip=P?P.daPagare:0;
  const netto=daInc-forn-dip;
  // fornitori con fatture aperte da più di 90 giorni
  const fornVecchie=F?Object.values(FO2.dati).filter(d=>d.aperte.length && _zgg(d.piuVecchia)>90):[];
  const fornVecchieImp=fornVecchie.reduce((s,d)=>s+d.e.debito,0);
  // commesse
  const cm=M?Object.values(CM2.dati):[];
  const att=cm.filter(d=>!['conclusa','persa','archivio'].includes(d.cat));
  const perdita=cm.filter(d=>d.ricavo>0 && d.margine<0), senzaRic=att.filter(d=>d.ricavo<=0), daFattComm=cm.filter(d=>d.daFatt>1);
  // personale
  const pe=P?Object.values(PE2.dati).filter(d=>!d.cessato):[];
  const scadP=pe.reduce((s,d)=>s+d.scadute,0), prestoP=pe.reduce((s,d)=>s+d.presto,0);
  // preventivi in attesa di risposta
  const prevAtt=(typeof PREVENTIVI!=='undefined'?PREVENTIVI:[]).filter(x=>x && x.stato==='inviato');
  // turni senza commessa (giornate pagate ma non attribuite)
  const nomiComm=new Set((DB.cantieri||[]).map(c=>String(c.nome||'').toLowerCase().trim().replace(/\s+/g,' ')));
  const idComm=new Set((DB.cantieri||[]).map(c=>c.id));
  let turniOrfani=0, turniOrfaniImp=0;
  Object.keys(DB.presenze||{}).forEach(d=>{ if(d.length!==10) return; Object.keys(DB.presenze[d]||{}).forEach(dip=>{ (typeof getTurniRaw==='function'?getTurniRaw(d,dip):[]).forEach(t=>{
    const ok=(t.cantiereId&&idComm.has(t.cantiereId)) || nomiComm.has(String(t.cantiere||'').toLowerCase().trim().replace(/\s+/g,' '));
    if(!ok){ turniOrfani++; turniOrfaniImp+=parseFloat(t.importo||0)||0; } }); }); });

  // ── cose che richiedono attenzione (in ordine di peso) ──
  const att_=[];
  const voce=(col,tit,sub,val,onclick)=>att_.push({col,tit,sub,val,onclick});
  const nScad=C?C.conto.scaduti:0;
  if(scad>1) voce('var(--z-bad)', 'Pagamenti dei clienti scaduti', `${nScad} ${nScad===1?'cliente':'clienti'} · fatture oltre la scadenza`, _zfm(scad), "czVai('clienti','scaduti')");
  if(daFattComm.length) voce('var(--z-warn)', 'Commesse da fatturare', `${daFattComm.length===1?'1 commessa':daFattComm.length+' commesse'} con lavoro non ancora in fattura (imponibile)`, _zfm(daFatt), "czVai('commesse','fatturare')");
  if(fornVecchie.length) voce('var(--z-bad)', 'Fornitori con fatture aperte da più di 90 giorni', `${fornVecchie.length===1?'1 fornitore':fornVecchie.length+' fornitori'}`, _zfm(fornVecchieImp), "czVai('fornitori','vecchie')");
  if(perdita.length) voce('var(--z-bad)', 'Commesse in perdita', perdita.slice(0,3).map(d=>esc(d.c.nome)).join(', ')+(perdita.length>3?'…':''), String(perdita.length), "czVai('commesse','perdita')");
  if(scadP) voce('var(--z-bad)', 'Documenti del personale scaduti', 'permessi, documenti, visite, corsi o contratti', String(scadP), "czVai('personale','scadenze')");
  if(prestoP) voce('var(--z-warn)', 'Documenti del personale in scadenza entro 30 giorni', '', String(prestoP), "czVai('personale','scadenze')");
  if(senzaRic.length) voce('var(--z-warn)', 'Commesse attive senza ricavo', 'manca il preventivo accettato o il consuntivo', String(senzaRic.length), "czVai('commesse','senza')");
  if(prevAtt.length) voce('var(--z-blu)', 'Preventivi inviati in attesa di risposta', prevAtt.slice(0,3).map(x=>esc(x.numero||'')).join(', ')+(prevAtt.length>3?'…':''), String(prevAtt.length), "czVai('clienti','attivi')");
  if(turniOrfani) voce('var(--text2)', 'Giornate senza commessa', 'il loro costo non entra in nessun margine', `${turniOrfani} · ${_zfm(turniOrfaniImp)}`, "czVai('personale','attivi')");

  // ── commesse attive: le più grandi ──
  const top=att.slice().sort((a,b)=>Math.max(b.ricavo,b.costi)-Math.max(a.ricavo,a.costi)).slice(0,7);

  // ── fatturato e incassato per mese (ultimi 6) ──
  const mesi=_czMesi(6), fat={}, inc={};
  mesi.forEach(m=>{ fat[m]=0; inc[m]=0; });
  (_fatture||[]).forEach(f=>{
    if(f.stato==='annullata'||f.stato==='da_emettere'||(f.tipo!=='unica'&&f.tipo!=='acconto')) return;
    const imp=+f.importo||0, mF=String(f.data_fattura||'').slice(0,7);
    if(mF in fat) fat[mF]+=imp;
    let acc=0;
    (Array.isArray(f.acconti)?f.acconti:[]).forEach(a=>{ const v=+a.importo||0; acc+=v; const m=String(a.data||'').slice(0,7); if(m in inc) inc[m]+=v; });
    if(f.stato==='pagata'){ const m=String(f.data_pagamento||f.data_fattura||'').slice(0,7); if(m in inc) inc[m]+=Math.max(0,imp-acc); }
  });
  const maxM=Math.max(1,...mesi.map(m=>Math.max(fat[m],inc[m])));
  const nomeM=m=>new Date(m+'-15T12:00').toLocaleDateString('it-IT',{month:'short'});

  // ── maturato del personale per settimana (ultime 8) ──
  const sett=[]; let lun=_czLunedi(oggi); for(let i=7;i>=0;i--){ const x=new Date(lun+'T12:00'); x.setDate(x.getDate()-7*i); sett.push(x.toISOString().slice(0,10)); }
  const mat={}; sett.forEach(s=>mat[s]=0);
  Object.keys(DB.presenze||{}).forEach(d=>{ if(d.length!==10) return; const l=_czLunedi(d); if(!(l in mat)) return;
    Object.keys(DB.presenze[d]||{}).forEach(dip=>{ (typeof getTurniRaw==='function'?getTurniRaw(d,dip):[]).forEach(t=>{ mat[l]+=parseFloat(t.importo||0)||0; }); }); });
  const maxS=Math.max(1,...sett.map(s=>mat[s]));

  const ora=new Date().toLocaleString('it-IT',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  root.innerHTML=`
    <div class="cz-testa"><div><h2>Cruscotto</h2><p>Aggiornato ${ora}. Clicca un numero per aprire la vista che lo spiega.</p></div></div>
    <div class="cz-soldi">
      <button class="cz-card" onclick="czVai('clienti','attivi')"><small>Da incassare <span class="cz-iva">IVA incl.</span></small><span class="num">${_zfm(daInc)}</span>
        <span class="def">${scad>1?`di cui <b style="color:var(--z-bad)">scaduto ${_zfm(scad)}</b>`:'nessun pagamento scaduto'}</span></button>
      <button class="cz-card" onclick="czVai('commesse','fatturare')"><small>Da fatturare <span class="cz-iva">imponibile</span></small><span class="num">${_zfm(daFatt)}</span>
        <span class="def">lavoro fatto o accettato, non ancora in fattura</span></button>
      <button class="cz-card" onclick="czVai('fornitori','dapagare')"><small>Da pagare fornitori <span class="cz-iva">IVA incl.</span></small><span class="num">${_zfm(forn)}</span>
        <span class="def">${fornVecchie.length?`<b style="color:var(--z-bad)">${_zfm(fornVecchieImp)}</b> aperti da oltre 90 giorni`:'nessuna fattura vecchia'}</span></button>
      <button class="cz-card" onclick="czVai('personale','pagare')"><small>Da pagare dipendenti</small><span class="num">${_zfm(dip)}</span>
        <span class="def">saldi delle persone attive</span></button>
      <div class="cz-card netto" title="Da incassare − da pagare fornitori − da pagare dipendenti"><small>Posizione a breve</small><span class="num" style="color:${netto<0?'var(--z-bad)':'var(--z-ok)'}">${_zfm(netto)}</span>
        <span class="def">da incassare meno da pagare (fornitori e dipendenti). Non conta il da fatturare.</span></div>
    </div>
    <div class="cz-griglia">
      <section class="cz-pan"><div class="cz-h"><span>Richiede attenzione</span></div>
        <div class="cz-att">${att_.length?att_.map(v=>`<div class="cz-voce" role="button" tabindex="0" onclick="${v.onclick}" onkeydown="if(event.key==='Enter')${v.onclick}">
            <span class="p" style="background:${v.col}"></span><span class="t"><b>${v.tit}</b>${v.sub?`<div>${v.sub}</div>`:''}</span><span class="v">${v.val}</span></div>`).join('')
          :'<div class="cz-ok">✓ Niente di urgente.</div>'}</div></section>
      <section class="cz-pan"><div class="cz-h"><span>Commesse attive (${att.length})</span><a onclick="czVai('commesse','attive')">tutte →</a></div>
        ${top.length?`<table class="cz-comm"><thead><tr><th>Commessa</th><th>Ricavo</th><th class="cz-opz">Costi</th><th>Margine</th></tr></thead><tbody>${top.map(d=>{
          const p=d.ricavo>0?Math.round(d.margine/d.ricavo*100):null; const w=d.ricavo>0?Math.max(0,Math.min(100,d.costi/d.ricavo*100)):100;
          return `<tr data-id="${esc(d.c.id)}" onclick="czApriCommessa(this.dataset.id)"><td>${esc(d.c.nome)}<div style="font-size:11.5px;color:var(--text2)">${esc(d.cliente||'')}</div></td>
            <td class="num">${d.ricavo>0?_zfm(d.ricavo):'—'}</td><td class="num cz-opz">${d.costi>0?_zfm(d.costi):'—'}</td>
            <td class="num"><span class="cz-mbar" title="Costi in % del ricavo"><i style="width:${w}%;background:${d.margine<0||d.ricavo<=0?'var(--z-bad)':'var(--z-ok)'}"></i></span><span style="color:${d.margine<0?'var(--z-bad)':'inherit'}">${p!=null?p+'%':'—'}</span></td></tr>`; }).join('')}</tbody></table>
          <p class="cz-nota">La barra è la parte del ricavo già spesa in costi: verde finché resta margine.</p>`
          :'<div class="cz-vuoto">Nessuna commessa attiva.</div>'}</section>
      <section class="cz-pan"><div class="cz-h"><span>Fatturato e incassato · ultimi 6 mesi</span><a onclick="czVai('clienti','attivi')">clienti →</a></div>
        <div class="cz-graf" style="--n:${mesi.length}">${mesi.map(m=>`<div class="cz-col" title="${nomeM(m)}: fatturato ${_zfm(fat[m])}, incassato ${_zfm(inc[m])}">
          <div class="cz-bars"><i style="height:${fat[m]/maxM*100}%;background:var(--teal)"></i><i style="height:${inc[m]/maxM*100}%;background:var(--z-ok)"></i></div><span>${nomeM(m)}</span></div>`).join('')}</div>
        <div class="cz-leg"><span><i style="background:var(--teal)"></i>Fatturato ${_zfm(mesi.reduce((s,m)=>s+fat[m],0))}</span><span><i style="background:var(--z-ok)"></i>Incassato ${_zfm(mesi.reduce((s,m)=>s+inc[m],0))}</span><span class="cz-iva">IVA inclusa</span></div>
        <p class="cz-nota">Incassato nel mese in cui è entrato (acconti compresi); se manca la data di pagamento si usa la data della fattura.</p></section>
      <section class="cz-pan"><div class="cz-h"><span>Costo del personale · ultime 8 settimane</span><a onclick="czVai('personale','attivi')">personale →</a></div>
        <div class="cz-graf" style="--n:${sett.length}">${sett.map(s=>`<div class="cz-col" title="Settimana dal ${new Date(s+'T12:00').toLocaleDateString('it-IT')}: ${_zfm(mat[s])}">
          <div class="cz-bars"><i style="width:60%;max-width:30px;height:${mat[s]/maxS*100}%;background:var(--teal)"></i></div><span>${new Date(s+'T12:00').toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})}</span></div>`).join('')}</div>
        <div class="cz-leg"><span><i style="background:var(--teal)"></i>Maturato con le giornate: ${_zfm(sett.reduce((s,x)=>s+mat[x],0))} in 8 settimane</span></div>
        <p class="cz-nota">Ogni barra è una settimana (da lunedì). Oneri e contributi esclusi.</p></section>
    </div>`;
}
