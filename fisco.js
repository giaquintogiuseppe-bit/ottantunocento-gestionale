(function(){
const FH=()=>({apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'});
function _fEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function _fEur(n){n=Number(n)||0;return '€ '+n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});}
function _fNum(v){ if(v==null||v==='') return 0; if(typeof v==='number') return v; const n=parseFloat(String(v).replace(/\s/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.')); return isNaN(n)?0:n; }
function _fPct(v){ if(v==null) return null; const m=String(v).match(/([\d.,]+)/); return m?parseFloat(m[1].replace(',','.')):null; }
function _fD(v){ if(!v) return null; if(v instanceof Date){ const z=n=>String(n).padStart(2,'0'); return v.getFullYear()+'-'+z(v.getMonth()+1)+'-'+z(v.getDate()); } const m=String(v).match(/(\d{4})-(\d{2})-(\d{2})/); if(m) return m[0]; const g=String(v).match(/(\d{2})\/(\d{2})\/(\d{4})/); return g?g[3]+'-'+g[2]+'-'+g[1]:null; }
function _fTipoDoc(td,ctx){ const t=(td||'').toLowerCase(); const nc=t.includes('nota di credito');
  if(ctx==='ricevute') return nc?'nc_ricevuta':'ricevuta';
  if(ctx==='emesse') return nc?'nc_emessa':'emessa';
  if(nc) return t.includes('fornitore')?'nc_ricevuta':'nc_emessa';
  if(t.includes('acquisto')||t.includes('parcella')) return 'ricevuta';
  return 'emessa';
}
function fiscoParseGenya(aoa,ctx){
  let h=-1; for(let i=0;i<Math.min(aoa.length,15);i++){ if((aoa[i]||[]).some(c=>String(c).trim()==='Tipo Documento')){ h=i; break; } }
  if(h<0) throw new Error('intestazione Genya non trovata (atteso "Tipo Documento")');
  const H=aoa[h].map(c=>String(c==null?'':c).trim()); const ix=n=>H.indexOf(n);
  const C={ td:ix('Tipo Documento'),anno:ix('Anno'),num:ix('Numero'),suf:ix('Suffisso'),data:ix('Data'),
    rifN:ix('Numero Rif. fornitore'),rifD:ix('Data Rif. fornitore'),cli:ix('Cliente'),forn:ix('Fornitore'),
    cf:ix('Codice Fiscale'),piva:ix('Partita IVA'),scad:ix('Scadenza'),pag:ix('Pagamento'),
    nriga:ix('Numero riga'),desc:ix('Descrizione'),qta:ix('Quantità'),um:ix('Unità misura'),
    pu:ix('Prezzo Un.'),ptot:ix('Prezzo Tot.'),civa:ix('Codice IVA'),iva:ix('IVA'),triga:ix('Tipo riga'),
    tot:ix('Totale (val)'),imp:ix('Imponibile (val)'),imposta:ix('Imposta (val)'),
    stato:ix('Stato'),fepa:ix('Fepa o B2b'),split:ix('Split') };
  const docs=new Map();
  for(let r=h+1;r<aoa.length;r++){
    const row=aoa[r]; if(!row||row[C.num]==null||String(row[C.num]).trim()==='') continue;
    const tipo=_fTipoDoc(row[C.td],ctx); const ricev=(tipo==='ricevuta'||tipo==='nc_ricevuta');
    const rifNum=C.rifN>=0?row[C.rifN]:null;
    const numeroDoc=ricev?(String(rifNum||'').trim()||String(row[C.num]).trim()):String(row[C.num]).trim();
    const piva=C.piva>=0?(row[C.piva]||''):'';
    const key=(ricev?'R':'E')+'|'+row[C.anno]+'|'+numeroDoc+'|'+(ricev?piva:(C.suf>=0?(row[C.suf]||''):''));
    let d=docs.get(key);
    if(!d){
      const seg=tipo.indexOf('nc_')===0?-1:1;
      d={testata:{ tipo, anno:parseInt(row[C.anno])||null, numero:numeroDoc,
        numero_protocollo:ricev?String(row[C.num]).trim():null, suffisso:C.suf>=0?(row[C.suf]||null):null,
        data_fattura:_fD(row[C.data]), rif_fornitore_data:C.rifD>=0?_fD(row[C.rifD]):null,
        controparte_nome:ricev?(C.forn>=0?row[C.forn]:null):(C.cli>=0?row[C.cli]:null),
        controparte_piva:piva||null, controparte_cf:C.cf>=0?(row[C.cf]||null):null,
        tipo_documento:row[C.td]||null,
        imponibile:Math.abs(_fNum(row[C.imp]))*seg, iva:Math.abs(_fNum(row[C.imposta]))*seg, totale:Math.abs(_fNum(row[C.tot]))*seg,
        scadenza_txt:C.scad>=0?(row[C.scad]||null):null, pagamento_txt:C.pag>=0?(row[C.pag]||null):null,
        stato_genya:C.stato>=0?(row[C.stato]||null):null, fepa_b2b:C.fepa>=0?String(row[C.fepa]):null,
        split:C.split>=0?String(row[C.split]):null }, righe:[], _ogg:[] };
      docs.set(key,d);
    }
    const descr=C.desc>=0?(row[C.desc]||''):''; if(descr) d._ogg.push(String(descr).trim());
    d.righe.push({ numero_riga:parseInt(row[C.nriga])||null, descrizione:descr||null,
      quantita:_fNum(row[C.qta])||null, unita:C.um>=0?(row[C.um]||null):null,
      prezzo_unitario:_fNum(row[C.pu])||null, prezzo_totale:_fNum(row[C.ptot])||null,
      codice_iva:C.civa>=0?(String(row[C.civa]||'').trim()||null):null, iva_perc:_fPct(row[C.iva]),
      tipo_riga:C.triga>=0?(row[C.triga]||null):null, imponibile_riga:_fNum(row[C.ptot])||null });
  }
  const out=[...docs.values()];
  out.forEach(d=>{ d.testata.oggetto=[...new Set(d._ogg)].join(' · ').slice(0,300)||null; delete d._ogg; });
  return out;
}
function fiscoChiave(t){ let k=(t.tipo||'').toLowerCase()+'|'+(t.anno!=null?t.anno:'')+'|'+(t.numero||'')+'|'+(t.suffisso||''); if((t.tipo||'').toLowerCase()==='ricevuta') k+='|'+(t.controparte_piva||''); return k; }
async function fiscoUpsert(docs){
  const url=SUPABASE_URL+'/rest/v1/fisco_fatture', rurl=SUPABASE_URL+'/rest/v1/fisco_fatture_righe';
  const chunk=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o;};
  const k2id={};
  for(const part of chunk(docs,150)){
    const r=await fetch(url+'?on_conflict=chiave',{method:'POST',headers:Object.assign({},FH(),{Prefer:'resolution=merge-duplicates,return=representation'}),body:JSON.stringify(part.map(d=>d.testata))});
    if(!r.ok) throw new Error('testate HTTP '+r.status+': '+(await r.text()).slice(0,180));
    (await r.json()).forEach(row=>{ k2id[row.chiave]=row.id; });
  }
  docs.forEach(d=>{ d._id=k2id[fiscoChiave(d.testata)]; });
  const ids=docs.map(d=>d._id).filter(Boolean);
  for(const part of chunk(ids,80)){ await fetch(rurl+'?fattura_id=in.('+part.join(',')+')',{method:'DELETE',headers:FH()}); }
  const righe=[]; docs.forEach(d=>{ if(d._id) d.righe.forEach(x=>righe.push(Object.assign({fattura_id:d._id},x))); });
  for(const part of chunk(righe,400)){
    const r=await fetch(rurl,{method:'POST',headers:Object.assign({},FH(),{Prefer:'return=minimal'}),body:JSON.stringify(part)});
    if(!r.ok) throw new Error('righe HTTP '+r.status+': '+(await r.text()).slice(0,180));
  }
  return {docs:docs.length, righe:righe.length};
}
async function fiscoImportFile(input,ctx){
  const file=input.files&&input.files[0]; if(!file) return;
  const stato=document.getElementById('fisco-imp-stato');
  stato.textContent='⏳ Leggo '+file.name+'…';
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true});
    const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:null});
    const docs=fiscoParseGenya(aoa,ctx);
    if(!docs.length){ stato.textContent='⚠ Nessun documento riconosciuto.'; input.value=''; return; }
    const tipi={}; docs.forEach(d=>tipi[d.testata.tipo]=(tipi[d.testata.tipo]||0)+1);
    const tot=docs.reduce((s,d)=>s+(Number(d.testata.totale)||0),0);
    const descrTipi=Object.entries(tipi).map(([k,v])=>v+' '+k).join(', ');
    if(!confirm('File: '+file.name+'\n\nDocumenti: '+docs.length+' ('+descrTipi+')\nTotale: '+_fEur(tot)+'\n\nImportare? I doppioni verranno aggiornati, non duplicati.')){ input.value=''; stato.textContent=''; return; }
    stato.textContent='⏳ Salvo '+docs.length+' documenti…';
    const res=await fiscoUpsert(docs);
    stato.textContent='✓ Importati '+res.docs+' documenti ('+res.righe+' righe) — doppioni aggiornati, non duplicati.';
    input.value=''; FISCO.loaded=false; await rFisco();
  }catch(e){ stato.textContent='⚠ Errore import: '+String(e.message||e).slice(0,180); console.error('fisco import',e); input.value=''; }
}
const FISCO={rows:[], flt:'tutte', sflt:'tutte', loaded:false, righeByFatt:{}};
// lettura paginata: PostgREST limita a ~1000 righe per richiesta, quindi scorriamo a pagine
async function _fFetchAll(path){
  const page=1000; let from=0, all=[];
  for(;;){
    let r; try{ r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:Object.assign({},FH(),{'Range-Unit':'items',Range:from+'-'+(from+page-1)}),cache:'no-cache'}); }catch(e){ break; }
    if(!r.ok) break; let b; try{ b=await r.json(); }catch(e){ break; }
    if(!Array.isArray(b)||!b.length) break;
    all=all.concat(b); if(b.length<page) break; from+=page; if(from>300000) break;
  }
  return all;
}
async function fiscoCarica(){
  const list=document.getElementById('fisco-list'); if(list) list.innerHTML='<div style="padding:16px;color:var(--text2)">Carico…</div>';
  try{ FISCO.rows=await _fFetchAll('fisco_fatture?select=*&order=data_fattura.desc'); }catch(e){ FISCO.rows=[]; }
  if(!Array.isArray(FISCO.rows)) FISCO.rows=[];
  // cache delle righe (per la ricerca sulle voci/descrizioni)
  FISCO.righeByFatt={};
  try{ const rg=await _fFetchAll('fisco_fatture_righe?select=fattura_id,numero_riga,descrizione,prezzo_totale'); if(Array.isArray(rg)) rg.forEach(x=>{ (FISCO.righeByFatt[x.fattura_id]=FISCO.righeByFatt[x.fattura_id]||[]).push(x); }); }catch(e){}
  // carica anche i movimenti banca, per mostrare lo stato "pagata" nella vista Documenti
  try{ if(!BANCA.loaded) await bancaCarica(); }catch(e){}
  FISCO.loaded=true; if(typeof bancaInvalida==='function') bancaInvalida();
  const sel=document.getElementById('fisco-anno');
  if(sel){ const anni=[...new Set(FISCO.rows.map(x=>x.anno).filter(Boolean))].sort((a,b)=>b-a); const cur=sel.value; sel.innerHTML='<option value="">Tutti gli anni</option>'+anni.map(a=>'<option>'+a+'</option>').join(''); sel.value=cur; }
}
async function rFisco(){ if(!FISCO.loaded) await fiscoCarica(); fiscoRender(); }
async function fiscoRicarica(){ FISCO.loaded=false; await rFisco(); }
function fiscoFiltra(f){ FISCO.flt=f; document.querySelectorAll('.fisco-flt').forEach(b=>b.classList.toggle('on',b.dataset.flt===f)); fiscoRender(); }
function fiscoSFiltra(s){ FISCO.sflt=s; document.querySelectorAll('.fisco-sflt').forEach(b=>b.classList.toggle('on',b.dataset.sflt===s)); fiscoRender(); }
// stato di pagamento di una fattura dalla mappa SM: 'pagate'|'parziali'|'aperte'|null
function _fStatoPag(x,SM){ if(!(BANCA.rows&&BANCA.rows.length)) return null; if(!(x.tipo==='emessa'||x.tipo==='ricevuta')) return null;
  const tot=Number(x.totale)||0, inc=(SM&&SM[x.id]&&SM[x.id].incassato)||0;
  if(inc<=0.01) return 'aperte'; if(Math.abs(inc-tot)<=Math.max(0.5,tot*0.01)) return 'pagate'; if(inc<tot) return 'parziali'; return 'pagate'; }
// stato per fattura: stornata da NC (match controparte+importo) e pagata (da riconciliazione banca)
function fiscoStatoMap(){
  const map={};
  const emesse=FISCO.rows.filter(f=>f.tipo==='emessa'), ricev=FISCO.rows.filter(f=>f.tipo==='ricevuta');
  const ncE=FISCO.rows.filter(f=>f.tipo==='nc_emessa'), ncR=FISCO.rows.filter(f=>f.tipo==='nc_ricevuta');
  const matchNC=(fatt,ncs)=>{ ncs.forEach(nc=>{ const amt=Math.abs(Number(nc.totale)||0);
    const cand=fatt.filter(f=>typeof _bNomeMatch==='function'?_bNomeMatch(f.controparte_nome,nc.controparte_nome):(f.controparte_nome===nc.controparte_nome));
    if(!cand.length) return;
    let pick=cand.find(f=>Math.abs((Number(f.totale)||0)-amt)<=Math.max(0.5,amt*0.01));
    const esatto=!!pick;
    if(!pick) pick=cand.slice().sort((a,b)=>Math.abs((Number(a.totale)||0)-amt)-Math.abs((Number(b.totale)||0)-amt))[0];
    if(pick){ const e=map[pick.id]=map[pick.id]||{}; (e.storni=e.storni||[]).push({nc,esatto,amt}); }
  }); };
  matchNC(emesse,ncE); matchNC(ricev,ncR);
  if(BANCA.rows && BANCA.rows.length){ const R=bancaRiconcilia(); FISCO.rows.forEach(f=>{ if(R.attr[f.id]!=null){ (map[f.id]=map[f.id]||{}).incassato=R.attr[f.id]; } }); }
  return map;
}
function _fStatoBadge(x,SM){ if(!SM) return ''; const e=SM[x.id]; let out='';
  if(BANCA.rows && BANCA.rows.length && (x.tipo==='emessa'||x.tipo==='ricevuta')){
    const tot=Number(x.totale)||0, inc=(e&&e.incassato)||0;
    if(inc<=0.01) out+=' <span title="Da incassare/pagare" style="color:#f87171">●</span>';
    else if(Math.abs(inc-tot)<=Math.max(0.5,tot*0.01)) out+=' <span title="Pagata ('+_fEur(inc)+')" style="color:#34d399">✓</span>';
    else if(inc<tot) out+=' <span title="Parziale '+_fEur(inc)+' / '+_fEur(tot)+'" style="color:#fbbf24">◐</span>';
    else out+=' <span title="Sovra-incasso '+_fEur(inc)+'" style="color:#fbbf24">▲</span>';
  }
  if(e&&e.storni&&e.storni.length){ const tit=e.storni.map(s=>'NC '+(s.nc.numero||'')+(s.nc.anno?'/'+s.nc.anno:'')+' −'+_fEur(s.amt)+(s.esatto?'':' (parziale?)')).join(' · ');
    out+=' <span title="Stornata: '+_fEsc(tit)+'" style="color:#f0abfc">↩️</span>'; }
  return out;
}
function fiscoRender(){
  const box=document.getElementById('fisco-list'), kpi=document.getElementById('fisco-kpi'); if(!box) return;
  const q=(document.getElementById('fisco-q').value||'').toLowerCase();
  const anno=document.getElementById('fisco-anno').value;
  const base=anno?FISCO.rows.filter(x=>String(x.anno)===anno):FISCO.rows;
  const sum=pred=>base.filter(pred).reduce((s,x)=>s+(Number(x.totale)||0),0);
  const em=sum(x=>x.tipo==='emessa'||x.tipo==='nc_emessa'), ri=sum(x=>x.tipo==='ricevuta'||x.tipo==='nc_ricevuta');
  const ncE=sum(x=>x.tipo==='nc_emessa'), ncR=sum(x=>x.tipo==='nc_ricevuta');
  if(kpi) kpi.innerHTML='<div class="sc"><div class="scv">'+_fEur(em)+'</div><div class="scl">Emesse (nette)</div></div>'+
    '<div class="sc"><div class="scv">'+_fEur(ri)+'</div><div class="scl">Ricevute (nette)</div></div>'+
    '<div class="sc"><div class="scv">'+_fEur(em-ri)+'</div><div class="scl">Saldo (em − ric)</div></div>'+
    '<div class="sc"><div class="scv">'+base.length+'</div><div class="scl">Documenti</div></div>'+
    ((ncE||ncR)?'<div class="sc"><div class="scv">'+_fEur(ncE)+'</div><div class="scl">NC a clienti</div></div>'+
      '<div class="sc"><div class="scv">'+_fEur(ncR)+'</div><div class="scl">NC da fornitori</div></div>':'');
  // === RICERCA GLOBALE: su tutte le sezioni + descrizioni delle righe ===
  if(q && q.length>=2){ fiscoRenderRicerca(box,base,q); return; }
  let rows=base.slice();
  if(FISCO.flt==='emessa') rows=rows.filter(x=>x.tipo==='emessa');
  else if(FISCO.flt==='ricevuta') rows=rows.filter(x=>x.tipo==='ricevuta');
  else if(FISCO.flt==='nc_emessa') rows=rows.filter(x=>x.tipo==='nc_emessa');
  else if(FISCO.flt==='nc_ricevuta') rows=rows.filter(x=>x.tipo==='nc_ricevuta');
  // intestazione della sezione corrente
  const intest={emessa:'🟢 Fatture emesse verso clienti',ricevuta:'🔵 Fatture ricevute da fornitori',nc_emessa:'↩️ Note di credito emesse verso i clienti (riducono le emesse)',nc_ricevuta:'↩️ Note di credito ricevute dai fornitori (riducono le ricevute)'}[FISCO.flt];
  const tot=rows.reduce((s,x)=>s+(Number(x.totale)||0),0);
  const SM=fiscoStatoMap();
  if(FISCO.sflt&&FISCO.sflt!=='tutte'){
    if(FISCO.sflt==='stornate') rows=rows.filter(x=>SM[x.id]&&SM[x.id].storni&&SM[x.id].storni.length);
    else rows=rows.filter(x=>_fStatoPag(x,SM)===FISCO.sflt);
  }
  const tot2=rows.reduce((s,x)=>s+(Number(x.totale)||0),0);
  const mostraStato=(FISCO.flt==='emessa'||FISCO.flt==='ricevuta'||FISCO.flt==='tutte');
  const legenda=mostraStato?'<div style="font-size:11px;color:var(--text2);margin:0 2px 8px">'+(BANCA.rows&&BANCA.rows.length?'<span style="color:#34d399">✓</span> pagata · <span style="color:#fbbf24">◐</span> parziale · <span style="color:#f87171">●</span> da incassare/pagare · ':'')+'<span style="color:#f0abfc">↩️</span> stornata da nota di credito'+(BANCA.rows&&BANCA.rows.length?'':' — <i>importa l\'estratto conto in «Banca» per vedere anche i pagamenti</i>')+'</div>':'';
  const head=(intest?'<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:0 2px 8px;font-size:13px"><b>'+intest+'</b><span style="color:var(--text2)">'+rows.length+' doc · '+_fEur(tot2)+'</span></div>':'')+legenda;
  if(!rows.length){ box.innerHTML=head+'<div style="padding:18px;color:var(--text2);text-align:center">Nessun documento in questa sezione. Importa gli Excel di Genya qui sopra.</div>'; return; }
  const badge=t=>({emessa:'🟢 Emessa',ricevuta:'🔵 Ricevuta',nc_emessa:'↩️ NC a cliente',nc_ricevuta:'↩️ NC da fornitore'}[t]||t);
  rows.sort((a,b)=>String(b.data_fattura||'').localeCompare(String(a.data_fattura||'')));
  box.innerHTML=head+'<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">'+
    '<thead><tr style="text-align:left;color:var(--text2)"><th style="padding:7px 8px">Tipo</th><th>Numero</th><th>Data</th><th>Controparte</th><th>Oggetto</th><th style="text-align:right">Imponibile</th><th style="text-align:right">IVA</th><th style="text-align:right">Totale</th></tr></thead><tbody>'+
    rows.slice(0,1500).map(x=>'<tr style="border-top:1px solid var(--brd);cursor:pointer" onclick="fiscoDettaglio(\''+x.id+'\')">'+
      '<td style="padding:7px 8px;white-space:nowrap">'+badge(x.tipo)+'</td>'+
      '<td style="white-space:nowrap">'+_fEsc(x.numero||'')+(x.anno?'/'+x.anno:'')+_fStatoBadge(x,SM)+'</td>'+
      '<td style="white-space:nowrap">'+(x.data_fattura?x.data_fattura.split('-').reverse().join('/'):'')+'</td>'+
      '<td>'+_fEsc((x.controparte_nome||'').slice(0,34))+'</td>'+
      '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_fEsc((x.oggetto||'').slice(0,80))+'</td>'+
      '<td style="text-align:right;white-space:nowrap">'+_fEur(x.imponibile)+'</td>'+
      '<td style="text-align:right;white-space:nowrap">'+_fEur(x.iva)+'</td>'+
      '<td style="text-align:right;white-space:nowrap;font-weight:700">'+_fEur(x.totale)+'</td></tr>').join('')+
    '</tbody></table></div>'+(rows.length>1500?'<div style="padding:8px;color:var(--text2);font-size:11px">Mostrati 1500 di '+rows.length+' — usa i filtri.</div>':'');
}
function fiscoRenderRicerca(box,base,q){
  const badge=t=>({emessa:'🟢 Emessa',ricevuta:'🔵 Ricevuta',nc_emessa:'↩️ NC a cliente',nc_ricevuta:'↩️ NC da fornitore'}[t]||t);
  const hl=s=>{ s=_fEsc(s||''); if(!q) return s; try{ return s.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark style="background:#ffd54f;color:#000;border-radius:2px;padding:0 1px">$1</mark>'); }catch(e){ return s; } };
  const res=[];
  base.forEach(x=>{
    const tHit=((x.numero||'')+' '+(x.controparte_nome||'')+' '+(x.oggetto||'')).toLowerCase().includes(q);
    const righe=FISCO.righeByFatt[x.id]||[];
    const vHit=righe.filter(r=>String(r.descrizione||'').toLowerCase().includes(q));
    if(tHit||vHit.length) res.push({f:x,voci:vHit});
  });
  res.sort((a,b)=>String(b.f.data_fattura||'').localeCompare(String(a.f.data_fattura||'')));
  const cnt={emessa:0,ricevuta:0,nc_emessa:0,nc_ricevuta:0}; res.forEach(o=>cnt[o.f.tipo]=(cnt[o.f.tipo]||0)+1);
  const head='<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 2px 10px;font-size:13px">'+
    '<b>🔎 Risultati per «'+_fEsc(q)+'» · '+res.length+' documenti</b>'+
    '<span style="color:var(--text2);font-size:12px">🟢 '+cnt.emessa+' emesse · 🔵 '+cnt.ricevuta+' ricevute · ↩️ '+(cnt.nc_emessa+cnt.nc_ricevuta)+' NC — <a href="#" onclick="document.getElementById(\'fisco-q\').value=\'\';fiscoRender();return false" style="color:var(--acc,#6ea8fe)">✕ chiudi ricerca</a></span></div>'+
    '<div style="color:var(--text2);font-size:11px;margin:0 2px 8px">Cerca su tutte le sezioni insieme, anche nelle descrizioni delle voci. Clicca un documento per il dettaglio righe.</div>';
  if(!res.length){ box.innerHTML=head+'<div style="padding:18px;color:var(--text2);text-align:center">Nessun documento trovato.</div>'; return; }
  box.innerHTML=head+res.slice(0,400).map(o=>{ const x=o.f;
    const voci=o.voci.slice(0,6).map(r=>'<div style="font-size:11.5px;color:var(--text2);margin-top:2px">• '+hl((r.descrizione||'').slice(0,160))+(r.prezzo_totale!=null?' <span style="color:var(--text)">('+_fEur(r.prezzo_totale)+')</span>':'')+'</div>').join('')+(o.voci.length>6?'<div style="font-size:11px;color:var(--text2)">… e altre '+(o.voci.length-6)+' voci</div>':'');
    return '<div onclick="fiscoDettaglio(\''+x.id+'\')" style="border:1px solid var(--brd);border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer;background:var(--navy)">'+
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">'+
        '<div style="font-size:13px"><span style="white-space:nowrap">'+badge(x.tipo)+'</span> &nbsp;<b>'+_fEsc(x.numero||'')+(x.anno?'/'+x.anno:'')+'</b> · '+(x.data_fattura?x.data_fattura.split('-').reverse().join('/'):'')+' · '+hl((x.controparte_nome||'').slice(0,50))+'</div>'+
        '<div style="font-size:13px;font-weight:700;white-space:nowrap">'+_fEur(x.totale)+'</div>'+
      '</div>'+
      (x.oggetto?'<div style="font-size:11.5px;color:var(--text2);margin-top:3px">'+hl((x.oggetto||'').slice(0,160))+'</div>':'')+
      voci+
    '</div>';
  }).join('')+(res.length>400?'<div style="padding:8px;color:var(--text2);font-size:11px">Mostrati 400 di '+res.length+' — affina la ricerca.</div>':'');
}
async function fiscoSvuotaTutto(){
  const stato=document.getElementById('fisco-imp-stato');
  if(!confirm('Cancellare TUTTE le fatture e le righe del quadro fiscale?\n\nQuesto svuota completamente la sezione (fatture emesse/ricevute e note di credito). I dati non sono recuperabili: dovrai reimportare gli Excel di Genya.\n\nProcedere?')) return;
  if(!confirm('Conferma definitiva: svuoto tutto il quadro fiscale ora?')) return;
  try{
    if(stato) stato.textContent='⏳ Svuoto il quadro fiscale…';
    // prima le righe (dipendono dalle fatture), poi le fatture
    let r=await fetch(SUPABASE_URL+'/rest/v1/fisco_fatture_righe?id=not.is.null',{method:'DELETE',headers:Object.assign({},FH(),{Prefer:'return=minimal'})});
    if(!r.ok && r.status!==404) throw new Error('righe HTTP '+r.status+': '+(await r.text()).slice(0,180));
    r=await fetch(SUPABASE_URL+'/rest/v1/fisco_fatture?id=not.is.null',{method:'DELETE',headers:Object.assign({},FH(),{Prefer:'return=minimal'})});
    if(!r.ok && r.status!==404) throw new Error('fatture HTTP '+r.status+': '+(await r.text()).slice(0,180));
    FISCO.rows=[]; FISCO.loaded=false; if(typeof bancaInvalida==='function') bancaInvalida();
    if(stato) stato.textContent='✅ Quadro fiscale svuotato. Reimporta gli Excel di Genya quando vuoi.';
    await rFisco();
  }catch(e){ if(stato) stato.textContent='❌ Errore durante lo svuotamento: '+(e.message||e); }
}
async function fiscoDettaglio(id){
  const f=FISCO.rows.find(x=>String(x.id)===String(id)); if(!f) return;
  const ov=document.getElementById('fisco-righe-ov'), tit=document.getElementById('fisco-righe-tit'), body=document.getElementById('fisco-righe-body');
  tit.textContent=(f.numero||'')+(f.anno?'/'+f.anno:'')+' — '+(f.controparte_nome||'');
  body.innerHTML='<div style="color:var(--text2)">Carico righe…</div>'; ov.style.display='flex';
  let righe=[]; try{ const r=await fetch(SUPABASE_URL+'/rest/v1/fisco_fatture_righe?fattura_id=eq.'+id+'&order=numero_riga.asc',{headers:FH(),cache:'no-cache'}); righe=r.ok?await r.json():[]; }catch(e){}
  body.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="text-align:left;color:var(--text2)"><th style="padding:5px">#</th><th>Descrizione</th><th style="text-align:right">Q.tà</th><th style="text-align:right">Prezzo</th><th style="text-align:right">IVA</th><th style="text-align:right">Importo</th></tr></thead><tbody>'+
    (righe.length?righe.map(r=>'<tr style="border-top:1px solid var(--brd)"><td style="padding:5px">'+(r.numero_riga||'')+'</td><td>'+_fEsc(r.descrizione||'')+'</td><td style="text-align:right">'+(r.quantita!=null?r.quantita:'')+'</td><td style="text-align:right">'+(r.prezzo_unitario!=null?_fEur(r.prezzo_unitario):'')+'</td><td style="text-align:right">'+(r.iva_perc!=null?r.iva_perc+'%':'')+'</td><td style="text-align:right">'+(r.prezzo_totale!=null?_fEur(r.prezzo_totale):'')+'</td></tr>').join(''):'<tr><td colspan="6" style="padding:8px;color:var(--text2)">Nessuna riga registrata.</td></tr>')+
    '</tbody></table><div style="margin-top:10px;text-align:right;font-size:12px;color:var(--text2)">Imponibile '+_fEur(f.imponibile)+' · IVA '+_fEur(f.iva)+' · <b style="color:var(--text)">Totale '+_fEur(f.totale)+'</b></div>';
}
/* ═══════════════ BANCA & RICONCILIAZIONE (estratto conto Intesa) ═══════════════ */
const BANCA={rows:[], flt:'ricon', loaded:false};
function _bHash(s){ let h=0; s=String(s||''); for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return (h>>>0).toString(36); }
function _bControparte(op,det,segno){ op=op||''; det=det||''; let m;
  m=det.match(/MITT\.\s*(.+?)\s*BENEF\./i); if(m) return m[1].trim().slice(0,80);
  if(segno==='entrata'){
    m=op.match(/disposto\s+da\s+(.+)$/i); if(m) return m[1].trim().slice(0,80);
    m=det.match(/disposto\s+da\s+(.+?)(?:\s+benef\.|\s+bic\b|\s+c\/o\b|\s+iban\b|\s+cod\b|$)/i); if(m) return m[1].trim().slice(0,80);
  } else {
    m=op.match(/a\s+favore\s+di\s+(.+)$/i); if(m) return m[1].trim().slice(0,80);
    m=det.match(/a\s+favore\s+di\s+(.+?)(?:\s+benef\.|\s+bic\b|\s+c\/o\b|\s+iban\b|\s+cod\b|$)/i); if(m) return m[1].trim().slice(0,80);
  }
  return '';
}
// controparte di un movimento, ricalcolata al volo se non salvata (robusto su dati vecchi)
function _bCp(m){ return (m.controparte_estratta&&m.controparte_estratta.trim())?m.controparte_estratta:_bControparte(m.operazione,m.dettagli,m.segno); }
function _bFatture(op,det){ const txt=((op||'')+' '+(det||'')); const out=new Set();
  const re=/\b(?:fatture|fattura|fatt|ft)\b\.?\s*(?:n(?:r|ro|um|°|º|\.)?\s*\.?\s*)?([0-9][0-9\s\/eE.,]{0,30})/gi; let m;
  while((m=re.exec(txt))){ const nums=m[1].split(/[^0-9]+/).filter(Boolean);
    for(const n of nums){ const v=parseInt(n,10); if(v>0 && v<=9999 && !(v>=2020&&v<=2035)) out.add(String(v)); if(out.size>=6) break; } }
  return [...out];
}
function _bNorm(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\b(S\s*R\s*L|S\s*P\s*A|S\s*N\s*C|S\s*A\s*S|SRLS|SSD|ARL|SOCIETA|RESPONSABILITA|LIMITATA|SEMPLIFICATA|UNIPERSONALE|DI|DEL|DELLA|E|THE|SPA|SRL)\b/g,' ').replace(/\s+/g,' ').trim(); }
const _normMemo={}, _tokMemo={};
function _bNormM(s){ s=String(s||''); let v=_normMemo[s]; if(v===undefined){ v=_bNorm(s); if(Object.keys(_normMemo).length<20000) _normMemo[s]=v; } return v; }
function _bToks(norm){ let v=_tokMemo[norm]; if(v===undefined){ v=norm.split(' ').filter(w=>w.length>=4); if(Object.keys(_tokMemo).length<20000) _tokMemo[norm]=v; } return v; }
function _bNomeMatch(a,b){ a=_bNormM(a); b=_bNormM(b); if(!a||!b) return false; if(a.includes(b)||b.includes(a)) return true;
  const as=a.replace(/ /g,''), bs=b.replace(/ /g,''); if(as.length>=5 && (as.includes(bs)||bs.includes(as))) return true;
  const ta=_bToks(a), tb=_bToks(b); const sb=tb.length<ta.length?new Set(tb):new Set(tb); for(const w of ta){ if(sb.has(w)) return true; } return false; }
function bancaParseEC(aoa){
  let h=-1; for(let i=0;i<Math.min(aoa.length,40);i++){ const v=(aoa[i]||[]).map(c=>String(c==null?'':c).trim().toLowerCase()); if(v.includes('data')&&v.some(x=>x.includes('importo'))){ h=i; break; } }
  if(h<0) throw new Error('intestazione estratto conto non trovata (atteso "Data" e "Importo")');
  const H=aoa[h].map(c=>String(c==null?'':c).trim().toLowerCase());
  const ix=(...names)=>{ for(const n of names){ const i=H.indexOf(n); if(i>=0) return i; } for(let i=0;i<H.length;i++){ if(names.some(n=>H[i].includes(n))) return i; } return -1; };
  const C={data:ix('data'),op:ix('operazione'),det:ix('dettagli'),conto:ix('conto o carta','conto'),cont:ix('contabilizzazione'),cat:ix('categoria'),imp:ix('importo')};
  const out=[]; const keyCount={};
  for(let r=h+1;r<aoa.length;r++){ const row=aoa[r]; if(!row) continue;
    const d=_fD(row[C.data]); const imp=_fNum(row[C.imp]);
    if(d==null || imp==null || (imp===0 && (row[C.imp]==null||row[C.imp]===''))) continue;
    if(d==null) continue;
    const op=row[C.op]!=null?String(row[C.op]).trim():''; const det=row[C.det]!=null?String(row[C.det]).trim():'';
    const segno=imp>=0?'entrata':'uscita'; const aImp=Math.round(Math.abs(imp)*100)/100;
    const rec={ data:d, segno, importo:aImp, operazione:op, dettagli:det,
      conto:C.conto>=0?(row[C.conto]!=null?String(row[C.conto]).trim():null):null,
      categoria:C.cat>=0?(row[C.cat]!=null?String(row[C.cat]).trim():null):null,
      contabilizzato:C.cont>=0?(String(row[C.cont]||'').trim().toUpperCase()==='SI'):null,
      controparte_estratta:_bControparte(op,det,segno)||null, fatture_rif:_bFatture(op,det).join(',')||null };
    const base=d+'|'+aImp.toFixed(2)+'|'+segno+'|'+_bHash(op+'~'+det); keyCount[base]=(keyCount[base]||0)+1; rec.chiave=base+'#'+keyCount[base];
    out.push(rec);
  }
  return out;
}
async function bancaUpsert(movs){
  const url=SUPABASE_URL+'/rest/v1/fisco_banca_movimenti'; const chunk=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o;};
  let n=0;
  for(const part of chunk(movs,300)){
    const r=await fetch(url+'?on_conflict=chiave',{method:'POST',headers:Object.assign({},FH(),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(part)});
    if(!r.ok) throw new Error('movimenti HTTP '+r.status+': '+(await r.text()).slice(0,180)); n+=part.length;
  }
  return n;
}
async function bancaImportFile(input){
  const file=input.files&&input.files[0]; if(!file) return; const stato=document.getElementById('banca-imp-stato');
  stato.textContent='⏳ Leggo '+file.name+'…';
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true}); const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:null});
    const movs=bancaParseEC(aoa); if(!movs.length){ stato.textContent='⚠ Nessun movimento riconosciuto.'; input.value=''; return; }
    const ent=movs.filter(m=>m.segno==='entrata').length, usc=movs.length-ent;
    stato.textContent='⏳ Salvo '+movs.length+' movimenti ('+ent+' incassi, '+usc+' uscite)…';
    const n=await bancaUpsert(movs); BANCA.loaded=false; await bancaCarica();
    stato.textContent='✅ Importati '+n+' movimenti ('+ent+' incassi, '+usc+' uscite). Reimportare lo stesso periodo non crea doppioni.'; input.value='';
    bancaRender();
  }catch(e){ stato.textContent='❌ Errore: '+(e.message||e); input.value=''; }
}
async function bancaCarica(){
  const list=document.getElementById('banca-list'); if(list && !BANCA.loaded) list.innerHTML='<div style="padding:16px;color:var(--text2)">Carico…</div>';
  try{ BANCA.rows=await _fFetchAll('fisco_banca_movimenti?select=*&order=data.desc'); }catch(e){ BANCA.rows=[]; }
  if(!Array.isArray(BANCA.rows)) BANCA.rows=[];
  BANCA.loaded=true; bancaInvalida();
}
async function bancaRicarica(){ BANCA.loaded=false; await bancaCarica(); bancaRender(); }
function bancaFiltra(f){ BANCA.flt=f; document.querySelectorAll('.banca-flt').forEach(b=>b.classList.toggle('on',b.dataset.flt===f)); bancaRender(); }
async function fiscoVista(v){
  document.getElementById('fisco-view-doc').style.display=(v==='doc')?'':'none';
  document.getElementById('fisco-view-banca').style.display=(v==='banca')?'':'none';
  const cv=document.getElementById('fisco-view-confronto'); if(cv) cv.style.display=(v==='confronto')?'':'none';
  document.getElementById('fisco-tab-doc').classList.toggle('on',v==='doc');
  document.getElementById('fisco-tab-banca').classList.toggle('on',v==='banca');
  const ct=document.getElementById('fisco-tab-confronto'); if(ct) ct.classList.toggle('on',v==='confronto');
  if(v==='banca'){ if(!FISCO.loaded) await fiscoCarica(); if(!BANCA.loaded) await bancaCarica(); bancaRender(); }
  if(v==='confronto'){ await confrontoCarica(); confrontoRender(); }
}
// ═══════════ CONFRONTO: Genya (fiscale) ↔ gestionale (posizioni) ↔ banca ═══════════
const CONF={sub:'cli', flt:'tutti'};
async function confrontoCarica(){
  const box=document.getElementById('conf-list'); if(box) box.innerHTML='<div style="padding:16px;color:var(--text2)">Carico e confronto i dati…</div>';
  if(!FISCO.loaded) await fiscoCarica();
  if(!BANCA.loaded) await bancaCarica();
  try{ if(typeof _fattureCarica==='function') await _fattureCarica(); }catch(e){}
  try{ if(typeof _pcCaricaPeriodi==='function') await _pcCaricaPeriodi(); }catch(e){}
  try{ if((typeof REF==='undefined'||!REF||!REF.length) && typeof refLoad==='function') await refLoad(); }catch(e){}
  try{ if(typeof _faRows==='undefined' || !_faRows){ _faRows=await _fFetchAll('fatture_acquisto?select=*'); } }catch(e){ try{ if(typeof _faRows==='undefined'||!_faRows) _faRows=[]; }catch(_){} }
}
async function confrontoRicarica(){ FISCO.loaded=false; BANCA.loaded=false; try{ _faRows=null; }catch(e){} bancaInvalida(); await confrontoCarica(); confrontoRender(); }
function confrontoVista(s){ CONF.sub=s; document.getElementById('conf-tab-cli').classList.toggle('on',s==='cli'); document.getElementById('conf-tab-forn').classList.toggle('on',s==='forn'); confrontoRender(); }
function confrontoFiltra(f){ CONF.flt=f; document.querySelectorAll('.conf-flt').forEach(b=>b.classList.toggle('on',b.dataset.cflt===f)); confrontoRender(); }
function _cNorm(s){ return (typeof _pcNorm==='function')?_pcNorm(s):String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function confrontoRender(){
  const box=document.getElementById('conf-list'), kpi=document.getElementById('conf-kpi'); if(!box) return;
  const q=(document.getElementById('conf-q')?document.getElementById('conf-q').value:'').toLowerCase();
  const R=bancaRiconcilia();
  // incassato/pagato reale dalla banca, per fattura → aggrego per controparte normalizzata
  if(CONF.sub==='cli') _confrontoClienti(box,kpi,q,R); else _confrontoFornitori(box,kpi,q,R);
}
function _confRiga(nome,genya,gest,banca,soloG,soloGe){
  const delta=genya-gest; const diff=Math.abs(delta)>Math.max(1,genya*0.01,gest*0.01);
  let tag=''; if(soloG) tag='<span style="color:#fbbf24">⚠ solo su Genya</span>'; else if(soloGe) tag='<span style="color:#fbbf24">⚠ solo nel gestionale</span>'; else if(diff) tag='<span style="color:#fbbf24">⚠ importi diversi (Δ '+_fEur(delta)+')</span>'; else tag='<span style="color:#34d399">✓ allineato</span>';
  return {diff:diff||soloG||soloGe, html:'<tr style="border-top:1px solid var(--brd)">'+
    '<td style="padding:7px 8px">'+_fEsc(nome)+'</td>'+
    '<td style="text-align:right;white-space:nowrap">'+_fEur(genya)+'</td>'+
    '<td style="text-align:right;white-space:nowrap">'+_fEur(gest)+'</td>'+
    '<td style="text-align:right;white-space:nowrap;color:'+(diff?'#fbbf24':'var(--text2)')+'">'+(delta?((delta>0?'+':'')+_fEur(delta)):'—')+'</td>'+
    '<td style="text-align:right;white-space:nowrap">'+_fEur(banca)+'</td>'+
    '<td style="font-size:11px">'+tag+'</td></tr>'};
}
function _confrontoClienti(box,kpi,q,R){
  const pc=(typeof _pcCompute==='function')?_pcCompute():{};
  const idx={}; Object.values(pc).forEach(e=>{ if(e.nome){ const k=_cNorm(e.nome); if(k)idx[k]=e; } Object.keys(e.membri||{}).forEach(raw=>{ const k=_cNorm(raw); if(k)idx[k]=e; }); });
  const gen={};
  FISCO.rows.forEach(f=>{ if(f.tipo!=='emessa'&&f.tipo!=='nc_emessa') return; const k=_cNorm(f.controparte_nome); if(!k) return;
    const g=gen[k]=gen[k]||{nome:f.controparte_nome||k,fatt:0,nc:0,banca:0};
    if(f.tipo==='emessa'){ g.fatt+=Number(f.totale)||0; g.banca+=(R.attr[f.id]||0); } else g.nc+=Math.abs(Number(f.totale)||0); });
  const usedPc=new Set(); const rows=[];
  Object.keys(gen).forEach(k=>{ const g=gen[k]; const e=idx[k]; if(e) usedPc.add(e.key!=null?e.key:e.nome);
    const genNet=g.fatt-g.nc, gestFatt=e?(Number(e.fatturato)||0):0;
    rows.push(Object.assign({nome:(e&&e.nome)||g.nome, banca:g.banca},_confRiga((e&&e.nome)||g.nome, genNet, gestFatt, g.banca, !e, false))); });
  // posizioni nel gestionale senza corrispondenza su Genya
  Object.values(pc).forEach(e=>{ const id=e.key!=null?e.key:e.nome; if(usedPc.has(id)) return; const gestFatt=Number(e.fatturato)||0; if(gestFatt<=0 && !(e.residuo>0)) return;
    rows.push(Object.assign({nome:e.nome, banca:Number(e.incassato)||0},_confRiga(e.nome,0,gestFatt,Number(e.incassato)||0,false,true))); });
  _confrontoShow(box,kpi,q,rows,'Fatturato Genya (netto)','Fatturato gestionale','Incassato banca');
}
function _confrontoFornitori(box,kpi,q,R){
  let pf={list:[]}; try{ if(typeof _pfCompute==='function') pf=_pfCompute(); }catch(e){}
  const idx={}; (pf.list||[]).forEach(e=>{ const k=_cNorm(e.nome); if(k)idx[k]=e; });
  const gen={};
  FISCO.rows.forEach(f=>{ if(f.tipo!=='ricevuta'&&f.tipo!=='nc_ricevuta') return; const k=_cNorm(f.controparte_nome); if(!k) return;
    const g=gen[k]=gen[k]||{nome:f.controparte_nome||k,ric:0,nc:0,banca:0};
    if(f.tipo==='ricevuta'){ g.ric+=Number(f.totale)||0; g.banca+=(R.attr[f.id]||0); } else g.nc+=Math.abs(Number(f.totale)||0); });
  const usedPf=new Set(); const rows=[];
  Object.keys(gen).forEach(k=>{ const g=gen[k]; const e=idx[k]; if(e) usedPf.add(e.nome);
    const genNet=g.ric-g.nc, gestImp=e?(Number(e.importo)||0):0;
    rows.push(Object.assign({nome:(e&&e.nome)||g.nome, banca:g.banca},_confRiga((e&&e.nome)||g.nome, genNet, gestImp, g.banca, !e, false))); });
  (pf.list||[]).forEach(e=>{ if(usedPf.has(e.nome)) return; const imp=Number(e.importo)||0; if(imp<=0) return;
    rows.push(Object.assign({nome:e.nome, banca:0},_confRiga(e.nome,0,imp,0,false,true))); });
  _confrontoShow(box,kpi,q,rows,'Ricevute Genya (netto)','Importo gestionale','Pagato banca');
}
function _confrontoShow(box,kpi,q,rows,colG,colGe,colB){
  let r=rows.slice();
  if(CONF.flt==='diff') r=r.filter(x=>x.diff);
  else if(CONF.flt==='soloGenya') r=r.filter(x=>/solo su Genya/.test(x.html));
  else if(CONF.flt==='soloGest') r=r.filter(x=>/solo nel gestionale/.test(x.html));
  if(q) r=r.filter(x=>(x.nome||'').toLowerCase().includes(q));
  r.sort((a,b)=>(b.banca||0)-(a.banca||0));
  const nDiff=rows.filter(x=>x.diff).length;
  if(kpi) kpi.innerHTML='<div class="sc"><div class="scv">'+rows.length+'</div><div class="scl">Controparti</div></div>'+
    '<div class="sc"><div class="scv" style="color:'+(nDiff?'#fbbf24':'#34d399')+'">'+nDiff+'</div><div class="scl">Da verificare</div></div>'+
    '<div class="sc"><div class="scv">'+(rows.length-nDiff)+'</div><div class="scl">Allineati</div></div>';
  if(!r.length){ box.innerHTML='<div style="padding:18px;color:var(--text2);text-align:center">Nessuna controparte in questa vista.</div>'; return; }
  box.innerHTML='<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">'+
    '<thead><tr style="text-align:left;color:var(--text2)"><th style="padding:7px 8px">Controparte</th><th style="text-align:right">'+colG+'</th><th style="text-align:right">'+colGe+'</th><th style="text-align:right">Δ</th><th style="text-align:right">'+colB+'</th><th>Stato</th></tr></thead><tbody>'+
    r.slice(0,1000).map(x=>x.html).join('')+'</tbody></table></div>'+(r.length>1000?'<div style="padding:8px;color:var(--text2);font-size:11px">Mostrate 1000 di '+r.length+'.</div>':'');
}
// una fattura può essere pagata solo se emessa non oltre ~7 giorni dopo il movimento
function _bDateOk(f,m){ if(!f.data_fattura||!m.data) return true; const g=new Date(m.data+'T00:00:00'); if(isNaN(g)) return true; g.setDate(g.getDate()+7); const gs=g.toISOString().slice(0,10); return String(f.data_fattura)<=gs; }
// Riconciliazione: assegna ogni movimento ad al più una fattura (per numero, poi per nome+importo)
let _riconCache=null;
function bancaInvalida(){ _riconCache=null; }
function bancaRiconcilia(){ if(_riconCache) return _riconCache; _riconCache=_bancaRiconciliaCalc(); return _riconCache; }
function _bancaRiconciliaCalc(){
  const emesse=FISCO.rows.filter(f=>f.tipo==='emessa'), ricevute=FISCO.rows.filter(f=>f.tipo==='ricevuta');
  const byNum={emessa:{},ricevuta:{}}; emesse.forEach(f=>{(byNum.emessa[String(f.numero)]=byNum.emessa[String(f.numero)]||[]).push(f);}); ricevute.forEach(f=>{(byNum.ricevuta[String(f.numero)]=byNum.ricevuta[String(f.numero)]||[]).push(f);});
  const attr={}; // fattura.id -> importo attribuito
  const movInfo={}; // mov.chiave -> {fatt:[{f,imp}], tipo:'num'|'nome'|null}
  const add=(f,imp)=>{ attr[f.id]=(attr[f.id]||0)+imp; };
  // PASSO 0: abbinamenti MANUALI confermati (hanno priorità e non si ricalcolano)
  BANCA.rows.forEach(m=>{ if(m.stato_ricon==='manuale' && m.fattura_id){ const f=FISCO.rows.find(x=>String(x.id)===String(m.fattura_id)); if(f){ add(f,m.importo); movInfo[m.chiave]={fatt:[{f,imp:m.importo}],tipo:'manuale'}; } } });
  // PASSO 1: per numero fattura
  BANCA.rows.forEach(m=>{
    if(movInfo[m.chiave]) return;
    const pool=m.segno==='entrata'?'emessa':'ricevuta'; const rif=(m.fatture_rif||'').split(',').filter(Boolean);
    if(!rif.length) return;
    const cp=_bCp(m);
    const targets=[]; const seen=new Set();
    rif.forEach(n=>{ let cands=(byNum[pool][n]||[]).filter(f=>_bDateOk(f,m)); if(!cands.length) return;
      let pick=cands.find(f=>_bNomeMatch(f.controparte_nome,cp)) || cands.slice().sort((a,b)=>Math.abs((a.totale||0)-m.importo)-Math.abs((b.totale||0)-m.importo))[0];
      if(pick && !seen.has(pick.id)){ seen.add(pick.id); targets.push(pick); } });
    if(!targets.length) return;
    let rem=m.importo; const assigned=[];
    if(targets.length===1){ const f=targets[0], tot=Number(f.totale)||0;
      // se il pagamento supera di molto il totale fattura, accredita solo fino al totale (il resto resta non attribuito)
      const give=(m.importo>tot*1.02 && tot>0)?tot:m.importo; add(f,give); assigned.push({f,imp:give}); }
    else { targets.forEach(f=>{ const cap=Math.max(0,(f.totale||0)-(attr[f.id]||0)); const give=Math.min(rem,cap||rem); if(give>0){ add(f,give); rem-=give; assigned.push({f,imp:give}); } }); if(rem>0.01 && assigned.length){ assigned[0].imp+=rem; add(assigned[0].f,rem); } }
    movInfo[m.chiave]={fatt:assigned,tipo:'num'};
  });
  // PASSO 2: per nome + importo (solo movimenti non ancora abbinati e "significativi")
  BANCA.rows.forEach(m=>{
    if(movInfo[m.chiave]) return; const pool=(m.segno==='entrata'?emesse:ricevute);
    const cp=_bCp(m); if(!cp) return;
    const cands=pool.filter(f=>_bNomeMatch(f.controparte_nome,cp) && _bDateOk(f,m));
    if(!cands.length) return;
    // preferisci fattura col residuo più vicino all'importo del movimento
    let best=null,bd=1e15; cands.forEach(f=>{ const res=(f.totale||0)-(attr[f.id]||0); const d=Math.abs(res-m.importo); if(d<bd){ bd=d; best=f; } });
    if(best && bd<=Math.max(2,(best.totale||0)*0.01)){ add(best,m.importo); movInfo[m.chiave]={fatt:[{f:best,imp:m.importo}],tipo:'nome'}; }
  });
  return {attr,movInfo,emesse,ricevute};
}
function bancaRender(){
  const box=document.getElementById('banca-list'), kpi=document.getElementById('banca-kpi'); if(!box) return;
  const q=(document.getElementById('banca-q')?document.getElementById('banca-q').value:'').toLowerCase();
  if(!BANCA.rows.length){ if(kpi)kpi.innerHTML=''; box.innerHTML='<div style="padding:18px;color:var(--text2);text-align:center">Nessun movimento. Importa l\'estratto conto Intesa qui sopra.</div>'; return; }
  const ent=BANCA.rows.filter(m=>m.segno==='entrata'), usc=BANCA.rows.filter(m=>m.segno==='uscita');
  const sE=ent.reduce((s,m)=>s+(Number(m.importo)||0),0), sU=usc.reduce((s,m)=>s+(Number(m.importo)||0),0);
  const R=bancaRiconcilia();
  const statoF=f=>{ const inc=R.attr[f.id]||0, tot=Number(f.totale)||0; if(inc<=0.01) return {k:'aperta',t:tot}; if(Math.abs(inc-tot)<=Math.max(0.5,tot*0.01)) return {k:'saldata',t:tot,inc}; if(inc<tot) return {k:'parziale',t:tot,inc}; return {k:'sovra',t:tot,inc}; };
  const emSald=R.emesse.filter(f=>statoF(f).k==='saldata').length, emAp=R.emesse.filter(f=>statoF(f).k==='aperta').length, emPar=R.emesse.filter(f=>statoF(f).k==='parziale').length;
  const nAbb=BANCA.rows.filter(m=>R.movInfo[m.chiave]).length;
  if(kpi) kpi.innerHTML='<div class="sc"><div class="scv">'+_fEur(sE)+'</div><div class="scl">Incassato (periodo)</div></div>'+
    '<div class="sc"><div class="scv">'+_fEur(sU)+'</div><div class="scl">Uscite (periodo)</div></div>'+
    '<div class="sc"><div class="scv">'+_fEur(sE-sU)+'</div><div class="scl">Saldo movimenti</div></div>'+
    '<div class="sc"><div class="scv">'+nAbb+' / '+BANCA.rows.length+'</div><div class="scl">Movimenti abbinati</div></div>'+
    '<div class="sc"><div class="scv">'+emSald+'</div><div class="scl">Emesse saldate</div></div>'+
    '<div class="sc"><div class="scv">'+(emPar+emAp)+'</div><div class="scl">Emesse da incassare</div></div>';
  const badgeSt={saldata:'<span style="color:#34d399">✓ Saldata</span>',parziale:'<span style="color:#fbbf24">◐ Parziale</span>',aperta:'<span style="color:#f87171">● Aperta</span>',sovra:'<span style="color:#fbbf24">▲ Sovra-incasso</span>'};
  if(BANCA.flt==='ricon'){
    // vista per fattura (emesse poi ricevute), con movimenti abbinati
    const movByFatt={}; BANCA.rows.forEach(m=>{ const info=R.movInfo[m.chiave]; if(info) info.fatt.forEach(a=>{ (movByFatt[a.f.id]=movByFatt[a.f.id]||[]).push({m,imp:a.imp,tipo:info.tipo}); }); });
    let list=R.emesse.concat(R.ricevute);
    if(q) list=list.filter(f=>((f.numero||'')+' '+(f.controparte_nome||'')).toLowerCase().includes(q));
    list.sort((a,b)=>String(b.data_fattura||'').localeCompare(String(a.data_fattura||'')));
    const card=f=>{ const st=statoF(f); const inc=R.attr[f.id]||0; const movs=movByFatt[f.id]||[];
      return '<div style="border:1px solid var(--brd);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--navy)">'+
        '<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">'+
          '<div style="font-size:13px">'+(f.tipo==='emessa'?'🟢':'🔵')+' <b>'+_fEsc(f.numero||'')+(f.anno?'/'+f.anno:'')+'</b> · '+_fEsc((f.controparte_nome||'').slice(0,42))+'</div>'+
          '<div style="font-size:12.5px">'+badgeSt[st.k]+' &nbsp;<b>'+_fEur(inc)+'</b> / '+_fEur(f.totale)+(st.k==='parziale'?' <span style="color:var(--text2)">(residuo '+_fEur((f.totale||0)-inc)+')</span>':'')+'</div>'+
        '</div>'+
        (movs.length?('<div style="margin-top:6px">'+movs.map(o=>'<div style="font-size:11.5px;color:var(--text2);cursor:pointer" onclick="bancaApriLink('+o.m.id+')" title="Correggi abbinamento">'+({num:'🔗 ',nome:'≈ ',manuale:'📌 '}[o.tipo]||'')+(o.m.data?o.m.data.split('-').reverse().join('/'):'')+' · '+_fEur(o.imp)+' · '+_fEsc((_bCp(o.m)||o.m.operazione||'').slice(0,46))+'</div>').join('')+'</div>'):'')+
      '</div>'; };
    box.innerHTML='<div style="font-size:11px;color:var(--text2);margin:0 2px 8px">🔗 abbinato per numero fattura · ≈ abbinato per nome+importo. Incassi→emesse, pagamenti→ricevute.</div>'+list.slice(0,800).map(card).join('')+(list.length>800?'<div style="padding:8px;color:var(--text2);font-size:11px">Mostrate 800 di '+list.length+' — cerca per restringere.</div>':'');
    return;
  }
  // viste movimenti grezzi
  let rows=BANCA.rows.slice();
  if(BANCA.flt==='incassi') rows=rows.filter(m=>m.segno==='entrata');
  else if(BANCA.flt==='uscite') rows=rows.filter(m=>m.segno==='uscita');
  else if(BANCA.flt==='nonabb') rows=rows.filter(m=>!R.movInfo[m.chiave]);
  if(q) rows=rows.filter(m=>((m.controparte_estratta||'')+' '+(m.operazione||'')+' '+(m.dettagli||'')+' '+(m.fatture_rif||'')).toLowerCase().includes(q));
  const totV=rows.reduce((s,m)=>s+(Number(m.importo)||0)*(m.segno==='entrata'?1:-1),0);
  if(!rows.length){ box.innerHTML='<div style="padding:18px;color:var(--text2);text-align:center">Nessun movimento in questa vista.</div>'; return; }
  box.innerHTML='<div style="font-size:12px;color:var(--text2);margin:0 2px 6px">'+rows.length+' movimenti · saldo vista '+_fEur(totV)+'</div>'+
    '<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">'+
    '<thead><tr style="text-align:left;color:var(--text2)"><th style="padding:7px 8px">Data</th><th>Controparte</th><th>Causale</th><th>Rif. fatt.</th><th>Abb.</th><th style="text-align:right">Importo</th></tr></thead><tbody>'+
    rows.slice(0,5000).map(m=>{ const info=R.movInfo[m.chiave]; const abb=info?({num:'🔗',nome:'≈',manuale:'📌'}[info.tipo]||'✓'):'—';
      return '<tr style="border-top:1px solid var(--brd)">'+
      '<td style="padding:7px 8px;white-space:nowrap">'+(m.data?m.data.split('-').reverse().join('/'):'')+'</td>'+
      '<td>'+_fEsc((_bCp(m)||'').slice(0,30))+'</td>'+
      '<td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_fEsc((m.operazione||'').slice(0,60))+'</td>'+
      '<td style="white-space:nowrap">'+_fEsc(m.fatture_rif||'')+'</td>'+
      '<td style="text-align:center;cursor:pointer" onclick="bancaApriLink('+m.id+')" title="Abbina/correggi manualmente">'+abb+'</td>'+
      '<td style="text-align:right;white-space:nowrap;font-weight:700;color:'+(m.segno==='entrata'?'#34d399':'#f87171')+'">'+(m.segno==='entrata'?'+':'−')+_fEur(m.importo)+'</td></tr>'; }).join('')+
    '</tbody></table></div>'+(rows.length>5000?'<div style="padding:8px;color:var(--text2);font-size:11px">Mostrati 5000 di '+rows.length+'.</div>':'');
}
async function bancaSvuota(){
  const stato=document.getElementById('banca-imp-stato');
  if(!confirm('Cancellare TUTTI i movimenti bancari importati?\n\nLe fatture NON vengono toccate. Dovrai reimportare l\'estratto conto.\n\nProcedere?')) return;
  try{ if(stato) stato.textContent='⏳ Svuoto i movimenti…';
    const r=await fetch(SUPABASE_URL+'/rest/v1/fisco_banca_movimenti?id=not.is.null',{method:'DELETE',headers:Object.assign({},FH(),{Prefer:'return=minimal'})});
    if(!r.ok && r.status!==404) throw new Error('HTTP '+r.status+': '+(await r.text()).slice(0,180));
    BANCA.rows=[]; BANCA.loaded=false; bancaInvalida(); if(stato) stato.textContent='✅ Movimenti bancari svuotati.'; bancaRender();
  }catch(e){ if(stato) stato.textContent='❌ Errore: '+(e.message||e); }
}
// ---- abbinamento manuale movimento → fattura (persistente) ----
async function bancaApriLink(id){
  const m=BANCA.rows.find(x=>String(x.id)===String(id)); if(!m) return; BANCA._linkId=id;
  if(!FISCO.loaded) await fiscoCarica();
  const info=document.getElementById('banca-link-mov');
  info.innerHTML='<b style="color:var(--text)">'+(m.data?m.data.split('-').reverse().join('/'):'')+' · '+(m.segno==='entrata'?'+':'−')+_fEur(m.importo)+'</b> · '+_fEsc(_bCp(m)||m.operazione||'')+'<br><span style="opacity:.8">'+_fEsc((m.dettagli||'').slice(0,120))+'</span>'+((m.stato_ricon==='manuale'&&m.fattura_id)?('<br><span style="color:#f0abfc">📌 Abbinato manualmente</span> — <a href="#" onclick="bancaScollega('+id+');return false" style="color:#6ea8fe">rimuovi abbinamento</a>'):'');
  document.getElementById('banca-link-q').value=''; bancaRenderLink();
  document.getElementById('banca-link-ov').style.display='flex';
}
function bancaRenderLink(){
  const m=BANCA.rows.find(x=>String(x.id)===String(BANCA._linkId)); if(!m) return;
  const q=(document.getElementById('banca-link-q').value||'').toLowerCase();
  const pool=FISCO.rows.filter(f=>m.segno==='entrata'?(f.tipo==='emessa'):(f.tipo==='ricevuta'));
  let list;
  if(q) list=pool.filter(f=>((f.numero||'')+' '+(f.controparte_nome||'')+' '+(f.oggetto||'')).toLowerCase().includes(q));
  else { const cp=_bCp(m); list=cp?pool.filter(f=>_bNomeMatch(f.controparte_nome,cp)):[]; if(!list.length) list=pool; }
  list=list.slice().sort((a,b)=>String(b.data_fattura||'').localeCompare(String(a.data_fattura||''))).slice(0,80);
  const box=document.getElementById('banca-link-list');
  box.innerHTML=list.length?list.map(f=>'<div onclick="bancaCollega('+m.id+',\''+f.id+'\')" style="border:1px solid var(--brd);border-radius:8px;padding:8px 10px;margin-bottom:6px;cursor:pointer;background:var(--navy);font-size:12.5px">'+(f.tipo==='emessa'?'🟢':'🔵')+' <b>'+_fEsc(f.numero||'')+(f.anno?'/'+f.anno:'')+'</b> · '+(f.data_fattura?f.data_fattura.split('-').reverse().join('/'):'')+' · '+_fEsc((f.controparte_nome||'').slice(0,40))+' · <b>'+_fEur(f.totale)+'</b></div>').join(''):'<div style="color:var(--text2);font-size:12px;padding:8px">Nessuna fattura trovata.</div>';
}
async function bancaCollega(id,fattId){
  try{ const r=await fetch(SUPABASE_URL+'/rest/v1/fisco_banca_movimenti?id=eq.'+id,{method:'PATCH',headers:Object.assign({},FH(),{Prefer:'return=minimal'}),body:JSON.stringify({fattura_id:String(fattId),stato_ricon:'manuale'})});
    if(!r.ok) throw new Error('HTTP '+r.status+': '+(await r.text()).slice(0,160));
    const m=BANCA.rows.find(x=>String(x.id)===String(id)); if(m){ m.fattura_id=String(fattId); m.stato_ricon='manuale'; }
    bancaInvalida(); document.getElementById('banca-link-ov').style.display='none'; bancaRender();
  }catch(e){ alert('Errore nel salvataggio: '+(e.message||e)); }
}
async function bancaScollega(id){
  try{ const r=await fetch(SUPABASE_URL+'/rest/v1/fisco_banca_movimenti?id=eq.'+id,{method:'PATCH',headers:Object.assign({},FH(),{Prefer:'return=minimal'}),body:JSON.stringify({fattura_id:null,stato_ricon:'nessuno'})});
    if(!r.ok) throw new Error('HTTP '+r.status+': '+(await r.text()).slice(0,160));
    const m=BANCA.rows.find(x=>String(x.id)===String(id)); if(m){ m.fattura_id=null; m.stato_ricon='nessuno'; }
    bancaInvalida(); document.getElementById('banca-link-ov').style.display='none'; bancaRender();
  }catch(e){ alert('Errore: '+(e.message||e)); }
}
// esponi le funzioni usate dagli onclick/nav
window.fiscoVista=fiscoVista; window.bancaImportFile=bancaImportFile; window.bancaRender=bancaRender; window.bancaFiltra=bancaFiltra; window.bancaRicarica=bancaRicarica; window.bancaSvuota=bancaSvuota;
window.bancaApriLink=bancaApriLink; window.bancaRenderLink=bancaRenderLink; window.bancaCollega=bancaCollega; window.bancaScollega=bancaScollega;
window.confrontoVista=confrontoVista; window.confrontoFiltra=confrontoFiltra; window.confrontoRender=confrontoRender; window.confrontoRicarica=confrontoRicarica;
window.fiscoImportFile=fiscoImportFile; window.rFisco=rFisco; window.fiscoRender=fiscoRender;
window.fiscoFiltra=fiscoFiltra; window.fiscoRicarica=fiscoRicarica; window.fiscoDettaglio=fiscoDettaglio;
window.fiscoSvuotaTutto=fiscoSvuotaTutto; window.fiscoSFiltra=fiscoSFiltra;
})();
