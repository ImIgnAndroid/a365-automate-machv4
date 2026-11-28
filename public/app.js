/* ════════════════════════════════════════════════════════════
   MDA · consola de la Mesa de Ayuda
   Autor: Engineer M.

   Acceso: la página solo guarda hashes PBKDF2 de las claves (las claves
   en texto plano viven en private/, fuera del repo y fuera del sitio).
   Es un control de acceso en el navegador para pruebas: no reemplaza
   una autenticación en servidor.
   ════════════════════════════════════════════════════════════ */
'use strict';

/* ───────────────────────── Perfiles ───────────────────────── */
const KDF_ITER = 150000;
const PROFILES = {
  clasico:       { label:'Agente', hash:'2275f61f5a0f7d49d91a680fe2b1e77740a1374858adff09bc3cb22a400d6412',
                   features:['plantillas','coaxial','tablas'] },
  especial:      { label:'Agente especial', hash:'ac67f911ef518bf0e34a4da906a356686f69ff7973ef93d9e6a0eb26cfb75639',
                   features:['plantillas','coaxial','tablas','speech'], user:'CAPILLO HIDALGO MOISÉS A.' },
  entrenamiento: { label:'Entrenamiento', hash:'288b7677f327c3a0b0112cf2e201eed9dd0fa0dfdd972679cb3f20ca2324b4eb',
                   features:['plantillas','coaxial','tablas','entrenamiento'] },
  senior:        { label:'Senior', hash:'56b073f3c013480ed9a57b4efe0b1316df4f9fe3fd304a39a58550d8166ed673',
                   features:['plantillas','coaxial','tablas','senior'] }
};

/* ───────────────────────── Utilidades ───────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad2 = n => String(n).padStart(2, '0');

const LS = {
  get(k, fb){ try{ const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }catch(e){ return fb; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const SS = {
  get(k){ try{ const v = sessionStorage.getItem(k); return v == null ? null : JSON.parse(v); }catch(e){ return null; } },
  set(k, v){ try{ sessionStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ sessionStorage.removeItem(k); }catch(e){} }
};

let PROFILE_ID = null;
const k = name => `mda.${PROFILE_ID}.${name}`;   // datos separados por perfil

const toastEl = $('#toast');
let toastT = null;
function toast(msg, opt = {}){
  clearTimeout(toastT);
  toastEl.innerHTML = '';
  const span = document.createElement('span'); span.textContent = msg; toastEl.appendChild(span);
  if(opt.action){
    const b = document.createElement('button'); b.type = 'button'; b.textContent = opt.action.label;
    b.addEventListener('click', () => { opt.action.run(); toastEl.classList.remove('show'); });
    toastEl.appendChild(b);
  }
  toastEl.className = 'toast show' + (opt.warn ? ' warn' : '');
  toastT = setTimeout(() => toastEl.classList.remove('show'), opt.ms || 2200);
}
function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}
function legacyCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  ta.remove();
}

/* ════════════════════════════════════════════════════════════
   SESIÓN · dura mientras quede al menos una pestaña abierta.
   Una pestaña nueva pregunta por BroadcastChannel si hay otra viva
   con sesión; si responde, hereda ese perfil. Al cerrar todas, se pide
   la clave otra vez. (Los temporizadores se congelan en pestañas de
   fondo, por eso no se usa un "latido" con setInterval.)
   ════════════════════════════════════════════════════════════ */
const SESSION_KEY = 'mda.session';
const chan = ('BroadcastChannel' in window) ? new BroadcastChannel('mda') : null;

function askOtherTabs(timeout = 300){
  return new Promise(resolve => {
    if(!chan) return resolve(null);
    const nonce = uid();
    const onMsg = e => {
      if(e.data && e.data.type === 'pong' && e.data.nonce === nonce && PROFILES[e.data.p]){
        chan.removeEventListener('message', onMsg); clearTimeout(t); resolve(e.data.p);
      }
    };
    chan.addEventListener('message', onMsg);
    chan.postMessage({ type:'ping', nonce });
    const t = setTimeout(() => { chan.removeEventListener('message', onMsg); resolve(null); }, timeout);
  });
}
if(chan){
  chan.addEventListener('message', e => {
    const d = e.data || {};
    if(d.type === 'ping' && PROFILE_ID) chan.postMessage({ type:'pong', nonce:d.nonce, p:PROFILE_ID });
    if(d.type === 'logout' && PROFILE_ID){ SS.del(SESSION_KEY); location.reload(); }
  });
}
window.addEventListener('storage', e => {
  if(e.key === SESSION_KEY && PROFILE_ID){
    const nv = e.newValue ? JSON.parse(e.newValue) : null;
    if(!nv){ SS.del(SESSION_KEY); location.reload(); }
    else if(nv.p !== PROFILE_ID){ SS.set(SESSION_KEY, nv); location.reload(); }
  }
});

async function resumeSession(){
  const shared = LS.get(SESSION_KEY, null);
  if(!shared || !PROFILES[shared.p]) return null;
  const mine = SS.get(SESSION_KEY);
  if(mine && mine.p === shared.p) return shared.p;          // recarga o pestaña duplicada
  if(!chan) return shared.p;                                  // navegador sin BroadcastChannel
  const p = await askOtherTabs();
  if(p){ SS.set(SESSION_KEY, { p }); return p; }              // otra pestaña viva: hereda su cuenta
  LS.del(SESSION_KEY);                                        // no queda ninguna: sesión cerrada
  return null;
}
function startSession(p){
  LS.set(SESSION_KEY, { p, t:Date.now() });
  SS.set(SESSION_KEY, { p });
}
function endSession(){
  LS.del(SESSION_KEY); SS.del(SESSION_KEY);
  if(chan) chan.postMessage({ type:'logout' });
  location.reload();
}

/* ───────────────────────── Puerta ───────────────────────── */
async function derive(pass, id){
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt:enc.encode('mda.v2.' + id), iterations:KDF_ITER, hash:'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function matchProfile(pass){
  for(const id of Object.keys(PROFILES)){
    if(await derive(pass, id) === PROFILES[id].hash) return id;
  }
  return null;
}

function setupGate(){
  const form = $('#gateForm'), pass = $('#gatePass'), msg = $('#gateMsg'), btn = $('#gateBtn'), card = $('.gate-card');
  let fails = 0, lockUntil = 0;
  if(!(window.crypto && crypto.subtle)){
    msg.textContent = 'Este navegador necesita abrir la página por HTTPS.'; msg.className = 'gate-msg bad';
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if(Date.now() < lockUntil){ msg.textContent = `Espera ${Math.ceil((lockUntil - Date.now())/1000)} s.`; msg.className = 'gate-msg bad'; return; }
    const v = pass.value;
    if(!v) return pass.focus();
    btn.disabled = true; msg.textContent = 'Verificando…'; msg.className = 'gate-msg';
    let p = null;
    try{ p = await matchProfile(v); }catch(err){ msg.textContent = 'No se pudo verificar en este navegador.'; msg.className = 'gate-msg bad'; btn.disabled = false; return; }
    btn.disabled = false;
    if(p){
      pass.value = ''; msg.textContent = '';
      startSession(p); enterApp(p);
    } else {
      fails++;
      if(fails >= 5){ lockUntil = Date.now() + 30000; fails = 0; }
      msg.textContent = 'Clave incorrecta.'; msg.className = 'gate-msg bad';
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      pass.select();
    }
  });
}

/* ════════════════════════════════════════════════════════════
   APP
   ════════════════════════════════════════════════════════════ */
function enterApp(p){
  PROFILE_ID = p;
  const prof = PROFILES[p];
  $('#gate').hidden = true;
  $('#app').hidden = false;

  $$('[data-feature]').forEach(el => { el.hidden = !prof.features.includes(el.dataset.feature); });

  const agent = $('#agent');
  const defAgent = prof.user ? `${prof.user} - A365` : '';
  agent.value = LS.get(k('agent'), defAgent);
  const syncWho = () => {
    const name = (agent.value || '').replace(/\s*-\s*A365\s*$/i, '').trim();
    $('#whoName').textContent = prof.user || name || 'Sin nombre';
    $('#whoTag').textContent = prof.label;
  };
  agent.addEventListener('input', () => { LS.set(k('agent'), agent.value); syncWho(); Gen.update(); });
  syncWho();

  setupTabs();
  setupLinks();
  setupPopovers();
  Gen.init();
  setupCoax();
  Tables.init();
  if(prof.features.includes('speech')) Speech.init();
  $('#logoutBtn').addEventListener('click', endSession);
}

function setupTabs(){
  const tabs = $$('#tabs .tab');
  const show = v => {
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.view === v));
    $$('.view').forEach(s => s.classList.toggle('is-active', s.id === 'view-' + v));
    LS.set(k('view'), v);
  };
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));
  const last = LS.get(k('view'), 'plantillas');
  const ok = tabs.find(t => t.dataset.view === last && !t.hidden);
  show(ok ? last : 'plantillas');
}

/* ───────────────────────── Enlaces ───────────────────────── */
function setupLinks(){
  $('#quickLinks').innerHTML = LINKS.filter(l => l.quick)
    .map(l => `<a class="qlink" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.d)}">${esc(l.t)}</a>`).join('');
  $('#linksGrid').innerHTML = LINKS
    .map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(l.t)}</b><span>${esc(l.d)}</span></a>`).join('');
}

/* ───────────────────────── Popovers (enlaces, FTTH) ───────────────────────── */
function setupPopovers(){
  const pairs = [['allLinksBtn','linksPop'], ['ftthBtn','ftthPop']];
  let ftthT = null;
  const close = id => {
    const pop = $('#' + id); if(!pop || pop.hidden) return;
    pop.hidden = true;
    const b = pairs.find(p => p[1] === id); if(b) $('#' + b[0]).setAttribute('aria-expanded', 'false');
    if(id === 'ftthPop') clearTimeout(ftthT);
  };
  const open = id => {
    pairs.forEach(p => { if(p[1] !== id) close(p[1]); });
    const pop = $('#' + id); pop.hidden = false;
    const b = pairs.find(p => p[1] === id); $('#' + b[0]).setAttribute('aria-expanded', 'true');
    if(id === 'ftthPop'){
      const bar = $('#ftthTimer'); bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
      clearTimeout(ftthT); ftthT = setTimeout(() => close('ftthPop'), 10000);
    }
  };
  pairs.forEach(([b, p]) => $('#' + b).addEventListener('click', e => {
    e.stopPropagation();
    $('#' + p).hidden ? open(p) : close(p);
  }));
  $$('[data-close]').forEach(x => x.addEventListener('click', () => close(x.dataset.close)));
  document.addEventListener('click', e => {
    pairs.forEach(([, p]) => { const pop = $('#' + p); if(!pop.hidden && !pop.contains(e.target)) close(p); });
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){ pairs.forEach(([, p]) => close(p)); if(window.Speech) Speech.close(); }
  });
}

/* ════════════════════════════════════════════════════════════
   GENERADOR · el texto se arma solo con cada cambio
   ════════════════════════════════════════════════════════════ */
const MK_L = '\u27E6', MK_R = '\u27E7';
const marker = label => MK_L + label.toUpperCase() + MK_R;
const isoToDMY = iso => { const p = (iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''; };
const dmyToISO = s => { const m = (s || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/); if(!m) return ''; let [, d, mo, y] = m; if(y.length === 2) y = '20' + y; return `${y}-${mo}-${d}`; };

function horizontal(text, sep){
  return text.split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l && !/^[-=_*·.]{4,}$/.test(l))
    .join(sep);
}

const Gen = {
  st:null,
  armed:false, armT:null,
  lastMissing:[],

  init(){
    const saved = LS.get(k('form'), null);
    this.st = Object.assign({ cat:'seguimiento', tpl:'sd1', sot:'', mode:'tab', sep:' | ', vals:{}, lastByCat:{} }, saved || {});
    if(!TEMPLATES.find(t => t.id === this.st.tpl)) this.st.tpl = 'sd1';
    this.save = debounce(() => LS.set(k('form'), this.st), 120);

    this.renderCats();
    $('#cats').addEventListener('click', e => {
      const b = e.target.closest('button'); if(!b) return;
      this.st.cat = b.dataset.cat;
      const first = TEMPLATES.find(t => t.cat === this.st.cat);
      this.select(this.st.lastByCat[this.st.cat] || first.id);
    });
    $('#tplList').addEventListener('click', e => {
      const b = e.target.closest('.tpl'); if(b) this.select(b.dataset.id);
    });

    const sot = $('#sot');
    sot.value = this.st.sot;
    sot.addEventListener('input', () => { this.st.sot = sot.value; this.save(); this.update(); });

    $$('#modeSeg button').forEach(b => b.addEventListener('click', () => { this.st.mode = b.dataset.mode; this.save(); this.syncMode(); this.update(); }));
    const sep = $('#sepSel'); sep.value = this.st.sep;
    sep.addEventListener('change', () => { this.st.sep = sep.value; this.save(); this.update(); });

    $('#copyBtn').addEventListener('click', () => this.copy());
    $('#newCaseBtn').addEventListener('click', () => this.newCase());
    $('#toaInput').addEventListener('input', e => this.fromTOA(e.target.value));
    document.addEventListener('keydown', e => {
      if((e.ctrlKey || e.metaKey) && e.key === 'Enter' && $('#view-plantillas').classList.contains('is-active')){ e.preventDefault(); this.copy(); }
    });
    $('#genStatus').addEventListener('click', e => {
      const b = e.target.closest('button[data-focus]'); if(!b) return;
      const id = b.dataset.focus;
      const el = id === 'sot' ? $('#sot') : id === 'agent' ? $('#agent') : ($('#f_' + id) || $(`[data-fid="${id}"] button`));
      if(el){ el.focus(); el.scrollIntoView({ block:'center', behavior:'smooth' }); }
    });

    this.syncMode();
    this.select(this.st.tpl, true);
    setInterval(() => this.update(), 20000);   // fecha y hora al minuto
  },

  tpl(){ return TEMPLATES.find(t => t.id === this.st.tpl); },
  norm(spec){ return typeof spec === 'string' ? { id:spec } : spec; },
  raw(id){
    const v = this.st.vals[id];
    if(v !== undefined && v !== null && v !== '') return v;
    return FIELDS[id] && FIELDS[id].def !== undefined ? FIELDS[id].def : '';
  },
  rawAll(){ const r = {}; Object.keys(FIELDS).forEach(id => r[id] = this.raw(id)); return r; },
  optionsFor(f){
    if(f.options) return f.options;
    if(f.from){ return f.from.map[this.raw(f.from.field)] || []; }
    return [];
  },

  renderCats(){
    $('#cats').innerHTML = CATEGORIES.map(c => {
      const n = TEMPLATES.filter(t => t.cat === c.id).length;
      return `<button type="button" role="tab" data-cat="${c.id}">${esc(c.label)}<b>${n}</b></button>`;
    }).join('');
  },

  select(id, initial){
    const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[0];
    this.st.tpl = t.id; this.st.cat = t.cat; this.st.lastByCat[t.cat] = t.id;
    this.save();
    $$('#cats button').forEach(b => { const on = b.dataset.cat === t.cat; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    const list = TEMPLATES.filter(x => x.cat === t.cat);
    $('#tplList').innerHTML = list.map((x, i) => `
      <button type="button" class="tpl${x.id === t.id ? ' is-on' : ''}" data-id="${x.id}" role="option" aria-selected="${x.id === t.id}">
        <small>${pad2(i + 1)}</small><span>${esc(x.title)}</span>${x.note ? `<em>${esc(x.note)}</em>` : ''}
      </button>`).join('');
    $('#toaBox').hidden = !t.toa;
    if(!t.toa){ $('#toaInput').value = ''; $('#toaStatus').textContent = 'esperando texto'; $('#toaStatus').className = 'toa-status'; }
    $('#genTitle').textContent = t.title;
    this.renderFields();
    this.update();
    if(!initial) this.disarm();
  },

  renderFields(){
    const t = this.tpl(), box = $('#fields');
    if(!t.fields.length){
      box.innerHTML = `<div class="empty-fields">Esta plantilla solo necesita el SOT y “Realizado por”.</div>`;
      return;
    }
    box.innerHTML = t.fields.map(spec => {
      const { id } = this.norm(spec), f = FIELDS[id], val = this.raw(id);
      const wide = f.wide || f.type === 'area' ? ' wide' : '';
      let ctl = '';
      if(f.type === 'seg'){
        ctl = `<div class="seg" role="radiogroup" aria-labelledby="l_${id}">${f.options.map(o =>
          `<button type="button" role="radio" data-v="${esc(o)}" aria-checked="${o === val}" class="${o === val ? 'is-on' : ''}">${esc(o)}</button>`).join('')}</div>`;
        return `<div class="f${wide}" data-fid="${id}"><span class="lbl" id="l_${id}">${esc(f.label)}</span>${ctl}</div>`;
      }
      if(f.type === 'select'){
        ctl = `<select id="f_${id}"></select>`;
      } else if(f.type === 'area'){
        ctl = `<textarea id="f_${id}" rows="2" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`;
      } else if(f.type === 'date'){
        ctl = `<input type="date" id="f_${id}" value="${esc(val)}">`;
      } else {
        ctl = `<input type="text" id="f_${id}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" autocomplete="off"${f.mode ? ` inputmode="${f.mode}"` : ''}>`;
      }
      return `<div class="f${wide}" data-fid="${id}"><label class="lbl" for="f_${id}">${esc(f.label)}</label>${ctl}</div>`;
    }).join('');

    t.fields.forEach(spec => {
      const { id } = this.norm(spec), f = FIELDS[id];
      const wrap = $(`[data-fid="${id}"]`, box);
      if(f.type === 'seg'){
        wrap.addEventListener('click', e => {
          const b = e.target.closest('button[data-v]'); if(!b) return;
          this.set(id, b.dataset.v);
          $$('button', wrap).forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on); });
        });
      } else {
        const el = $('#f_' + id);
        el.addEventListener(f.type === 'select' || f.type === 'date' ? 'change' : 'input', () => this.set(id, el.value));
        if(f.type === 'date') el.addEventListener('input', () => this.set(id, el.value));
      }
    });
    this.refreshDynamic();
  },

  /* Visibilidad condicional y listas dependientes */
  refreshDynamic(){
    const t = this.tpl(), r = this.rawAll();
    t.fields.forEach(spec => {
      const s = this.norm(spec), f = FIELDS[s.id];
      const wrap = $(`[data-fid="${s.id}"]`);
      if(!wrap) return;
      wrap.hidden = !!(s.when && !s.when(r));
      if(f.type === 'select'){
        const el = $('#f_' + s.id), opts = this.optionsFor(f), cur = this.raw(s.id);
        const sig = opts.join('\u0001');
        if(el.dataset.sig !== sig){
          const parentLabel = f.from ? FIELDS[f.from.field].label.toLowerCase() : '';
          el.innerHTML = (opts.length ? `<option value="">— Seleccionar —</option>` : `<option value="">— Primero elige ${esc(parentLabel)} —</option>`)
            + opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
          el.disabled = !opts.length;
          el.dataset.sig = sig;
        }
        if(cur && !opts.includes(cur)){ this.st.vals[s.id] = ''; }
        el.value = opts.includes(cur) ? cur : '';
      }
    });
  },

  set(id, value){
    this.st.vals[id] = value;
    this.save();
    this.refreshDynamic();
    this.update();
  },

  build(){
    const t = this.tpl(), r = this.rawAll(), v = {}, missing = [];
    t.fields.forEach(spec => {
      const s = this.norm(spec), f = FIELDS[s.id];
      if(s.when && !s.when(r)){ v[s.id] = s.otherwise || ''; return; }
      let val = String(r[s.id] || '').trim();
      if(f.type === 'date') val = isoToDMY(val);
      if(f.type === 'select' && !this.optionsFor(f).includes(val)) val = '';
      if(!val){ v[s.id] = marker(f.label); missing.push({ id:s.id, label:f.label }); }
      else v[s.id] = val;
    });
    const now = new Date();
    const sot = (this.st.sot || '').trim();
    const agent = ($('#agent').value || '').trim();
    let usesAgent = false;
    const ctx = {
      fecha: now.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' }),
      hora:  now.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' }),
      sot:   sot || marker('SOT'),
      get u(){ usesAgent = true; return agent || marker('Realizado por'); }
    };
    const text = t.render(v, ctx);
    if(!sot) missing.unshift({ id:'sot', label:'SOT' });
    if(usesAgent && !agent) missing.push({ id:'agent', label:'Realizado por' });
    return { text, missing, total: t.fields.filter(s => { const n = this.norm(s); return !(n.when && !n.when(r)); }).length + 1 + (usesAgent ? 1 : 0) };
  },

  output(){ const b = this.build(); return Object.assign(b, { shown: this.st.mode === 'hz' ? horizontal(b.text, this.st.sep) : b.text }); },

  update(){
    if(!this.st) return;
    const { shown, missing, total } = this.output();
    this.lastMissing = missing;
    const out = $('#out');
    out.classList.toggle('hz', this.st.mode === 'hz');
    out.innerHTML = esc(shown).replace(new RegExp(MK_L + '([^' + MK_R + ']*)' + MK_R, 'g'), '<mark>$1</mark>');
    $('#genSot').textContent = 'SOT ' + ((this.st.sot || '').trim() || '—');
    $('#fillMeta').textContent = `${total - missing.length} / ${total} campos`;
    const status = $('#genStatus');
    if(!missing.length){
      status.innerHTML = `<span class="ok">Listo para copiar</span> · ${shown.length} caracteres`;
      this.disarm();
    } else {
      status.innerHTML = `Falta: ` + missing.slice(0, 4).map(m => `<button type="button" data-focus="${m.id}">${esc(m.label)}</button>`).join(', ')
        + (missing.length > 4 ? ` y ${missing.length - 4} más` : '');
    }
  },

  syncMode(){
    $$('#modeSeg button').forEach(b => { const on = b.dataset.mode === this.st.mode; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on); });
    $('#sepWrap').hidden = this.st.mode !== 'hz';
  },

  disarm(){ this.armed = false; clearTimeout(this.armT); const b = $('#copyBtn'); b.classList.remove('force'); b.textContent = 'Copiar texto'; },

  copy(){
    const { shown, missing } = this.output();
    if(missing.length && !this.armed){
      missing.forEach(m => {
        const el = m.id === 'sot' ? $('#sot') : m.id === 'agent' ? $('#agent') : ($('#f_' + m.id) || $(`[data-fid="${m.id}"] .seg`));
        if(el){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      });
      this.armed = true;
      const b = $('#copyBtn'); b.classList.add('force'); b.textContent = 'Copiar igual';
      clearTimeout(this.armT); this.armT = setTimeout(() => this.disarm(), 4000);
      toast(`Faltan ${missing.length} campo(s). Pulsa otra vez para copiar igual.`, { warn:true, ms:3000 });
      return;
    }
    copyText(shown.replace(new RegExp('[' + MK_L + MK_R + ']', 'g'), ''));
    const out = $('#out'); out.classList.remove('copied'); void out.offsetWidth; out.classList.add('copied');
    this.disarm();
    toast(this.st.mode === 'hz' ? 'Copiado en una línea' : 'Copiado');
  },

  newCase(){
    const snap = { sot:this.st.sot, vals:Object.assign({}, this.st.vals) };
    this.st.sot = ''; this.st.vals = {};
    $('#sot').value = '';
    $('#toaInput').value = '';
    this.save(); this.renderFields(); this.update();
    $('#sot').focus();
    toast('Caso limpiado', { ms:5000, action:{ label:'Deshacer', run:() => {
      this.st.sot = snap.sot; this.st.vals = snap.vals; $('#sot').value = snap.sot;
      this.save(); this.renderFields(); this.update();
    }}});
  },

  fromTOA(text){
    const st = $('#toaStatus');
    if(!text.trim()){ st.textContent = 'esperando texto'; st.className = 'toa-status'; return; }
    const padded = '\n' + text.replace(/\r/g, '') + '\n';
    const grab = kw => {
      const mk = '\n' + kw + '\n', i = padded.indexOf(mk); if(i === -1) return '';
      const s = i + mk.length, e = padded.indexOf('\n', s); return e === -1 ? '' : padded.slice(s, e).trim();
    };
    let n = 0;
    Object.entries(TOA_KEYWORDS).forEach(([id, kw]) => {
      let val = grab(kw); if(!val) return;
      if(id === 'sot'){ this.st.sot = val; $('#sot').value = val; n++; return; }
      const f = FIELDS[id];
      if(f.type === 'date'){ val = dmyToISO(val); if(!val) return; }
      if(f.type === 'seg'){ const m = f.options.find(o => o.toUpperCase() === val.toUpperCase()); if(!m) return; val = m; }
      this.st.vals[id] = val; n++;
    });
    this.save(); this.renderFields(); this.update();
    st.textContent = n ? `${n} campo(s) completados desde TOA` : 'no se detectaron campos; revisa el texto pegado';
    st.className = 'toa-status' + (n ? ' ok' : '');
  }
};

/* ════════════════════════════════════════════════════════════
   COAXIAL · medidor libre, sin SOT
   ════════════════════════════════════════════════════════════ */
function setupCoax(){
  const inp = $('#coaxIn'), thr = $('#coaxThr'), usnr = $('#coaxUsnr'), pow = $('#coaxPow');
  const saved = LS.get(k('coax'), {});
  inp.value = saved.in || ''; thr.value = saved.thr || '4'; usnr.value = saved.usnr || ''; pow.value = saved.pow || '';
  const save = debounce(() => LS.set(k('coax'), { in:inp.value, thr:thr.value, usnr:usnr.value, pow:pow.value }), 150);

  const chip = (el, val, pass, okL, badL) => {
    if(val === null){ el.className = 'chip'; el.textContent = '—'; return null; }
    el.className = 'chip ' + (pass ? 'ok' : 'bad'); el.textContent = pass ? okL : badL; return pass;
  };
  const num = el => { const n = parseFloat(String(el.value).replace(',', '.')); return isNaN(n) ? null : n; };

  function spark(vals){
    const svg = $('#cSpark');
    if(vals.length < 2){ svg.innerHTML = ''; return; }
    const max = Math.max(...vals), min = Math.min(...vals), span = (max - min) || 1, w = 200, h = 40, p = 4;
    const pts = vals.map((v, i) => [p + i / (vals.length - 1) * (w - 2 * p), h - p - (v - min) / span * (h - 2 * p)]);
    const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    svg.innerHTML = `<path d="${d} L ${pts[pts.length-1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z" fill="rgba(43,255,136,.12)"/>`
      + `<path d="${d}" fill="none" stroke="#2bff88" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`;
  }

  function run(){
    save();
    const vals = inp.value.split(/[\s,;]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
    const t = parseFloat(thr.value) || 0;
    const u = num(usnr), pw = num(pow);
    const uOk = chip($('#usnrChip'), u, u !== null && u > 28, 'OK', 'BAJO');
    const pOk = chip($('#powChip'), pw, pw !== null && pw >= 36.1 && pw <= 52.9, 'OK', 'FUERA');
    $('#cN').textContent = vals.length;
    const notes = [];
    if(uOk === false) notes.push('U/S SNR bajo 28 dB');
    if(pOk === false) notes.push('Upstream fuera de 36.1–52.9 dBmV');
    const verdict = $('#cVerdict'), vt = $('.v-text', verdict);

    if(!vals.length){
      ['#cMax','#cMin','#cDiff'].forEach(s => $(s).textContent = '—'); spark([]);
      if(uOk === null && pOk === null){ verdict.className = 'verdict'; vt.textContent = 'Esperando lecturas'; return; }
      const bad = uOk === false || pOk === false;
      verdict.className = 'verdict ' + (bad ? 'bad' : 'ok');
      vt.textContent = bad ? 'Fuera de especificación · ' + notes.join(' · ') : 'U/S SNR y Upstream dentro de rango';
      return;
    }
    const max = Math.max(...vals), min = Math.min(...vals), diff = max - min;
    $('#cMax').textContent = max.toFixed(2); $('#cMin').textContent = min.toFixed(2); $('#cDiff').textContent = diff.toFixed(2);
    spark(vals);
    const stable = diff <= t, ok = stable && uOk !== false && pOk !== false;
    verdict.className = 'verdict ' + (ok ? 'ok' : 'bad');
    vt.textContent = `Señal ${stable ? 'ESTABLE' : 'INESTABLE'} · diferencia ${diff.toFixed(2)} dB (umbral ${t.toFixed(1)})` + (notes.length ? ' · ' + notes.join(' · ') : '');
  }
  [inp, thr, usnr, pow].forEach(el => el.addEventListener('input', run));
  $('#coaxClear').addEventListener('click', () => { inp.value = ''; usnr.value = ''; pow.value = ''; run(); inp.focus(); });
  run();
}

/* ════════════════════════════════════════════════════════════
   TABLAS RÁPIDAS + NOTAS
   ════════════════════════════════════════════════════════════ */
const Tables = {
  m:null, notes:null,
  newTable(name){ return { id:uid(), name, cols:['SOT','Estado','Nota'], rows:[{ id:uid(), cells:['','',''], done:false }] }; },

  init(){
    this.load();
    this.saveT = debounce(() => LS.set(k('tables'), this.m), 150);
    this.saveN = debounce(() => LS.set(k('notes'), this.notes), 150);

    $('#qtNew').addEventListener('click', () => {
      const t = this.newTable('Tabla ' + (this.m.list.length + 1));
      this.m.list.push(t); this.m.active = t.id; this.saveT(); this.renderAll();
      $('#qtName').select();
    });
    $('#qtName').addEventListener('input', e => { this.cur().name = e.target.value; this.saveT(); this.renderList(); });
    $('#qtAddRow').addEventListener('click', () => this.addRow(true));
    $('#qtAddCol').addEventListener('click', () => {
      const t = this.cur(); t.cols.push('Columna ' + (t.cols.length + 1)); t.rows.forEach(r => r.cells.push(''));
      this.saveT(); this.renderTable();
      const ins = $$('#qtTable th input'); ins[ins.length - 1].select();
    });
    $('#qtSearch').addEventListener('input', () => this.filter());
    $('#noteNew').addEventListener('click', () => {
      this.notes.unshift({ id:uid(), text:'', t:Date.now() }); this.saveN(); this.renderNotes();
      const ta = $('#notes textarea'); if(ta) ta.focus();
    });

    window.addEventListener('storage', e => {
      if(e.key === k('tables') || e.key === k('notes')){
        const busy = document.activeElement && document.activeElement.closest('#view-tablas');
        if(!busy){ this.load(); this.renderAll(); }
      }
    });
    this.renderAll();
  },

  load(){
    this.m = LS.get(k('tables'), null);
    if(!this.m || !Array.isArray(this.m.list) || !this.m.list.length){
      const t = this.newTable('SOTs por revisar'); this.m = { active:t.id, list:[t] };
    }
    if(!this.m.list.find(t => t.id === this.m.active)) this.m.active = this.m.list[0].id;
    this.notes = LS.get(k('notes'), []);
    if(!Array.isArray(this.notes)) this.notes = [];
  },
  cur(){ return this.m.list.find(t => t.id === this.m.active); },
  renderAll(){ this.renderList(); this.renderTable(); this.renderNotes(); },

  renderList(){
    const ul = $('#qtList');
    ul.innerHTML = this.m.list.map(t => {
      const pend = t.rows.filter(r => !r.done && r.cells.some(c => c.trim())).length;
      return `<li class="${t.id === this.m.active ? 'is-on' : ''}" data-id="${t.id}">
        <button type="button" class="pick">${esc(t.name || 'Sin nombre')}<small>${t.rows.length} filas · ${pend} pendientes</small></button>
        <button type="button" class="del" aria-label="Eliminar tabla ${esc(t.name)}">×</button></li>`;
    }).join('');
    $$('li', ul).forEach(li => {
      $('.pick', li).addEventListener('click', () => { this.m.active = li.dataset.id; this.saveT(); this.renderAll(); });
      $('.del', li).addEventListener('click', () => {
        const t = this.m.list.find(x => x.id === li.dataset.id);
        if(!confirm(`¿Eliminar la tabla “${t.name}”?`)) return;
        this.m.list = this.m.list.filter(x => x.id !== t.id);
        if(!this.m.list.length) this.m.list.push(this.newTable('SOTs por revisar'));
        if(this.m.active === t.id) this.m.active = this.m.list[0].id;
        this.saveT(); this.renderAll();
      });
    });
  },

  renderTable(){
    const t = this.cur(), table = $('#qtTable');
    $('#qtName').value = t.name;
    const head = `<thead><tr>${t.cols.map((c, i) => `<th><div class="th-in"><input value="${esc(c)}" data-col="${i}" aria-label="Nombre de columna">${t.cols.length > 1 ? `<button type="button" class="coldel" data-col="${i}" aria-label="Eliminar columna">×</button>` : ''}</div></th>`).join('')}<th class="c-act"></th></tr></thead>`;
    const body = `<tbody>${t.rows.map(r => `<tr data-id="${r.id}" class="${r.done ? 'done' : ''}">${r.cells.map((c, i) => `<td><input value="${esc(c)}" data-c="${i}" aria-label="${esc(t.cols[i] || '')}"></td>`).join('')}<td class="c-act"><button type="button" class="chk" title="Marcar revisada" aria-label="Marcar revisada">✓</button><button type="button" class="cp" title="Copiar primera celda" aria-label="Copiar primera celda"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="8" height="8"/><path d="M10.5 5.5v-3h-8v8h3"/></svg></button><button type="button" class="del" title="Eliminar fila" aria-label="Eliminar fila">×</button></td></tr>`).join('')}</tbody>`;
    table.innerHTML = head + body;

    $$('th input', table).forEach(inp => inp.addEventListener('input', () => { t.cols[+inp.dataset.col] = inp.value; this.saveT(); }));
    $$('th .coldel', table).forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.col; t.cols.splice(i, 1); t.rows.forEach(r => r.cells.splice(i, 1)); this.saveT(); this.renderTable();
    }));
    $$('tbody tr', table).forEach(tr => {
      const row = t.rows.find(r => r.id === tr.dataset.id);
      $$('input', tr).forEach(inp => {
        inp.addEventListener('input', () => { row.cells[+inp.dataset.c] = inp.value; this.saveT(); this.renderListSoon(); });
        inp.addEventListener('keydown', e => {
          if(e.key === 'Enter'){ e.preventDefault(); if(t.rows[t.rows.length - 1] === row) this.addRow(true); else { const nx = tr.nextElementSibling; if(nx) $(`input[data-c="${inp.dataset.c}"]`, nx).focus(); } }
        });
      });
      $('.chk', tr).addEventListener('click', () => { row.done = !row.done; tr.classList.toggle('done', row.done); this.saveT(); this.renderList(); });
      $('.cp', tr).addEventListener('click', () => { const v = (row.cells[0] || '').trim(); if(!v) return toast('Celda vacía', { warn:true }); copyText(v); toast('Copiado: ' + v); });
      $('.del', tr).addEventListener('click', () => {
        const idx = t.rows.indexOf(row); t.rows.splice(idx, 1);
        if(!t.rows.length) t.rows.push({ id:uid(), cells:t.cols.map(() => ''), done:false });
        this.saveT(); this.renderTable(); this.renderList();
        toast('Fila eliminada', { ms:4000, action:{ label:'Deshacer', run:() => { t.rows.splice(idx, 0, row); this.saveT(); this.renderTable(); this.renderList(); } } });
      });
    });
    this.filter();
  },
  renderListSoon: debounce(function(){ Tables.renderList(); }, 400),

  addRow(focus){
    const t = this.cur(); const r = { id:uid(), cells:t.cols.map(() => ''), done:false };
    t.rows.push(r); this.saveT(); this.renderTable(); this.renderList();
    if(focus){ const inp = $(`#qtTable tr[data-id="${r.id}"] input`); if(inp) inp.focus(); }
  },

  filter(){
    const q = $('#qtSearch').value.trim().toLowerCase();
    $$('#qtTable tbody tr').forEach(tr => {
      tr.hidden = !!q && !$$('input', tr).some(i => i.value.toLowerCase().includes(q));
    });
  },

  renderNotes(){
    const box = $('#notes');
    if(!this.notes.length){ box.innerHTML = `<div class="notes-empty">Sin notas. Usa “+ Nota” para apuntar algo rápido.</div>`; return; }
    box.innerHTML = this.notes.map(n => `<div class="note" data-id="${n.id}">
      <div class="note-head"><span>${new Date(n.t).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span><button type="button" aria-label="Eliminar nota">×</button></div>
      <textarea aria-label="Nota" placeholder="Escribe…">${esc(n.text)}</textarea></div>`).join('');
    $$('.note', box).forEach(el => {
      const n = this.notes.find(x => x.id === el.dataset.id);
      $('textarea', el).addEventListener('input', e => { n.text = e.target.value; n.t = Date.now(); this.saveN(); });
      $('button', el).addEventListener('click', () => {
        if(n.text.trim() && !confirm('¿Eliminar esta nota?')) return;
        this.notes = this.notes.filter(x => x !== n); this.saveN(); this.renderNotes();
      });
    });
  }
};

/* ════════════════════════════════════════════════════════════
   SPEECHS (perfil especial)
   Capa base: data/speeches.json. Capa local: lo editado aquí, guardado
   codificado en este navegador (no viaja a ningún servidor). Mismo id =
   misma tarjeta y mismo número.
   ════════════════════════════════════════════════════════════ */
const SPEECH_FALLBACK = [
  { id:'s1', tag:'Apertura', title:'Saludo inicial', text:'{saludo}, le saluda {agente} de la Mesa de Seguimiento de Claro. ¿Me comunico con {cliente}? Le llamo por su orden de servicio {sot}.' },
  { id:'s5', tag:'Cierre', title:'Despedida', text:'Gracias por su tiempo, {cliente}. Su caso queda registrado con la orden {sot}. Le atendió {agente}. Que tenga un buen día.' }
];
const OBF_KEY = 'mda\u00b7sp\u00b7v1';
function obfuscate(str){
  const b = new TextEncoder().encode(str), kb = new TextEncoder().encode(OBF_KEY);
  let bin = ''; b.forEach((x, i) => { bin += String.fromCharCode(x ^ kb[i % kb.length]); });
  return btoa(bin);
}
function deobfuscate(s){
  const bin = atob(s), kb = new TextEncoder().encode(OBF_KEY);
  const b = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i) ^ kb[i % kb.length];
  return new TextDecoder().decode(b);
}

const Speech = {
  base:[], layer:[], editing:null, ready:false,

  async init(){
    window.Speech = this;
    this.layer = this.readLayer();
    try{
      const r = await fetch('data/speeches.json', { cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer' });
      const j = await r.json();
      this.base = Array.isArray(j) ? j : (j.items || []);
    }catch(e){ this.base = SPEECH_FALLBACK; }

    $('#speechBtn').addEventListener('click', () => $('#speechDrawer').hidden ? this.open() : this.close());
    $('#spClose').addEventListener('click', () => this.close());
    $('#spSearch').addEventListener('input', () => this.render());
    $('#spNewBtn').addEventListener('click', () => this.edit(null));
    $('#spCancel').addEventListener('click', () => this.showList());
    $('#spEdit').addEventListener('submit', e => { e.preventDefault(); this.saveEdit(); });
    $('#spLayerBtn').addEventListener('click', () => $('#spLayer').hidden ? this.showLayer() : this.showList());
    $('#spLayerApply').addEventListener('click', () => this.applyLayer());
    $('#spLayerCopy').addEventListener('click', () => { copyText($('#spLayerText').value); toast('Capa copiada'); });
    $('#spReset').addEventListener('click', () => {
      if(!confirm('¿Borrar la capa local? Se vuelve al archivo base.')) return;
      this.layer = []; this.writeLayer(); this.showList(); toast('Capa local borrada');
    });
    window.addEventListener('storage', e => { if(e.key === k('spx')){ this.layer = this.readLayer(); this.render(); } });
    this.ready = true;
    this.render();
  },

  readLayer(){
    try{ const raw = localStorage.getItem(k('spx')); return raw ? JSON.parse(deobfuscate(raw)) : []; }catch(e){ return []; }
  },
  writeLayer(){ try{ localStorage.setItem(k('spx'), obfuscate(JSON.stringify(this.layer))); }catch(e){} },

  merged(){
    const out = this.base.map(b => Object.assign({ _base:true }, b));
    this.layer.forEach(l => {
      const i = out.findIndex(o => o.id === l.id);
      if(i >= 0) out[i] = Object.assign({}, out[i], l);
      else out.push(Object.assign({ _base:false }, l));
    });
    return out.filter(o => !o._hidden);
  },

  vars(text, mark){
    const h = new Date().getHours();
    const agent = ($('#agent').value || '').replace(/\s*-\s*A365\s*$/i, '').trim();
    const map = {
      saludo: h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches',
      agente: agent, sot: (Gen.st && Gen.st.sot || '').trim(), cliente: (Gen.st && Gen.st.vals.cliente || '').trim()
    };
    return text.replace(/\{(\w+)\}/g, (m, key) => {
      if(!(key in map)) return m;
      if(map[key]) return mark ? '\u0001' + map[key] + '\u0002' : map[key];
      return mark ? '\u0003' + m + '\u0004' : m;
    });
  },

  render(){
    if(!this.ready) return;
    const q = $('#spSearch').value.trim().toLowerCase();
    const list = this.merged();
    const html = list.map((s, i) => ({ s, n:i + 1 }))
      .filter(({ s }) => !q || [s.title, s.text, s.tag].join(' ').toLowerCase().includes(q))
      .map(({ s, n }) => {
        const body = esc(this.vars(s.text || '', true)).replace(/\u0001/g, '<b>').replace(/\u0002/g, '</b>').replace(/\u0003/g, '<mark>').replace(/\u0004/g, '</mark>');
        return `<article class="sp-card" data-id="${esc(s.id)}">
          <div class="sp-top"><span class="sp-num">${pad2(n)}</span><span class="sp-title">${esc(s.title || 'Sin título')}</span>${s.tag ? `<span class="sp-tag">${esc(s.tag)}</span>` : ''}</div>
          <div class="sp-text">${body}</div>
          <div class="sp-actions"><button type="button" class="copy">Copiar</button><button type="button" class="ed">Editar</button><button type="button" class="del">Eliminar</button></div>
        </article>`;
      }).join('');
    $('#spList').innerHTML = html || `<div class="notes-empty">Sin speechs${q ? ' para esa búsqueda' : ''}.</div>`;
    $$('#spList .sp-card').forEach(card => {
      const s = list.find(x => x.id === card.dataset.id);
      $('.copy', card).addEventListener('click', () => { copyText(this.vars(s.text || '', false)); toast('Speech copiado'); });
      $('.ed', card).addEventListener('click', () => this.edit(s));
      $('.del', card).addEventListener('click', () => this.remove(s));
    });
  },

  open(){ $('#app').classList.add('sp-open'); $('#speechDrawer').hidden = false; $('#speechBtn').setAttribute('aria-expanded', 'true'); this.showList(); $('#spSearch').focus(); },
  close(){ const d = $('#speechDrawer'); if(!d || d.hidden) return; d.hidden = true; $('#app').classList.remove('sp-open'); $('#speechBtn').setAttribute('aria-expanded', 'false'); },
  showList(){ $('#spEdit').hidden = true; $('#spLayer').hidden = true; $('#spList').hidden = false; $('#spSearch').hidden = false; this.render(); },

  edit(s){
    this.editing = s ? s.id : null;
    $('#spTitle').value = s ? s.title || '' : '';
    $('#spTag').value = s ? s.tag || '' : '';
    $('#spText').value = s ? s.text || '' : '';
    $('#spList').hidden = true; $('#spLayer').hidden = true; $('#spSearch').hidden = true; $('#spEdit').hidden = false;
    $('#spTitle').focus();
  },
  saveEdit(){
    const item = { id:this.editing || 'u' + uid(), title:$('#spTitle').value.trim(), tag:$('#spTag').value.trim(), text:$('#spText').value };
    if(!item.title || !item.text.trim()) return toast('Título y texto son obligatorios', { warn:true });
    const i = this.layer.findIndex(l => l.id === item.id);
    if(i >= 0) this.layer[i] = item; else this.layer.push(item);
    this.writeLayer(); this.showList(); toast('Speech guardado');
  },
  remove(s){
    if(!confirm(`¿Eliminar “${s.title}”?`)) return;
    const isBase = this.base.some(b => b.id === s.id);
    this.layer = this.layer.filter(l => l.id !== s.id);
    if(isBase) this.layer.push({ id:s.id, _hidden:true });
    this.writeLayer(); this.render(); toast('Speech eliminado');
  },

  showLayer(){
    $('#spLayerText').value = JSON.stringify({ version:1, items:this.layer }, null, 2);
    $('#spList').hidden = true; $('#spEdit').hidden = true; $('#spSearch').hidden = true; $('#spLayer').hidden = false;
  },
  applyLayer(){
    let j;
    try{ j = JSON.parse($('#spLayerText').value); }catch(e){ return toast('JSON inválido: ' + e.message, { warn:true, ms:4000 }); }
    const items = Array.isArray(j) ? j : j && j.items;
    if(!Array.isArray(items) || items.some(x => !x || typeof x.id !== 'string' || !x.id)) return toast('Cada elemento necesita un "id" de texto', { warn:true, ms:4000 });
    this.layer = items; this.writeLayer(); this.showList(); toast(`Capa aplicada · ${items.length} elemento(s)`);
  }
};

/* ───────────────────────── Arranque ───────────────────────── */
(async function boot(){
  setupGate();
  const p = await resumeSession();
  if(p) enterApp(p);
  else { $('#gate').hidden = false; $('#gatePass').focus(); }
})();
