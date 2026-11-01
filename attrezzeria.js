// ============================================================
// ATTREZZERIA & IMPORT FATTURA ATTREZZATURA  (estratto da index.html)
// Script classico (stesso scope globale): usa esc/fmt/DB/toast/openModal ecc. definiti nel main.
// ============================================================

// ═══════════════════ ATTREZZERIA ═══════════════════
let ATTREZZERIA = [];
let _attrEditId = null;
let _fatturaRighe = [];

async function caricaAttrezzeria(){
  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/attrezzeria?select=*&order=creato_il.desc&limit=2000`, {
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}, cache:'no-cache'
    });
    if(res.ok) ATTREZZERIA = await res.json();
  }catch(e){ /* offline */ }
}

function _ubicazioni(){
  // deposito + targhe della flotta (dalle carte DKV) + mezzi citati nei rifornimenti
  const set = new Set(['Deposito']);
  (DB.carteDkv||[]).forEach(c=>{ if(c.veicolo && !/PRAMAC/i.test(c.veicolo)) set.add(c.veicolo); });
  ['GM972CF','CT068NE','FS504WE','FX943SG','NTI894'].forEach(t=>set.add(t));
  ATTREZZERIA.forEach(a=>{ if(a.ubicazione) set.add(a.ubicazione); });
  return [...set];
}
function _custodi(){
  return (DB.personale||[]).map(p=>p.nome).filter(Boolean);
}

async function rAttrezzeria(){
  if(!ATTREZZERIA.length) await caricaAttrezzeria();
  // filtro ubicazioni (popola una volta)
  const selU = document.getElementById('attr-filtro-ubic');
  if(selU && selU.options.length<=1){
    _ubicazioni().forEach(u=>{ const o=document.createElement('option'); o.value=u; o.textContent=u; selU.appendChild(o); });
  }
  const q = (document.getElementById('attr-cerca')?.value||'').toLowerCase().trim();
  const fStato = document.getElementById('attr-filtro-stato')?.value||'';
  const fUbic = document.getElementById('attr-filtro-ubic')?.value||'';
  let lista = ATTREZZERIA.filter(a=>{
    if(fStato && a.stato!==fStato) return false;
    if(fUbic && a.ubicazione!==fUbic) return false;
    if(q){
      const blob=`${a.nome} ${a.tipo} ${a.marca} ${a.modello} ${a.matricola} ${a.custode}`.toLowerCase();
      if(!blob.includes(q)) return false;
    }
    return true;
  });
  // KPI
  const attivi=ATTREZZERIA.filter(a=>a.stato==='attivo').length;
  const manut=ATTREZZERIA.filter(a=>a.stato==='manutenzione').length;
  const dism=ATTREZZERIA.filter(a=>a.stato==='dismesso').length;
  const valore=ATTREZZERIA.filter(a=>a.stato!=='dismesso').reduce((s,a)=>s+parseFloat(a.valore||0),0);
  const kpi=document.getElementById('attr-kpi');
  if(kpi) kpi.innerHTML=`
    <div class="sc"><div class="lb">Strumenti attivi</div><div class="vl">${attivi}</div></div>
    <div class="sc"><div class="lb">In manutenzione</div><div class="vl">${manut}</div></div>
    <div class="sc"><div class="lb">Dismessi</div><div class="vl">${dism}</div></div>
    <div class="sc"><div class="lb">Valore inventario</div><div class="vl">${fm(valore)}</div></div>`;
  // tabella
  const badge = s => s==='attivo'?'<span style="color:var(--green)">● attivo</span>'
    : s==='manutenzione'?'<span style="color:var(--gold,#C9A227)">● manut.</span>'
    : '<span style="color:var(--red)">● dismesso</span>';
  const tb=document.getElementById('attr-tb');
  if(!tb) return;
  if(!lista.length){ tb.innerHTML='<tr><td colspan="7" style="color:var(--text2);padding:14px">Nessuno strumento. Aggiungine uno o importa da una fattura.</td></tr>'; return; }
  tb.innerHTML=lista.map(a=>`<tr style="${a.stato==='dismesso'?'opacity:.55':''}">
    <td><b>${esc(a.nome||'—')}</b>${a.marca||a.modello?`<div style="font-size:11px;color:var(--text2)">${esc([a.marca,a.modello].filter(Boolean).join(' '))}</div>`:''}</td>
    <td class="mono" style="font-family:monospace">${esc(a.matricola||'—')}</td>
    <td>${esc(a.ubicazione||'—')}</td>
    <td>${esc(a.custode||'—')}</td>
    <td>${badge(a.stato)}${a.stato==='dismesso'&&a.motivo_dismissione?`<div style="font-size:10px;color:var(--text2)">${esc(a.motivo_dismissione)}</div>`:''}</td>
    <td class="mono">${a.valore?fm(a.valore):'—'}</td>
    <td><button class="bs" style="font-size:11px;padding:4px 10px" onclick="apriModalAttr('${a.id}')">✎</button></td>
  </tr>`).join('');
}

function apriModalAttr(id){
  _attrEditId = id||null;
  const a = id ? ATTREZZERIA.find(x=>String(x.id)===String(id)) : null;
  document.getElementById('modal-attr-title').textContent = a? 'Modifica strumento' : 'Nuovo strumento';
  document.getElementById('at-btn-elimina').style.display = a? 'inline-block' : 'none';
  document.getElementById('at-nome').value = a?.nome||'';
  document.getElementById('at-tipo').value = a?.tipo||'';
  document.getElementById('at-marca').value = a?.marca||'';
  document.getElementById('at-modello').value = a?.modello||'';
  document.getElementById('at-matricola').value = a?.matricola||'';
  _popolaSelect(document.getElementById('at-ubicazione'), _ubicazioni(), a?.ubicazione||'Deposito');
  _popolaSelect(document.getElementById('at-custode'), _custodi(), a?.custode||'');
  document.getElementById('at-stato').value = a?.stato||'attivo';
  document.getElementById('at-data-acq').value = a?.data_acquisto||'';
  document.getElementById('at-valore').value = a?.valore||'';
  document.getElementById('at-fornitore').value = a?.fornitore||'';
  document.getElementById('at-fattura').value = a?.fattura_rif||'';
  document.getElementById('at-motivo').value = a?.motivo_dismissione||'usura';
  document.getElementById('at-data-dism').value = a?.data_dismissione||'';
  document.getElementById('at-note').value = a?.note||'';
  attrToggleDismiss();
  // storico custodi
  const box=document.getElementById('at-storico-box');
  const storico = a?.storico_custodi||[];
  box.innerHTML = storico.length ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text2);font-weight:600;margin-bottom:6px">Storico custodi</div>`+
    storico.map(s=>`<div style="font-size:12px;color:var(--text2);padding:3px 0">👤 ${esc(s.custode)} — dal ${fdate(s.dal)}${s.al?` al ${fdate(s.al)}`:' <b style="color:var(--teal)">(attuale)</b>'}</div>`).join('') : '';
  // memorizza il custode di partenza per rilevare i cambi
  document.getElementById('modal-attr').dataset.custodeIniziale = a?.custode||'';
  openModal('modal-attr');
}

function attrToggleDismiss(){
  const dism = document.getElementById('at-stato').value==='dismesso';
  document.getElementById('at-dismiss-box').style.display = dism?'block':'none';
  if(dism && !document.getElementById('at-data-dism').value)
    document.getElementById('at-data-dism').value = today();
}

async function salvaAttr(){
  const nome=document.getElementById('at-nome').value.trim();
  if(!nome){ toast('⚠ Il nome è obbligatorio'); return; }
  const custodeNuovo=document.getElementById('at-custode').value;
  const custodeIniz=document.getElementById('modal-attr').dataset.custodeIniziale||'';
  const esistente=_attrEditId?ATTREZZERIA.find(x=>String(x.id)===String(_attrEditId)):null;
  let storico=(esistente?.storico_custodi||[]).slice();
  const oggi=today();
  // gestione passaggio di custode: chiude il precedente e apre il nuovo
  if(custodeNuovo!==custodeIniz){
    if(storico.length && !storico[storico.length-1].al) storico[storico.length-1].al=oggi;
    if(custodeNuovo) storico.push({custode:custodeNuovo, dal:oggi, al:null});
  } else if(!storico.length && custodeNuovo){
    storico.push({custode:custodeNuovo, dal:esistente?.data_acquisto||oggi, al:null});
  }
  const stato=document.getElementById('at-stato').value;
  const rec={
    nome, tipo:document.getElementById('at-tipo').value.trim()||null,
    marca:document.getElementById('at-marca').value.trim()||null,
    modello:document.getElementById('at-modello').value.trim()||null,
    matricola:document.getElementById('at-matricola').value.trim()||null,
    ubicazione:document.getElementById('at-ubicazione').value||null,
    custode:custodeNuovo||null,
    stato,
    data_acquisto:document.getElementById('at-data-acq').value||null,
    valore:parseFloat(document.getElementById('at-valore').value)||null,
    fornitore:document.getElementById('at-fornitore').value.trim()||null,
    fattura_rif:document.getElementById('at-fattura').value.trim()||null,
    motivo_dismissione: stato==='dismesso'?document.getElementById('at-motivo').value:null,
    data_dismissione: stato==='dismesso'?(document.getElementById('at-data-dism').value||oggi):null,
    note:document.getElementById('at-note').value.trim()||null,
    storico_custodi:storico,
    aggiornato_il:new Date().toISOString()
  };
  try{
    let res;
    if(_attrEditId){
      res=await fetch(`${SUPABASE_URL}/rest/v1/attrezzeria?id=eq.${_attrEditId}`, {method:'PATCH',
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify(rec)});
    } else {
      res=await fetch(`${SUPABASE_URL}/rest/v1/attrezzeria`, {method:'POST',
        headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify(rec)});
    }
    if(!res.ok) throw new Error(await res.text());
    closeModal('modal-attr'); ATTREZZERIA=[]; await caricaAttrezzeria(); rAttrezzeria();
    toast('✓ Strumento salvato');
  }catch(e){ toast('⚠ Errore salvataggio: '+String(e).slice(0,80)); }
}

async function eliminaAttr(){
  if(!_attrEditId || !confirm('Eliminare definitivamente questo strumento? Per toglierlo dall’uso conservando lo storico, usa invece lo stato "Dismesso".')) return;
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/attrezzeria?id=eq.${_attrEditId}`, {method:'DELETE',
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    if(!res.ok) throw new Error(await res.text());
    closeModal('modal-attr'); ATTREZZERIA=[]; await caricaAttrezzeria(); rAttrezzeria();
    toast('✓ Strumento eliminato');
  }catch(e){ toast('⚠ Errore: '+String(e).slice(0,80)); }
}

// ── IMPORT DA FATTURA (OCR/parse via API Claude) ──
async function importaFatturaFile(ev){
  const file=ev.target.files[0]; if(!file) return;
  document.getElementById('if-loading').style.display='block';
  try{
    let righe, meta;
    const nome=file.name.toLowerCase();
    if(nome.endsWith('.xml')){
      ({righe, meta} = parseFatturaXML(await file.text()));
    } else if(nome.endsWith('.pdf')){
      ({righe, meta} = await parseFatturaPDF(file));
    } else {
      // immagine: fuori da Claude.ai non c'è OCR → inserimento manuale guidato
      righe = [{descrizione:'', quantita:1, prezzo:0, attrezzo:true}];
      meta = {fornitore:'', numero:'', data:''};
      toast('ℹ Foto: compila le righe a mano (l\u2019OCR automatico non è disponibile offline)');
    }
    if(!righe.length){ toast('⚠ Nessuna riga trovata nella fattura'); document.getElementById('if-loading').style.display='none'; ev.target.value=''; return; }
    _fatturaRighe = righe;
    document.getElementById('if-forn').textContent = meta.fornitore||'—';
    document.getElementById('if-num').textContent = meta.numero||'—';
    document.getElementById('if-data').textContent = meta.data? fdate(meta.data) : '—';
    renderRigheFattura();
    document.getElementById('if-step1').style.display='none';
    document.getElementById('if-step2').style.display='block';
    document.getElementById('if-footer').style.display='flex';
  }catch(e){
    toast('⚠ Lettura fattura fallita: '+String(e.message||e).slice(0,90));
  }
  document.getElementById('if-loading').style.display='none';
  ev.target.value='';
}

// Estrae righe da un PDF con testo selezionabile (pdf.js, tutto locale).
// Strategia a colonne: raggruppa i frammenti per riga (Y) e li colloca nelle
// colonne codice/descrizione/UM/quantità/prezzo/importo in base alla X.
async function parseFatturaPDF(file){
  if(!window.pdfjsLib) throw new Error('libreria PDF non caricata — riprova tra qualche secondo');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data:buf}).promise;
  const items = [];         // tutti i frammenti con x,y,testo
  const larghezze = [];
  for(let p=1;p<=pdf.numPages;p++){
    const page = await pdf.getPage(p);
    const vp = page.getViewport({scale:1});
    larghezze.push(vp.width);
    const tc = await page.getTextContent();
    tc.items.forEach(it=>{
      const x=it.transform[4], y=it.transform[5];
      if(it.str.trim()) items.push({x, y:Math.round(y), s:it.str.trim(), pag:p});
    });
  }
  const W = larghezze[0]||595;
  // raggruppa per riga con tolleranza verticale (±2px): codice e descrizione
  // spesso hanno Y sfalsata di 1px e non vanno separati
  items.sort((a,b)=> (b.pag-a.pag) || (b.y-a.y) || (a.x-b.x));
  const righeOrdinate=[];
  let cur=null;
  items.slice().sort((a,b)=> (a.pag-b.pag) || (b.y-a.y) || (a.x-b.x)).forEach(it=>{
    if(cur && it.pag===cur.pag && Math.abs(it.y-cur.y)<=2){ cur.frs.push(it); }
    else { cur={pag:it.pag, y:it.y, frs:[it]}; righeOrdinate.push(cur); }
  });
  const righeArr = righeOrdinate.map(r=>r.frs.sort((a,b)=>a.x-b.x));

  const testoTot = righeArr.map(fr=>fr.map(f=>f.s).join(' ')).join('\n');
  // meta generiche (valgono su molti layout)
  const mNum = testoTot.match(/FATTURA\s+([0-9\/]+)\s+\d{2}[\/\-]\d{2}[\/\-]\d{4}/i)
    || testoTot.match(/N\.?\s*Documento[:\s]*([0-9]+)/i)
    || testoTot.match(/(?:fattura|n[°.]?)\s*([0-9]+\s*\/\s*[0-9]+)/i);
  const mData = testoTot.match(/Data[:\s]*(\d{2})[.\/\-](\d{2})[.\/\-](\d{4})/i)
    || testoTot.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/);
  // fornitore: prima riga in MAIUSCOLO lunga, spesso il nome ditta in alto o nel piè
  // fornitore: riconosce i fornitori noti dai loghi/testo, poi cerca ragioni sociali
  let forn='';
  if(/bricoman/i.test(testoTot)) forn='Bricoman Italia S.r.l.';
  else if(/malatesta/i.test(testoTot)) forn='Malatesta S.r.l.';
  else {
    const candidati=[...testoTot.matchAll(/([A-ZÀ-Ù][A-ZÀ-Ù&'\.\s]{3,40}(?:S\.?R\.?L|S\.?N\.?C|S\.?P\.?A|SRL|SNC|SPA))/g)]
      .map(m=>m[1].replace(/\s+/g,' ').trim())
      .filter(n=>!/OTTANTUNOCENTO|SPETT|DESTINAZION|CLIENTE/i.test(n));
    if(candidati.length) forn=candidati[0];
  }
  const meta={ fornitore:forn, numero:mNum?mNum[1].replace(/\s/g,''):'', data:mData?`${mData[3]}-${mData[2]}-${mData[1]}`:'' };

  // rileva le righe articolo. Due formati supportati:
  //  A) con UM (PZ/CF/KG…) tipo Malatesta
  //  B) tabella con prezzi in € e codice a inizio riga tipo Bricoman
  const UM=/^(PZ|CF|KG|NR|MT|LT|ML|CT|SC|MQ|MC|GR|BO|RT)$/i;
  const CODICE_INIZIO=/^(\d{6,14}|[A-Z0-9][A-Z0-9\-]{4,})\s+(.*)/;  // codice lungo + descrizione
  const righe=[];
  righeArr.forEach(fr=>{
    const testoRiga = fr.map(f=>f.s).join(' ');
    // scarta intestazioni e righe non-articolo
    if(/^\s*(codice|descrizione|riferimento al|d\.d\.t\.|totale|imponibile|aliquota|pagamento|iban|n\.documento)/i.test(testoRiga)) return;
    // numeri con decimali (con o senza €)
    const euro = [...testoRiga.matchAll(/€?\s?(\d{1,3}(?:\.\d{3})*|\d{1,4})[.,](\d{2})\b/g)]
      .map(m=>parseFloat((m[1].replace(/\./g,''))+'.'+m[2]));
    const umFrag = fr.find(f=>UM.test(f.s));

    let desc='', qta=1, prezzo=0;
    if(umFrag){
      // ── formato A (Malatesta) ──
      const umX=umFrag.x;
      const sinistra=fr.filter(f=>f.x<umX-2).sort((a,b)=>a.x-b.x);
      if(!sinistra.length) return;
      const sogliaDesc=W*0.16;
      const fragDesc=sinistra.filter(f=>f.x>=sogliaDesc);
      desc=(fragDesc.length?fragDesc:sinistra).map(f=>f.s).join(' ').replace(/\s+/g,' ').trim();
      const conVirg=fr.filter(f=>f.x>umX && /,\d{2,4}$/.test(f.s)).map(f=>parseFloat(f.s.replace(/\./g,'').replace(',','.')));
      prezzo=conVirg.length?conVirg[0]:0;
      const qFrag=fr.find(f=>f.x>umX && f.x<umX+80 && /^\d+(?:,\d{1,3})?$/.test(f.s));
      qta=qFrag?parseFloat(qFrag.s.replace(',','.')):1;
    } else {
      // ── formato B (Bricoman): codice+descrizione a inizio riga, prezzi in € ──
      // serve almeno un € o due numeri decimali per essere una riga articolo
      const hasEuro=/€/.test(testoRiga);
      if(!hasEuro || euro.length<2) return;
      const m=testoRiga.match(CODICE_INIZIO);
      if(!m) return;
      // descrizione = tutto dopo il codice, fino al primo % o €
      desc=m[2].replace(/\d{1,3}[.,]\d%.*$/,'').replace(/\s*\d{1,2},\d%.*/,'').split(/\s+€/)[0]
             .replace(/\s+\d{1,2},\d+%?\s*$/,'').replace(/\s+/g,' ').trim();
      // ripulisci eventuale "22,0%" rimasto in coda
      desc=desc.replace(/\s*\d{1,2}[.,]\d\s*%?\s*$/,'').trim();
      // quantità: primo intero isolato dopo la % IVA (spesso "1","6","10")
      const qm=testoRiga.match(/%\s+(\d{1,3}(?:\s\d)?)/);
      qta=qm?parseInt(qm[1].replace(/\s/g,'')):1;
      // prezzo unitario = primo importo € della riga (Prz. Net.)
      prezzo=euro.length?euro[0]:0;
    }
    if(!desc || desc.length<3) return;
    if(prezzo>0) righe.push({descrizione:desc, quantita:qta||1, prezzo, attrezzo:classificaAttrezzo(desc)});
  });
  return {righe, meta};
}

function parseFatturaXML(xml){
  const doc=new DOMParser().parseFromString(xml,'text/xml');
  // aggancio robusto: cerca per nome tag locale, ignorando i prefissi namespace (p:, ns2:, ecc.)
  const byTag=(root,name)=>{
    const out=[];
    const walk=(el)=>{ for(const ch of el.children){ if(ch.localName===name||ch.tagName.split(':').pop()===name) out.push(ch); walk(ch); } };
    walk(root||doc.documentElement); return out;
  };
  const first=(root,name)=>byTag(root,name)[0];
  const txt=(root,name)=>{ const e=first(root,name); return e?e.textContent.trim():''; };

  // fornitore = CedentePrestatore (il vero fornitore, mai il cliente)
  const ced=first(doc.documentElement,'CedentePrestatore');
  let forn=txt(ced,'Denominazione');
  if(!forn){ forn=[txt(ced,'Nome'),txt(ced,'Cognome')].filter(Boolean).join(' '); }
  const meta={
    fornitore: forn,
    piva: txt(first(ced,'IdFiscaleIVA'),'IdCodice'),
    numero: txt(doc.documentElement,'Numero'),
    data: txt(doc.documentElement,'Data')
  };

  const righe=byTag(doc.documentElement,'DettaglioLinee').map(l=>{
    const desc=txt(l,'Descrizione').replace(/\s+/g,' ').trim();
    const qta=parseFloat(txt(l,'Quantita')||'1')||1;
    // prezzo unitario; se manca usa PrezzoTotale/quantità
    let prezzo=parseFloat(txt(l,'PrezzoUnitario')||'0')||0;
    if(!prezzo){ const tot=parseFloat(txt(l,'PrezzoTotale')||'0')||0; prezzo=qta?tot/qta:tot; }
    const codice=txt(first(l,'CodiceArticolo'),'CodiceValore');
    const iva=parseFloat(txt(l,'AliquotaIVA')||'')||null;
    return {descrizione:desc, quantita:qta, prezzo:Math.round(prezzo*100)/100, codice, iva, attrezzo:classificaAttrezzo(desc)};
  }).filter(r=>r.descrizione);
  return {righe, meta};
}

// euristica: distingue attrezzo da consumabile guardando la descrizione
function classificaAttrezzo(desc){
  const d=desc.toLowerCase();
  const consumo=/(\bvit[ie]\b|tassell|nastro|silicon|guant|\bcolla\b|\blam[ae]\b|\bdisc|\bpunt[ae]\b|batteri|\bolio\b|spray|stucco|\bcarta\b|sacch|chiod|graff|\bcav[oi]\b|prolung|fascett|morsett|adesiv|ricambi|consumo|guarnizion)/;
  const attrezzo=/(trapan|avvitator|\bflex\b|flessibil|smerigliatric|spillatric|graffatric|fissatric|\bcutter\b|taglierin|martell|mazzuol|seghett|\bsega\b|troncatric|cacciavit|pinza|tenagli|\bchiav[ei]\b|livella|\bmetro\b|flessometr|tronches|fresatric|pistola|sparachiod|saldatric|generator|gruppo elettrogen|compressor|aspirator|tassellator|\bscala\b|trabattell|carriol|betonier|molatric|avvita|\btaglier|decespugli|idropulitric|termocamer|misurator|\blaser\b|faro|proiettor|argano|paranco|transpallet|carrell|segoncin|portainsert|morsa|calibr|squadra )/;
  if(attrezzo.test(d)) return true;
  if(consumo.test(d)) return false;
  return null; // incerto: lo lascio deciso dall'utente (deselezionato di default)
}

function renderRigheFattura(){
  const custodi=_custodi(), ubic=_ubicazioni();
  const tb=document.getElementById('if-righe');
  tb.innerHTML=_fatturaRighe.map((r,i)=>`<tr style="${r.attrezzo===false?'opacity:.5':''}">
    <td><input type="checkbox" class="if-chk" data-i="${i}" ${r.attrezzo?'checked':''} onchange="ifContaSel()"></td>
    <td><input type="text" value="${esc(r.descrizione)}" onchange="_fatturaRighe[${i}].descrizione=this.value" style="width:100%;min-width:160px;font-size:12px">${r.attrezzo===null?' <span style="font-size:10px;color:var(--gold,#C9A227)">?</span>':''}</td>
    <td><input type="number" value="${r.quantita}" onchange="_fatturaRighe[${i}].quantita=parseFloat(this.value)||1" style="width:52px;font-size:12px"></td>
    <td><input type="number" step="0.01" value="${r.prezzo}" onchange="_fatturaRighe[${i}].prezzo=parseFloat(this.value)||0" style="width:72px;font-size:12px"></td>
    <td><select class="if-cust" data-i="${i}" style="font-size:11px"><option value="">—</option>${custodi.map(c=>`<option>${esc(c)}</option>`).join('')}</select></td>
    <td><select class="if-ubic" data-i="${i}" style="font-size:11px">${ubic.map(u=>`<option${u==='Deposito'?' selected':''}>${esc(u)}</option>`).join('')}</select></td>
  </tr>`).join('');
  ifContaSel();
}
function ifAggiungiRiga(){ _fatturaRighe.push({descrizione:'', quantita:1, prezzo:0, attrezzo:true}); renderRigheFattura(); }
function ifToggleAll(v){ document.querySelectorAll('.if-chk').forEach(c=>c.checked=v); ifContaSel(); }
function ifContaSel(){ const n=document.querySelectorAll('.if-chk:checked').length; document.getElementById('if-conta').textContent=`${n} attrezzi selezionati`; }

async function salvaImportFattura(){
  const forn=document.getElementById('if-forn').textContent;
  const num=document.getElementById('if-num').textContent;
  const dataF=_fatturaRighe.length?document.getElementById('if-data').textContent:'';
  const dataIso=(dataF&&dataF.includes('/'))?dataF.split('/').reverse().join('-'):null;
  const sel=[...document.querySelectorAll('.if-chk:checked')].map(c=>parseInt(c.dataset.i));
  if(!sel.length){ toast('⚠ Nessun attrezzo selezionato'); return; }
  // 🛡 ANTI-DOPPIONE (06/08/2026): mai reimportare articoli già presenti dalla stessa fattura
  if(!ATTREZZERIA.length){ try{ await caricaAttrezzeria(); }catch(e){} }
  const _anorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const _fatRif=[num,dataF].filter(x=>x&&x!=='—').join(' ');
  const _giaImportati=new Set(ATTREZZERIA.filter(a=>(a.fattura_rif||'')===_fatRif).map(a=>_anorm(a.nome)));
  let _saltati=0;
  const nuovi=[];
  sel.forEach(i=>{
    const r=_fatturaRighe[i];
    if(_giaImportati.has(_anorm(r.descrizione))){ _saltati++; return; }
    const cust=document.querySelector(`.if-cust[data-i="${i}"]`)?.value||null;
    const ubi=document.querySelector(`.if-ubic[data-i="${i}"]`)?.value||'Deposito';
    const q=Math.max(1,Math.round(r.quantita||1));
    const base={nome:r.descrizione, valore:r.prezzo||null, custode:cust, ubicazione:ubi,
      stato:'attivo', fornitore:forn!=='—'?forn:null, fattura_rif:_fatRif,
      data_acquisto:dataIso, storico_custodi:cust?[{custode:cust,dal:dataIso||today(),al:null}]:[],
      aggiornato_il:new Date().toISOString()};
    if(q>5){
      // quantità alta = consumabile: UNA riga sola, quantità in nota (mai più 500 righe di viti)
      nuovi.push({...base, tipo:'Consumabile', note:'×'+q+' pezzi (da fattura)'});
    }else{
      // pochi pezzi = beni singoli: un record per pezzo (es. 3 trapani → 3 schede)
      for(let k=0;k<q;k++) nuovi.push({...base});
    }
  });
  if(!nuovi.length){ toast('Già tutto importato da questa fattura'+(_saltati?' ('+_saltati+' articoli saltati)':'')); return; }
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/attrezzeria`, {method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'}, body:JSON.stringify(nuovi)});
    if(!res.ok) throw new Error(await res.text());
    closeModal('modal-import-fattura');
    document.getElementById('if-step1').style.display='block';
    document.getElementById('if-step2').style.display='none';
    document.getElementById('if-footer').style.display='none';
    ATTREZZERIA=[]; await caricaAttrezzeria(); rAttrezzeria();
    toast(`✓ ${nuovi.length} attrezzi importati${_saltati?' · '+_saltati+' saltati (già presenti da questa fattura)':''}`);
  }catch(e){ toast('⚠ Errore import: '+String(e).slice(0,80)); }
}
