/* ═══════════════════════════════════════════════════════════════════════
   CONFIGURAZIONE AZIENDA — unico punto con i dati della società.
   Ogni installazione (81|00, Aurica, …) ha il suo azienda.js: il resto del
   codice è identico e legge tutto da window.AZIENDA.
   Va caricato PRIMA di ogni altro script (subito dopo <title>).
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var A = {
    id:             '81100',                    // identificativo interno (anche suffisso di alcune chiavi locali)
    ragioneSociale: 'Ottantunocento S.r.l.',
    marchio:        '81|00',                    // logo testuale e titoli delle app
    nomeBreve:      'Ottantunocento',           // nomi file, cartelle, testi
    intestazione:   "L'OTTANTUNOCENTO",         // riga di testa dei report Excel
    piva:           '02187720616',
    sede:           'Caserta',

    supabase: {
      url:     'https://xqbhujcnjvwbwzpwjujf.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYmh1amNuanZ3Ynd6cHdqdWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MzM4ODUsImV4cCI6MjA5NzMwOTg4NX0.VstO3aII143jpPXjgKg0t3du-yc5rS9xs2hYko_2DRs'
    },

    accesso: {
      emailPin:       'giaquinto.giuseppe+campo@gmail.com',   // account condiviso delle app di campo (PIN)
      chiaveSessione: 'sb81_sess',                            // chiave locale della sessione di login
      paginaReset:    'https://giaquintogiuseppe-bit.github.io/ottantunocento-gestionale/reset.html'
    },

    app: {
      gestionale: 'https://giaquintogiuseppe-bit.github.io/ottantunocento-gestionale/',
      planning:   'https://giaquintogiuseppe-bit.github.io/ottantunocento-planning/',
      preventivi: 'https://giaquintogiuseppe-bit.github.io/preventivi/',
      risorse:    'https://giaquintogiuseppe-bit.github.io/ottantunocento-risorse/'
    }
  };

  // Valori derivati
  A.fileDati      = A.nomeBreve.toLowerCase() + '-dati.json';
  A.cartellaIcloud = 'iCloud Drive → ' + A.nomeBreve;

  // Valore per percorso puntato: AZIENDA.val('app.risorse')
  A.val = function(percorso){
    return String(percorso).split('.').reduce(function(o, k){ return (o == null) ? undefined : o[k]; }, A);
  };
  // Sostituisce {chiave} e {a.b} in un testo: AZIENDA.testo('{marchio} Gestionale')
  A.testo = function(t){
    return String(t).replace(/\{([\w.]+)\}/g, function(m, k){ var v = A.val(k); return (v == null) ? m : String(v); });
  };

  // ── Protezione: mai due aziende nello stesso browser/origine ─────────────
  // Le app salvano dati in locale (cache, sessione). Se sullo stesso indirizzo
  // girasse l'app di un'altra azienda, quei dati finirebbero nel database
  // sbagliato. In quel caso l'app si blocca prima di caricare qualsiasi cosa.
  var CHIAVE_AZIENDA = 'azienda_attiva';
  var precedente = null;
  try{
    precedente = localStorage.getItem(CHIAVE_AZIENDA);
    if(!precedente) localStorage.setItem(CHIAVE_AZIENDA, A.id);
  }catch(e){ /* storage non disponibile: nessun dato locale da proteggere */ }

  if(precedente && precedente !== A.id){
    document.addEventListener('DOMContentLoaded', function(){
      document.body.innerHTML =
        '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:60px auto;padding:24px;'+
        'border:2px solid #a63b3b;border-radius:12px;color:#152238;line-height:1.5">'+
        '<h2 style="margin-top:0;color:#a63b3b">App bloccata</h2>'+
        'Questo browser contiene già i dati di un\'altra azienda (<b>'+precedente+'</b>). '+
        'Per sicurezza l\'app di <b>'+A.ragioneSociale+'</b> non parte qui: va aperta dal suo indirizzo.</div>';
    });
    throw new Error('AZIENDA: conflitto di azienda nello stesso browser (' + precedente + ' ≠ ' + A.id + ')');
  }

  Object.freeze(A.supabase); Object.freeze(A.accesso); Object.freeze(A.app);
  window.AZIENDA = Object.freeze(A);

  // ── Testi statici della pagina ──────────────────────────────────────────
  //   data-az="{marchio} Gestionale"   → testo (solo il primo nodo di testo, i figli restano)
  //   data-az-href="{app.risorse}"     → link
  //   data-az-content="{marchio} …"    → attributo content (meta)
  function applica(radice){
    (radice || document).querySelectorAll('[data-az],[data-az-href],[data-az-content]').forEach(function(el){
      var t = el.getAttribute('data-az');
      if(t != null){
        var nodo = null;
        for(var i = 0; i < el.childNodes.length; i++){ if(el.childNodes[i].nodeType === 3){ nodo = el.childNodes[i]; break; } }
        if(nodo) nodo.nodeValue = A.testo(t); else el.insertBefore(document.createTextNode(A.testo(t)), el.firstChild);
      }
      var h = el.getAttribute('data-az-href');    if(h != null) el.setAttribute('href', A.testo(h));
      var c = el.getAttribute('data-az-content'); if(c != null) el.setAttribute('content', A.testo(c));
    });
  }
  window.applicaAzienda = applica;   // per contenuti inseriti dopo il caricamento
  // <title> e <meta> sono già nel DOM quando questo script gira (va caricato dopo <title>)
  applica(document);
  document.addEventListener('DOMContentLoaded', function(){ applica(document); });
})();
