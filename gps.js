/* ═══════════════════════════════════════════════════════════════════════
   GPS RADIUS / KINESIS — tragitti nel gestionale (Fase 1: import assistito)
   Report "Storico viaggi" (CSV, Excel "Detailed View" o Excel un foglio per mezzo):
   Targa Veicolo, Nome autista, Data, Ora di inizio, Ora di fine, Luogo di partenza,
   Luogo di arrivo, Tempo alla guida ("0h 24m"), Tempo di sosta ("HH:MM:SS"), Distanza percorsa (km).
   • gpsImporta: legge il file, mostra l'anteprima, salva in gps_tragitti (anti-doppione su "chiave").
   • gpsCaricaPeriodo: rilegge i tragitti dal cloud e riempie _GPS (usato dal Controllo DKV).
   • gpsPosizione: dov'era il mezzo a una certa ora (in sosta dopo un viaggio / in viaggio / nessun dato).
   Script classico, caricato dopo il codice principale (usa _GPS, isoLocale, toast).
   ═══════════════════════════════════════════════════════════════════════ */

const GPS2 = { tragitti:{}, periodo:null };   // tragitti: TARGA → { 'AAAA-MM-GG': [viaggi ordinati per ora] }

/* ── lettura dei formati ── */
function _gpsTarga(s){ return String(s==null?'':s).replace(/\s/g,'').toUpperCase(); }
function _gpsData(v){
  if(v==null||v==='') return null;
  if(v instanceof Date && !isNaN(v)) return isoLocale(v);
  if(typeof v==='number') return new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000).toISOString().slice(0,10);
  const s=String(v).trim(); let m;
  if((m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/))) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[0];
  return null;
}
function _gpsOra(v){
  if(v==null||v==='') return null;
  if(v instanceof Date && !isNaN(v)) return String(v.getHours()).padStart(2,'0')+':'+String(v.getMinutes()).padStart(2,'0');
  if(typeof v==='number'){ const f=v%1, min=Math.round(f*1440); return String(Math.floor(min/60)%24).padStart(2,'0')+':'+String(min%60).padStart(2,'0'); }
  const m=String(v).match(/(\d{1,2}):(\d{2})/); return m?m[1].padStart(2,'0')+':'+m[2]:null;
}
function _gpsMinuti(v){
  if(v==null||v==='') return null;
  if(typeof v==='number') return Math.round((v%1)*1440);
  if(v instanceof Date && !isNaN(v)) return v.getHours()*60+v.getMinutes();
  const s=String(v).trim(); let m;
  if((m=s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i)) && (m[1]||m[2])) return (parseInt(m[1]||0,10)*60)+parseInt(m[2]||0,10);   // "0h 24m"
  if((m=s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/))) return parseInt(m[1],10)*60+parseInt(m[2],10)+Math.round((parseInt(m[3]||0,10))/60);   // "HH:MM:SS"
  return null;
}
function _gpsKm(v){
  if(v==null||v==='') return null; if(typeof v==='number') return v;
  let s=String(v).replace(/[^\d.,-]/g,''); if(s.includes(',')&&!s.includes('.')) s=s.replace(',','.'); else s=s.replace(/,/g,'');
  const n=parseFloat(s); return isNaN(n)?null:n;
}
function _gpsLuogo(v){ const s=String(v==null?'':v).trim(); return (!s||s==='-'||/^non disponibile$/i.test(s))?null:s; }

// CSV con virgolette (gli indirizzi contengono virgole); separatore indovinato dalla riga d'intestazione
function _gpsCSV(testo){
  testo=String(testo).replace(/^﻿/,'');
  const prima=testo.split(/\r?\n/).find(r=>r.trim())||'';
  const sep=[';',',','\t'].map(c=>[c,(prima.match(new RegExp(c==='\t'?'\t':'\\'+c,'g'))||[]).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const righe=[]; let riga=[], campo='', q=false;
  for(let i=0;i<testo.length;i++){
    const c=testo[i];
    if(q){ if(c==='"'){ if(testo[i+1]==='"'){ campo+='"'; i++; } else q=false; } else campo+=c; continue; }
    if(c==='"') q=true;
    else if(c===sep){ riga.push(campo); campo=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&testo[i+1]==='\n') i++; riga.push(campo); righe.push(riga); riga=[]; campo=''; }
    else campo+=c;
  }
  if(campo!==''||riga.length){ riga.push(campo); righe.push(riga); }
  return righe.filter(r=>r.some(x=>String(x).trim()!==''));
}

// da una tabella (righe di celle) con intestazione → tragitti
function _gpsDaTabella(aoa, targaFoglio){
  const hi=aoa.findIndex(r=>r && r.some(c=>/targa/i.test(String(c||''))) && r.some(c=>/distanza|km/i.test(String(c||''))));
  if(hi<0) return null;
  const H=aoa[hi].map(c=>String(c==null?'':c).trim().toLowerCase());
  const col=(...nomi)=>{ for(const n of nomi){ const i=H.findIndex(h=>h===n); if(i>=0) return i; } for(const n of nomi){ const i=H.findIndex(h=>h.includes(n)); if(i>=0) return i; } return -1; };
  const C={ targa:col('targa veicolo','targa'), autista:col('nome autista','autista'), data:col('data'), ini:col('ora di inizio','inizio'), fine:col('ora di fine','fine'),
    da:col('luogo di partenza','partenza'), a:col('luogo di arrivo','arrivo'), guida:col('tempo alla guida','guida'), sosta:col('tempo di sosta','sosta'), km:col('distanza percorsa','distanza','km') };
  const out=[];
  for(const r of aoa.slice(hi+1)){
    if(!r) continue;
    const targa=_gpsTarga(C.targa>=0?r[C.targa]:targaFoglio), data=_gpsData(r[C.data]);
    if(!targa||!data) continue;
    out.push({ targa, autista:C.autista>=0?(String(r[C.autista]||'').trim()||null):null, data, ora_inizio:_gpsOra(r[C.ini]), ora_fine:_gpsOra(r[C.fine]),
      luogo_partenza:_gpsLuogo(r[C.da]), luogo_arrivo:_gpsLuogo(r[C.a]), guida_min:_gpsMinuti(r[C.guida]), sosta_min:_gpsMinuti(r[C.sosta]), km:_gpsKm(r[C.km]) });
  }
  return out;
}
// vecchio Excel "un foglio per mezzo": data nella prima colonna, poi i viaggi di quel giorno
function _gpsDaFogliPerMezzo(wb){
  const out=[];
  for(const sn of wb.SheetNames){
    const raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null}); let giorno=null;
    for(const r of raw){
      if(!r) continue;
      const d=_gpsData(r[0]); if(d && (r[0] instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(r[0])))) giorno=d;
      if(String(r[0]).startsWith('Totali')) continue;
      if(giorno && r[1] && r[1]!=='Ora di inizio')
        out.push({ targa:_gpsTarga(sn), autista:null, data:giorno, ora_inizio:_gpsOra(r[1]), ora_fine:_gpsOra(r[2]), luogo_partenza:_gpsLuogo(r[3]), luogo_arrivo:_gpsLuogo(r[4]),
          guida_min:_gpsMinuti(r[5]), sosta_min:_gpsMinuti(r[6]), km:_gpsKm(r[7]) });
    }
  }
  return out;
}
async function gpsLeggiFile(file){
  let tragitti=null;
  if(/\.csv$/i.test(file.name) || /text\/csv/.test(file.type)) tragitti=_gpsDaTabella(_gpsCSV(await file.text()));
  else {
    const wb=XLSX.read(await file.arrayBuffer(),{cellDates:true});
    const det=wb.SheetNames.find(n=>/detailed view/i.test(n));
    for(const sn of (det?[det]:wb.SheetNames)){
      const t=_gpsDaTabella(XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null}), sn); if(t){ tragitti=(tragitti||[]).concat(t); }
    }
    if(!tragitti) tragitti=_gpsDaFogliPerMezzo(wb);
  }
  if(!tragitti||!tragitti.length) throw new Error('nessun viaggio riconosciuto: serve lo "Storico viaggi" di Radius (CSV o Excel)');
  // chiave anti-doppione + doppioni nello stesso file
  const visti=new Set(), uniche=[];
  tragitti.forEach(t=>{ t.chiave=[t.targa,t.data,t.ora_inizio||'',t.ora_fine||'',t.km==null?'':Number(t.km).toFixed(2)].join('|'); if(!visti.has(t.chiave)){ visti.add(t.chiave); uniche.push(t); } });
  return uniche;
}

/* ── import con anteprima ── */
async function gpsImporta(ev){
  const input=ev&&ev.target, file=input&&input.files&&input.files[0]; if(!file) return;
  const stato=document.getElementById('gps-stato');
  try{
    if(stato) stato.textContent='⏳ Leggo '+file.name+'…';
    const tr=await gpsLeggiFile(file);
    const perT={}; tr.forEach(t=>{ const v=perT[t.targa]=perT[t.targa]||{n:0,km:0}; v.n++; v.km+=Number(t.km)||0; });
    const date=tr.map(t=>t.data).sort();
    const elenco=Object.entries(perT).sort().map(([k,v])=>'• '+k+': '+v.n+' viaggi, '+Math.round(v.km).toLocaleString('it-IT')+' km').join('\n');
    if(!confirm('Storico viaggi GPS — '+file.name+'\nDal '+date[0].split('-').reverse().join('/')+' al '+date[date.length-1].split('-').reverse().join('/')+'\n\n'+tr.length+' viaggi:\n'+elenco+'\n\nSalvare nel gestionale? Reimportare lo stesso periodo non crea doppioni.')){ if(stato) stato.textContent=''; if(input) input.value=''; return; }
    if(stato) stato.textContent='⏳ Salvo '+tr.length+' viaggi…';
    for(let i=0;i<tr.length;i+=500){
      const parte=tr.slice(i,i+500).map(t=>Object.assign({},t,{file_origine:file.name.slice(0,120)}));
      const r=await fetch(SUPABASE_URL+'/rest/v1/gps_tragitti?on_conflict=chiave',{method:'POST',
        headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(parte)});
      if(!r.ok) throw new Error('salvataggio HTTP '+r.status+' '+(await r.text()).slice(0,140));
    }
    _gpsRiempi(tr);
    if(stato) stato.textContent='✓ Salvati '+tr.length+' viaggi di '+Object.keys(perT).length+' mezzi ('+date[0].split('-').reverse().join('/')+' → '+date[date.length-1].split('-').reverse().join('/')+'). Restano nel gestionale: la prossima volta non serve ricaricarli.';
    toast('📡 GPS salvato: '+tr.length+' viaggi');
  }catch(e){ if(stato) stato.textContent='⚠ '+(e.message||e); toast('⚠ Errore GPS: '+(e.message||e)); }
  if(input) input.value='';
}

/* ── dal cloud, per il periodo del controllo ── */
function _gpsRiempi(tr){
  GPS2.tragitti={}; const G={};
  tr.forEach(t=>{
    ((GPS2.tragitti[t.targa]=GPS2.tragitti[t.targa]||{})[t.data]=GPS2.tragitti[t.targa][t.data]||[]).push(t);
    const v=G[t.targa]=G[t.targa]||{giorni:{},kmTot:0}; const g=v.giorni[t.data]=v.giorni[t.data]||{km:0,luoghi:new Set()};
    const km=Number(t.km)||0; g.km+=km; v.kmTot+=km;
    [t.luogo_partenza,t.luogo_arrivo].forEach(l=>{ if(l) g.luoghi.add(_gpsCitta(l)||String(l).split(',')[0].trim()); });
  });
  Object.values(GPS2.tragitti).forEach(gg=>Object.values(gg).forEach(a=>a.sort((x,y)=>String(x.ora_inizio||'').localeCompare(String(y.ora_inizio||'')))));
  _GPS=G;
}
async function gpsCaricaPeriodo(da, a){
  const sposta=(d,n)=>{ const x=new Date(d+'T12:00:00'); x.setDate(x.getDate()+n); return isoLocale(x); };
  const dal=sposta(da,-1), al=sposta(a,1); const tutti=[];
  for(let from=0;;from+=1000){
    const r=await fetch(SUPABASE_URL+'/rest/v1/gps_tragitti?select=targa,autista,data,ora_inizio,ora_fine,luogo_partenza,luogo_arrivo,km&data=gte.'+dal+'&data=lte.'+al+'&order=data.asc',
      {headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Range-Unit':'items',Range:from+'-'+(from+999)},cache:'no-cache'});
    if(!r.ok) throw new Error('tragitti GPS HTTP '+r.status);
    const b=await r.json(); tutti.push(...b.map(t=>Object.assign(t,{ora_inizio:_gpsOra(t.ora_inizio),ora_fine:_gpsOra(t.ora_fine)}))); if(b.length<1000) break;
  }
  if(tutti.length) _gpsRiempi(tutti);
  GPS2.periodo={dal,al,n:tutti.length};
  return tutti.length;
}

/* ── posizione del mezzo a una certa ora ── */
function _gpsCitta(ind){
  if(!ind) return null; const s=String(ind);
  const m=s.match(/\b\d{5}\b\s*,?\s*([^,]+)/); if(m) return m[1].replace(/\(.*?\)/g,'').trim();   // "via …, 81100, Caserta"
  const p=s.split(',').map(x=>x.trim()).filter(Boolean); return p.length>1?p[p.length-1]:null;
}
function _gpsNorm(s){ return String(s||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function gpsPosizione(targa, data, ora){
  const giorno=(GPS2.tragitti[targa]||{})[data]||[];
  if(!giorno.length) return { tipo:'nessuno' };
  if(!ora) return { tipo:'giorno', luoghi:[...new Set(giorno.flatMap(t=>[t.luogo_partenza,t.luogo_arrivo]).filter(Boolean))] };
  const dentro=giorno.find(t=>t.ora_inizio && t.ora_fine && t.ora_inizio<=ora && ora<=t.ora_fine);
  if(dentro) return { tipo:'viaggio', viaggio:dentro, luogo:dentro.luogo_partenza+' → '+dentro.luogo_arrivo, citta:[_gpsCitta(dentro.luogo_partenza),_gpsCitta(dentro.luogo_arrivo)].filter(Boolean) };
  const prima=giorno.filter(t=>t.ora_fine && t.ora_fine<=ora).pop(), dopo=giorno.find(t=>t.ora_inizio && t.ora_inizio>=ora);
  const luogo=(prima&&prima.luogo_arrivo)||(dopo&&dopo.luogo_partenza)||null;
  const min=(h)=>{ const [a,b]=String(h).split(':').map(Number); return a*60+b; };
  return { tipo:'sosta', luogo, citta:[_gpsCitta(luogo)].filter(Boolean), daMin:prima?min(ora)-min(prima.ora_fine):null, aMin:dopo?min(dopo.ora_inizio)-min(ora):null };
}
// la città del distributore (testo DKV) compare tra le città del GPS?
function gpsStessoPosto(stazione, pos){
  const s=_gpsNorm(stazione); if(!s||!pos||!pos.citta||!pos.citta.length) return null;
  return pos.citta.some(c=>{ const n=_gpsNorm(c); return n && (s.includes(n) || n.split(' ').filter(w=>w.length>=4).some(w=>s.split(' ').includes(w))); });
}
// testo del punto vendita dalla riga originale DKV (le colonne cambiano tra un export e l'altro)
function gpsStazioneDkv(t){
  const r=t&&t.raw; if(!r) return '';
  const k=Object.keys(r).filter(x=>/stazion|punto (vendita|di accettazione)|accettazione|localit|luogo|indirizzo|citt/i.test(x));
  return k.map(x=>String(r[x]||'').trim()).filter(Boolean).join(' · ');
}

window.gpsImporta=gpsImporta; window.gpsCaricaPeriodo=gpsCaricaPeriodo; window.gpsPosizione=gpsPosizione;
window.gpsStessoPosto=gpsStessoPosto; window.gpsStazioneDkv=gpsStazioneDkv; window.gpsLeggiFile=gpsLeggiFile;
