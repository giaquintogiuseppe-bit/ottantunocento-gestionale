(function(){
  'use strict';
  const SC_VER='1.1';
  const NUOVO='__nuovo__';
  const FINESTRA={operativo:60,economico:180};
  const MAX_RECENTI=5, LS_RECENTI='sc81_recenti';
  const MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const MESI_B=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’`]/g,"'").replace(/\s+/g,' ').trim();
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const oggiISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
  const addG=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
  const fmtD=iso=>{if(!iso)return '';const p=iso.split('-');return (+p[2])+' '+MESI_B[+p[1]-1];};

  // ── dati: legge DB.cantieri ogni volta (si aggiorna da solo dopo un sync)
  function cantieri(){
    const db=(typeof DB!=='undefined'&&DB)||{};
    const arch=new Set(db._cantieriArchiviati||[]);
    return (db.cantieri||[]).filter(c=>c&&c.id&&(c.nome||c.name)).map(c=>{
      const nome=String(c.nome||c.name).trim();
      const s=norm(c.stato);
      const arc=arch.has(c.id)||c.archiviato===true;
      const conc=s.includes('conclus')||s.includes('pers')||s.includes('rifiut');
      const ivs=(Array.isArray(c.interventi)?c.interventi:[]).filter(iv=>iv&&iv.data);
      let ini=c.periodoInizio||'', fin=c.periodoFine||'';
      if(!ini&&ivs.length) ini=ivs.reduce((a,iv)=>iv.data<a?iv.data:a,ivs[0].data);
      if(!fin&&ivs.length) fin=ivs.reduce((a,iv)=>iv.data>a?iv.data:a,ivs[0].data);
      if(!fin) fin=ini;
      const cli=c.clienteNome||c.committente||'';
      const mesi=[];
      if(ini){let y=+ini.slice(0,4),m=+ini.slice(5,7);const fy=+fin.slice(0,4),fm=+fin.slice(5,7);
        for(let k=0;k<24&&(y<fy||(y===fy&&m<=fm));k++){mesi.push(MESI[m-1]);m++;if(m>12){m=1;y++;}}}
      return {c,id:c.id,nome,cli,luogo:c.luogo||'',cod:c.codice||'',stato:c.stato||'',ini,fin,ivs,
        lp:c.tipo==='lungo_periodo',arc,conc,att:!arc&&!conc,mese:ini?ini.slice(0,7):'',nn:' '+norm(nome),
        hay:norm([nome,cli,c.luogo,c.codice,mesi.join(' '),ini.slice(0,4)].join(' '))};
    });
  }
  function recenti(){try{return JSON.parse(localStorage.getItem(LS_RECENTI)||'[]')||[];}catch(e){return [];}}
  function segnaRecente(id){try{localStorage.setItem(LS_RECENTI,JSON.stringify([id,...recenti().filter(x=>x!==id)].slice(0,MAX_RECENTI)));}catch(e){}}

  // ── stato del foglio
  let cur=null; // {el, modo, profilo, giorno, persona}
  let vista='smart';
  let sheet, scrim;

  function periodo(x){ if(!x.ini) return 'date da definire'; return x.ini===x.fin?fmtD(x.ini):fmtD(x.ini)+' – '+fmtD(x.fin); }
  function dot(x){ if(x.arc) return 'arc'; if(x.conc) return ''; if(x.lp) return 'lp'; const s=norm(x.stato); return (s.includes('confermar')||s.includes('arrivo')||s.includes('fermo'))?'wait':'att'; }
  function tagStato(x){
    if(x.arc) return '<span class="sc-tag">archivio</span>';
    if(x.conc) return '<span class="sc-tag">'+esc(x.stato||'concluso')+'</span>';
    if(x.lp) return '<span class="sc-tag lp">deposito / lungo periodo</span>';
    return '<span class="sc-tag att">'+esc(x.stato||'attivo')+'</span>';
  }
  function hl(text,toks){
    text=String(text||''); if(!toks.length) return esc(text);
    const n=text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
    if(n.length!==text.length) return esc(text);
    const mk=new Array(text.length).fill(false);
    toks.forEach(t=>{let i=n.indexOf(t);while(i>=0){for(let k=i;k<i+t.length;k++)mk[k]=true;i=n.indexOf(t,i+t.length);}});
    let s='',open=false;
    for(let i=0;i<text.length;i++){if(mk[i]&&!open){s+='<mark>';open=true;}if(!mk[i]&&open){s+='</mark>';open=false;}s+=esc(text[i]);}
    return open?s+'</mark>':s;
  }
  function riga(x,toks,why,selId){
    const meta=[x.cli,x.luogo&&norm(x.luogo)!==norm(x.nome)?x.luogo:'',periodo(x)].filter(Boolean).map(v=>hl(v,toks)).join(' · ');
    return '<button type="button" class="sc-it'+(x.id===selId?' sc-cur':'')+'" data-sc-id="'+esc(x.id)+'"><span class="sc-dot '+dot(x)+'"></span>'+
      '<span class="sc-tx"><span class="sc-n">'+hl(x.nome,toks)+'</span><span class="sc-m">'+meta+'</span>'+
      '<span class="sc-tags">'+(why?'<span class="sc-tag why">'+esc(why)+'</span>':'')+tagStato(x)+(x.cod?'<span class="sc-tag">'+hl(x.cod,toks)+'</span>':'')+'</span></span></button>';
  }
  function gruppo(t,items,toks,whyFn,selId){
    if(!items.length) return '';
    return '<div class="sc-grp"><span>'+t+'</span><span>'+items.length+'</span></div><div class="sc-list">'+items.map(x=>riga(x,toks,whyFn?whyFn(x):'',selId)).join('')+'</div>';
  }
  const perData=(a,b)=>(b.ini||'9999').localeCompare(a.ini||'9999');

  function inFinestra(x){ if(x.arc) return false; if(x.att) return true; return !!x.fin&&x.fin>=addG(oggiISO(),-FINESTRA[cur.profilo]); }
  function suggeriti(L){
    const d=cur.giorno||oggiISO(), p=norm(cur.persona);
    const out=[], why={};
    const push=(x,w)=>{ if(!why[x.id]){why[x.id]=w;out.push(x);} };
    if(p) L.forEach(x=>{ if(!x.arc&&x.ivs.some(iv=>iv.data===d&&(iv.squadra||[]).some(n=>norm(n)===p))) push(x,'in squadra quel giorno'); });
    L.forEach(x=>{ if(!x.arc&&x.ivs.some(iv=>iv.data===d)) push(x,'lavorazione quel giorno'); });
    L.filter(x=>!x.arc&&x.ini&&x.ini<=addG(d,1)&&x.fin>=addG(d,-1)).sort((a,b)=>(b.att-a.att)||perData(a,b))
      .forEach(x=>push(x,x.att?'in corso quel giorno':'attivo quel giorno'));
    return {out,why};
  }
  function idCorrente(L){
    if(!cur) return '';
    const v=cur.el.value; if(!v) return '';
    if(cur.modo==='id') return v;
    const n=norm(v); const x=L.find(y=>norm(y.nome)===n); return x?x.id:'';
  }

  function renderSmart(){
    const L=cantieri(), selId=idCorrente(L);
    const q=sheet.querySelector('#sc-q').value.trim(), toks=norm(q).split(' ').filter(Boolean);
    const d=cur.giorno||oggiISO();
    sheet.querySelector('#sc-ctx').textContent=(cur.profilo==='economico'?'Incassi e fatture':'Lavoro operativo')+' · record del '+fmtD(d)+' '+d.slice(0,4)+' · conclusi ultimi '+FINESTRA[cur.profilo]+' giorni';
    let h='';
    if(toks.length){
      // pertinenza: parola del NOME che inizia col testo cercato > dentro il nome > altrove (cliente, luogo…)
      const punti=x=>toks.reduce((a,t)=>a+(x.nn.includes(' '+t)?3:x.nn.includes(t)?2:0),0);
      const hits=L.filter(x=>toks.every(t=>x.hay.includes(t))).map(x=>({x,p:punti(x)}));
      const best=hits.reduce((m,h)=>Math.max(m,h.p),0);
      const ord=(a,b)=>(b.p-a.p)||(b.x.att-a.x.att)||perData(a.x,b.x);
      // in alto: le più pertinenti (anche se vecchie) e quelle nella finestra; sotto il resto dell'archivio
      const top=hits.filter(h=>h.p===best&&best>0||inFinestra(h.x)).sort(ord).map(h=>h.x);
      const resto=hits.filter(h=>!(h.p===best&&best>0||inFinestra(h.x))).sort(ord).map(h=>h.x);
      h+=gruppo('Risultati',top,toks,null,selId);
      h+=gruppo('Più vecchie e archivio',resto,toks,null,selId);
      if(!hits.length) h+='<div class="sc-empty">Nessuna commessa contiene “'+esc(q)+'”.<br>Prova con il cliente, il luogo, il mese (es. “agosto”) o il codice COM.</div>';
    }else{
      const {out:sug,why}=suggeriti(L), visti=new Set(sug.map(x=>x.id));
      const rec=recenti().map(id=>L.find(x=>x.id===id)).filter(x=>x&&!visti.has(x.id)).slice(0,MAX_RECENTI);
      rec.forEach(x=>visti.add(x.id));
      const att=L.filter(x=>x.att&&!visti.has(x.id)).sort((a,b)=>(a.lp-b.lp)||perData(a,b));
      const conc=L.filter(x=>!x.att&&inFinestra(x)&&!visti.has(x.id)).sort((a,b)=>(b.fin||'').localeCompare(a.fin||''));
      h+=gruppo('⭐ Suggeriti per il '+fmtD(d),sug,[],x=>why[x.id],selId);
      h+=gruppo('🕘 Usati di recente',rec,[],null,selId);
      h+=gruppo('🟢 Attivi',att,[],null,selId);
      h+=gruppo('⚪ Conclusi negli ultimi '+FINESTRA[cur.profilo]+' giorni',conc,[],null,selId);
    }
    h+='<button type="button" class="sc-more" data-sc-azione="tutte">Non la trovi? Cerca in tutte le '+L.length+' commesse ›</button>';
    if(cur.nuovoOk) h+='<button type="button" class="sc-none" data-sc-azione="nuovo">➕ Crea nuovo cantiere</button>';
    if(cur.vuotoOk) h+='<button type="button" class="sc-none" data-sc-azione="nessuno">✕ Nessun cantiere</button>';
    sheet.querySelector('#sc-body').innerHTML=h;
  }
  function riempiFiltri(L){
    const mesi=[...new Set(L.map(x=>x.mese).filter(Boolean))].sort().reverse();
    sheet.querySelector('#sc-f-mese').innerHTML='<option value="">Tutti i mesi</option>'+mesi.map(m=>'<option value="'+m+'">'+MESI[+m.slice(5)-1].replace(/^./,c=>c.toUpperCase())+' '+m.slice(0,4)+'</option>').join('');
    const cl={}; L.forEach(x=>{if(x.cli){const k=norm(x.cli);(cl[k]=cl[k]||{n:x.cli,k:0}).k++;}});
    sheet.querySelector('#sc-f-cli').innerHTML='<option value="">Tutti i clienti</option>'+Object.entries(cl).sort((a,b)=>a[1].n.localeCompare(b[1].n,'it',{sensitivity:'base'})).map(([k,v])=>'<option value="'+esc(k)+'">'+esc(v.n)+' ('+v.k+')</option>').join('');
  }
  function renderTutte(){
    const L=cantieri(), selId=idCorrente(L);
    const q=sheet.querySelector('#sc-q').value.trim(), toks=norm(q).split(' ').filter(Boolean);
    const fm=sheet.querySelector('#sc-f-mese').value, fs=sheet.querySelector('#sc-f-stato').value, fc=sheet.querySelector('#sc-f-cli').value;
    const list=L.filter(x=>toks.every(t=>x.hay.includes(t))&&(!fm||x.mese===fm)&&(!fc||norm(x.cli)===fc)&&
      (!fs||(fs==='att'&&x.att)||(fs==='conc'&&x.conc&&!x.arc)||(fs==='arc'&&x.arc))).sort(perData);
    sheet.querySelector('#sc-ctx').textContent='Elenco completo · '+list.length+' di '+L.length+' commesse · dalla più recente';
    const byM={}; list.forEach(x=>{(byM[x.mese||'—']=byM[x.mese||'—']||[]).push(x);});
    const keys=Object.keys(byM).sort((a,b)=>a==='—'?-1:b==='—'?1:b.localeCompare(a));
    sheet.querySelector('#sc-body').innerHTML=list.length
      ? keys.map(k=>gruppo(k==='—'?'Senza date':MESI[+k.slice(5)-1].replace(/^./,c=>c.toUpperCase())+' '+k.slice(0,4),byM[k],toks,null,selId)).join('')
      : '<div class="sc-empty">Nessuna commessa con questi filtri.<br>Togli un filtro o cambia la ricerca.</div>';
    if(cur.nuovoOk) sheet.querySelector('#sc-body').insertAdjacentHTML('beforeend','<button type="button" class="sc-none" data-sc-azione="nuovo">➕ Crea nuovo cantiere</button>');
  }
  function render(){ vista==='tutte'?renderTutte():renderSmart(); }
  function setVista(v){
    vista=v;
    sheet.querySelector('#sc-filt').hidden=v!=='tutte';
    sheet.querySelector('#sc-back').hidden=v!=='tutte';
    sheet.querySelector('#sc-tit').textContent=v==='tutte'?'Tutte le commesse':'Scegli commessa';
    if(v==='tutte') riempiFiltri(cantieri());
    sheet.querySelector('#sc-body').scrollTop=0; render();
  }

  function costruisci(){
    scrim=document.createElement('div'); scrim.id='sc-scrim'; scrim.hidden=true;
    sheet=document.createElement('div'); sheet.id='sc-sheet'; sheet.hidden=true;
    sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true');
    sheet.innerHTML='<div class="sc-top"><div class="sc-row1"><button type="button" class="sc-lnk" id="sc-back" hidden>‹ Indietro</button>'+
      '<h3 id="sc-tit">Scegli commessa</h3><button type="button" class="sc-lnk" id="sc-close">Chiudi</button></div>'+
      '<input type="search" id="sc-q" placeholder="🔍 Nome, cliente, luogo, COM-…, mese" autocomplete="off" autocorrect="off" spellcheck="false" data-af="1">'+
      '<div class="sc-filt" id="sc-filt" hidden><select id="sc-f-mese" aria-label="Mese"></select>'+
      '<select id="sc-f-stato" aria-label="Stato"><option value="">Tutti gli stati</option><option value="att">Attivi</option><option value="conc">Conclusi</option><option value="arc">Archiviati</option></select>'+
      '<select id="sc-f-cli" aria-label="Cliente" style="grid-column:1/-1"></select></div>'+
      '<div class="sc-ctx" id="sc-ctx"></div></div><div class="sc-body" id="sc-body"></div>';
    document.body.appendChild(scrim); document.body.appendChild(sheet);
    scrim.addEventListener('click',chiudi);
    sheet.querySelector('#sc-close').addEventListener('click',chiudi);
    sheet.querySelector('#sc-back').addEventListener('click',()=>setVista('smart'));
    sheet.querySelector('#sc-q').addEventListener('input',render);
    ['#sc-f-mese','#sc-f-stato','#sc-f-cli'].forEach(s=>sheet.querySelector(s).addEventListener('change',render));
    sheet.querySelector('#sc-body').addEventListener('click',e=>{
      const a=e.target.closest('[data-sc-azione]');
      if(a){ const z=a.dataset.scAzione; if(z==='tutte') setVista('tutte'); else if(z==='nuovo') scegli(NUOVO); else scegli(null); return; }
      const it=e.target.closest('[data-sc-id]'); if(it) scegli(it.dataset.scId);
    });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&sheet&&!sheet.hidden) chiudi(); });
  }
  function giornoDi(el){
    if(el.dataset.scGiorno) return el.dataset.scGiorno;
    if(el.dataset.scData){ try{ const f=document.querySelector(el.dataset.scData); if(f&&f.value) return f.value; }catch(e){} }
    return oggiISO();
  }
  function apri(el){
    if(!sheet) costruisci();
    cur={el,modo:el.dataset.sc==='id'?'id':'nome',profilo:el.dataset.scProfilo==='economico'?'economico':'operativo',
      giorno:giornoDi(el),persona:el.dataset.scPersona||'',
      vuotoOk:el.tagName!=='SELECT'||[...el.options].some(o=>o.value===''),
      nuovoOk:el.tagName==='SELECT'&&[...el.options].some(o=>o.value===NUOVO)};
    sheet.querySelector('#sc-q').value='';
    sheet.querySelector('#sc-f-stato').value='';
    scrim.hidden=false; sheet.hidden=false;
    setVista('smart');
    // su telefono non apriamo subito la tastiera: si vedono prima i suggeriti
    if(!(window.matchMedia&&matchMedia('(pointer:coarse)').matches)) setTimeout(()=>sheet.querySelector('#sc-q').focus(),50);
  }
  function chiudi(){ if(!sheet) return; sheet.hidden=true; scrim.hidden=true; if(cur&&cur.btn) try{cur.btn.focus();}catch(e){} cur=null; }

  // imposta il valore sul controllo originale e avvisa il codice esistente
  function scegli(id){
    if(!cur) return;
    const el=cur.el, L=cantieri();
    const x=id&&id!==NUOVO?L.find(y=>y.id===id):null;
    const v=id===NUOVO?NUOVO:x?(cur.modo==='id'?x.id:x.nome):'';
    if(el.tagName==='SELECT'&&v&&![...el.options].some(o=>o.value===v)){
      const o=document.createElement('option'); o.value=v; o.textContent=x.nome; el.appendChild(o);
    }
    el.value=v;
    if(x) segnaRecente(x.id);
    chiudi();
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    etichetta(el);
  }

  // ── bottone al posto del controllo
  function etichetta(el){
    const b=el._scBtn; if(!b) return;
    const v=el.value, L=cantieri();
    const x=!v?null:(el.dataset.sc==='id'?L.find(y=>y.id===v):L.find(y=>norm(y.nome)===norm(v)));
    b.disabled=!!el.disabled;
    b.classList.toggle('sc-warn',!!v&&!x&&v!==NUOVO);
    const h=v===NUOVO ? '<span class="sc-bn">➕ Nuovo cantiere</span><span class="sc-bm">il nome viene chiesto dall\'app</span>'
      : !v
      ? '<span class="sc-ph">'+esc(el.dataset.scVuoto||'🔍 Scegli o cerca la commessa…')+'</span>'
      : x ? '<span class="sc-bn">'+esc(x.nome)+'</span><span class="sc-bm">'+esc([x.cli,periodo(x),x.cod].filter(Boolean).join(' · '))+'</span>'
          : '<span class="sc-bn">'+esc(v)+'</span><span class="sc-bm">⚠ non trovato tra le commesse: tocca per ricollegarlo</span>';
    const t=b.querySelector('.sc-bt'); if(t.innerHTML!==h) t.innerHTML=h;
    const ti=x?[x.nome,x.cli,periodo(x),x.cod].filter(Boolean).join(' · '):(v&&v!==NUOVO?v:'');
    if(b.title!==ti) b.title=ti;
  }
  function potenzia(el){
    if(el._scBtn||!el.parentNode) return;
    const b=document.createElement('button'); b.type='button'; b.className='sc-btn';
    b.innerHTML='<span class="sc-bt"></span><span class="sc-chev">›</span>';
    if(el.classList.contains('ie')||el.hasAttribute('data-sc-compatto')) b.classList.add('sc-compact');
    // in una riga flex il bottone prende lo stesso spazio della select originale
    if(el.style.flex){ b.style.flex=el.style.flex; b.style.width='auto'; }
    if(el.style.minWidth) b.style.minWidth=el.style.minWidth;
    b.addEventListener('click',()=>{ if(el.disabled) return; apri(el); cur.btn=b; });
    el.parentNode.insertBefore(b,el.nextSibling);
    el.classList.add('sc-orig'); el._scBtn=b; el.dataset.scOk=SC_VER;
    // valori impostati da codice (es. precompila, reset del form) aggiornano il bottone
    const proto=Object.getPrototypeOf(el), d=Object.getOwnPropertyDescriptor(proto,'value');
    if(d&&d.set) try{ Object.defineProperty(el,'value',{configurable:true,get(){return d.get.call(el);},set(v){d.set.call(el,v);etichetta(el);}}); }catch(e){}
    etichetta(el);
  }
  function spento(){
    try{ if(localStorage.getItem('sc81_off')==='1') return true; }catch(e){}
    return !!(typeof DB!=='undefined'&&DB&&DB._selettoreCommessaOff===true);
  }
  let pend=false;
  function scansiona(){
    pend=false;
    const off=spento();
    document.querySelectorAll('[data-sc]').forEach(el=>{
      if(off){ if(el._scBtn){ el.classList.remove('sc-orig'); el._scBtn.hidden=true; } return; }
      if(!el._scBtn) potenzia(el); else { el.classList.add('sc-orig'); el._scBtn.hidden=false; etichetta(el); }
    });
  }
  function pianifica(){ if(!pend){ pend=true; (window.requestAnimationFrame||setTimeout)(scansiona); } }
  function avvia(){
    try{ const q=new URLSearchParams(location.search).get('sc');
      if(q==='off') localStorage.setItem('sc81_off','1'); else if(q==='on') localStorage.removeItem('sc81_off'); }catch(e){}
    scansiona();
    // ignora le modifiche fatte dal selettore stesso (foglio e bottoni), altrimenti si rincorre
    const nostro=t=>(sheet&&(t===sheet||sheet.contains(t)))||(t.closest&&t.closest('.sc-btn'));
    try{ new MutationObserver(ms=>{ if(ms.every(m=>nostro(m.target))) return; pianifica(); })
      .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']}); }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',avvia); else avvia();
  window.SelettoreCommessa={versione:SC_VER,apri,aggiorna:scansiona,spento};
})();
