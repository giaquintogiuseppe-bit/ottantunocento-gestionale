/* ═══════════════════════════════════════════════════════════════════════
   MENU A 8 AREE — barra laterale con le aree; le pagine di ogni area
   diventano schede in alto. Nessuna pagina è stata tolta: cambia solo come
   ci si arriva. Si appoggia a nav(pg) del Gestionale (la estende, non la
   sostituisce). Script classico, caricato dopo il codice principale.
   ═══════════════════════════════════════════════════════════════════════ */

const MENU_AREE = [
  { id:'cruscotto', nome:'Cruscotto', icona:'cruscotto', schede:[
      { pg:'dash', nome:'Panoramica' }, { pg:'grafici', nome:'Numeri e grafici' } ] },
  { id:'commesse', nome:'Commesse', icona:'commesse', schede:[
      { pg:'commesse', nome:'Commesse' }, { pg:'cantieri', nome:'Elenco classico' }, { pg:'coerenza', nome:'Coerenza' } ],
    nascoste:['dettaglio-cant'] },
  { id:'clienti', nome:'Clienti', icona:'clienti', schede:[
      { pg:'clienti', nome:'Clienti' }, { pg:'fatture', nome:'Fatture e scadenze', dopo:'renderFatture' },
      { pg:'incassi', nome:'Incassi' }, { pg:'posizione-clienti', nome:'Posizione' },
      { pg:'referenti', nome:'Referenti' }, { pg:'clienti-gest', nome:'Anagrafica (vecchia)', dopo:'renderClientiGest' } ],
    nascoste:['report-cliente'] },
  { id:'fornitori', nome:'Fornitori', icona:'fornitori', schede:[
      { pg:'fatture-fornitori', nome:'Fatture fornitori' }, { pg:'posizione-fornitori', nome:'Posizione fornitori' },
      { pg:'scontrini', nome:'Scontrini e foto' } ] },
  { id:'personale', nome:'Personale', icona:'personale', schede:[
      { pg:'presenze', nome:'Presenze' }, { pg:'nuova-giornata', nome:'Nuova giornata' }, { pg:'anagrafica', nome:'Anagrafica' },
      { pg:'scheda-dip', nome:'Scheda dipendente' }, { pg:'saldi', nome:'Saldi' }, { pg:'anticipi', nome:'Pagamenti' },
      { pg:'pagamenti', nome:'Chiusura settimana' }, { pg:'riepilogo', nome:'Riepilogo' }, { pg:'danni', nome:'Danni' },
      { pg:'documenti', nome:'Documenti' } ] },
  { id:'mezzi', nome:'Mezzi e attrezzature', icona:'mezzi', schede:[
      { pg:'flotta', nome:'Flotta e carburante' }, { pg:'dkv', nome:'Importa DKV' },
      { pg:'attrezzeria', nome:'Attrezzeria' }, { pg:'parco', nome:'Parco risorse', dopo:'renderParco' } ] },
  { id:'fisco', nome:'Fisco e documenti', icona:'fisco', schede:[ { pg:'fisco', nome:'Quadro fiscale' } ] },
  { id:'impostazioni', nome:'Impostazioni', icona:'impostazioni', schede:[
      { pg:'sync', nome:'Sync cloud' },
      { azione:'menuAggiornaApp', nome:'Aggiorna app' } ] }
];

const _MENU_ICONE = {
  cruscotto:'<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/>',
  commesse:'<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>',
  clienti:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3.3 3.2-5 6-5s5.2 1.7 6 5M16 5.5a3 3 0 0 1 0 5.6M18 14c1.6.6 2.7 2.2 3 5"/>',
  fornitori:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1"/>',
  personale:'<circle cx="12" cy="7" r="3.5"/><path d="M5 20c1-4 3.6-6 7-6s6 2 7 6"/>',
  mezzi:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8 7.2 20l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.6-.6-.6-2.6z"/>',
  fisco:'<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
  impostazioni:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.3-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>'
};

const _menuUltima = {};   // ultima scheda aperta per ogni area (si torna lì)

function _menuAreaDi(pg){
  return MENU_AREE.find(a => a.schede.some(s => s.pg===pg) || (a.nascoste||[]).includes(pg)) || null;
}

(function menuStile(){
  if(document.getElementById('menu8-css')) return;
  const s=document.createElement('style'); s.id='menu8-css';
  s.textContent=`
  #sb .m8{display:flex;flex-direction:column;gap:2px;padding:10px 0}
  #sb .m8 .ni{gap:11px}
  #sb .m8 svg{width:18px;height:18px;flex:none;stroke:currentColor;fill:none;stroke-width:1.7;opacity:.9}
  #sb .m8 .ni.active{box-shadow:inset 3px 0 0 #f0d58a}
  #area-tabs{display:flex;align-items:center;gap:4px;flex-wrap:nowrap;overflow-x:auto;margin:-4px 0 16px;border-bottom:1px solid var(--brd);scrollbar-width:thin}
  #area-tabs:empty{display:none}
  #area-tabs .at-area{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text2);font-weight:700;margin-right:8px;white-space:nowrap}
  #area-tabs button{all:unset;cursor:pointer;padding:9px 11px;font-size:13px;font-weight:600;color:var(--text2);border-bottom:2px solid transparent;white-space:nowrap}
  #area-tabs button:hover{color:var(--text)}
  #area-tabs button.on{color:var(--text);border-color:var(--teal)}
  #area-tabs button.az{color:var(--teal)}
  #area-tabs button:focus-visible{outline:2px solid var(--teal);outline-offset:2px;border-radius:4px}
  #mnav .mni-item svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.7}
  `;
  document.head.appendChild(s);
})();

// Barra laterale e barra mobile: 8 aree
function menuDisegna(){
  const voce = (a, cls, extra) => `<div class="${cls}" data-area="${a.id}" onclick="menuArea('${a.id}')" ${extra||''}><svg viewBox="0 0 24 24" aria-hidden="true">${_MENU_ICONE[a.icona]}</svg>${cls==='ni'?a.nome:`<span>${a.nome.split(' ')[0]}</span>`}</div>`;
  const sb=document.getElementById('sb-aree');
  if(sb) sb.innerHTML = MENU_AREE.map(a=>voce(a,'ni')).join('');
  const mn=document.querySelector('#mnav .mni');
  if(mn) mn.innerHTML = MENU_AREE.map(a=>voce(a,'mni-item')).join('');
}

function menuArea(id){
  const a=MENU_AREE.find(x=>x.id===id); if(!a) return;
  const pg=_menuUltima[id] && a.schede.some(s=>s.pg===_menuUltima[id]) ? _menuUltima[id] : a.schede.find(s=>s.pg).pg;
  menuApri(pg);
}

function menuApri(pg){
  const sch=MENU_AREE.flatMap(a=>a.schede).find(s=>s.pg===pg);
  nav(pg);
  if(sch && sch.dopo && typeof window[sch.dopo]==='function'){ try{ window[sch.dopo](); }catch(e){} }
}

function menuAggiornaApp(){
  if(confirm('Aggiornare la app all\'ultima versione? Verrà svuotata la cache e ricaricata.')) location.href='aggiorna.html?v='+Date.now();
}

// Dopo ogni nav(pg): area attiva nel menu + schede dell'area in alto
function menuSegui(pg){
  const a=_menuAreaDi(pg);
  document.querySelectorAll('#sb-aree .ni, #mnav .mni-item').forEach(n=>n.classList.toggle('active', !!a && n.dataset.area===a.id));
  const box=document.getElementById('area-tabs'); if(!box) return;
  if(!a){ box.innerHTML=''; return; }
  if(a.schede.some(s=>s.pg===pg)) _menuUltima[a.id]=pg;
  box.innerHTML = a.schede.length<2 && !a.schede.some(s=>s.azione) ? `<span class="at-area">${a.nome}</span>` :
    `<span class="at-area">${a.nome}</span>` + a.schede.map(s => s.azione
      ? `<button class="az" onclick="${s.azione}()">${s.nome}</button>`
      : `<button class="${s.pg===pg?'on':''}" onclick="menuApri('${s.pg}')">${s.nome}</button>`).join('');
}

// Estende nav(): stesso comportamento di prima + aggiornamento del menu
(function menuAvvia(){
  if(typeof nav!=='function') return;
  const _navBase = nav;
  window.nav = function(pg){ _navBase(pg); try{ menuSegui(pg); }catch(e){} };
  menuDisegna();
  menuSegui(typeof curPg!=='undefined' && curPg ? curPg : 'dash');
})();
