/* ═══════════════════════════════════════════════════════════════════════
   PRESENZE e NUOVA GIORNATA — veste nuova (stesso stile della vista Clienti)
   Solo la parte grafica: il "motore" resta quello del Gestionale
   (toggleP, aggiungiTurno, rimuoviTurno, updateTurno, savePres,
   saveNuovaGiornata, getTurniRaw, getTurniCompetenza…), che salva e calcola
   come prima. La pagina Riepilogo (vista settimanale) NON è toccata.
   Script classico, caricato dopo il codice principale.
   ═══════════════════════════════════════════════════════════════════════ */

const PR2 = { vista: 'persona' };   // 'persona' | 'commessa'

(function pr2Stile(){
  if(document.getElementById('pr2-css')) return;
  const s=document.createElement('style'); s.id='pr2-css';
  s.textContent=`
  .pr2{--p2-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--p2-soft:var(--td2,rgba(154,122,31,.06));--p2-sel:var(--td,rgba(154,122,31,.13));
    --p2-ok:var(--green,#2f7d4f);--p2-bad:var(--red,#b23a2e);--p2-warn:var(--gold,#c07d16);--p2-notte:#5b6fd6}
  .pr2 .num{font-family:var(--p2-mono);font-variant-numeric:tabular-nums}
  .pr2-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .pr2-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .pr2-testa p{color:var(--text2);font-size:13px;margin-top:2px}
  .pr2-az{display:flex;gap:8px;flex-wrap:wrap}
  .pr2-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;min-width:0;overflow:hidden;margin-bottom:14px}
  .pr2-pan-h{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid var(--brd);background:var(--p2-soft)}
  .pr2-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:700}
  /* barra del giorno */
  .pr2-giorno{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 14px}
  .pr2-frec{all:unset;cursor:pointer;width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--brd);border-radius:8px;background:var(--card);font-size:15px;color:var(--text)}
  .pr2-frec:hover{background:var(--p2-soft)}
  .pr2-data{border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:7px 10px;font-family:var(--p2-mono);font-size:14px;color:var(--text)}
  .pr2-giorno-tit{font-size:18px;font-weight:700;margin-left:4px;text-transform:capitalize}
  .pr2-info{display:none}
  .pr2-sett{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;background:var(--brd);border-top:1px solid var(--brd)}
  .pr2-sett button{all:unset;cursor:pointer;background:var(--card);padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}
  .pr2-sett button:hover{background:var(--p2-soft)}
  .pr2-sett button.on{background:var(--p2-sel);box-shadow:inset 0 -2px 0 var(--teal)}
  .pr2-sett .g{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--text2)}
  .pr2-sett .g b{color:var(--text);font-size:13px;letter-spacing:0}
  .pr2-sett .v{font-family:var(--p2-mono);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pr2-sett .v.zero{color:var(--text2);opacity:.6}
  .pr2-sett .oggi .g::after{content:" · oggi";color:var(--teal);font-weight:700}
  /* totali */
  .pr2-tot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .pr2-tot>div{background:var(--card);padding:12px 16px;min-width:0}
  .pr2-tot small{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .pr2-tot .num{font-size:20px;font-weight:600}
  .pr2-tot .sub{font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pr2-tot .warn .num{color:var(--p2-warn)}
  /* avvisi (campo, oneri) */
  .pr2-avvisi{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
  .pr2-avv{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid var(--brd);background:var(--card);border-radius:10px;padding:8px 12px;font-size:13px;flex:1 1 320px}
  .pr2-avv .t{color:var(--text2)}
  .pr2-avv .bs{font-size:12px;padding:5px 11px}
  .pr2-avv.campo{border-color:color-mix(in srgb,var(--teal) 45%,var(--brd))}
  .pr2-badge{background:var(--gold);color:#000;font-size:12px;font-weight:800;border-radius:10px;padding:2px 9px}
  /* chip vista */
  .pr2-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text);font-family:inherit}
  .pr2-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .pr2-chip .n{font-family:var(--p2-mono);font-size:11px;opacity:.7;margin-left:4px}
  /* persone presenti */
  .pr2-pers{display:grid;grid-template-columns:minmax(150px,210px) minmax(0,1fr) auto;gap:10px 16px;align-items:start;padding:12px 14px;border-bottom:1px solid var(--brd)}
  .pr2-pers:last-child{border-bottom:0}
  .pr2-chi{display:flex;gap:10px;align-items:center;min-width:0}
  .pr2-av{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--p2-sel);color:var(--text);border:1px solid var(--brd)}
  .pr2-nome{font-weight:600;line-height:1.2;overflow-wrap:anywhere}
  .pr2-sub{font-size:12px;color:var(--text2)}
  .pr2-turni{display:flex;flex-direction:column;gap:6px;min-width:0}
  .pr2-turno{display:grid;grid-template-columns:minmax(150px,1fr) auto auto auto auto auto;gap:6px;align-items:center;border:1px solid var(--brd);border-radius:9px;padding:6px 8px;background:var(--card)}
  .pr2-turno.notte{border-color:color-mix(in srgb,var(--p2-notte) 45%,var(--brd));background:color-mix(in srgb,var(--p2-notte) 5%,var(--card))}
  .pr2-turno.manca{border-color:color-mix(in srgb,var(--p2-warn) 55%,var(--brd))}
  .pr2-turno select,.pr2-turno input{font:inherit;font-size:13px;color:var(--text);background:var(--card);border:1px solid var(--brd);border-radius:7px;padding:6px 8px;min-width:0}
  .pr2-turno input[type=time]{width:96px;font-family:var(--p2-mono)}
  .pr2-turno input.eur{width:82px;text-align:right;font-family:var(--p2-mono)}
  .pr2-turno .fr{color:var(--text2);font-size:12px}
  .pr2-notte{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text2);cursor:pointer;white-space:nowrap;user-select:none}
  .pr2-notte input{accent-color:var(--p2-notte)}
  .pr2-turno.notte .pr2-notte{color:var(--p2-notte);font-weight:600}
  .pr2-x{all:unset;cursor:pointer;width:26px;height:26px;display:grid;place-items:center;border-radius:6px;color:var(--p2-bad);font-size:13px}
  .pr2-x:hover{background:color-mix(in srgb,var(--p2-bad) 12%,transparent)}
  .pr2-nota-notte{grid-column:1/-1;font-size:11.5px;color:var(--p2-notte)}
  .pr2-piu{all:unset;cursor:pointer;font-size:12px;font-weight:600;color:var(--teal);padding:3px 2px;align-self:flex-start}
  .pr2-piu:hover{text-decoration:underline}
  .pr2-dx{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
  .pr2-dx .p-tot{font-family:var(--p2-mono);font-size:16px;font-weight:600}
  .pr2-tolgo{all:unset;cursor:pointer;font-size:12px;color:var(--text2)}
  .pr2-tolgo:hover{color:var(--p2-bad);text-decoration:underline}
  .pr2-vuoto{color:var(--text2);font-size:13px;padding:16px 14px}
  /* assenti */
  .pr2-assenti{padding:12px 14px;border-top:1px solid var(--brd);background:var(--p2-soft)}
  .pr2-assenti .lista{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .pr2-ass{border:1px dashed var(--brd);background:var(--card);border-radius:99px;padding:5px 11px 5px 6px;font-size:12.5px;cursor:pointer;color:var(--text);display:flex;align-items:center;gap:6px;font-family:inherit}
  .pr2-ass:hover{border-style:solid;border-color:var(--teal)}
  .pr2-ass i{font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;background:var(--p2-soft);border:1px solid var(--brd)}
  .pr2-ass .p{color:var(--teal);font-weight:700}
  /* per commessa */
  .pr2-comm{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:4px 16px;align-items:center;padding:11px 14px;border-bottom:1px solid var(--brd)}
  .pr2-comm:last-child{border-bottom:0}
  .pr2-comm .chi{font-size:12.5px;color:var(--text2);grid-column:1/-1}
  .pr2-comm .manca{color:var(--p2-warn);font-weight:600}
  /* storico */
  .pr2-t{width:100%;border-collapse:collapse}
  .pr2-t th{position:sticky;top:0;background:var(--card);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 12px;border-bottom:1px solid var(--brd);white-space:nowrap}
  .pr2-t td{padding:9px 12px;border-bottom:1px solid var(--brd);vertical-align:middle;font-size:13px}
  .pr2-t tbody tr:hover{background:var(--p2-soft)}
  .pr2-t tr.on{background:var(--p2-sel)}
  .pr2-tw{max-height:420px;overflow:auto}
  .pr2-cerca{border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:7px 11px;font:inherit;font-size:13px;color:var(--text);min-width:200px}
  /* nuova giornata */
  .ng2-passi{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:14px;align-items:start}
  .ng2-campi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px}
  .ng2-campi label,.ng2-orario label{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;margin-bottom:5px}
  .ng2-campi input,.ng2-campi select,.ng2-orario input{width:100%;font:inherit;font-size:14px;color:var(--text);background:var(--card);border:1px solid var(--brd);border-radius:8px;padding:8px 10px}
  .ng2-orario{display:grid;grid-template-columns:1fr 1fr;gap:8px;grid-column:1/-1}
  .ng2-orario input{font-family:var(--p2-mono)}
  .ng2-imp{display:flex;flex-direction:column;gap:10px;padding:14px}
  .ng2-imp-v{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid var(--brd);border-radius:10px;padding:10px 12px}
  .ng2-imp-v b{font-size:13.5px}
  .ng2-imp-v div div{font-size:12px;color:var(--text2);margin-top:2px}
  .ng2-imp-v .bp{font-size:12px;padding:7px 12px;white-space:nowrap}
  .ng2-righe{display:flex;flex-direction:column}
  .ng2-riga{display:grid;grid-template-columns:28px minmax(140px,200px) minmax(150px,1fr) 90px 90px 84px 84px minmax(90px,.6fr);gap:8px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--brd)}
  .ng2-riga:last-child{border-bottom:0}
  .ng2-riga.testa{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:600;background:var(--p2-soft);padding-top:9px;padding-bottom:9px}
  .ng2-riga.on{background:color-mix(in srgb,var(--teal) 7%,var(--card))}
  .ng2-riga input[type=checkbox]{width:17px;height:17px;accent-color:var(--teal);cursor:pointer}
  .ng2-riga input:not([type=checkbox]),.ng2-riga select{width:100%;min-width:0;font:inherit;font-size:13px;color:var(--text);background:var(--card);border:1px solid var(--brd);border-radius:7px;padding:6px 8px}
  .ng2-riga input[type=time],.ng2-riga input[type=number]{font-family:var(--p2-mono)}
  .ng2-riga input[type=number]{text-align:right}
  .ng2-riga:not(.on) .campo{opacity:.35}
  .ng2-chi{cursor:pointer;min-width:0}
  .ng2-chi .pr2-nome{font-size:13.5px}
  .ng2-piede{position:sticky;bottom:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:var(--card);border:1px solid var(--brd);border-radius:12px;box-shadow:0 -6px 18px rgba(0,0,0,.06);margin-bottom:14px}
  .ng2-piede .num{font-size:20px;font-weight:600}
  .ng2-piede small{font-size:12px;color:var(--text2);display:block}
  @media (max-width:900px){
    .pr2-tot{grid-template-columns:repeat(2,minmax(0,1fr))}
    .pr2-pers{grid-template-columns:minmax(0,1fr) auto}
    .pr2-turni{grid-column:1/-1;grid-row:2}
    .pr2-turno{grid-template-columns:minmax(0,1fr) auto auto auto}
    .pr2-turno select{grid-column:1/-1}
    .pr2-sett button{padding:7px 4px}
    .pr2-sett .v{font-size:11px}
    .pr2-sett .e{display:none}
    .ng2-passi{grid-template-columns:minmax(0,1fr)}
    .ng2-riga{grid-template-columns:28px minmax(0,1fr) 1fr 1fr;row-gap:6px}
    .ng2-riga.testa{display:none}
    .ng2-riga .c-comm,.ng2-riga .c-note{grid-column:2/-1}
    .ng2-riga .c-oi{grid-column:2}
  }
  @media (max-width:520px){ .ng2-campi{grid-template-columns:minmax(0,1fr)} .pr2-turno input[type=time]{width:84px} }
  `;
  document.head.appendChild(s);
})();

/* ── piccoli aiuti ─────────────────────────────────────────────────────── */
const _pr2Iniziali = n => String(n||'?').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const _pr2GG = ['dom','lun','mar','mer','gio','ven','sab'];
function _pr2Data(iso){ return new Date(iso+'T12:00:00'); }
function _pr2Iso(dt){ return (typeof isoLocale==='function') ? isoLocale(dt) : dt.toISOString().slice(0,10); }
function _pr2Lunedi(iso){ const d=_pr2Data(iso); const k=(d.getDay()+6)%7; d.setDate(d.getDate()-k); return d; }
function _pr2Attivo(p){
  if(!p) return false;
  if(p.stato==='cessato') return false;
  const hr=(DB.personaleHR||[]).find(h=>h.id===p.id);
  return !(hr && hr.stato==='cessato');
}
function _pr2Persone(){ return (DB.personale||[]); }
// Totale di competenza del giorno (come prima: i notturni contano il giorno dopo)
function _pr2Maturato(d){
  return _pr2Persone().reduce((a,p)=>a+getTurniCompetenza(d,p.id).reduce((s,t)=>s+parseFloat(t.importo||0),0),0);
}
// Turni registrati nel giorno, con la persona
function _pr2TurniDelGiorno(d){
  const st=(DB.presenze||{})[d]||{}, out=[];
  Object.keys(st).forEach(pid=>getTurniRaw(d,pid).forEach((t,i)=>out.push({pid,i,t})));
  return out;
}
function _pr2Etichetta(iso){
  const d=_pr2Data(iso);
  return d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

/* ── disegno della pagina Presenze ─────────────────────────────────────── */
// Chiamata da loadPres() del Gestionale: disegna il giorno scelto.
function pr2Disegna(d){
  const grid=document.getElementById('pres-grid'); if(!grid) return;
  const tit=document.getElementById('pr2-giorno-tit'); if(tit) tit.textContent=d?_pr2Etichetta(d):'Scegli una data';
  pr2Aggiorna(d);
  if(!d){ grid.innerHTML='<div class="pr2-vuoto">Scegli una data.</div>'; return; }
  if(PR2.vista==='commessa'){ grid.innerHTML=pr2PerCommessa(d); pr2Assenti(d); return; }
  const st=(DB.presenze||{})[d]||{};
  const pers=_pr2Persone();
  const ids=Object.keys(st);
  const noti=new Set(pers.map(p=>p.id));
  const righe=[...pers.filter(p=>st[p.id]), ...ids.filter(id=>!noti.has(id)).map(id=>({id,nome:'Persona non in anagrafica ('+id+')',ruolo:''}))];
  grid.innerHTML = righe.length ? righe.map(p=>pr2Persona(d,p)).join('')
    : `<div class="pr2-vuoto">Nessuno registrato il ${fdate(d)}. Aggiungi chi ha lavorato qui sotto, oppure usa <a href="#" onclick="nav('nuova-giornata');return false">Nuova giornata</a> per inserirli tutti insieme.</div>`;
  pr2Assenti(d);
}

function pr2Persona(d,p){
  const turni=getTurniRaw(d,p.id);
  const tot=turni.reduce((a,t)=>a+parseFloat(t.importo||0),0);
  const nome=String(p.nome||''); const n1=nome.split(' ')[0], n2=nome.split(' ').slice(1).join(' ');
  return `<div class="pr2-pers" id="tog-${esc(p.id)}">
    <div class="pr2-chi"><div class="pr2-av">${esc(_pr2Iniziali(nome))}</div>
      <div><div class="pr2-nome">${esc(n1)} ${esc(n2)}</div><div class="pr2-sub">${esc(p.ruolo||'')}</div></div></div>
    <div class="pr2-turni" id="turni-${esc(p.id)}">
      ${turni.map((t,ti)=>pr2Turno(d,p,t,ti)).join('')}
      <button class="pr2-piu" onclick="aggiungiTurno('${esc(p.id)}')">+ Aggiungi un turno</button>
    </div>
    <div class="pr2-dx"><span class="p-tot">${fmt(tot)}</span>
      <button class="pr2-tolgo" onclick="toggleP('${esc(p.id)}')">Togli dalla giornata</button></div>
  </div>`;
}

function pr2Turno(d,p,t,ti){
  const pid=esc(p.id), manca=!(t.cantiere||'').trim();
  return `<div class="pr2-turno ${t.notturno?'notte':''} ${manca?'manca':''}" id="tr-${pid}-${ti}">
    <select data-sc="nome" data-sc-data="#pres-date" data-sc-persona="${esc(p.nome||'')}" onchange="updateTurno('${pid}',${ti},'cantiere',this.value)" title="Commessa">
      <option value="">— Nessuna commessa —</option>${_optCantByNome(t.cantiere||'')}<option value="__nuovo__">➕ Crea nuova commessa…</option>
    </select>
    <input type="time" value="${esc(t.oraI||'08:00')}" title="Dalle" onchange="updateTurno('${pid}',${ti},'oraI',this.value)">
    <input type="time" value="${esc(t.oraF||'18:00')}" title="Alle" onchange="updateTurno('${pid}',${ti},'oraF',this.value)">
    <input class="eur" type="number" step="0.01" min="0" placeholder="€" value="${parseFloat(t.importo)?esc(t.importo):''}" title="Compenso del turno (€)" onchange="updateTurno('${pid}',${ti},'importo',+this.value)">
    <label class="pr2-notte" title="Turno notturno: conta il giorno dopo"><input type="checkbox" ${t.notturno?'checked':''} onchange="updateTurno('${pid}',${ti},'notturno',this.checked)">🌙 notte</label>
    <button class="pr2-x" title="Togli questo turno" onclick="rimuoviTurno('${pid}',${ti})">✕</button>
    ${t.notturno?`<div class="pr2-nota-notte">🌙 Turno notturno: l'importo conta per il ${fdate(nextDay(d))}</div>`:''}
  </div>`;
}

// Riepilogo per commessa (sola lettura)
function pr2PerCommessa(d){
  const gruppi={};
  _pr2TurniDelGiorno(d).forEach(({pid,t})=>{
    const k=(t.cantiere||'').trim()||'__senza__';
    const g=gruppi[k]||(gruppi[k]={nome:k,persone:new Set(),turni:0,eur:0});
    const p=_pr2Persone().find(x=>x.id===pid); g.persone.add(p?p.nome:pid); g.turni++; g.eur+=parseFloat(t.importo||0)||0;
  });
  const arr=Object.values(gruppi).sort((a,b)=>(a.nome==='__senza__')-(b.nome==='__senza__')||b.eur-a.eur);
  if(!arr.length) return `<div class="pr2-vuoto">Nessun turno registrato il ${fdate(d)}.</div>`;
  return arr.map(g=>{
    const senza=g.nome==='__senza__';
    const c=senza?null:(DB.cantieri||[]).find(x=>(x.nome||'').trim().toLowerCase()===g.nome.toLowerCase());
    const apri=c&&typeof cm2ApriDa==='function'?` <a href="#" onclick="cm2ApriDa('${esc(c.id)}');return false" class="pr2-sub">apri commessa →</a>`:'';
    return `<div class="pr2-comm">
      <div><span class="pr2-nome ${senza?'manca':''}">${senza?'⚠ Senza commessa':esc(g.nome)}</span>${c&&c.codice?` <span class="pr2-sub num">${esc(c.codice)}</span>`:''}${apri}</div>
      <div class="pr2-sub">${g.persone.size} ${g.persone.size===1?'persona':'persone'} · ${g.turni} ${g.turni===1?'turno':'turni'}</div>
      <div class="num" style="font-weight:600">${fmt(g.eur)}</div>
      <div class="chi">${[...g.persone].map(esc).join(', ')}</div>
    </div>`;
  }).join('');
}

// Chi non è registrato nel giorno: un tocco per aggiungerlo
function pr2Assenti(d){
  const box=document.getElementById('pr2-assenti'); if(!box) return;
  const st=(DB.presenze||{})[d]||{};
  const ass=_pr2Persone().filter(p=>!st[p.id] && _pr2Attivo(p));
  box.innerHTML = !d ? '' : `<div class="pr2-h">Non registrati il ${fdate(d)} <span class="num" style="font-weight:400">(${ass.length})</span> · tocca un nome per aggiungerlo</div>
    <div class="lista">${ass.map(p=>`<button class="pr2-ass" onclick="pr2Aggiungi('${esc(p.id)}')"><i>${esc(_pr2Iniziali(p.nome))}</i>${esc(p.nome)} <span class="p">+</span></button>`).join('')||'<span class="pr2-sub">Tutto il personale attivo è registrato.</span>'}
      <button class="pr2-ass" onclick="openModal('modal-pers')" title="Crea una persona nuova in anagrafica"><i>+</i>Nuova persona</button></div>`;
}

// Aggiunge una persona alla giornata (motore: toggleP) e, se c'è, mette la commessa del giorno
function pr2Aggiungi(pid){
  const d=gv('pres-date'); if(!d){ alert('Seleziona prima una data'); return; }
  toggleP(pid);
  const pr=(DB.presenze[d]||{})[pid];
  if(pr && Array.isArray(pr.turni) && pr.turni.length===1 && !pr.turni[0].cantiere){
    // commessa più usata quel giorno (di solito la squadra è sullo stesso lavoro)
    const cont={}; _pr2TurniDelGiorno(d).forEach(({t})=>{ const n=(t.cantiere||'').trim(); if(n) cont[n]=(cont[n]||0)+1; });
    const top=Object.entries(cont).sort((a,b)=>b[1]-a[1])[0];
    if(top){ pr.turni[0].cantiere=top[0]; loadPres(); toast('Aggiunto su «'+top[0]+'» — controlla orari e importo'); }
  }
}

// Numeri del giorno e striscia della settimana (chiamata anche dopo ogni modifica di un turno)
function pr2Aggiorna(d){
  pr2Settimana(d);
  const box=document.getElementById('pr2-tot'); if(!box) return;
  if(!d){ box.innerHTML=''; return; }
  const st=(DB.presenze||{})[d]||{};
  const turni=_pr2TurniDelGiorno(d);
  const comm=new Set(turni.map(x=>(x.t.cantiere||'').trim()).filter(Boolean));
  const senza=turni.filter(x=>!(x.t.cantiere||'').trim()).length;
  const zero=turni.filter(x=>!(parseFloat(x.t.importo)>0)).length;
  const notti=turni.filter(x=>x.t.notturno).length;
  const ieriNotte=_pr2Persone().reduce((a,p)=>a+getTurniRaw(prevDay(d),p.id).filter(t=>t.notturno).reduce((s,t)=>s+parseFloat(t.importo||0),0),0);
  const mat=_pr2Maturato(d);
  const subMat=[notti?`${notti} turno notturno → conta domani`:'', ieriNotte?`incl. ${fmt(ieriNotte)} notte di ieri`:''].filter(Boolean).join(' · ')||'compensi di competenza del giorno';
  const daSist=senza+zero;
  box.innerHTML=`
    <div><small>Presenti</small><span class="num">${Object.keys(st).length}</span><div class="sub">${turni.length} ${turni.length===1?'turno':'turni'}</div></div>
    <div><small>Maturato del giorno</small><span class="num">${fmt(mat)}</span><div class="sub">${esc(subMat)}</div></div>
    <div><small>Commesse</small><span class="num">${comm.size}</span><div class="sub">${esc([...comm].slice(0,3).join(', ')+(comm.size>3?'…':''))||'—'}</div></div>
    <div class="${daSist?'warn':''}"><small>Da sistemare</small><span class="num">${daSist}</span><div class="sub">${daSist?[senza?senza+' senza commessa':'',zero?zero+' senza importo':''].filter(Boolean).join(' · '):'tutto a posto'}</div></div>`;
}

function pr2Settimana(d){
  const box=document.getElementById('pr2-sett'); if(!box) return;
  if(!d){ box.innerHTML=''; return; }
  const lun=_pr2Lunedi(d), oggi=today();
  let h='';
  for(let i=0;i<7;i++){
    const x=new Date(lun); x.setDate(lun.getDate()+i); const iso=_pr2Iso(x);
    const n=Object.keys((DB.presenze||{})[iso]||{}).length, m=_pr2Maturato(iso);
    h+=`<button class="${iso===d?'on':''} ${iso===oggi?'oggi':''}" onclick="pr2VaiData('${iso}')" title="${esc(_pr2Etichetta(iso))}">
      <span class="g">${_pr2GG[x.getDay()]} <b>${x.getDate()}</b></span>
      <span class="v ${n?'':'zero'}">${n?n+' pers<span class="e"> · '+fmt(m)+'</span>':'—'}</span></button>`;
  }
  box.innerHTML=h;
}

function pr2VaiData(iso){ const di=document.getElementById('pres-date'); if(di){ di.value=iso; loadPres(); rPresHist(); } }
function pr2Oggi(){ pr2VaiData(today()); }
function pr2Vista(v){
  PR2.vista=v;
  document.querySelectorAll('[data-pr2-vista]').forEach(b=>b.classList.toggle('on', b.dataset.pr2Vista===v));
  loadPres();
}

/* ── Nuova giornata: righe delle persone ───────────────────────────────── */
// Chiamata da rNuovaGiornata(): disegna l'elenco di chi può essere segnato presente.
function ng2Righe(){
  const box=document.getElementById('ng-persone-list'); if(!box) return false;
  const pers=_pr2Persone().filter(_pr2Attivo);
  const oi=gv('ng-oraI')||'08:00', of=gv('ng-oraF')||'18:00';
  box.innerHTML=`<div class="ng2-righe">
    <div class="ng2-riga testa"><span></span><span>Persona</span><span>Commessa</span><span>Dalle</span><span>Alle</span><span style="text-align:right">Compenso €</span><span style="text-align:right">Straord. €</span><span>Note</span></div>
    ${pers.map(p=>{ const id=esc(p.id), nome=String(p.nome||'');
      return `<div class="ng2-riga" id="ngr-${id}">
        <input type="checkbox" id="ngc-${id}" onchange="ngToggle('${id}')" aria-label="Presente: ${esc(nome)}">
        <div class="ng2-chi" onclick="const c=document.getElementById('ngc-${id}');c.checked=!c.checked;ngToggle('${id}')">
          <div class="pr2-nome">${esc(nome)}</div><div class="pr2-sub">${esc(p.ruolo||'')}</div></div>
        <div class="campo c-comm"><select class="cantiere-select" id="ngcant-${id}" data-sc="nome" data-sc-data="#ng-data" data-sc-persona="${esc(nome)}" disabled><option value="">— Nessuna commessa —</option>${_optCantByNome('')}<option value="__nuovo__">➕ Crea nuova commessa…</option></select></div>
        <input class="campo c-oi" type="time" id="ngi-${id}" value="${esc(oi)}" disabled title="Dalle">
        <input class="campo" type="time" id="ngf-${id}" value="${esc(of)}" disabled title="Alle">
        <input class="campo" type="number" step="0.01" min="0" id="ngbase-${id}" placeholder="0" disabled oninput="ngCalcTot('${id}')" title="Compenso">
        <input class="campo" type="number" step="0.01" min="0" id="ngstr-${id}" placeholder="0" disabled oninput="ngCalcTot('${id}')" title="Straordinario">
        <input class="campo c-note" id="ngnote-${id}" placeholder="Note" disabled>
      </div>`; }).join('')}
  </div>`;
  ng2Piede();
  return true;
}
// Barra in fondo: quante persone e totale
function ng2Piede(){
  const n=_pr2Persone().filter(p=>{ const c=document.getElementById('ngc-'+p.id); return c&&c.checked; }).length;
  const el=document.getElementById('ng2-n'); if(el) el.textContent=n?`${n} ${n===1?'persona segnata':'persone segnate'}`:'Nessuno segnato: spunta chi ha lavorato';
}
// Orario standard cambiato: lo porta su chi è già spuntato
function ng2Orario(){
  const oi=gv('ng-oraI')||'08:00', of=gv('ng-oraF')||'18:00';
  _pr2Persone().forEach(p=>{ const c=document.getElementById('ngc-'+p.id); if(c&&c.checked){ const a=document.getElementById('ngi-'+p.id), b=document.getElementById('ngf-'+p.id); if(a) a.value=oi; if(b) b.value=of; } });
}
// Segna tutti / nessuno
function ng2Tutti(si){
  _pr2Persone().forEach(p=>{ const c=document.getElementById('ngc-'+p.id); if(c && c.checked!==si){ c.checked=si; ngToggle(p.id); } });
}
