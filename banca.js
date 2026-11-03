/* ═══════════════════════════════════════════════════════════════════════
   BANCA — pagina di controllo dei movimenti bancari (Fisco e documenti → Banca)
   Ogni movimento ha uno stato:
     • con fattura  → abbinato dalla riconciliazione di Fisco (per numero, per nome+importo o a mano)
     • etichettato  → spesa/entrata senza fattura (stipendi, F24, commissioni…), a mano o da regola
     • da spiegare  → tutto il resto: è la colonna da portare a zero
   Registro del robot: cosa ha importato e quali pagamenti ha registrato, con "Annulla"
   (funzione banca_annulla_registrazione, solo amministratore).
   Dati: fisco_banca_movimenti (+ etichetta, nota), banca_regole, agente_log (canale robot-contabilita).
   La riconciliazione viene da fisco.js (fiscoQuadDati) — stesse regole della Quadratura.
   Script classico, caricato dopo fisco.js.
   ═══════════════════════════════════════════════════════════════════════ */

const BK = { vista:'mov', periodo:'90', flt:'tutti', conto:'', q:'', limite:200, dati:null, regole:[], log:[], aperto:null, carico:false };
const BK_ETICHETTE = ['Stipendi e compensi','F24 / tasse','Commissioni e spese bancarie','Carburante','Carta di credito','Giroconto tra conti','Prelievo contanti','Finanziamento / leasing','Assicurazioni','Utenze','Rimborso','Altro'];

(function bkStile(){
  if(document.getElementById('bk-css')) return;
  const s=document.createElement('style'); s.id='bk-css';
  s.textContent=`
  #bk-root{--bk-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--bk-soft:var(--td2,rgba(154,122,31,.06));--bk-sel:var(--td,rgba(154,122,31,.13));
    --bk-ok:var(--green,#2f7d4f);--bk-bad:var(--red,#b23a2e);--bk-warn:var(--gold,#c07d16)}
  #bk-root .num{font-family:var(--bk-mono);font-variant-numeric:tabular-nums}
  .bk-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .bk-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .bk-testa p{color:var(--text2);font-size:13px;margin-top:2px}
  .bk-viste{display:flex;gap:2px;border-bottom:1px solid var(--brd);margin-bottom:14px}
  .bk-viste button{all:unset;cursor:pointer;padding:9px 12px;font-size:13.5px;color:var(--text2);border-bottom:2px solid transparent}
  .bk-viste button.on{color:var(--text);border-bottom-color:var(--teal,#2b7a78);font-weight:600}
  .bk-tot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .bk-tot>div{background:var(--card);padding:12px 16px;min-width:0}
  .bk-tot small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .bk-tot .num{font-size:20px;font-weight:600}
  .bk-tot .bk-ts{display:block;font-size:12px;color:var(--text2)}
  .bk-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;overflow:hidden;min-width:0}
  .bk-filtri{display:flex;flex-wrap:wrap;gap:8px;padding:12px;border-bottom:1px solid var(--brd);background:var(--bk-soft);align-items:center}
  .bk-cerca{flex:1 1 220px;min-width:0;border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 11px;font:inherit;font-size:13px;color:var(--text)}
  .bk-sel{border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;color:var(--text);max-width:100%}
  .bk-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text)}
  .bk-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .bk-chip .n{font-family:var(--bk-mono);font-size:11px;opacity:.7;margin-left:4px}
  .bk-tw{overflow:auto;max-height:68vh}
  .bk-t{width:100%;border-collapse:collapse;font-size:13px}
  .bk-t th{position:sticky;top:0;background:var(--card);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 10px;border-bottom:1px solid var(--brd);white-space:nowrap;z-index:1}
  .bk-t td{padding:9px 10px;border-bottom:1px solid var(--brd);vertical-align:top}
  .bk-t .r{text-align:right;white-space:nowrap}
  .bk-t tbody tr:hover td{background:var(--bk-soft)}
  .bk-nome{font-weight:600}
  .bk-sub{font-size:12px;color:var(--text2);max-width:520px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .bk-in{color:var(--bk-ok)} .bk-out{color:var(--text)}
  .bk-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
  .bk-b.ok{color:var(--bk-ok);background:color-mix(in srgb,var(--bk-ok) 12%,transparent)}
  .bk-b.warn{color:var(--bk-warn);background:color-mix(in srgb,var(--bk-warn) 14%,transparent)}
  .bk-b.bad{color:var(--bk-bad);background:color-mix(in srgb,var(--bk-bad) 12%,transparent)}
  .bk-b.neu{color:var(--text2);border-color:var(--brd)}
  .bk-az{display:flex;gap:6px;flex-wrap:wrap}
  .bk-az button,.bk-btn{font-size:12px;padding:4px 9px;border:1px solid var(--brd);background:var(--card);border-radius:7px;cursor:pointer;color:var(--text);white-space:nowrap}
  .bk-az button:hover,.bk-btn:hover{border-color:var(--text2)}
  .bk-ed td{background:var(--bk-soft)}
  .bk-ed-box{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
  .bk-ed-box label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--text2)}
  .bk-ed-box input[type=text],.bk-ed-box select{border:1px solid var(--brd);background:var(--card);border-radius:7px;padding:7px 9px;font:inherit;font-size:13px;color:var(--text);min-width:180px}
  .bk-ed-box .bk-ric{flex-direction:row;align-items:center;gap:6px;font-size:12.5px;color:var(--text)}
  .bk-vuoto{padding:18px;color:var(--text2);font-size:13px;text-align:center}
  .bk-piu{padding:12px;text-align:center;border-top:1px solid var(--brd)}
  .bk-giro{padding:12px 14px;border-bottom:1px solid var(--brd);font-size:13px}
  .bk-giro b{font-weight:600}
  @media (max-width:900px){ .bk-tot{grid-template-columns:repeat(2,minmax(0,1fr))} .bk-sub{max-width:240px} }
  `;
  document.head.appendChild(s);
})();

/* ── aiuti ── */
const _bnkEur=n=>'€ '+(Number(n)||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
const _bnkEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _bnkData=d=>d?String(d).slice(0,10).split('-').reverse().join('/'):'—';
const _bnkH=()=>({apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'});
function _bnkIso(d){ const z=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); }
function _bnkCp(m){
  if(m.controparte_estratta && m.controparte_estratta.trim()) return m.controparte_estratta.trim();
  const op=String(m.operazione||'').replace(/^(bonifico( istantaneo)?|pagamento( tramite)?|addebito|accredito)\s+(disposto\s+da|a\s+favore\s+di|pos)?/i,'').trim();
  return op || m.operazione || '—';
}
function _bnkTesto(m){ return ((m.operazione||'')+' '+(m.dettagli||'')).toLowerCase(); }
function _bnkRegola(m){ const t=_bnkTesto(m); return BK.regole.find(r=>r.testo && t.includes(String(r.testo).toLowerCase()) && (!r.segno || r.segno===m.segno)) || null; }

/* ── caricamento ── */
async function _bnkGet(path){
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:_bnkH(),cache:'no-cache'});
  if(!r.ok) throw new Error(path.split('?')[0]+' HTTP '+r.status);
  return r.json();
}
async function bkCarica(ricarica){
  BK.carico=false;
  const F=await fiscoQuadDati(!!ricarica);
  let regole=[], log=[];
  try{ regole=await _bnkGet('banca_regole?select=*&order=id.asc'); }catch(e){ console.warn('banca_regole',e); }
  try{ log=await _bnkGet('agente_log?select=id,ts,azione,input,risultato&canale=eq.robot-contabilita&order=id.desc&limit=300'); }catch(e){ console.warn('registro robot',e); }
  BK.regole=Array.isArray(regole)?regole:[]; BK.log=Array.isArray(log)?log:[];
  // movimento → registrazione del robot (solo quelle non annullate)
  const perMov={};
  BK.log.filter(l=>l.azione!=='giro_contabilita' && !(l.risultato&&l.risultato.annullato_il))
    .forEach(l=>((l.input&&l.input.movimenti)||[]).forEach(mv=>{ perMov[mv.chiave]=l; }));
  BK.dati={ mov:F.mov||[], R:F.R||{movInfo:{}}, robot:perMov };
  BK.carico=true;
}

/* ── stato di un movimento ── */
function bkStato(m){
  const info=BK.dati.R.movInfo&&BK.dati.R.movInfo[m.chiave];
  if(info && info.fatt && info.fatt.length){
    const f=info.fatt.map(a=>a.f.numero+(a.f.controparte_nome?' '+a.f.controparte_nome:'')).join(', ');
    return { k:'fattura', testo:'Fattura '+f, come:info.tipo, robot:BK.dati.robot[m.chiave]||null };
  }
  if(m.etichetta) return { k:'etichetta', testo:m.etichetta, come:'mano' };
  const reg=_bnkRegola(m); if(reg) return { k:'etichetta', testo:reg.etichetta, come:'regola', regola:reg };
  return { k:'spiegare', testo:'Da spiegare' };
}

/* ── periodo e filtri ── */
function _bnkNelPeriodo(m){
  if(BK.periodo==='tutto') return true;
  const oggi=new Date(); let da;
  if(BK.periodo==='mese') da=new Date(oggi.getFullYear(),oggi.getMonth(),1);
  else if(BK.periodo==='mese_prec'){ da=new Date(oggi.getFullYear(),oggi.getMonth()-1,1); const a=_bnkIso(new Date(oggi.getFullYear(),oggi.getMonth(),0)); if(String(m.data)>a) return false; }
  else if(BK.periodo==='anno') da=new Date(oggi.getFullYear(),0,1);
  else { da=new Date(oggi); da.setDate(da.getDate()-(parseInt(BK.periodo,10)||90)); }
  return String(m.data||'')>=_bnkIso(da);
}
function _bnkBase(){
  return BK.dati.mov.filter(m=>_bnkNelPeriodo(m) && (!BK.conto || (m.conto||'(senza conto)')===BK.conto));
}

/* ── disegno ── */
async function rBanca(){
  const root=document.getElementById('bk-root'); if(!root) return;
  if(!BK.carico){ root.innerHTML='<div class="bk-vuoto">Carico movimenti, fatture e registro del robot…</div>';
    try{ await bkCarica(false); }catch(e){ root.innerHTML='<div class="bk-vuoto">⚠ Non riesco a caricare i dati: '+_bnkEsc(e.message||e)+'</div>'; return; } }
  bkRender();
}
async function bkRicarica(){ BK.carico=false; const root=document.getElementById('bk-root'); if(root) root.innerHTML='<div class="bk-vuoto">Ricarico…</div>';
  try{ await bkCarica(true); }catch(e){ if(root) root.innerHTML='<div class="bk-vuoto">⚠ '+_bnkEsc(e.message||e)+'</div>'; return; } bkRender(); }

function bkRender(){
  const root=document.getElementById('bk-root'); if(!root||!BK.dati) return;
  const mov=BK.dati.mov;
  const ultimoImp=mov.reduce((a,m)=>m.creato_il&&m.creato_il>a?m.creato_il:a,'');
  const ultimaData=mov.reduce((a,m)=>m.data&&m.data>a?m.data:a,'');
  const giro=BK.log.find(l=>l.azione==='giro_contabilita');
  const conti=[...new Set(mov.map(m=>m.conto||'(senza conto)'))].sort();
  root.innerHTML=`
    <div class="bk-testa">
      <div><h2>Banca</h2>
        <p>Movimenti fino al <b>${_bnkData(ultimaData)}</b> · ultimo import ${ultimoImp?new Date(ultimoImp).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'—'}${giro?' · robot passato '+new Date(giro.ts).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):''}</p></div>
      <div class="bk-az"><button class="bk-btn" onclick="bkRicarica()">↻ Aggiorna</button><button class="bk-btn" onclick="if(typeof menuApri==='function')menuApri('fisco');else nav('fisco')">Quadro fiscale</button></div>
    </div>
    <div class="bk-viste">
      <button class="${BK.vista==='mov'?'on':''}" onclick="bkVista('mov')">Movimenti</button>
      <button class="${BK.vista==='robot'?'on':''}" onclick="bkVista('robot')">Registro del robot</button>
      <button class="${BK.vista==='regole'?'on':''}" onclick="bkVista('regole')">Etichette ricordate (${BK.regole.length})</button>
    </div>
    <div id="bk-corpo"></div>`;
  if(BK.vista==='robot') return _bnkRenderRobot();
  if(BK.vista==='regole') return _bnkRenderRegole();
  const corpo=document.getElementById('bk-corpo');
  corpo.innerHTML=`
    <div class="bk-tot" id="bk-tot"></div>
    <div class="bk-pan">
      <div class="bk-filtri">
        <input class="bk-cerca" id="bk-q" placeholder="Cerca controparte, causale, importo…" value="${_bnkEsc(BK.q)}" oninput="BK.q=this.value;BK.limite=200;_bnkLista()">
        <select class="bk-sel" onchange="BK.periodo=this.value;BK.limite=200;_bnkLista()">
          ${[['mese','Questo mese'],['mese_prec','Mese scorso'],['30','Ultimi 30 giorni'],['90','Ultimi 90 giorni'],['anno','Quest\'anno'],['tutto','Tutto']].map(([v,t])=>`<option value="${v}"${BK.periodo===v?' selected':''}>${t}</option>`).join('')}
        </select>
        <select class="bk-sel" onchange="BK.conto=this.value;BK.limite=200;_bnkLista()">
          <option value="">Tutti i conti e carte</option>${conti.map(c=>`<option${BK.conto===c?' selected':''}>${_bnkEsc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="bk-filtri" id="bk-chips" style="background:transparent"></div>
      <div class="bk-tw"><table class="bk-t"><thead><tr><th>Data</th><th>Movimento</th><th class="r">Importo</th><th>Stato</th><th></th></tr></thead><tbody id="bk-righe"></tbody></table></div>
      <div id="bk-piu"></div>
    </div>`;
  _bnkLista();
}
function bkVista(v){ BK.vista=v; BK.aperto=null; bkRender(); }

function _bnkLista(){
  const base=_bnkBase().map(m=>({m,s:bkStato(m)}));
  const ent=base.filter(x=>x.m.segno==='entrata'), usc=base.filter(x=>x.m.segno!=='entrata');
  const somma=a=>a.reduce((t,x)=>t+(Number(x.m.importo)||0),0);
  const spieg=base.filter(x=>x.s.k==='spiegare');
  const tot=document.getElementById('bk-tot');
  if(tot) tot.innerHTML=`
    <div><small>Entrate</small><span class="num bk-in">${_bnkEur(somma(ent))}</span><div class="bk-ts">${ent.length} movimenti</div></div>
    <div><small>Uscite</small><span class="num">${_bnkEur(somma(usc))}</span><div class="bk-ts">${usc.length} movimenti</div></div>
    <div><small>Differenza</small><span class="num" style="color:${somma(ent)-somma(usc)>=0?'var(--bk-ok)':'var(--bk-bad)'}">${_bnkEur(somma(ent)-somma(usc))}</span><div class="bk-ts">entrate meno uscite del periodo</div></div>
    <div><small>Da spiegare</small><span class="num" style="color:${spieg.length?'var(--bk-warn)':'var(--bk-ok)'}">${spieg.length}</span><div class="bk-ts">${_bnkEur(somma(spieg))} senza fattura né etichetta</div></div>`;
  const gruppi={ tutti:base, entrate:ent, uscite:usc, spiegare:spieg, fattura:base.filter(x=>x.s.k==='fattura'), etichetta:base.filter(x=>x.s.k==='etichetta') };
  const nomi={ tutti:'Tutti', spiegare:'Da spiegare', fattura:'Con fattura', etichetta:'Etichettati', entrate:'Entrate', uscite:'Uscite' };
  const ch=document.getElementById('bk-chips');
  if(ch) ch.innerHTML=Object.keys(nomi).map(k=>`<button class="bk-chip${BK.flt===k?' on':''}" onclick="BK.flt='${k}';BK.limite=200;_bnkLista()">${nomi[k]}<span class="n">${gruppi[k].length}</span></button>`).join('');
  const q=BK.q.trim().toLowerCase();
  let righe=gruppi[BK.flt]||base;
  if(q) righe=righe.filter(x=>(_bnkTesto(x.m)+' '+(x.m.controparte_estratta||'')+' '+(x.m.etichetta||'')+' '+x.s.testo+' '+String(x.m.importo).replace('.',',')+' '+x.m.importo).toLowerCase().includes(q));
  righe.sort((a,b)=>String(b.m.data).localeCompare(String(a.m.data)) || (b.m.id-a.m.id));
  const tb=document.getElementById('bk-righe'); if(!tb) return;
  if(!righe.length){ tb.innerHTML='<tr><td colspan="5"><div class="bk-vuoto">Nessun movimento con questi filtri.</div></td></tr>'; document.getElementById('bk-piu').innerHTML=''; return; }
  tb.innerHTML=righe.slice(0,BK.limite).map(x=>_bnkRiga(x.m,x.s)).join('');
  document.getElementById('bk-piu').innerHTML=righe.length>BK.limite?`<div class="bk-piu"><button class="bk-btn" onclick="BK.limite+=300;_bnkLista()">Mostra altri (${righe.length-BK.limite})</button></div>`:'';
}

function _bnkBadge(s){
  if(s.k==='fattura'){
    const come={num:'per numero',nome:'per nome e importo',manuale:'a mano'}[s.come]||'';
    return `<span class="bk-b ok">✓ ${_bnkEsc(s.testo.slice(0,60))}</span><div class="bk-sub">abbinata ${come}${s.robot?' · registrata dal robot il '+_bnkData(s.robot.ts):''}</div>`;
  }
  if(s.k==='etichetta') return `<span class="bk-b neu">🏷 ${_bnkEsc(s.testo)}</span>${s.come==='regola'?'<div class="bk-sub">da etichetta ricordata</div>':''}`;
  return '<span class="bk-b warn">Da spiegare</span>';
}
function _bnkRiga(m,s){
  const entrata=m.segno==='entrata';
  const az=[];
  if(s.k!=='fattura') az.push(`<button onclick="bkEtichetta(${m.id})">${s.k==='etichetta'?'Cambia etichetta':'Etichetta'}</button>`);
  if(s.k==='etichetta' && s.come==='mano') az.push(`<button onclick="bkTogliEtichetta(${m.id})" title="Togli l'etichetta">✕</button>`);
  az.push(`<button onclick="bkAbbina(${m.id})" title="Collega o scollega a mano una fattura">${s.k==='fattura'&&s.come==='manuale'?'Abbinamento':'Abbina fattura'}</button>`);
  let h=`<tr><td class="num" style="white-space:nowrap">${_bnkData(m.data)}${m.contabilizzato===false?'<div class="bk-sub">in attesa</div>':''}</td>
    <td><div class="bk-nome">${_bnkEsc(_bnkCp(m))}</div><div class="bk-sub">${_bnkEsc(((m.operazione||'')+' — '+(m.dettagli||'')).slice(0,220))}</div>${m.nota?'<div class="bk-sub">📝 '+_bnkEsc(m.nota)+'</div>':''}</td>
    <td class="r num ${entrata?'bk-in':'bk-out'}">${entrata?'+':'−'} ${_bnkEur(m.importo)}<div class="bk-sub" style="text-align:right">${_bnkEsc((m.conto||'').replace(/^Conto\s*/,''))}</div></td>
    <td>${_bnkBadge(s)}</td><td><div class="bk-az">${az.join('')}</div></td></tr>`;
  if(BK.aperto===m.id) h+=_bnkEditor(m,s);
  return h;
}

/* ── etichette ── */
function bkEtichetta(id){ BK.aperto=(BK.aperto===id?null:id); _bnkLista(); }
function _bnkEditor(m,s){
  const usate=[...new Set([...BK_ETICHETTE, ...BK.regole.map(r=>r.etichetta), ...BK.dati.mov.map(x=>x.etichetta).filter(Boolean)])];
  const corr=s.k==='etichetta'?s.testo:'';
  const proposta=_bnkCp(m).replace(/\s+/g,' ').slice(0,40);
  return `<tr class="bk-ed"><td></td><td colspan="4"><div class="bk-ed-box">
    <label>Etichetta<input type="text" id="bk-et" list="bk-et-list" value="${_bnkEsc(corr)}" placeholder="es. Stipendi e compensi"></label>
    <datalist id="bk-et-list">${usate.map(e=>`<option value="${_bnkEsc(e)}">`).join('')}</datalist>
    <label>Nota (facoltativa)<input type="text" id="bk-nota" value="${_bnkEsc(m.nota||'')}" placeholder="es. stipendio ottobre Rossi"></label>
    <label class="bk-ric"><input type="checkbox" id="bk-ric"> Ricorda: etichetta da sola i movimenti ${m.segno==='entrata'?'in entrata':'in uscita'} che contengono</label>
    <label>&nbsp;<input type="text" id="bk-ric-t" value="${_bnkEsc(proposta)}"></label>
    <button class="bp" onclick="bkSalvaEtichetta(${m.id})">Salva</button><button class="bk-btn" onclick="bkEtichetta(${m.id})">Annulla</button>
  </div></td></tr>`;
}
async function _bnkPatchMov(id,body){
  const r=await fetch(SUPABASE_URL+'/rest/v1/fisco_banca_movimenti?id=eq.'+id,{method:'PATCH',headers:Object.assign(_bnkH(),{Prefer:'return=minimal'}),body:JSON.stringify(body)});
  if(!r.ok) throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,120));
  const m=BK.dati.mov.find(x=>x.id===id); if(m) Object.assign(m,body);
}
async function bkSalvaEtichetta(id){
  const et=(document.getElementById('bk-et').value||'').trim(), nota=(document.getElementById('bk-nota').value||'').trim();
  const ric=document.getElementById('bk-ric').checked, testo=(document.getElementById('bk-ric-t').value||'').trim();
  if(!et){ toast('Scrivi o scegli un\'etichetta'); return; }
  const m=BK.dati.mov.find(x=>x.id===id); if(!m) return;
  try{
    await _bnkPatchMov(id,{etichetta:et, nota:nota||null});
    if(ric){
      if(testo.length<4){ toast('Testo da ricordare troppo corto (almeno 4 caratteri)'); }
      else{
        const r=await fetch(SUPABASE_URL+'/rest/v1/banca_regole',{method:'POST',headers:Object.assign(_bnkH(),{Prefer:'return=representation'}),body:JSON.stringify({testo, segno:m.segno, etichetta:et})});
        if(!r.ok) throw new Error('regola HTTP '+r.status);
        BK.regole.push((await r.json())[0]);
        const simili=BK.dati.mov.filter(x=>!x.etichetta && x.segno===m.segno && _bnkTesto(x).includes(testo.toLowerCase())).length;
        toast('✓ Etichetta salvata · ricordata: vale anche per '+simili+' movimenti simili');
      }
    } else toast('✓ Etichetta salvata');
    BK.aperto=null; _bnkLista();
  }catch(e){ toast('⚠ Non salvata: '+(e.message||e)); }
}
async function bkTogliEtichetta(id){
  try{ await _bnkPatchMov(id,{etichetta:null}); toast('Etichetta tolta'); _bnkLista(); }catch(e){ toast('⚠ '+(e.message||e)); }
}

/* ── abbinamento manuale: riusa la finestra di Fisco ── */
function bkAbbina(id){
  const ov=document.getElementById('banca-link-ov');
  if(ov && ov.parentElement!==document.body) document.body.appendChild(ov);   // fuori dalla pagina Fisco (nascosta)
  if(typeof bancaApriLink==='function') bancaApriLink(id);
}
['bancaCollega','bancaScollega'].forEach(n=>{
  const orig=window[n]; if(typeof orig!=='function') return;
  window[n]=async function(){ const r=await orig.apply(this,arguments); if(typeof curPg!=='undefined' && curPg==='banca' && BK.carico){ BK.dati.R=fiscoQuadDati?(await fiscoQuadDati(false)).R:BK.dati.R; _bnkLista(); } return r; };
});

/* ── registro del robot ── */
function _bnkRenderRobot(){
  const corpo=document.getElementById('bk-corpo');
  const giri=BK.log.filter(l=>l.azione==='giro_contabilita');
  const reg=BK.log.filter(l=>l.azione!=='giro_contabilita');
  if(!BK.log.length){ corpo.innerHTML='<div class="bk-pan"><div class="bk-vuoto">Nessuna attività del robot (o non hai i permessi da amministratore per vederla).</div></div>'; return; }
  const riga=l=>{ const i=l.input||{}, r=l.risultato||{}, ann=!!r.annullato_il, cli=l.azione==='registra_incasso_banca';
    const movs=(i.movimenti||[]).map(m=>_bnkData(m.data)+' '+_bnkEur(m.importo)).join(' + ');
    return `<tr><td class="num" style="white-space:nowrap">${new Date(l.ts).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})}</td>
      <td><div class="bk-nome">${cli?'Incasso':'Pagamento'} · ${_bnkEsc(i.controparte||'')}</div><div class="bk-sub">Fattura ${_bnkEsc(i.fattura_genya||'')}${i.protocollo?' (prot. '+_bnkEsc(i.protocollo)+')':''} → ${cli?'Fatture e scadenze':'Fatture fornitori'} ${_bnkEsc(r.numero_gestionale||'')}</div><div class="bk-sub">Banca: ${_bnkEsc(movs)}</div></td>
      <td class="r num">${_bnkEur(i.importo_banca!=null?i.importo_banca:(i.movimenti||[]).reduce((s,m)=>s+(Number(m.importo)||0),0))}${i.totale_fattura?'<div class="bk-sub">su '+_bnkEur(i.totale_fattura)+'</div>':''}</td>
      <td>${ann?'<span class="bk-b neu">Annullata il '+_bnkData(String(r.annullato_il).slice(0,10))+'</span>':'<span class="bk-b ok">Registrata</span>'}</td>
      <td>${ann?'':(i.prima?`<button class="bk-btn" onclick="bkAnnulla(${l.id})">Annulla</button>`:'<span class="bk-sub">modifica dalla pagina della fattura</span>')}</td></tr>`; };
  const g=giri[0], gr=g&&g.risultato||{};
  const filesTxt=g?((gr.banca&&gr.banca.file)||[]).map(f=>_bnkEsc(f.file)+': '+_bnkEsc(f.esito)).join('<br>'):'';
  corpo.innerHTML=`
    ${g?`<div class="bk-pan" style="margin-bottom:14px"><div class="bk-giro"><b>Ultimo giro:</b> ${new Date(g.ts).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})}${gr.prova?' · <span class="bk-b warn">in prova</span>':''}${(gr.errori||[]).length?' · <span class="bk-b bad">errori: '+_bnkEsc(gr.errori.join(' | ')).slice(0,300)+'</span>':''}
      <div class="bk-sub" style="max-width:none;display:block;margin-top:4px">Fisco: ${gr.fisco?(gr.fisco.nuovi+' documenti nuovi, '+gr.fisco.aggiornati+' aggiornati'):'—'} · Banca: ${gr.banca?(gr.banca.movimenti+' movimenti importati'):'—'}
      ${['cli','forn'].map(k=>gr.quadratura&&gr.quadratura[k]?' · '+(k==='cli'?'Clienti':'Fornitori')+': '+(gr.quadratura[k].registrati||[]).length+' registrati, '+(gr.quadratura[k].n_da_confermare||0)+' da confermare':'').join('')}</div>
      ${filesTxt?'<div class="bk-sub" style="max-width:none;display:block;margin-top:4px">'+filesTxt+'</div>':''}</div></div>`:''}
    <div class="bk-pan"><div class="bk-filtri"><b style="font-size:13px">Pagamenti registrati dal robot</b><span class="bk-sub" style="display:inline">Annulla rimette la fattura com'era prima; il robot poi non la ritocca più.</span></div>
      <div class="bk-tw"><table class="bk-t"><thead><tr><th>Quando</th><th>Cosa</th><th class="r">Importo</th><th>Stato</th><th></th></tr></thead>
      <tbody>${reg.length?reg.map(riga).join(''):'<tr><td colspan="5"><div class="bk-vuoto">Il robot non ha ancora registrato pagamenti.</div></td></tr>'}</tbody></table></div></div>`;
}
async function bkAnnulla(id){
  const l=BK.log.find(x=>x.id===id); if(!l) return;
  const i=l.input||{};
  if(!confirm('Annullare la registrazione del '+(l.azione==='registra_incasso_banca'?'incasso':'pagamento')+' di '+(i.controparte||'')+' (fattura '+(i.fattura_genya||'')+')?\n\nLa fattura torna com\'era prima del robot e il robot non la ritocca più: da lì la gestisci tu.')) return;
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/banca_annulla_registrazione',{method:'POST',headers:_bnkH(),body:JSON.stringify({p_log_id:id})});
    if(!r.ok){ let t=''; try{ t=(await r.json()).message||''; }catch(e){} throw new Error(t||('HTTP '+r.status)); }
    toast('✓ Registrazione annullata'); try{ if(typeof invalidaCache==='function') invalidaCache(); }catch(e){}
    await bkRicarica(); BK.vista='robot'; bkRender();
  }catch(e){ toast('⚠ Non annullata: '+(e.message||e)); }
}

/* ── etichette ricordate ── */
function _bnkRenderRegole(){
  const corpo=document.getElementById('bk-corpo');
  const conta=r=>BK.dati.mov.filter(m=>!m.etichetta && (!r.segno||r.segno===m.segno) && _bnkTesto(m).includes(String(r.testo).toLowerCase())).length;
  corpo.innerHTML=`<div class="bk-pan"><div class="bk-filtri"><span class="bk-sub" style="display:inline;max-width:none">Si creano dalla lista movimenti (Etichetta → "Ricorda"). Valgono subito anche per i movimenti già importati.</span></div>
    <div class="bk-tw"><table class="bk-t"><thead><tr><th>Se il movimento contiene</th><th>Verso</th><th>Etichetta</th><th class="r">Movimenti</th><th></th></tr></thead><tbody>
    ${BK.regole.length?BK.regole.map(r=>`<tr><td class="bk-nome">${_bnkEsc(r.testo)}</td><td>${r.segno==='entrata'?'entrata':(r.segno==='uscita'?'uscita':'tutti')}</td><td><span class="bk-b neu">🏷 ${_bnkEsc(r.etichetta)}</span></td><td class="r num">${conta(r)}</td><td><button class="bk-btn" onclick="bkTogliRegola(${r.id})">Togli</button></td></tr>`).join(''):'<tr><td colspan="5"><div class="bk-vuoto">Nessuna etichetta ricordata.</div></td></tr>'}
    </tbody></table></div></div>`;
}
async function bkTogliRegola(id){
  if(!confirm('Togliere questa etichetta ricordata? I movimenti etichettati a mano restano come sono.')) return;
  try{ const r=await fetch(SUPABASE_URL+'/rest/v1/banca_regole?id=eq.'+id,{method:'DELETE',headers:_bnkH()}); if(!r.ok) throw new Error('HTTP '+r.status);
    BK.regole=BK.regole.filter(x=>x.id!==id); _bnkRenderRegole(); }catch(e){ toast('⚠ '+(e.message||e)); }
}

window.rBanca=rBanca; window.bkRender=bkRender; window.bkRicarica=bkRicarica; window.bkVista=bkVista; window.bkEtichetta=bkEtichetta;
window.bkSalvaEtichetta=bkSalvaEtichetta; window.bkTogliEtichetta=bkTogliEtichetta; window.bkAbbina=bkAbbina; window.bkAnnulla=bkAnnulla; window.bkTogliRegola=bkTogliRegola;
