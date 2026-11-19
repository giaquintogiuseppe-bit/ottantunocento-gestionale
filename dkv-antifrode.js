/* ═══════════════════════════════════════════════════════════════════════
   ANTIFRODE DKV — controllo delle autorizzazioni carburante ricevute da DKV
   (tabella Supabase dkv_autorizzazioni): transazioni sospette, senza
   scontrino o rifiutate. Sola lettura + "Segna vista" (stato='vista').
   Config Supabase solo dalle globali SUPABASE_URL / SUPABASE_KEY.
   Se la rete non risponde la pagina mostra "Dati non disponibili (offline)".
   Script classico, scope globale (prefisso DKA / dka).
   ═══════════════════════════════════════════════════════════════════════ */

const DKA = { filtro:'tutte', targa:'', giorni:0, righe:null, errore:false, caricando:false };

(function dkaStile(){
  if(document.getElementById('dka-css')) return;
  const s=document.createElement('style'); s.id='dka-css';
  s.textContent=`
  .dka-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .dka-testa p{color:var(--text2);font-size:13px;margin:2px 0 14px}
  .dka-tot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .dka-tot div{background:var(--card);padding:12px 16px;min-width:0}
  .dka-tot small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .dka-tot b{font-size:20px;font-weight:600}
  .dka-tot .rosso b{color:var(--red)}
  .dka-filtri{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
  .dka-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text)}
  .dka-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .dka-sel{border:1px solid var(--brd);background:var(--card);color:var(--text);border-radius:8px;padding:6px 9px;font:inherit;font-size:13px}
  .dka-tabw{overflow-x:auto;background:var(--card);border:1px solid var(--brd);border-radius:12px}
  .dka-t{width:100%;border-collapse:collapse;font-size:13px}
  .dka-t th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 10px;border-bottom:1px solid var(--brd);white-space:nowrap}
  .dka-t td{padding:9px 10px;border-bottom:1px solid var(--brd);vertical-align:top}
  .dka-t .r{text-align:right;white-space:nowrap}
  .dka-t tr.sosp{background:rgba(232,75,75,.09)}
  .dka-sub{font-size:12px;color:var(--text2)}
  .dka-mot{font-size:12px;color:var(--red);margin-top:3px}
  .dka-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;border:1px solid var(--brd);color:var(--text2)}
  .dka-b.bad{color:var(--red);border-color:var(--red)}
  .dka-b.ok{color:var(--green)}
  .dka-vuoto{color:var(--text2);font-size:13px;padding:16px}
  .dka-mini{font-size:11.5px;padding:3px 8px;border-radius:7px;border:1px solid var(--brd);background:var(--card);cursor:pointer;color:var(--text);white-space:nowrap}
  @media (max-width:760px){ .dka-tot{grid-template-columns:repeat(2,minmax(0,1fr))} }
  `;
  document.head.appendChild(s);
})();

const _dkaRifiutata = r => String(r.esito||'').toUpperCase().startsWith('DEC');
const _dkaSenzaScontrino = r => !r.scontrino_trovato;
const _dkaFm = v => (v==null||v==='') ? '' : (Math.round((+v||0)*100)/100).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
const _dkaData = s => { if(!s) return ''; const d=new Date(s); return isNaN(d)?String(s):d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); };
const _dkaEsc = s => (typeof esc==='function') ? esc(s) : String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _dkaAvviso = m => { try{ if(typeof toast==='function') toast(m); else console.warn(m); }catch(e){} };
function _dkaMotivi(r){
  let m=r.motivi_sospetto;
  if(typeof m==='string'){ try{ const j=JSON.parse(m); m=j; }catch(e){ m=m?[m]:[]; } }
  if(!Array.isArray(m)) m=m?[String(m)]:[];
  return m.map(String);
}

async function rDkvAntifrode(){
  const root=document.getElementById('dka-root'); if(!root) return;
  if(DKA.caricando) return;
  DKA.caricando=true;
  if(!DKA.righe) root.innerHTML='<div class="dka-vuoto">Carico le autorizzazioni DKV…</div>';
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/dkv_autorizzazioni?select=*&order=ts_transazione.desc.nullslast&limit=500',
      {headers:{apikey:SUPABASE_KEY, Authorization:'Bearer '+SUPABASE_KEY}});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    if(!Array.isArray(d)) throw new Error('risposta non valida');
    DKA.righe=d; DKA.errore=false;
  }catch(e){
    DKA.errore=true; if(!DKA.righe) DKA.righe=[];
  }
  DKA.caricando=false;
  dkaRender();
}

function dkaFiltrate(){
  const lim=DKA.giorni? Date.now()-DKA.giorni*864e5 : 0;
  return (DKA.righe||[]).filter(r=>{
    if(DKA.filtro==='sospette' && !r.sospetta) return false;
    if(DKA.filtro==='senza' && !_dkaSenzaScontrino(r)) return false;
    if(DKA.filtro==='rifiutate' && !_dkaRifiutata(r)) return false;
    if(DKA.targa && r.targa!==DKA.targa) return false;
    if(lim){ const t=new Date(r.ts_transazione||r.ricevuta_il||0).getTime(); if(!(t>=lim)) return false; }
    return true;
  });
}

function dkaImposta(k,v){ DKA[k]=v; dkaRender(); }

function dkaRender(){
  const root=document.getElementById('dka-root'); if(!root) return;
  const tutte=DKA.righe||[];
  const n={ tot:tutte.length, sosp:tutte.filter(r=>r.sospetta).length, senza:tutte.filter(_dkaSenzaScontrino).length, rif:tutte.filter(_dkaRifiutata).length };
  const targhe=[...new Set(tutte.map(r=>r.targa).filter(Boolean))].sort();
  const F=[['tutte','Tutte',n.tot],['sospette','Sospette',n.sosp],['senza','Senza scontrino',n.senza],['rifiutate','Rifiutate',n.rif]];
  const righe=dkaFiltrate();
  root.innerHTML=`
    <div class="dka-testa"><h2>Antifrode DKV</h2><p>Autorizzazioni carburante ricevute da DKV, con controllo di scontrino e anomalie.</p></div>
    ${DKA.errore?'<div class="dka-vuoto" style="border:1px solid var(--red);border-radius:10px;margin-bottom:12px;color:var(--red)">Dati non disponibili (offline). <button class="dka-mini" onclick="rDkvAntifrode()">Riprova</button></div>':''}
    <div class="dka-tot">
      <div><small>Transazioni</small><b>${n.tot}</b></div>
      <div class="rosso"><small>Sospette</small><b>${n.sosp}</b></div>
      <div><small>Senza scontrino</small><b>${n.senza}</b></div>
      <div><small>Rifiutate</small><b>${n.rif}</b></div>
    </div>
    <div class="dka-filtri">
      ${F.map(([k,t,c])=>`<button class="dka-chip ${DKA.filtro===k?'on':''}" onclick="dkaImposta('filtro','${k}')">${t} (${c})</button>`).join('')}
      <select class="dka-sel" aria-label="Mezzo" onchange="dkaImposta('targa',this.value)">
        <option value="">Tutti i mezzi</option>${targhe.map(t=>`<option value="${_dkaEsc(t)}" ${DKA.targa===t?'selected':''}>${_dkaEsc(t)}</option>`).join('')}
      </select>
      <select class="dka-sel" aria-label="Periodo" onchange="dkaImposta('giorni',+this.value)">
        ${[[0,'Tutto il periodo'],[7,'Ultimi 7 giorni'],[30,'Ultimi 30 giorni']].map(([g,t])=>`<option value="${g}" ${DKA.giorni===g?'selected':''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="dka-tabw"><table class="dka-t">
      <thead><tr><th>Data/ora</th><th>Targa</th><th>Prodotto</th><th class="r">Litri</th><th class="r">Importo</th><th>Stazione</th><th>Cantiere</th><th>Esito</th><th>Stato</th><th></th></tr></thead>
      <tbody>${righe.length? righe.map(dkaRiga).join('') : `<tr><td colspan="10" class="dka-vuoto">${DKA.errore?'Dati non disponibili (offline)':'Nessuna transazione con questi filtri.'}</td></tr>`}</tbody>
    </table></div>`;
}

function dkaRiga(r){
  const mot=_dkaMotivi(r), rif=_dkaRifiutata(r), vista=r.stato==='vista';
  const id=_dkaEsc(r.authorization_id);
  return `<tr class="${r.sospetta?'sosp':''}">
    <td class="r">${_dkaEsc(_dkaData(r.ts_transazione||r.ricevuta_il))}</td>
    <td><b>${_dkaEsc(r.targa||'')}</b></td>
    <td>${_dkaEsc(r.prodotto||'')}</td>
    <td class="r">${r.litri!=null?_dkaEsc((+r.litri).toLocaleString('it-IT',{maximumFractionDigits:2})):''}</td>
    <td class="r">${_dkaEsc(_dkaFm(r.importo))}</td>
    <td>${_dkaEsc(r.stazione||'')}<div class="dka-sub">${_dkaEsc(r.citta||'')}</div></td>
    <td>${_dkaEsc(r.cantiere||'')}${_dkaSenzaScontrino(r)?'<div class="dka-sub">senza scontrino</div>':''}</td>
    <td><span class="dka-b ${rif?'bad':'ok'}">${_dkaEsc(r.esito||'')}</span>${r.sospetta?'<div class="dka-mot">SOSPETTA'+(mot.length?': '+mot.map(_dkaEsc).join('; '):'')+'</div>':''}</td>
    <td>${_dkaEsc(r.stato||'')}</td>
    <td>${vista?'':`<button class="dka-mini" onclick="dkaSegnaVista('${id.replace(/'/g,'')}',this)">Segna vista</button>`}</td>
  </tr>`;
}

async function dkaSegnaVista(id,btn){
  if(btn) btn.disabled=true;
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/dkv_autorizzazioni?authorization_id=eq.'+encodeURIComponent(id),
      {method:'PATCH', headers:{apikey:SUPABASE_KEY, Authorization:'Bearer '+SUPABASE_KEY, 'Content-Type':'application/json', Prefer:'return=minimal'},
       body:JSON.stringify({stato:'vista'})});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const x=(DKA.righe||[]).find(q=>String(q.authorization_id)===String(id)); if(x) x.stato='vista';
    dkaRender(); _dkaAvviso('Segnata come vista ✓');
  }catch(e){
    if(btn) btn.disabled=false;
    _dkaAvviso('Impossibile aggiornare (offline o errore)');
  }
}
