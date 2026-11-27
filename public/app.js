/* ════════════════════════════════════════════════════════════
   MDA · Mesa de Ayuda — lógica de la consola
   Base de diseño: skill "impeccable" (pbakaus). Autor: Engineer M.

   NOTA DE SEGURIDAD (puerta de acceso):
   La clave de abajo es un control de acceso CLIENTE (front-end) para
   pruebas temporales y poco tráfico. No es seguridad real: cualquiera
   puede ver el código fuente. Para producción usa la protección de
   contraseño de Netlify o una Netlify Function con auth real.
   ════════════════════════════════════════════════════════════ */
'use strict';

const APP_PASSWORD = 'mda2026';

/* ───────────────────────── Utilidades ───────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const toastEl = $('#toast');
let toastTimer = null;
function showToast(msg, warn = false){
  toastEl.textContent = msg;
  toastEl.className = 'toast show' + (warn ? ' warn' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
function markError(el){
  if(!el) return;
  el.classList.add('input-error');
  setTimeout(() => el.classList.remove('input-error'), 2500);
}
const store = {
  get(k, fb){ try{ const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }catch(e){ return fb; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

/* ───────────────────────── Puerta de acceso ───────────────────────── */
(function gate(){
  const gate = $('#gate');
  const pass = $('#gatePass');
  const btn  = $('#gateBtn');
  const err  = $('#gateError');

  function tryEnter(){
    if(pass.value === APP_PASSWORD){
      try{ sessionStorage.setItem('mda_gate','1'); }catch(e){}
      err.classList.remove('show');
      gate.style.display = 'none';
      $('#app').hidden = false;
      initApp();
    } else {
      err.textContent = 'Clave incorrecta. Inténtalo de nuevo.';
      err.classList.add('show');
      gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake');
      pass.focus();
    }
  }
  btn.addEventListener('click', tryEnter);
  pass.addEventListener('keydown', e => { if(e.key === 'Enter') tryEnter(); });
  let unlocked = false;
  try{ unlocked = sessionStorage.getItem('mda_gate') === '1'; }catch(e){}
  if(unlocked){ gate.style.display = 'none'; $('#app').hidden = false; initApp(); }
  else pass.focus();
})();

let appReady = false;
function initApp(){
  if(appReady) return;
  appReady = true;

  setupNav();
  setupPlantillas();
  setupMedidor();
  setupTabla();
  setupTEPJ();
  setupAccesos();

  // "Realizado por" persistido
  const agent = $('#agentName');
  const savedAgent = store.get('mda_agent', null);
  if(savedAgent) agent.value = savedAgent;
  agent.addEventListener('input', () => store.set('mda_agent', agent.value));

  poblarSelectPlantillas();
}

/* ───────────────────────── Navegación entre vistas ───────────────────────── */
function setupNav(){
  const tabs = $$('#nav .nav-tab');
  const views = $$('.view');
  tabs.forEach(t => t.addEventListener('click', () => {
    const v = t.dataset.view;
    tabs.forEach(x => x.classList.toggle('is-active', x === t));
    views.forEach(x => x.classList.toggle('is-active', x.id === 'view-' + v));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

/* ════════════════════════════════════════════════════════════
   PLANTILLAS DE AUTOMATIZACIÓN
   ════════════════════════════════════════════════════════════ */
const RECHAZO_MOTIVOS = {
  "CLIENTE NO DESEA EL SERVICIO": [
    "Solicito otra fecha de instalación de la venta",
    "Cliente tiene servicio con otro operador",
    "Titular no ha contratado ningún servicio a Claro",
    "Demora en la atención de la solicitud, ya no desea esperar.",
    "Cliente no desea servicio por Motivos personales (económico, familiar, laboral)",
    "Cliente no desea servicio por cambio de titularidad"
  ],
  "FACILIDADES TECNICAS DEL CLIENTE": [
    "Dueño de Casa y/o Edificio no autoriza la instalación",
    "Al momento de la instalación no hay acceso al techo",
    "Al momento de la instalación se valida ducterias obstruidas.",
    "Cliente cuenta con SOT de suspensión y/o baja.",
    "Cliente indica que no tiene disponibilidad y se volverá a comunicar y/o excede el tiempo de reprogramación"
  ],
  "FALTA DE CONTACTO": [
    "No hay contacto con el cliente (unicos números errados o faltan dígitos)"
  ],
  "MAL INGRESO DE DIRECCION": [
    "Dirección registrada en el sistema es errada. (numero, Lt, Mz, nombre calle, distrito)",
    "Se llego a domicilio, pero cliente no vive en esta Dirección"
  ],
  "SOT MAL GENERADO": [
    "Error en sistemas al generar la sot"
  ],
  "POR DUPLICIDAD": [
    "se atendió con otra SOT",
    "se rechazo con otra SOT",
    "Se genero doble SOT por diferentes puntos de venta"
  ],
  "TRANSACCION NO AUTORIZADA, ERROR DE ETIQUETA": [
    "POSIBLE FRAUDE"
  ],
  "MALA OFERTA": [
    "Tecnología incorrecta",
    "Velocidad de Internet no es acorde a lo solicitado por el cliente",
    "Cantidad o Modelo de Decos no es acorde a lo solicitado por el cliente",
    "Cliente solicito atención PostVenta (Decos adicionales, traslados, etc).",
    "No amerita cambio de router porque soporta la velocidad contratada.",
    "Decodificadores descontinuados.",
    "Producto incorrecto (Falta de play).",
    "Equipos incompatibles"
  ]
};

const CIERRE_MOTIVOS = {
  "INCIDENCIA MAL GENERADA": [
    "DATOS ERRADOS",
    "CLIENTE DARA DE BAJA EL SERVICIO",
    "YA NO DESEA LA VISITA",
    "DUPLICIDAD",
    "SERVICIO SUSPENDIDO O BAJA"
  ],
  "OK LINEA": [
    "DATOS ERRADOS",
    "CLIENTE DARA DE BAJA EL SERVICIO",
    "YA NO DESEA LA VISITA",
    "DUPLICIDAD",
    "SERVICIO SUSPENDIDO O BAJA"
  ],
  "EJECUTADO Y MOVILIZADO": [
    "CLIENTE DARA DE BAJA EL SERVICIO",
    "CLIENTE AUSENTE",
    "CLIENTE INFORMA SERVICIO CONFORME / VISITA TECNICA",
    "NO HAY FACILIDAD TECNICA"
  ]
};

const SEG_MOTIVOS = {
  CLARO: [
    'Pérdida de fecha de agendamiento',
    'Caída masiva en sistemas Claro',
    'Inasistencia de cuadrillas de la contratista',
    'Retraso de técnicos de la contratista',
    'Incidencias en el campo durante la instalación',
    'Falta de materiales: Detallar material',
    'Retiro anticipado de cuadrillas en campo',
    'Falta de herramientas',
    'Sobreagendamiento de cuotas',
    'Problemas con las configuraciones de zonas de trabajo',
    'Cuota configurada incorrectamente'
  ],
  CLIENTE: [
    'Cambios en las fechas y franjas de visita solicitados por el cliente',
    'Cliente se encuentra de viaje',
    'Solo puede domingos, horarios especiales, noche',
    'Cliente desconoce su fecha agendamiento y no puede atender a técnicos',
    'Cliente no cuenta con los equipos en el nuevo domicilio',
    'Cliente no brinda facilidades técnicas: ducterías o cableados o ambientes o permisos de edificio',
    'Factores climatológicos',
    'Cliente no responde los 4 intentos de llamada (falta de contacto)',
    'Cliente Ausente en Campo'
  ]
};

const SEG_PLANTILLAS = {
  dia: [
    {
      id:'sd1', titulo:'SEGUIMIENTO TÉCNICO', subtitulo:'',
      usaContactabilidad:true,
      campos:[
        {id:'tecnico',    label:'Técnico',        placeholder:'Nombre del técnico'},
        {id:'telefono',   label:'Teléfono',        placeholder:'Ej: 987654321'},
        {id:'id_llamada', label:'ID de Llamada',   placeholder:'Ej: 123456789'},
        {id:'observacion',label:'Observación',     placeholder:'Detalle de la gestión'}
      ],
      template:(v,sot,u)=>{
        const now=new Date();
        const fecha=now.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
        const hora=now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
        return `FECHA Y HORA: ${fecha} / ${hora}
+++ SEGUIMIENTO TECNICO A365 +++
TECNICO: ${v.tecnico}
TELÉFONO: ${v.telefono}
ID DE LLAMADA: ${v.id_llamada}
OBSERVACION: ${v.observacion}
REALIZADO POR: ${u}`;
      }
    },
    {
      id:'sd2', titulo:'CLIENTE CONFIRMA VISITA', subtitulo:'',
      campos:[
        {id:'tipo_servicio',  label:'Tipo de Servicio',      placeholder:'Ej: FTTH - Instalación'},
        {id:'telefono',       label:'Teléfono',               placeholder:'Ej: 987654321'},
        {id:'id_llamada',     label:'ID de Llamada',          placeholder:'Ej: 1788289232-339049'},
        {id:'plano_coord',    label:'Plano / Coordenadas',    placeholder:'Ej: LMSB042 / -12.09,-77.03'},
        {id:'fecha',   label:'Fecha de Visita',  tipo:'date'},
        {id:'franja', label:'Franja',           tipo:'franja'},
        {id:'observacion',    label:'Observación',            placeholder:'Detalle adicional'}
      ],
      template:(v,sot,u)=>{
        const now=new Date();
        const fecha=now.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
        const hora=now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
        return `FECHA Y HORA: ${fecha} / ${hora}
+++ MESA DE SEGUIMIENTO A365 +++
TIPO DE SERVICIO: ${v.tipo_servicio}
TELÉFONO: ${v.telefono}
ID DE LLAMADA: ${v.id_llamada}
PLANO / COORDENADAS: ${v.plano_coord}
FECHA / FRANJA DE VISITA: ${v.fecha} / ${v.franja}
OBSERVACION: ${v.observacion}
REALIZADO POR: ${u}`;
      }
    },
    {
      id:'sd3', titulo:'CLIENTE NO CONTESTA', subtitulo:'',
      campos:[
        {id:'servicio',    label:'Servicio', tipo:'radio', opciones:['INSTALACION','POST VENTA','MANTENIMIENTO'], default:'INSTALACION'},
        {id:'telefono',    label:'Teléfono',         placeholder:'Ej: 987654321'}
      ],
      template:(v,sot,u)=>{
        const now=new Date();
        const fecha=now.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
        const hora=now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
        return `FECHA Y HORA: ${fecha} / ${hora}
+++ MESA DE SEGUIMIENTO A365 +++
CLIENTE NO CONTESTA
SERVICIO: ${v.servicio}
TELÉFONO: ${v.telefono}
CANTIDAD DE LLAMADAS: 4 INTENTOS SIN RESULTADO, SE ENVIA WHATSAPP.
REALIZADO POR: ${u}`;
      }
    },
    {
      id:'sd4', titulo:'CLIENTE NO DESEA ADELANTAR', subtitulo:'Mantiene fecha',
      campos:[
        {id:'servicio',     label:'Servicio',              placeholder:'Ej: FTTH - Instalación'},
        {id:'telefono',     label:'Teléfono',               placeholder:'Ej: 987654321'},
        {id:'fecha',   label:'Fecha de Visita',  tipo:'date'},
        {id:'franja', label:'Franja',           tipo:'franja'},
        {id:'id_llamada',   label:'ID de Llamada',          placeholder:'Ej: 1788289232-339049'}
      ],
      template:(v,sot,u)=>{
        const now=new Date();
        const fecha=now.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
        const hora=now.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
        return `FECHA Y HORA: ${fecha} / ${hora}
+++ MESA DE SEGUIMIENTO A365 +++
CLIENTE NO DESEA ADELANTAR - MANTIENE FECHA
📧SERVICIO: ${v.servicio}
TELÉFONO: ${v.telefono}
📆FECHA / FRANJA DE VISITA: ${v.fecha} / ${v.franja}
🪪ID DE LLAMADA: ${v.id_llamada}
REALIZADO POR: ${u}`;
      }
    },
    {
      id:'sd5', titulo:'FUERA DE TOA', subtitulo:'SOT sin flujo TOA',
      campos:[
        {id:'sub_tipo',    label:'Sub Tipo',            placeholder:'Ej: INSTALACION'},
        {id:'direccion',   label:'Dirección',           placeholder:'Ej: AV. LOS PINOS 123'},
        {id:'distrito',    label:'Distrito',            placeholder:'Ej: SAN BORJA'},
        {id:'servicio',    label:'Servicio',            placeholder:'Ej: FTTH - Instalación'},
        {id:'plano',       label:'Plano',               placeholder:'Ej: LMSB042'},
        {id:'cliente',     label:'Cliente',             placeholder:'Nombre completo'},
        {id:'cod_cliente', label:'Cód. Cliente',        placeholder:'Ej: 4225215'},
        {id:'celular',     label:'Celular del Cliente', placeholder:'Ej: 987654321'},
        {id:'fecha',  label:'Fecha de Visita', tipo:'date'},
        {id:'franja', label:'Franja',          tipo:'franja'}
      ],
      template:(v,sot,u)=>{
        return `*FUERA DE TOA*
🔍 SOT: ${sot}
🍄 SUB TIPO: ${v.sub_tipo}
🏡 DIRECCIÓN: ${v.direccion}
🏡 DISTRITO: ${v.distrito}
📧 SERVICIO: ${v.servicio}
📝 PLANO: ${v.plano}
👨💼 CLIENTE: ${v.cliente}
👨‍💼💼 COD CLIENTE: ${v.cod_cliente}
📱CELULAR DEL CLIENTE: ${v.celular}
📍 FECHA Y FRANJA: ${v.fecha} / ${v.franja}
✍️ REALIZADO POR:${u}
--------------------------------------------
Proceder con atención fuera de TOA.
Motivo: SOT sin flujo TOA
Autorizado por: ${u}`;
      }
    },
    {
      id:'sd6', titulo:'LIBERACIÓN DE FRANJA', subtitulo:'',
      campos:[
        {id:'plano',       label:'Plano',               placeholder:'Ej: LAMO076-S'},
        {id:'cliente',     label:'Cliente',             placeholder:'Nombre del cliente'},
        {id:'tipo_trabajo',label:'Tipo de Trabajo',     placeholder:'Ej: FTTH - PORTABILIDAD'},
        {id:'fecha',  label:'Fecha de Visita', tipo:'date'},
        {id:'franja', label:'Franja',          tipo:'franja'}
      ],
      template:(v,sot,u)=>{
        return `LIBERACION DE FRANJA
SOT: ${sot}
PLANO: ${v.plano}
CLIENTE: ${v.cliente}
TIPO DE TRABAJO: ${v.tipo_trabajo}
FECHA / FRANJA: ${v.fecha} / ${v.franja}`;
      }
    },
    {
      id:'sd7', titulo:'ESPERA DE EQUIPOS', subtitulo:'Sin stock',
      campos:[
        {id:'modelo', label:'Modelo de Equipo', placeholder:'Ej: ONT HG8345R'}
      ],
      template:(v,sot,u)=>{
        return `EN ESPERA DE EQUIPOS
Sin Stock de equipos
Modelo: ${v.modelo}
Pendiente de Atención o reasignación
REALIZADO POR: ${u}`;
      }
    },
    {
      id:'sd8', titulo:'TOA NO INTERVIENE', subtitulo:'Atención por sistemas',
      campos:[],
      template:(v,sot,u)=>{
        return `+++ MESA DE SEGUIMIENTO A365 +++
ATENCION POR SISTEMAS // NO CORRESPONDE VISITA EN CAMPO
Revisado Por: ${u}`;
      }
    },
    {
      id:'sd9', titulo:'CENTRO COMERCIAL', subtitulo:'Coordinación de estado',
      campos:[],
      template:(v,sot,u)=>{
        return `+++ MESA DE SEGUIMIENTO A365 +++
ESTABLECIMIENTO EN CENTRO COMERCIAL
SE CAMBIA ESTADO PARA COORDINACION
REALIZADO POR: ${u}`;
      }
    }
  ],
  reprogramacion: [
    {
      id:'sr1', titulo:'REPROGRAMACIÓN DE VISITA', subtitulo:'Reprogramado en Mesa',
      usaMotivo:true, usaContactabilidad:true,
      campos:[
        {id:'nombre_cliente', label:'Cliente',     placeholder:'Ej: JUAN PÉREZ QUISPE'},
        {id:'telefono',       label:'Teléfono',    placeholder:'Ej: 987654321'},
        {id:'id_llamada',     label:'ID de Llamada',    placeholder:'Ej: 1788289232-339049'},
        {id:'fecha_nueva',    label:'Nueva Fecha', tipo:'date'},
        {id:'franja',         label:'Franja',      tipo:'franja'},
        {id:'contrata',       label:'Contrata',    placeholder:'Ej: VISANET'},
        {id:'observacion',    label:'Observación', placeholder:'Ej: Cliente solicita horario de tarde'}
      ],
      template:(v,sot,u,motivo)=>
`**MESA DE SEGUIMIENTO A365**
REPROGRAMADO EN MESA
NUEVA FECHA Y FRANJA DE VISITA: ${v.fecha_nueva} / ${v.franja}
CLIENTE: ${v.nombre_cliente}
TELÉFONO: ${v.telefono}
MOTIVO DE REPROGRAMACIÓN: ${motivo}
CONTRATA: ${v.contrata}
REALIZADO POR: ${u}
ID DE LLAMADA: ${v.id_llamada}
OBSERVACION: ${v.observacion}`
    },
    {
      id:'sr2', titulo:'REPROGRAMACIÓN POR INCIDENCIA', subtitulo:'Reprogramado en Campo',
      usaMotivo:true, usaLaraigo:true, usaContactabilidad:true,
      campos:[
        {id:'nombre_cliente', label:'Cliente',     placeholder:'Ej: JUAN PÉREZ QUISPE'},
        {id:'telefono',       label:'Teléfono',    placeholder:'Ej: 987654321'},
        {id:'id_llamada',     label:'ID de Llamada',    placeholder:'Ej: 1788289232-339049'},
        {id:'fecha_nueva',    label:'Nueva Fecha', tipo:'date'},
        {id:'franja',         label:'Franja',      tipo:'franja'},
        {id:'contrata',       label:'Contrata',    placeholder:'Ej: VISANET'},
        {id:'observacion',    label:'Observación', placeholder:'Ej: Incidencia detectada en campo'}
      ],
      template:(v,sot,u,motivo)=>
`**MESA DE SEGUIMIENTO A365**
REPROGRAMADO EN CAMPO
NUEVA FECHA Y FRANJA DE VISITA: ${v.fecha_nueva} / ${v.franja}
CLIENTE: ${v.nombre_cliente}
TELÉFONO: ${v.telefono}
MOTIVO DE REPROGRAMACIÓN: ${motivo}
CONTRATA: ${v.contrata}
${v.lara||''}REALIZADO POR: ${u}
ID DE LLAMADA: ${v.id_llamada}
OBSERVACION: ${v.observacion}`
    }
  ],
  rechazo: [
    { id:'rc1', titulo:'RECHAZO EN LINEA', subtitulo:'Cliente no desea el servicio', tipoEspecial:'rc' },
    { id:'rc2', titulo:'RECHAZO TECNICO', subtitulo:'Sin viabilidad técnica', tipoEspecial:'rc', usaLaraigo:true },
    { id:'rc3', titulo:'CIERRE', subtitulo:'Cierre de caso en mesa', tipoEspecial:'cierre', usaLaraigo:true }
  ]
};

function templateRC(id,v,sot,u,motivo,submotivo,servicio,tecnologia,idLlamada,paqueteIngresado,paqueteCorrecto){
  const tag = id==='rc1' ? 'RECHAZADO EN MESA' : 'RECHAZADO EN CAMPO';
  if(motivo === 'MALA OFERTA'){
    return `**MESA DE SEGUIMIENTO A365**
${tag} -- ${servicio} / ${tecnologia}
PERSONA QUE CONTESTA: ${v.cliente}
TELÉFONO: ${v.telefono}
MOTIVO DEL RECHAZO: ${motivo}
SUBMOTIVO DE RECHAZO: ${submotivo}
MOTIVO DEL RECHAZO: MALA OFERTA
SUBMOTIVO DE RECHAZO: ${submotivo}
PAQUETE INGRESADO: ${paqueteIngresado}
PAQUETE CORRECTO: ${paqueteCorrecto}
${v.lara||''}REALIZADO POR: ${u}
ID DE LLAMADA: ${idLlamada}`;
  }
  return `**MESA DE SEGUIMIENTO A365**
${tag} -- ${servicio} / ${tecnologia}
PERSONA QUE CONTESTA: ${v.cliente}
TELÉFONO: ${v.telefono}
MOTIVO DEL RECHAZO: ${motivo}
SUBMOTIVO DE RECHAZO: ${submotivo}
${v.lara||''}REALIZADO POR: ${u}
ID DE LLAMADA: ${idLlamada}`;
}

function templateCierre(v,sot,u,motivo,submotivo,idLlamada){
  const tipoCierre = motivo === 'EJECUTADO Y MOVILIZADO' ? 'CIERRE EN CAMPO' : 'CIERRE EN MESA';
  return `**MESA DE SEGUIMIENTO A365**
${tipoCierre}
CLIENTE: ${v.cliente}
MOTIVO: ${motivo}
SUB MOTIVO: ${submotivo}
TELÉFONO: ${v.telefono}
CONTRATA: ${v.contrata}
${v.lara||''}REALIZADO POR: ${u}
ID DE LLAMADA: ${idLlamada}`;
}

/* ── Estado de plantillas ── */
let categoria = 'dia';
let plantillaActiva = null;

const catTabs        = $('#catTabs');
const plantillaSelect = $('#plantillaSelect');
const plantillaHint   = $('#plantillaHint');
const campoSOT        = $('#campoSOT');
const motivoWrap      = $('#motivoWrap');
const motivoTipo      = $('#motivoTipo');
const motivoDetalle   = $('#motivoDetalle');
const fieldsContainer = $('#fieldsContainer');
const agentName       = $('#agentName');
const output          = $('#output');
const ticketLabel     = $('#ticketLabel');
const ticketSot       = $('#ticketSot');

function setupPlantillas(){
  catTabs.addEventListener('click', e => {
    const b = e.target.closest('.seg-btn'); if(!b) return;
    categoria = b.dataset.cat;
    $$('#catTabs .seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
    poblarSelectPlantillas();
  });
  plantillaSelect.addEventListener('change', () => seleccionarPlantilla(plantillaSelect.value));
  motivoTipo.addEventListener('change', () => {
    motivoDetalle.innerHTML = '<option value="">— Seleccionar —</option>';
    (SEG_MOTIVOS[motivoTipo.value] || []).forEach(op => {
      const o = document.createElement('option'); o.value = op; o.textContent = op;
      motivoDetalle.appendChild(o);
    });
  });

  $('#genBtn').addEventListener('click', generarTexto);
  $('#copyBtn').addEventListener('click', copyOutput);
  $('#clearBtn').addEventListener('click', clearOutput);
}

function poblarSelectPlantillas(){
  const plants = SEG_PLANTILLAS[categoria] || [];
  plantillaSelect.innerHTML = plants.map(p => `<option value="${p.id}">${p.titulo}</option>`).join('');
  seleccionarPlantilla(plants[0] && plants[0].id);
}

function seleccionarPlantilla(id){
  const plants = SEG_PLANTILLAS[categoria] || [];
  plantillaActiva = plants.find(p => p.id === id) || null;
  if(!plantillaActiva) return;

  plantillaHint.textContent = plantillaActiva.subtitulo || '';
  ticketLabel.textContent = plantillaActiva.titulo;

  if(plantillaActiva.usaMotivo){
    motivoWrap.hidden = false;
    motivoTipo.value = '';
    motivoDetalle.innerHTML = '<option value="">— Primero selecciona responsable —</option>';
  } else {
    motivoWrap.hidden = true;
  }

  fieldsContainer.innerHTML = '';

  if(plantillaActiva.tipoEspecial === 'rc'){
    renderCamposRC();
  } else if(plantillaActiva.tipoEspecial === 'cierre'){
    renderCamposCierre();
  } else if(plantillaActiva.campos.length === 0){
    fieldsContainer.innerHTML = `<div class="no-campos">✅ Solo completa el SOT y presiona <strong>Generar texto</strong>.</div>`;
  } else {
    const grid = document.createElement('div');
    grid.className = 'grid-2';

    if(plantillaActiva.usaContactabilidad){
      const cont = document.createElement('div');
      cont.className = 'field';
      cont.innerHTML = `<label>Contactabilidad</label>
        <div class="radio-group">
          <label><input type="radio" name="reprog_contactabilidad" value="SI" checked onchange="toggleContactabilidadReprog()"> SI</label>
          <label><input type="radio" name="reprog_contactabilidad" value="NO" onchange="toggleContactabilidadReprog()"> NO</label>
        </div>`;
      grid.appendChild(cont);
    }
    if(plantillaActiva.usaLaraigo){
      const tmp = document.createElement('div'); tmp.innerHTML = laraigoHTML();
      while(tmp.firstChild) grid.appendChild(tmp.firstChild);
    }

    plantillaActiva.campos.forEach(c => {
      const div = document.createElement('div');
      div.className = 'field';
      if(c.id === 'id_llamada' && plantillaActiva.usaContactabilidad) div.id = 'reprog_id_llamada_wrap';
      let inputHtml = '';
      if(c.tipo === 'date'){
        inputHtml = `<input type="date" id="campo_${c.id}">`;
      } else if(c.tipo === 'franja'){
        inputHtml = `<select id="campo_${c.id}">
          <option value="">— Seleccionar —</option>
          <option>AM0</option><option>AM1</option>
          <option>PM1</option><option>PM3</option>
        </select>`;
      } else if(c.tipo === 'radio'){
        div.className = 'field';
        const opciones = c.opciones || [];
        inputHtml = `<div class="radio-group">${opciones.map(op => {
          const checked = op === (c.default || opciones[0]) ? ' checked' : '';
          return `<label><input type="radio" name="campo_${c.id}" value="${op}"${checked}> ${op}</label>`;
        }).join('')}</div>`;
      } else {
        inputHtml = `<input type="text" id="campo_${c.id}" placeholder="${c.placeholder||''}">`;
      }
      div.innerHTML = `<label>${c.label}</label>${inputHtml}`;
      grid.appendChild(div);
    });
    fieldsContainer.appendChild(grid);
  }

  // Pegar texto TOA para autocompletar (plantilla FUERA DE TOA)
  if(plantillaActiva.id === 'sd5'){
    const box = document.createElement('div');
    box.className = 'toa-box';
    box.innerHTML = `
      <label style="display:block;font-size:12px;color:var(--muted);margin:14px 0 6px;">Pegar texto de TOA (opcional)</label>
      <p class="panel-hint" style="margin-bottom:8px;">En TOA abre la actividad, <b>Ctrl+A</b> y <b>Ctrl+C</b>. Pégalo aquí (<b>Ctrl+V</b>) y los campos (y el SOT) se completan solos.</p>
      <textarea id="toaPasteInput" placeholder="Pega aquí el texto completo de la actividad…"></textarea>
      <div class="toa-status" id="toaPasteStatus">esperando texto…</div>`;
    fieldsContainer.insertBefore(box, fieldsContainer.firstChild);
    $('#toaPasteInput').addEventListener('input', extraerYAutorrellenarTOA);
  }
}

/* ── TOA paste → autofill ── */
const TOA_KEYWORDS = {
  sot: 'SOT', sub_tipo: 'Sub Tipo de Orden', direccion: 'Direccion', distrito: 'Distrito',
  servicio: 'Tipo de Orden', plano: 'Plano', cliente: 'Nombre', cod_cliente: 'Código de Cliente',
  celular: 'Telefono', fecha: 'Fecha de Programacion', franja: 'Ventana Entrega'
};
function extractTOAField(text, keyword){
  if(!keyword) return '';
  const padded = '\n' + text + '\n';
  const marker = '\n' + keyword + '\n';
  const idx = padded.indexOf(marker);
  if(idx === -1) return '';
  const start = idx + marker.length;
  const end = padded.indexOf('\n', start);
  if(end === -1) return '';
  return padded.substring(start, end).trim();
}
function ddmmyyToISO(str){
  const m = (str||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if(!m) return '';
  let [, d, mo, y] = m;
  if(y.length === 2) y = '20' + y;
  return `${y}-${mo}-${d}`;
}
function extraerYAutorrellenarTOA(){
  const text = $('#toaPasteInput').value;
  const status = $('#toaPasteStatus');
  if(!text.trim()){ status.textContent = 'esperando texto…'; status.className = 'toa-status'; return; }
  let found = 0;
  Object.keys(TOA_KEYWORDS).forEach(campoId => {
    const val = extractTOAField(text, TOA_KEYWORDS[campoId]);
    if(!val) return;
    if(campoId === 'sot'){ campoSOT.value = val; found++; return; }
    const el = $('#campo_'+campoId); if(!el) return;
    if(el.tagName === 'INPUT' && el.type === 'date'){
      const iso = ddmmyyToISO(val); if(iso){ el.value = iso; found++; }
    } else if(el.tagName === 'SELECT'){
      const match = [...el.options].find(o => o.value.toUpperCase() === val.toUpperCase());
      if(match){ el.value = match.value; found++; }
    } else { el.value = val; found++; }
  });
  if(found === 0){ status.textContent = 'no se detectaron campos, revisa el texto pegado'; status.className = 'toa-status'; }
  else { status.textContent = `${found} campo(s) detectado(s) y completado(s)`; status.className = 'toa-status ok'; }
}

/* ── Laraigo / campos especiales ── */
function laraigoHTML(){
  return `<div class="field">
      <label>Laraigo</label>
      <div class="radio-group">
        <label><input type="radio" name="laraigo" value="SI" onchange="toggleLaraigo()"> SI</label>
        <label><input type="radio" name="laraigo" value="NO" checked onchange="toggleLaraigo()"> NO</label>
      </div>
    </div>
    <div class="field" id="laraigo_ticket_wrap" hidden>
      <label>Ticket Laraigo</label>
      <input type="text" id="campo_ticket_laraigo" placeholder="Ej: 0085852" inputmode="numeric" autocomplete="off">
    </div>`;
}
function toggleLaraigo(){
  const val = $('input[name="laraigo"]:checked');
  const wrap = $('#laraigo_ticket_wrap');
  if(wrap) wrap.hidden = !(val && val.value === 'SI');
}
function toggleContactabilidadReprog(){
  const val = $('input[name="reprog_contactabilidad"]:checked');
  const wrap = $('#reprog_id_llamada_wrap');
  if(wrap) wrap.style.display = (val && val.value === 'SI') ? '' : 'none';
}
function toggleIdLlamadaRC(){
  const val = $('input[name="rc_contactabilidad"]:checked');
  const wrap = $('#rc_id_llamada_wrap');
  if(wrap) wrap.style.display = (val && val.value === 'SI') ? 'block' : 'none';
}
function actualizarSubmotivosRC(){
  const m = $('#campo_motivo'), s = $('#campo_submotivo');
  s.innerHTML = '<option value="">— Seleccionar —</option>';
  if(m.value && RECHAZO_MOTIVOS[m.value]){
    RECHAZO_MOTIVOS[m.value].forEach(sm => {
      const o = document.createElement('option'); o.value = sm; o.textContent = sm; s.appendChild(o);
    });
  }
}
function togglePaquetesRC(){
  const m = $('#campo_motivo');
  const w = $('#rc_paquetes_wrap'); if(w) w.hidden = !(m && m.value === 'MALA OFERTA');
}
function toggleIdLlamadaCierre(){
  const val = $('input[name="cierre_contactabilidad"]:checked');
  const wrap = $('#cierre_id_llamada_wrap');
  if(wrap) wrap.style.display = (val && val.value === 'SI') ? 'block' : 'none';
}
function actualizarSubmotivosCierre(){
  const m = $('#campo_motivo'), s = $('#campo_submotivo');
  s.innerHTML = '<option value="">— Seleccionar —</option>';
  if(m.value && CIERRE_MOTIVOS[m.value]){
    CIERRE_MOTIVOS[m.value].forEach(sm => {
      const o = document.createElement('option'); o.value = sm; o.textContent = sm; s.appendChild(o);
    });
  }
}
function renderCamposRC(){
  const motivoOpts = Object.keys(RECHAZO_MOTIVOS).map(m => `<option value="${m}">${m}</option>`).join('');
  fieldsContainer.innerHTML = `
    <div class="grid-2">
      <div class="field"><label>Cliente</label><input type="text" id="campo_cliente" placeholder="Nombre del cliente"></div>
      <div class="field"><label>Teléfono</label><input type="text" id="campo_telefono" placeholder="Ej: 987654321"></div>
      <div class="field">
        <label>Servicio</label>
        <div class="radio-group">
          <label><input type="radio" name="rc_servicio" value="INSTALACION" checked> INSTALACION</label>
          <label><input type="radio" name="rc_servicio" value="POST VENTA"> POST VENTA</label>
        </div>
      </div>
      <div class="field">
        <label>Tecnología</label>
        <div class="radio-group">
          <label><input type="radio" name="rc_tecnologia" value="FTTH" checked> FTTH</label>
          <label><input type="radio" name="rc_tecnologia" value="HFC"> HFC</label>
        </div>
      </div>
      <div class="field">
        <label>Contactabilidad</label>
        <div class="radio-group">
          <label><input type="radio" name="rc_contactabilidad" value="SI" checked onchange="toggleIdLlamadaRC()"> SI</label>
          <label><input type="radio" name="rc_contactabilidad" value="NO" onchange="toggleIdLlamadaRC()"> NO</label>
        </div>
      </div>
      <div class="field" id="rc_id_llamada_wrap"><label>ID de Llamada</label><input type="text" id="campo_id_llamada" placeholder="Ej: 1515151151551"></div>
      ${plantillaActiva && plantillaActiva.usaLaraigo ? laraigoHTML() : ''}
      <div class="field">
        <label>Motivo</label>
        <select id="campo_motivo" onchange="actualizarSubmotivosRC(); togglePaquetesRC();">
          <option value="">— Seleccionar —</option>${motivoOpts}
        </select>
      </div>
      <div class="field">
        <label>Submotivo</label>
        <select id="campo_submotivo"><option value="">— Primero selecciona un motivo —</option></select>
      </div>
      <div class="field" id="rc_paquetes_wrap" hidden>
        <div class="grid-2" style="margin-top:0;">
          <div><label>Paquete ingresado</label><input type="text" id="campo_paquete_ingresado" placeholder="Ej: 200 Mbps + 1 deco"></div>
          <div><label>Paquete correcto</label><input type="text" id="campo_paquete_correcto" placeholder="Ej: 100 Mbps + 2 decos"></div>
        </div>
      </div>
    </div>`;
}
function renderCamposCierre(){
  const motivoOpts = Object.keys(CIERRE_MOTIVOS).map(m => `<option value="${m}">${m}</option>`).join('');
  fieldsContainer.innerHTML = `
    <div class="grid-2">
      <div class="field"><label>Cliente</label><input type="text" id="campo_cliente" placeholder="Nombre del cliente"></div>
      <div class="field"><label>Teléfono</label><input type="text" id="campo_telefono" placeholder="Ej: 987654321"></div>
      <div class="field"><label>Contrata</label><input type="text" id="campo_contrata" placeholder="Ej: VISANET"></div>
      <div class="field">
        <label>Contactabilidad</label>
        <div class="radio-group">
          <label><input type="radio" name="cierre_contactabilidad" value="SI" checked onchange="toggleIdLlamadaCierre()"> SI</label>
          <label><input type="radio" name="cierre_contactabilidad" value="NO" onchange="toggleIdLlamadaCierre()"> NO</label>
        </div>
      </div>
      <div class="field" id="cierre_id_llamada_wrap"><label>ID de Llamada</label><input type="text" id="campo_id_llamada" placeholder="Ej: 1515151151551"></div>
      ${plantillaActiva && plantillaActiva.usaLaraigo ? laraigoHTML() : ''}
      <div class="field">
        <label>Motivo</label>
        <select id="campo_motivo" onchange="actualizarSubmotivosCierre();">
          <option value="">— Seleccionar —</option>${motivoOpts}
        </select>
      </div>
      <div class="field">
        <label>Submotivo</label>
        <select id="campo_submotivo"><option value="">— Primero selecciona un motivo —</option></select>
      </div>
    </div>`;
}

function isoToDDMMYYYY(iso){
  const p = (iso||'').split('-'); if(p.length !== 3) return '';
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function generarTexto(){
  if(!plantillaActiva) return;
  const sot = campoSOT.value.trim();
  let ok = true;
  if(!sot){ markError(campoSOT); ok = false; }

  let motivoFinal = '';
  if(plantillaActiva.usaMotivo){
    const mt = motivoTipo.value.trim(), md = motivoDetalle.value.trim();
    if(!mt){ markError(motivoTipo); ok = false; }
    if(!md){ markError(motivoDetalle); ok = false; }
    if(mt && md) motivoFinal = md;
  }

  const u = agentName.value.trim() || '—';
  let texto = '', telefonoLog = '', idLlamadaLog = '', servicioLog = '';

  let laraTxt = '';
  if(plantillaActiva.usaLaraigo){
    const r = $('input[name="laraigo"]:checked');
    const laraigoLog = r ? r.value : 'NO';
    if(laraigoLog === 'SI'){
      const tk = $('#campo_ticket_laraigo');
      const ticket = tk.value.trim();
      if(!ticket){ markError(tk); ok = false; }
      else laraTxt = `TICKET: ${ticket}\n`;
    }
  }

  if(plantillaActiva.tipoEspecial === 'rc'){
    const cliente = $('#campo_cliente'), telefono = $('#campo_telefono'),
          motivo = $('#campo_motivo'), submotivo = $('#campo_submotivo');
    if(!cliente.value.trim()){ markError(cliente); ok=false; }
    if(!telefono.value.trim()){ markError(telefono); ok=false; }
    if(!motivo.value){ markError(motivo); ok=false; }
    if(!submotivo.value){ markError(submotivo); ok=false; }
    const contVal = $('input[name="rc_contactabilidad"]:checked');
    let idLlamada = 'NO APLICA';
    if(contVal && contVal.value === 'SI'){
      const idEl = $('#campo_id_llamada');
      if(!idEl.value.trim()){ markError(idEl); ok=false; } else idLlamada = idEl.value.trim();
    }
    let pi='', pc='';
    if(motivo.value === 'MALA OFERTA'){
      const a = $('#campo_paquete_ingresado'), b = $('#campo_paquete_correcto');
      pi = a.value.trim(); pc = b.value.trim();
      if(!pi){ markError(a); ok=false; } if(!pc){ markError(b); ok=false; }
    }
    if(!ok){ showToast('⚠️ Completa los campos requeridos','warn'); return; }
    const servicio = $('input[name="rc_servicio"]:checked').value;
    const tecnologia = $('input[name="rc_tecnologia"]:checked').value;
    const valores = { cliente: cliente.value.trim(), telefono: telefono.value.trim(), lara: laraTxt };
    texto = templateRC(plantillaActiva.id, valores, sot, u, motivo.value, submotivo.value, servicio, tecnologia, idLlamada, pi, pc);
    telefonoLog = valores.telefono; idLlamadaLog = idLlamada; servicioLog = servicio;

  } else if(plantillaActiva.tipoEspecial === 'cierre'){
    const cliente = $('#campo_cliente'), telefono = $('#campo_telefono'),
          contrata = $('#campo_contrata'), motivo = $('#campo_motivo'), submotivo = $('#campo_submotivo');
    if(!cliente.value.trim()){ markError(cliente); ok=false; }
    if(!telefono.value.trim()){ markError(telefono); ok=false; }
    if(!contrata.value.trim()){ markError(contrata); ok=false; }
    if(!motivo.value){ markError(motivo); ok=false; }
    if(!submotivo.value){ markError(submotivo); ok=false; }
    const contVal = $('input[name="cierre_contactabilidad"]:checked');
    let idLlamada = 'NO APLICA';
    if(contVal && contVal.value === 'SI'){
      const idEl = $('#campo_id_llamada');
      if(!idEl.value.trim()){ markError(idEl); ok=false; } else idLlamada = idEl.value.trim();
    }
    if(!ok){ showToast('⚠️ Completa los campos requeridos','warn'); return; }
    const valores = { cliente: cliente.value.trim(), telefono: telefono.value.trim(), contrata: contrata.value.trim(), lara: laraTxt };
    texto = templateCierre(valores, sot, u, motivo.value, submotivo.value, idLlamada);
    telefonoLog = valores.telefono; idLlamadaLog = idLlamada;

  } else {
    let contactabilidadVal = null;
    if(plantillaActiva.usaContactabilidad){
      const c = $('input[name="reprog_contactabilidad"]:checked');
      contactabilidadVal = c ? c.value : 'SI';
    }
    const valores = {};
    plantillaActiva.campos.forEach(c => {
      if(c.tipo === 'radio'){
        const chk = $(`input[name="campo_${c.id}"]:checked`);
        valores[c.id] = chk ? chk.value : ''; return;
      }
      const el = $('#campo_'+c.id); if(!el) return;
      if(c.id === 'id_llamada' && contactabilidadVal === 'NO'){ valores.id_llamada = 'NO APLICA'; return; }
      let val = el.value.trim();
      if(c.tipo === 'date' && val) val = isoToDDMMYYYY(val);
      if(!val){ markError(el); ok=false; } else valores[c.id] = val;
    });
    if(!ok){ showToast('⚠️ Completa los campos requeridos','warn'); return; }
    valores.lara = laraTxt;
    texto = plantillaActiva.template(valores, sot, u, motivoFinal);
    telefonoLog = valores.telefono || ''; idLlamadaLog = valores.id_llamada || ''; servicioLog = valores.servicio || '';
  }

  output.textContent = texto;
  ticketSot.textContent = 'SOT ' + (sot || '—');
  $('#ticketShell').hidden = false;
  $('#plantillasSplit').classList.remove('solo');
  if(window.matchMedia('(max-width: 880px)').matches) $('#ticketShell').scrollIntoView({behavior:'smooth', block:'start'});
  showToast('✓ Texto generado');
}

function copyOutput(){
  const text = output.textContent;
  if(!text){ showToast('⚠️ Primero genera el texto','warn'); return; }
  const fb = () => {
    const ta = document.createElement('textarea'); ta.value = text;
    ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta);
    showCopyFeedback();
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(showCopyFeedback).catch(fb);
  } else fb();
}
function showCopyFeedback(){
  const f = $('#copyFeedback'); f.style.display='inline'; setTimeout(()=>f.style.display='none',1600);
}
function clearOutput(){
  output.textContent=''; ticketSot.textContent='SOT —'; $('#ticketShell').hidden = true; campoSOT.value='';
  $('#plantillasSplit').classList.add('solo');
  if(plantillaActiva) seleccionarPlantilla(plantillaActiva.id);
}

/* ════════════════════════════════════════════════════════════
   MEDIDOR · HFC (coaxial) y FTTH (fibra)
   ════════════════════════════════════════════════════════════ */
function setupMedidor(){
  // tabs coaxial / fibra
  $$('#medidorTabs .seg-btn').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.tech;
    $$('#medidorTabs .seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
    $('#panel-hfc').classList.toggle('is-active', t === 'hfc');
    $('#panel-ftth').classList.toggle('is-active', t === 'ftth');
    $('#panel-hfc').hidden = t !== 'hfc';
    $('#panel-ftth').hidden = t !== 'ftth';
  }));

  // HFC
  const hfcInput = $('#hfc-input'), hfcThreshold = $('#hfc-threshold');
  const hfcUsnr = $('#hfc-usnr'), hfcUspow = $('#hfc-uspow');
  function evalChip(inputEl, chipEl, passFn, passLabel, failLabel){
    const raw = inputEl.value;
    if(raw === ''){ chipEl.className='chip'; chipEl.textContent='—'; return null; }
    const val = parseFloat(raw);
    if(isNaN(val)){ chipEl.className='chip'; chipEl.textContent='—'; return null; }
    const pass = passFn(val);
    chipEl.className = 'chip ' + (pass ? 'ok' : 'bad');
    chipEl.textContent = pass ? passLabel : failLabel;
    return pass;
  }
  function parseHFC(raw){
    if(!raw) return [];
    return raw.split(/[,\n;]+/).map(s=>s.trim()).filter(s=>s.length>0)
      .map(s=>parseFloat(s.replace(',','.'))).filter(n=>!isNaN(n));
  }
  function drawSpark(values){
    const svg = $('#hfc-spark'); svg.innerHTML='';
    if(values.length < 2){
      if(values.length === 1){ svg.innerHTML = '<circle cx="150" cy="35" r="3.5" fill="var(--hfc)"></circle>'; }
      return;
    }
    const max = Math.max(...values), min = Math.min(...values), span = (max-min)||1;
    const w=300, h=70, pad=6;
    const pts = values.map((v,i)=>{
      const x = pad + (i/(values.length-1))*(w-pad*2);
      const y = h-pad-((v-min)/span)*(h-pad*2);
      return [x,y];
    });
    const pathD = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const areaD = pathD+` L ${pts[pts.length-1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z`;
    const ns='http://www.w3.org/2000/svg';
    const area=document.createElementNS(ns,'path'); area.setAttribute('d',areaD);
    area.setAttribute('fill','var(--hfc)'); area.setAttribute('opacity','.14'); svg.appendChild(area);
    const line=document.createElementNS(ns,'path'); line.setAttribute('d',pathD);
    line.setAttribute('fill','none'); line.setAttribute('stroke','var(--hfc)'); line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-linecap','round'); line.setAttribute('stroke-linejoin','round'); svg.appendChild(line);
    pts.forEach(p=>{ const c=document.createElementNS(ns,'circle'); c.setAttribute('cx',p[0]); c.setAttribute('cy',p[1]); c.setAttribute('r','2.2'); c.setAttribute('fill','var(--hfc)'); svg.appendChild(c); });
  }
  function computeHFC(){
    const values = parseHFC(hfcInput.value);
    const threshold = parseFloat(hfcThreshold.value) || 0;
    const countEl = $('#hfc-count'); countEl.textContent = values.length;
    const usnrPass = evalChip(hfcUsnr, $('#hfc-usnr-chip'), v=>v>28, 'OK', 'BAJO');
    const uspowPass = evalChip(hfcUspow, $('#hfc-uspow-chip'), v=>v>=36.1 && v<=52.9, 'OK', 'FUERA DE RANGO');
    const extraChecks = [usnrPass, uspowPass].filter(p=>p!==null);
    const extraFail = extraChecks.some(p=>p===false);
    const extraNotes = [];
    if(usnrPass === false) extraNotes.push('U/S SNR bajo el mínimo (28 dB)');
    if(uspowPass === false) extraNotes.push('Potencia Upstream fuera de 36.1–52.9 dBmV');

    if(values.length === 0){
      $('#hfc-max').innerHTML='—<i>dB</i>'; $('#hfc-min').innerHTML='—<i>dB</i>'; $('#hfc-diff').innerHTML='—<i>dB</i>';
      drawSpark([]);
      const light=$('#hfc-light'), verdict=$('#hfc-verdict'), detail=$('#hfc-detail');
      if(extraChecks.length === 0){
        light.className='status-dot'; verdict.className='verdict'; verdict.textContent='Esperando valores…';
        detail.textContent='Pega una lista de lecturas para evaluar la estabilidad de la señal.';
      } else {
        light.className='status-dot '+(extraFail?'bad':'ok'); verdict.className='verdict '+(extraFail?'bad':'ok');
        verdict.textContent = (extraFail?'❌  ':'✅  ')+'Mediciones '+(extraFail?'fuera de especificación':'dentro de especificación');
        detail.textContent = extraFail ? extraNotes.join(' · ') : 'U/S SNR y Potencia Upstream dentro de rango.';
      }
      return;
    }
    const max=Math.max(...values), min=Math.min(...values), diff=max-min;
    $('#hfc-max').innerHTML=max.toFixed(2)+'<i>dB</i>'; $('#hfc-min').innerHTML=min.toFixed(2)+'<i>dB</i>';
    $('#hfc-diff').innerHTML=diff.toFixed(2)+'<i>dB</i>';
    const stable = diff <= threshold, overallOk = stable && !extraFail;
    const light=$('#hfc-light'), verdict=$('#hfc-verdict'), detail=$('#hfc-detail');
    light.className='status-dot '+(overallOk?'ok':'bad');
    verdict.className='verdict '+(overallOk?'ok':'bad');
    verdict.textContent = (overallOk?'✅  ':'❌  ')+'Diferencia: '+diff.toFixed(2)+' dB → SEÑAL '+(stable?'ESTABLE':'INESTABLE');
    const notes=[ stable ? 'variación dentro del umbral de '+threshold.toFixed(1)+' dB' : 'variación supera el umbral de '+threshold.toFixed(1)+' dB' ];
    notes.push(...extraNotes);
    detail.textContent = notes.join(' · ');
    drawSpark(values);
  }
  hfcInput.addEventListener('input', computeHFC);
  hfcThreshold.addEventListener('input', computeHFC);
  hfcUsnr.addEventListener('input', computeHFC);
  hfcUspow.addEventListener('input', computeHFC);
  $('#hfc-clear').addEventListener('click', ()=>{ hfcInput.value=''; hfcUsnr.value=''; hfcUspow.value=''; computeHFC(); });

  // FTTH
  const ftthLevel=$('#ftth-level'), ftthFrom=$('#ftth-from'), ftthTo=$('#ftth-to'), ftthMargin=$('#ftth-margin');
  const LED_COUNT=22; const ledBar=$('#ftth-led-bar');
  for(let i=0;i<LED_COUNT;i++){ const s=document.createElement('div'); s.className='led-seg'; ledBar.appendChild(s); }
  const ledSegs=ledBar.querySelectorAll('.led-seg');
  function computeFTTH(){
    const level=parseFloat(ftthLevel.value), from=parseFloat(ftthFrom.value),
          to=parseFloat(ftthTo.value), margin=parseFloat(ftthMargin.value)||0;
    $('#ftth-weak-label').textContent=to.toFixed(2)+' dBm · débil';
    $('#ftth-strong-label').textContent=from.toFixed(2)+' dBm · fuerte';
    const light=$('#ftth-light'), verdict=$('#ftth-verdict'), detail=$('#ftth-detail'), posLabel=$('#ftth-pos');
    if(isNaN(level)){
      light.className='status-dot'; verdict.className='verdict'; verdict.textContent='Ingresa un nivel para evaluar'; detail.textContent='';
      posLabel.textContent='Posición en el rango: —'; ledSegs.forEach(s=>s.className='led-seg'); return;
    }
    let estado = (level>from || level<to) ? 'NO ACEPTABLE' : (level>=from-margin || level<=to+margin) ? 'ACEPTABLE' : 'ÓPTIMO';
    let pos = ((level-to)/(from-to))*100; pos=Math.max(0,Math.min(100,pos));
    const cls = estado==='ÓPTIMO'?'ok':(estado==='ACEPTABLE'?'warn':'bad');
    const icon = estado==='ÓPTIMO'?'✅':(estado==='ACEPTABLE'?'⚠️':'❌');
    light.className='status-dot '+cls; verdict.className='verdict '+cls;
    verdict.textContent=icon+'  El nivel es '+estado;
    detail.textContent='Nivel: '+level.toFixed(2)+' dBm · Estado: '+estado+' · Posición: '+Math.round(pos)+'%';
    posLabel.textContent='Posición en el rango: '+Math.round(pos)+'%';
    const litCount=Math.round((pos/100)*LED_COUNT);
    ledSegs.forEach((seg,i)=>{ seg.className='led-seg'+(i<litCount?' lit-'+cls:''); });
  }
  [ftthLevel, ftthFrom, ftthTo, ftthMargin].forEach(el=>el.addEventListener('input', computeFTTH));
  $('#ftth-clear').addEventListener('click', ()=>{ ftthLevel.value=''; computeFTTH(); });

  computeHFC(); computeFTTH();
}

/* ════════════════════════════════════════════════════════════
   TABLA TEMPORAL · editor con persistencia local
   ════════════════════════════════════════════════════════════ */
function setupTabla(){
  const table = $('#ttTable');
  const notes = $('#ttNotes');
  const statusEl = $('#ttStatus');

  let model = store.get('mda_tabla', null);
  if(!model || !model.headers){
    model = { headers: ['Cliente','SOT','Estado','Nota'], rows: [['','','','']] };
  }
  notes.value = store.get('mda_notas', '');

  let saveT = null;
  function save(){
    clearTimeout(saveT);
    saveT = setTimeout(()=>{
      store.set('mda_tabla', model);
      store.set('mda_notas', notes.value);
      statusEl.textContent = 'Guardado · ' + new Date().toLocaleTimeString('es-PE');
    }, 250);
  }

  function render(){
    table.innerHTML = '';
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    htr.appendChild(th(''));
    model.headers.forEach((h, ci) => {
      const cell = th('');
      cell.contentEditable = 'true';
      cell.textContent = h;
      cell.addEventListener('input', () => { model.headers[ci] = cell.textContent; save(); });
      const del = document.createElement('span');
      del.className = 'col-del'; del.textContent = ' ✕'; del.title = 'Eliminar columna';
      del.addEventListener('click', () => { model.headers.splice(ci,1); model.rows.forEach(r=>r.splice(ci,1)); render(); save(); });
      cell.appendChild(del);
      htr.appendChild(cell);
    });
    thead.appendChild(htr); table.appendChild(thead);

    const tbody = document.createElement('tbody');
    model.rows.forEach((row, ri) => {
      const tr = document.createElement('tr');
      const del = document.createElement('td');
      del.className = 'row-del'; del.textContent = '✕'; del.title = 'Eliminar fila';
      del.addEventListener('click', () => { model.rows.splice(ri,1); render(); save(); });
      tr.appendChild(del);
      model.headers.forEach((_, ci) => {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = row[ci] != null ? row[ci] : '';
        td.addEventListener('input', () => { model.rows[ri][ci] = td.textContent; save(); });
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }
  function th(t){ const e=document.createElement('th'); e.textContent=t; return e; }

  $('#ttAddRow').addEventListener('click', () => { model.rows.push(model.headers.map(()=>'')); render(); save(); });
  $('#ttAddCol').addEventListener('click', () => {
    model.headers.push('Columna ' + (model.headers.length+1));
    model.rows.forEach(r => r.push('')); render(); save();
  });
  $('#ttExport').addEventListener('click', () => {
    const data = model.rows.map(r => {
      const o = {}; model.headers.forEach((h,i)=> o[h] = r[i] != null ? r[i] : ''); return o;
    });
    downloadJSON(data, 'tabla-temporal.json');
    showToast('✓ JSON exportado');
  });
  $('#ttClear').addEventListener('click', () => {
    if(confirm('¿Vaciar la tabla temporal? Esta acción no se puede deshacer.')){
      model = { headers: ['Cliente','SOT','Estado','Nota'], rows: [['','','','']] };
      notes.value=''; render(); save(); showToast('Tabla vaciada');
    }
  });
  notes.addEventListener('input', save);

  render();
}

/* ════════════════════════════════════════════════════════════
   TEPJ · Excel → JSON
   ════════════════════════════════════════════════════════════ */
function setupTEPJ(){
  const input = $('#tepjInput');
  const headerChk = $('#tepjHeader');
  const meta = $('#tepjMeta');
  const tableEl = $('#tepjTable');
  const jsonEl = $('#tepjJson');

  function detectDelim(text){
    if(text.includes('\t')) return '\t';
    if(text.includes(';') && !text.includes(',')) return ';';
    if(text.includes(',')) return ',';
    return '\n';
  }
  function parse(){
    const raw = input.value.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    if(!raw.trim()){ meta.textContent='Sin datos'; tableEl.innerHTML=''; jsonEl.textContent='[]'; return; }
    const delim = detectDelim(raw);
    const lines = raw.split('\n').filter(l => l.trim() !== '');
    const useHeader = headerChk.checked;
    const matrix = lines.map(l => delim === '\n' ? [l] : l.split(delim).map(c => c.trim()));
    const cols = matrix[0].length;
    const headerRow = useHeader ? matrix.shift() : matrix[0].map((_,i)=>'Col'+(i+1));
    const data = matrix.map(r => {
      const o = {}; headerRow.forEach((h,i)=> o[h] = r[i] != null ? r[i] : '');
      return (cols === 1 && r.length === 1) ? r[0] : o;
    });
    const final = useHeader ? data : matrix.map(r => r.length === 1 ? r[0] : r);
    meta.textContent = `${matrix.length} fila(s) de datos · ${cols} columna(s)${useHeader ? " · encabezado detectado" : ""}`;
    renderPreview(headerRow, matrix);
    jsonEl.textContent = JSON.stringify(final, null, 2);
  }
  function renderPreview(headerRow, matrix){
    tableEl.innerHTML='';
    const thead=document.createElement('thead'); const htr=document.createElement('tr');
    htr.appendChild(th(''));
    headerRow.forEach(h=>{ const c=th(h); c.contentEditable='true'; htr.appendChild(c); });
    thead.appendChild(htr); tableEl.appendChild(thead);
    const tbody=document.createElement('tbody');
    matrix.slice(0,50).forEach(row=>{
      const tr=document.createElement('tr'); tr.appendChild(td(''));
      row.forEach(c=> tr.appendChild(td(c))); tbody.appendChild(tr);
    });
    tableEl.appendChild(tbody);
  }
  function th(t){ const e=document.createElement('th'); e.textContent=t; return e; }
  function td(t){ const e=document.createElement('td'); e.textContent=t; return e; }

  input.addEventListener('input', debounce(parse, 200));
  headerChk.addEventListener('change', parse);
  $('#tepjCopy').addEventListener('click', () => {
    const txt = jsonEl.textContent;
    if(!txt || txt === '[]'){ showToast('⚠️ Nada que copiar','warn'); return; }
    copyText(txt, () => showToast('✓ JSON copiado'));
  });
  $('#tepjDownload').addEventListener('click', () => {
    const txt = jsonEl.textContent;
    if(!txt || txt === '[]'){ showToast('⚠️ Nada que descargar','warn'); return; }
    downloadJSONText(txt, 'tepj.json'); showToast('✓ JSON descargado');
  });
}
function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function copyText(text, done){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done){
  const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta); done();
}
function downloadJSON(obj, filename){ downloadJSONText(JSON.stringify(obj, null, 2), filename); }
function downloadJSONText(text, filename){
  const blob = new Blob([text], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════
   ACCESOS · enlaces de la mesa de ayuda
   ════════════════════════════════════════════════════════════ */
function setupAccesos(){
  const links = [
    {t:'SIOP', d:'Marca tu asistencia', url:'https://siop.a365.com.pe/index.php'},
    {t:'AICC', d:'Para realizar llamadas', url:'https://10.189.8.188:28090/service-cloud/aicc-web/index/index.html#/login'},
    {t:'TOA', d:'SG Técnico en Campo', url:'https://amx-peru.fs.ocs.oraclecloud.com/'},
    {t:'Laraigo', d:'TK de Atención TC', url:'https://claro.laraigo.com/sign-in'},
    {t:'360', d:'TK de Atención TC', url:'https://claro360.com/plataforma360/'},
    {t:'REMEDY', d:'SOT de Reemplazo', url:'https://claro360.com/plataforma360/Peru/soporte_remoto'},
    {t:'Zymbra', d:'Webmail', url:'https://correo.grupoa365.com:8443/?loginOp=logout'},
    {t:'ODN', d:'Verificación de FAT y clientes', url:'https://192.168.57.45:31943/ncecommonwebsite/v1/newportal/index.html?refr-flags=e'},
    {t:'Incognito', d:'Niveles y equipos', url:'http://172.17.51.6/sac/Login_input'},
    {t:'Incognito ACS', d:'Conexión, equipos y repetidor', url:'http://172.19.196.16:8080/acs/index.xhtml'},
    {t:'SKYWAY', d:'Conexión IPTV', url:'https://www.skywayplatform.com/skyway-platform/login?tenantCode=1086&backUrl'},
    {t:'CES FIJA', d:'Servicios fijos', url:'http://intranetces.tim.com.pe/'},
    {t:'SISEF', d:'TK Cobertura AM0', url:'https://gestorsisef.claro.pe/ords/r/ws_srvfija/srvfija/login'},
    {t:'Geodir', d:'Mapas de cobertura', url:'https://maps.geodir.co/bravo-maps'},
    {t:'Factibilidad', d:'Factibilidad de cobertura', url:'https://172.19.90.243/portalfactibilidad/public/buscar-casa-direccion/31'}
  ];
  const grid = $('#linkGrid');
  grid.innerHTML = links.map(l =>
    `<a class="link-item" href="${l.url}" target="_blank" rel="noopener"><span class="t">${l.t}</span><span class="d">${l.d}</span></a>`
  ).join('');
}
