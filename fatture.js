/* ═══════════════════════════════════════════════════════════════════════
   FATTURE E SCADENZE — veste nuova (stesso stile di Clienti, Presenze)
   Solo la parte grafica: dati e azioni restano quelli del Gestionale
   (_fatture, fattApri, fattNuova, fattFiltra, fattOrdina, _fattCmp,
   fattStatoScadenza, _fattAccTot, _fattResiduo, _fattDupSet, fattEliminaId).
   fattRenderAlert / fattRenderLista del Gestionale delegano qui.
   Script classico, caricato dopo il codice principale.
   ═══════════════════════════════════════════════════════════════════════ */

const FT2 = { anno:'' };

(function ft2Stile(){
  if(document.getElementById('ft2-css')) return;
  const s=document.createElement('style'); s.id='ft2-css';
  s.textContent=`
  .ft2{--f2-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--f2-soft:var(--td2,rgba(154,122,31,.06));--f2-sel:var(--td,rgba(154,122,31,.13));
    --f2-ok:var(--green,#2f7d4f);--f2-bad:var(--red,#b23a2e);--f2-warn:var(--gold,#c07d16);--f2-blu:#3f74b5}
  .ft2 .num{font-family:var(--f2-mono);font-variant-numeric:tabular-nums}
  .ft2-testa{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px}
  .ft2-testa h2{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .ft2-testa p{color:var(--text2);font-size:13px;margin-top:2px;max-width:640px}
  .ft2-az{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .ft2-az .bs{font-size:12.5px;padding:7px 12px}
  .ft2-tot{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1px;background:var(--brd);border:1px solid var(--brd);border-radius:12px;overflow:hidden;margin-bottom:14px}
  .ft2-tot button{all:unset;cursor:pointer;background:var(--card);padding:12px 16px;display:flex;flex-direction:column;gap:2px;min-width:0}
  .ft2-tot button:hover{background:var(--f2-soft)}
  .ft2-tot button.on{background:var(--f2-sel);box-shadow:inset 0 -3px 0 var(--teal)}
  .ft2-tot small{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
  .ft2-tot .num{font-size:20px;font-weight:600;white-space:nowrap}
  .ft2-tot .sub{font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ft2-tot .bad .num,.ft2-tot button.bad .num{color:var(--f2-bad)}
  .ft2-tot .warn .num,.ft2-tot button.warn .num{color:var(--f2-warn)}
  .ft2-tot .ok .num,.ft2-tot button.ok .num{color:var(--f2-ok)}
  .ft2-pan{background:var(--card);border:1px solid var(--brd);border-radius:12px;min-width:0;overflow:hidden;margin-bottom:14px}
  .ft2-pan-h{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--brd);background:var(--f2-soft)}
  .ft2-h{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:700}
  .ft2-sol{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:4px 16px;align-items:center;padding:9px 14px;border-bottom:1px solid var(--brd);cursor:pointer}
  .ft2-sol:last-child{border-bottom:0}
  .ft2-sol:hover{background:var(--f2-soft)}
  .ft2-filtri{display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px;border-bottom:1px solid var(--brd);background:var(--f2-soft);align-items:center}
  .ft2-cerca{flex:1 1 260px;min-width:0;border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 11px;font:inherit;font-size:13px;color:var(--text)}
  .ft2-sel{border:1px solid var(--brd);background:var(--card);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;color:var(--text)}
  .ft2-chip{border:1px solid var(--brd);background:var(--card);border-radius:99px;padding:5px 11px;font-size:12.5px;cursor:pointer;color:var(--text);font-family:inherit}
  .ft2-chip.on{background:var(--text);color:var(--card);border-color:var(--text)}
  .ft2-chip .n{font-family:var(--f2-mono);font-size:11px;opacity:.7;margin-left:4px}
  .ft2-chip.rosso:not(.on){color:var(--f2-bad)}
  .ft2-tw{overflow:auto;max-height:70vh}
  .ft2-t{width:100%;border-collapse:collapse}
  .ft2-t th{position:sticky;top:0;z-index:1;background:var(--card);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text2);font-weight:500;text-align:left;padding:9px 12px;border-bottom:1px solid var(--brd);white-space:nowrap;cursor:pointer;user-select:none}
  .ft2-t th.r,.ft2-t td.r{text-align:right}
  .ft2-t td{padding:10px 12px;border-bottom:1px solid var(--brd);vertical-align:middle;font-size:13.5px}
  .ft2-t tbody tr{cursor:pointer}
  .ft2-t tbody tr:hover{background:var(--f2-soft)}
  .ft2-t tr.dup{background:color-mix(in srgb,var(--f2-bad) 5%,transparent)}
  .ft2-nome{font-weight:600}
  .ft2-sub{font-size:12px;color:var(--text2)}
  .ft2-b{display:inline-block;font-size:11px;font-weight:600;padding:2px 9px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
  .ft2-b.ok{color:var(--f2-ok);background:color-mix(in srgb,var(--f2-ok) 12%,transparent)}
  .ft2-b.blu{color:var(--f2-blu);background:color-mix(in srgb,var(--f2-blu) 12%,transparent)}
  .ft2-b.warn{color:var(--f2-warn);background:color-mix(in srgb,var(--f2-warn) 14%,transparent)}
  .ft2-b.bad{color:var(--f2-bad);background:color-mix(in srgb,var(--f2-bad) 12%,transparent)}
  .ft2-b.neu{color:var(--text2);border-color:var(--brd)}
  .ft2-dup{font-size:10px;font-weight:700;color:var(--f2-bad);border:1px solid var(--f2-bad);border-radius:4px;padding:0 4px;margin-left:6px;vertical-align:1px}
  .ft2-barra{height:5px;border-radius:99px;background:var(--f2-soft);border:1px solid var(--brd);overflow:hidden;margin-top:5px;min-width:70px}
  .ft2-barra i{display:block;height:100%;background:var(--f2-ok)}
  .ft2-genya{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 14px;font-size:13px}
  .ft2-genya .t{color:var(--text2);font-size:12px}
  .ft2-genya select{font-size:12px;padding:5px 8px}
  .ft2-genya .bs{font-size:12px;padding:6px 11px}
  .ft2-vuoto{color:var(--text2);font-size:13px;padding:18px;text-align:center}
  @media (max-width:900px){ .ft2-tot{grid-template-columns:repeat(2,minmax(0,1fr))} .ft2-t td,.ft2-t th{padding:8px} }
  `;
  document.head.appendChild(s);
})();

/* ── aiuti ── */
const _f2D=d=>d?String(d).slice(0,10).split('-').reverse().join('/'):'—';
const _f2Credito=f=>f && (f.tipo||'')!=='nota di credito' && f.stato!=='annullata';
function _f2Classe(f){
  // categoria unica per filtri, riquadri e badge
  if((f.tipo||'')==='nota di credito') return 'nc';
  if(f.stato==='annullata') return 'annullata';
  if(f.stato==='pagata') return 'pagata';
  if(f.stato==='da_emettere') return 'da_emettere';
  const s=fattStatoScadenza(f);
  if(s&&s.cls==='scaduta') return 'scaduta';
  if(s&&s.cls==='prossima') return 'prossima';
  return 'aperta';
}
function _f2Base(){
  let l=Array.isArray(_fatture)?_fatture.slice():[];
  if(FT2.anno) l=l.filter(f=>String(f.data_fattura||'').slice(0,4)===FT2.anno || (!f.data_fattura && FT2.anno===String(new Date().getFullYear())));
  return l;
}
function _f2Anni(){
  const sel=document.getElementById('ft2-anno'); if(!sel) return;
  const anni=[...new Set((_fatture||[]).map(f=>String(f.data_fattura||'').slice(0,4)).filter(a=>/^\d{4}$/.test(a)))].sort().reverse();
  const cur=FT2.anno;
  sel.innerHTML='<option value="">Tutti gli anni</option>'+anni.map(a=>`<option value="${a}"${a===cur?' selected':''}>${a}</option>`).join('');
}
function ft2Anno(v){ FT2.anno=v||''; fattRenderAlert(); fattRenderLista(); }

/* ── riquadri in alto + elenco "da sollecitare" (al posto del vecchio avviso) ── */
function ft2Alert(){
  const box=document.getElementById('fatt-alert'); if(!box) return;
  _f2Anni();
  const L=_f2Base();
  const somma=(arr,res)=>arr.reduce((s,f)=>s+(res?_fattResiduo(f):(+f.importo||0)),0);
  const aperte=L.filter(f=>_f2Credito(f)&&f.stato==='emessa'&&_fattResiduo(f)>0.009);
  const scad=L.filter(f=>_f2Classe(f)==='scaduta'), pross=L.filter(f=>_f2Classe(f)==='prossima');
  const pag=L.filter(f=>_f2Credito(f)&&f.stato==='pagata'), daEm=L.filter(f=>f.stato==='da_emettere');
  const fat=L.filter(f=>_f2Credito(f)&&f.stato!=='da_emettere');
  const incassato=pag.reduce((s,f)=>s+(+f.importo||0),0)+L.filter(f=>_f2Credito(f)&&f.stato==='emessa').reduce((s,f)=>s+Math.min(_fattAccTot(f),+f.importo||0),0);
  const fl=_fattFiltro;
  const c=(k,cls,tit,num,sub)=>`<button class="${cls} ${fl===k?'on':''}" onclick="fattFiltra('${k}')"><small>${tit}</small><span class="num">${num}</span><span class="sub">${sub}</span></button>`;
  let h=`<div class="ft2-tot">
    ${c('tutte','', 'Fatturato'+(FT2.anno?' '+FT2.anno:''), fmtE(somma(fat)), fat.length+' fatture · incassato '+fmtE(incassato))}
    ${c('emessa','warn','Da incassare', fmtE(somma(aperte,true)), aperte.length+' fatture aperte')}
    ${c('scadute','bad','Scadute', fmtE(somma(scad,true)), scad.length?scad.length+' da sollecitare':'nessuna')}
    ${c('prossime','warn','In scadenza', fmtE(somma(pross,true)), pross.length?pross.length+' entro il preavviso':'nessuna')}
    ${c('pagata','ok','Incassate', fmtE(somma(pag)), pag.length+' pagate'+(daEm.length?' · '+daEm.length+' da emettere':''))}
  </div>`;
  // da sollecitare: le scadute più vecchie e quelle in scadenza
  const sol=[...scad,...pross].sort((a,b)=>String(a.scadenza||'').localeCompare(String(b.scadenza||''))).slice(0,6);
  if(sol.length && fl!=='scadute' && fl!=='prossime'){
    h+=`<div class="ft2-pan"><div class="ft2-pan-h"><span class="ft2-h">🔔 Da sollecitare</span>${scad.length+pross.length>6?`<button class="ft2-chip" onclick="fattFiltra('scadute')">Vedi tutte (${scad.length+pross.length})</button>`:''}</div>
      ${sol.map(f=>{ const s=fattStatoScadenza(f); const res=_fattResiduo(f);
        return `<div class="ft2-sol" onclick="fattApri(${f.id})">
          <div><div class="ft2-nome">${esc(f.cliente||'—')}</div><div class="ft2-sub">${esc(f.numero||'s.n.')}${f.cantiere_nome?' · '+esc(f.cantiere_nome):''}</div></div>
          <span class="ft2-b ${s&&s.cls==='scaduta'?'bad':'warn'}">${esc(s?s.txt:'')} · ${_f2D(f.scadenza)}</span>
          <span class="num" style="font-weight:600">${fmtE(res)}</span></div>`; }).join('')}</div>`;
  }
  box.innerHTML=h;
}

/* ── elenco ── */
function ft2Lista(){
  const cont=document.getElementById('fatt-lista'); if(!cont) return;
  const tutte=_f2Base(); const dupSet=_fattDupSet();
  const conta={tutte:tutte.length, emessa:0, parziali:0, scadute:0, prossime:0, da_emettere:0, pagata:0, annullate:0, duplicati:0};
  tutte.forEach(f=>{ const k=_f2Classe(f);
    if(_f2Credito(f)&&f.stato==='emessa'&&_fattResiduo(f)>0.009) conta.emessa++;
    if(f.stato==='emessa'&&_fattAccTot(f)>0) conta.parziali++;
    if(k==='scaduta') conta.scadute++; if(k==='prossima') conta.prossime++;
    if(k==='da_emettere') conta.da_emettere++; if(k==='pagata') conta.pagata++;
    if(k==='annullata'||k==='nc') conta.annullate++;
    if(dupSet.has(String(f.id))) conta.duplicati++; });
  let lista=tutte;
  const fl=_fattFiltro;
  if(fl==='emessa') lista=lista.filter(f=>_f2Credito(f)&&f.stato==='emessa'&&_fattResiduo(f)>0.009);
  else if(fl==='parziali') lista=lista.filter(f=>f.stato==='emessa'&&_fattAccTot(f)>0);
  else if(fl==='scadute') lista=lista.filter(f=>_f2Classe(f)==='scaduta');
  else if(fl==='prossime') lista=lista.filter(f=>_f2Classe(f)==='prossima');
  else if(fl==='da_emettere') lista=lista.filter(f=>f.stato==='da_emettere');
  else if(fl==='pagata') lista=lista.filter(f=>f.stato==='pagata'&&_f2Credito(f));
  else if(fl==='annullate') lista=lista.filter(f=>{ const k=_f2Classe(f); return k==='annullata'||k==='nc'; });
  else if(fl==='duplicati') lista=lista.filter(f=>dupSet.has(String(f.id)));
  const q=(document.getElementById('fatt-search')?.value||'').toLowerCase().trim();
  if(q) lista=lista.filter(f=>[f.cliente,f.cantiere_nome,f.numero,f.note,f.descrizione].some(x=>String(x||'').toLowerCase().includes(q)));
  lista.sort(_fattCmp);
  const ch=(k,lbl,cls)=>`<button class="ft2-chip fatt-flt ${cls||''} ${fl===k?'on':''}" data-flt="${k}" onclick="fattFiltra('${k}')">${lbl}<span class="n">${conta[k]}</span></button>`;
  const ar=c=>_fattSort===c?(_fattDir>0?' ▲':' ▼'):'';
  const th=(c,lbl,cls)=>`<th class="${cls||''}" onclick="fattOrdina('${c}')" title="Ordina per ${lbl}">${lbl}${ar(c)}</th>`;
  const tot=lista.filter(_f2Credito).reduce((s,f)=>s+(+f.importo||0),0), res=lista.filter(f=>_f2Credito(f)&&f.stato==='emessa').reduce((s,f)=>s+_fattResiduo(f),0);
  const chips=document.getElementById('ft2-chips');
  if(chips) chips.innerHTML=ch('tutte','Tutte')+ch('emessa','Da incassare')+ch('scadute','Scadute','rosso')+ch('prossime','In scadenza')+ch('parziali','Con acconti')+ch('da_emettere','Da emettere')+ch('pagata','Pagate')+ch('annullate','Annullate / NC')+(conta.duplicati?ch('duplicati','⚠ Doppioni','rosso'):'');
  const info=document.getElementById('ft2-info');
  if(info) info.innerHTML=`<b>${lista.length}</b> fatture · ${fmtE(tot)}${res>0.009?' · da incassare <b class="num">'+fmtE(res)+'</b>':''}`;
  _f2Anni();
  if(!lista.length){ cont.innerHTML='<div class="ft2-vuoto">Nessuna fattura in questa vista.</div>'; return; }
  let h='';
  h+=`<div class="ft2-tw"><table class="ft2-t"><thead><tr>
      ${th('cliente','Cliente / commessa')}${th('numero','Numero')}${th('data_fattura','Data')}${th('scadenza','Scadenza')}<th>Stato</th>${th('importo','Importo','r')}<th class="r">Da incassare</th></tr></thead><tbody>
    ${(()=>{ const riga=f=>{
      const k=_f2Classe(f), s=fattStatoScadenza(f), acc=_fattAccTot(f), resid=_fattResiduo(f), imp=+f.importo||0;
      const isDup=dupSet.has(String(f.id));
      const badge={pagata:['ok','Pagata'],da_emettere:['neu','Da emettere'],annullata:['neu','Annullata (NC)'],nc:['neu','Nota di credito'],
                   scaduta:['bad','Scaduta'],prossima:['warn','In scadenza'],aperta:['blu','Da incassare']}[k];
      const pagTxt=k==='pagata'&&f.data_pagamento?`<div class="ft2-sub">il ${_f2D(f.data_pagamento)}</div>`:(acc>0&&f.stato==='emessa'?`<div class="ft2-sub">acconti ${fmtE(acc)}</div>`:'');
      const perc=imp>0&&f.stato==='emessa'&&acc>0?Math.min(100,Math.round(acc/imp*100)):null;
      return `<tr class="${isDup?'dup':''}" onclick="fattApri(${f.id})">
        <td><div class="ft2-nome">${esc(f.cliente||'—')}${isDup?'<span class="ft2-dup" title="Possibile doppione: stesso cliente e numero, o stesso importo e data di un\'altra">DOPPIONE</span>':''}</div>
          <div class="ft2-sub">${f.cantiere_nome?esc(f.cantiere_nome):'senza commessa'}${(f.tipo&&f.tipo!=='unica')?' · '+esc(f.tipo):''}</div></td>
        <td class="num">${esc(f.numero||'—')}</td>
        <td class="num" style="color:var(--text2)">${_f2D(f.data_fattura)}</td>
        <td class="num">${_f2D(f.scadenza)}${s?`<div class="ft2-sub" style="color:${s.cls==='scaduta'?'var(--f2-bad)':'var(--f2-warn)'}">${esc(s.txt)}</div>`:''}</td>
        <td><span class="ft2-b ${badge[0]}">${badge[1]}</span>${pagTxt}</td>
        <td class="r num" style="font-weight:600;${_f2Credito(f)?'':'color:var(--text2);text-decoration:line-through'}">${fmtE(imp)}</td>
        <td class="r">${f.stato==='emessa'&&_f2Credito(f)?`<span class="num" style="font-weight:600">${fmtE(resid)}</span>${perc!=null?`<div class="ft2-barra" title="incassato ${perc}%"><i style="width:${perc}%"></i></div>`:''}`:'<span class="ft2-sub">—</span>'}
          ${isDup?`<div><button class="bs" style="font-size:11px;padding:3px 8px;margin-top:4px;color:var(--f2-bad)" onclick="event.stopPropagation();fattEliminaId(${f.id})">Elimina doppione</button></div>`:''}</td>
      </tr>`; };
      // Da seguire in cima (da incassare, da emettere, doppioni), il resto per anno ▸ mese (raggruppa.js)
      return typeof RAGGRUPPA!=='undefined'
        ? RAGGRUPPA.tabella({ chiave:'fatture', voci:lista, colonne:7, cerca:q, riga, anno:FT2.anno||'tutti', ordina:false,
            data:f=>f.data_fattura, somma:f=>_f2Credito(f)?(+f.importo||0):0, formato:fmtE,
            daSeguire:f=>f.stato==='da_emettere' || dupSet.has(String(f.id)) || (_f2Credito(f)&&f.stato==='emessa'&&_fattResiduo(f)>0.009) })
        : lista.map(riga).join(''); })()}
    </tbody></table></div>`;
  cont.innerHTML=h;
}
if(typeof RAGGRUPPA!=='undefined') RAGGRUPPA.registra('fatture', ()=>ft2Lista());
