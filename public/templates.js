/* ════════════════════════════════════════════════════════════
   MDA · catálogo de plantillas (datos puros)
   Cada campo vive en FIELDS y se comparte entre plantillas por su id:
   si dos plantillas piden "telefono", el valor escrito sirve para ambas.
   Autor: Engineer M.
   ════════════════════════════════════════════════════════════ */
'use strict';

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

/* type: text (por defecto) · area · date · seg (botones) · select
   options: lista fija · from: {field, map} lista dependiente de otro campo */
const FIELDS = {
  tecnico:       { label:'Técnico', ph:'Nombre del técnico' },
  telefono:      { label:'Teléfono', ph:'987654321', mode:'tel' },
  celular:       { label:'Celular del cliente', ph:'987654321', mode:'tel' },
  id_llamada:    { label:'ID de llamada', ph:'1788289232-339049' },
  observacion:   { label:'Observación', ph:'Detalle de la gestión', type:'area', wide:true },
  tipo_servicio: { label:'Tipo de servicio', ph:'FTTH - Instalación' },
  servicio:      { label:'Servicio', ph:'FTTH - Instalación' },
  servicio_nc:   { label:'Servicio', type:'seg', options:['INSTALACION','POST VENTA','MANTENIMIENTO'], def:'INSTALACION', wide:true },
  plano_coord:   { label:'Plano / coordenadas', ph:'LMSB042 / -12.09,-77.03' },
  plano:         { label:'Plano', ph:'LMSB042' },
  fecha:         { label:'Fecha de visita', type:'date' },
  fecha_nueva:   { label:'Nueva fecha', type:'date' },
  franja:        { label:'Franja', type:'seg', options:['AM0','AM1','PM1','PM3'] },
  sub_tipo:      { label:'Sub tipo', ph:'INSTALACION' },
  direccion:     { label:'Dirección', ph:'AV. LOS PINOS 123', wide:true },
  distrito:      { label:'Distrito', ph:'SAN BORJA' },
  cliente:       { label:'Cliente', ph:'Nombre completo' },
  cod_cliente:   { label:'Cód. cliente', ph:'4225215' },
  tipo_trabajo:  { label:'Tipo de trabajo', ph:'FTTH - PORTABILIDAD' },
  modelo:        { label:'Modelo de equipo', ph:'ONT HG8345R', wide:true },
  contrata:      { label:'Contrata', ph:'VISANET' },

  contacto:      { label:'Contactabilidad', type:'seg', options:['SI','NO'], def:'SI' },
  laraigo:       { label:'Laraigo', type:'seg', options:['SI','NO'], def:'NO' },
  ticket:        { label:'Ticket Laraigo', ph:'0085852', mode:'numeric' },

  resp:          { label:'Responsable del motivo', type:'seg', options:['CLARO','CLIENTE'], wide:true },
  motivo_rep:    { label:'Motivo de reprogramación', type:'select', from:{ field:'resp', map:SEG_MOTIVOS }, wide:true },

  rc_servicio:   { label:'Servicio', type:'seg', options:['INSTALACION','POST VENTA'], def:'INSTALACION' },
  rc_tec:        { label:'Tecnología', type:'seg', options:['FTTH','HFC'], def:'FTTH' },
  rc_motivo:     { label:'Motivo', type:'select', options:Object.keys(RECHAZO_MOTIVOS), wide:true },
  rc_sub:        { label:'Submotivo', type:'select', from:{ field:'rc_motivo', map:RECHAZO_MOTIVOS }, wide:true },
  paq_ing:       { label:'Paquete ingresado', ph:'200 Mbps + 1 deco' },
  paq_cor:       { label:'Paquete correcto', ph:'100 Mbps + 2 decos' },

  ci_motivo:     { label:'Motivo', type:'select', options:Object.keys(CIERRE_MOTIVOS), wide:true },
  ci_sub:        { label:'Submotivo', type:'select', from:{ field:'ci_motivo', map:CIERRE_MOTIVOS }, wide:true }
};

/* Campos condicionales reutilizables */
const IDL  = { id:'id_llamada', when: v => v.contacto === 'SI', otherwise:'NO APLICA' };
const TKT  = { id:'ticket',     when: v => v.laraigo === 'SI' };
const lara = v => v.laraigo === 'SI' ? `TICKET: ${v.ticket}\n` : '';
const stamp = c => `FECHA Y HORA: ${c.fecha} / ${c.hora}`;

const CATEGORIES = [
  { id:'seguimiento',    label:'Seguimiento' },
  { id:'reprogramacion', label:'Reprogramación' },
  { id:'rechazo',        label:'Rechazo y cierre' }
];

const TEMPLATES = [
  /* ───────────── SEGUIMIENTO ───────────── */
  { id:'sd1', cat:'seguimiento', title:'Seguimiento técnico',
    fields:['contacto','tecnico','telefono',IDL,'observacion'],
    render:(v,c)=>`${stamp(c)}
+++ SEGUIMIENTO TECNICO A365 +++
TECNICO: ${v.tecnico}
TELÉFONO: ${v.telefono}
ID DE LLAMADA: ${v.id_llamada}
OBSERVACION: ${v.observacion}
REALIZADO POR: ${c.u}` },

  { id:'sd2', cat:'seguimiento', title:'Cliente confirma visita',
    fields:['tipo_servicio','telefono','id_llamada','plano_coord','fecha','franja','observacion'],
    render:(v,c)=>`${stamp(c)}
+++ MESA DE SEGUIMIENTO A365 +++
TIPO DE SERVICIO: ${v.tipo_servicio}
TELÉFONO: ${v.telefono}
ID DE LLAMADA: ${v.id_llamada}
PLANO / COORDENADAS: ${v.plano_coord}
FECHA / FRANJA DE VISITA: ${v.fecha} / ${v.franja}
OBSERVACION: ${v.observacion}
REALIZADO POR: ${c.u}` },

  { id:'sd3', cat:'seguimiento', title:'Cliente no contesta',
    fields:['servicio_nc','telefono'],
    render:(v,c)=>`${stamp(c)}
+++ MESA DE SEGUIMIENTO A365 +++
CLIENTE NO CONTESTA
SERVICIO: ${v.servicio_nc}
TELÉFONO: ${v.telefono}
CANTIDAD DE LLAMADAS: 4 INTENTOS SIN RESULTADO, SE ENVIA WHATSAPP.
REALIZADO POR: ${c.u}` },

  { id:'sd4', cat:'seguimiento', title:'No desea adelantar', note:'Mantiene fecha',
    fields:['servicio','telefono','fecha','franja','id_llamada'],
    render:(v,c)=>`${stamp(c)}
+++ MESA DE SEGUIMIENTO A365 +++
CLIENTE NO DESEA ADELANTAR - MANTIENE FECHA
📧SERVICIO: ${v.servicio}
TELÉFONO: ${v.telefono}
📆FECHA / FRANJA DE VISITA: ${v.fecha} / ${v.franja}
🪪ID DE LLAMADA: ${v.id_llamada}
REALIZADO POR: ${c.u}` },

  { id:'sd5', cat:'seguimiento', title:'Fuera de TOA', note:'SOT sin flujo TOA', toa:true,
    fields:['sub_tipo','servicio','direccion','distrito','plano','cliente','cod_cliente','celular','fecha','franja'],
    render:(v,c)=>`*FUERA DE TOA*
🔍 SOT: ${c.sot}
🍄 SUB TIPO: ${v.sub_tipo}
🏡 DIRECCIÓN: ${v.direccion}
🏡 DISTRITO: ${v.distrito}
📧 SERVICIO: ${v.servicio}
📝 PLANO: ${v.plano}
👨💼 CLIENTE: ${v.cliente}
👨‍💼💼 COD CLIENTE: ${v.cod_cliente}
📱CELULAR DEL CLIENTE: ${v.celular}
📍 FECHA Y FRANJA: ${v.fecha} / ${v.franja}
✍️ REALIZADO POR:${c.u}
--------------------------------------------
Proceder con atención fuera de TOA.
Motivo: SOT sin flujo TOA
Autorizado por: ${c.u}` },

  { id:'sd6', cat:'seguimiento', title:'Liberación de franja',
    fields:['plano','cliente','tipo_trabajo','fecha','franja'],
    render:(v,c)=>`LIBERACION DE FRANJA
SOT: ${c.sot}
PLANO: ${v.plano}
CLIENTE: ${v.cliente}
TIPO DE TRABAJO: ${v.tipo_trabajo}
FECHA / FRANJA: ${v.fecha} / ${v.franja}` },

  { id:'sd7', cat:'seguimiento', title:'Espera de equipos', note:'Sin stock',
    fields:['modelo'],
    render:(v,c)=>`EN ESPERA DE EQUIPOS
Sin Stock de equipos
Modelo: ${v.modelo}
Pendiente de Atención o reasignación
REALIZADO POR: ${c.u}` },

  { id:'sd8', cat:'seguimiento', title:'TOA no interviene', note:'Atención por sistemas',
    fields:[],
    render:(v,c)=>`+++ MESA DE SEGUIMIENTO A365 +++
ATENCION POR SISTEMAS // NO CORRESPONDE VISITA EN CAMPO
Revisado Por: ${c.u}` },

  { id:'sd9', cat:'seguimiento', title:'Centro comercial', note:'Coordinación de estado',
    fields:[],
    render:(v,c)=>`+++ MESA DE SEGUIMIENTO A365 +++
ESTABLECIMIENTO EN CENTRO COMERCIAL
SE CAMBIA ESTADO PARA COORDINACION
REALIZADO POR: ${c.u}` },

  /* ───────────── REPROGRAMACIÓN ───────────── */
  { id:'sr1', cat:'reprogramacion', title:'Reprogramación de visita', note:'En mesa',
    fields:['resp','motivo_rep','contacto','cliente','telefono',IDL,'fecha_nueva','franja','contrata','observacion'],
    render:(v,c)=>`**MESA DE SEGUIMIENTO A365**
REPROGRAMADO EN MESA
NUEVA FECHA Y FRANJA DE VISITA: ${v.fecha_nueva} / ${v.franja}
CLIENTE: ${v.cliente}
TELÉFONO: ${v.telefono}
MOTIVO DE REPROGRAMACIÓN: ${v.motivo_rep}
CONTRATA: ${v.contrata}
REALIZADO POR: ${c.u}
ID DE LLAMADA: ${v.id_llamada}
OBSERVACION: ${v.observacion}` },

  { id:'sr2', cat:'reprogramacion', title:'Reprogramación por incidencia', note:'En campo',
    fields:['resp','motivo_rep','contacto','laraigo',TKT,'cliente','telefono',IDL,'fecha_nueva','franja','contrata','observacion'],
    render:(v,c)=>`**MESA DE SEGUIMIENTO A365**
REPROGRAMADO EN CAMPO
NUEVA FECHA Y FRANJA DE VISITA: ${v.fecha_nueva} / ${v.franja}
CLIENTE: ${v.cliente}
TELÉFONO: ${v.telefono}
MOTIVO DE REPROGRAMACIÓN: ${v.motivo_rep}
CONTRATA: ${v.contrata}
${lara(v)}REALIZADO POR: ${c.u}
ID DE LLAMADA: ${v.id_llamada}
OBSERVACION: ${v.observacion}` },

  /* ───────────── RECHAZO Y CIERRE ───────────── */
  { id:'rc1', cat:'rechazo', title:'Rechazo en línea', note:'Cliente no desea',
    fields:['cliente','telefono','rc_servicio','rc_tec','contacto',IDL,'rc_motivo','rc_sub',
      { id:'paq_ing', when:v=>v.rc_motivo==='MALA OFERTA' }, { id:'paq_cor', when:v=>v.rc_motivo==='MALA OFERTA' }],
    render:(v,c)=>rechazo('RECHAZADO EN MESA', v, c) },

  { id:'rc2', cat:'rechazo', title:'Rechazo técnico', note:'Sin viabilidad',
    fields:['cliente','telefono','rc_servicio','rc_tec','contacto',IDL,'laraigo',TKT,'rc_motivo','rc_sub',
      { id:'paq_ing', when:v=>v.rc_motivo==='MALA OFERTA' }, { id:'paq_cor', when:v=>v.rc_motivo==='MALA OFERTA' }],
    render:(v,c)=>rechazo('RECHAZADO EN CAMPO', v, c) },

  { id:'rc3', cat:'rechazo', title:'Cierre', note:'Mesa o campo',
    fields:['cliente','telefono','contrata','contacto',IDL,'laraigo',TKT,'ci_motivo','ci_sub'],
    render:(v,c)=>`**MESA DE SEGUIMIENTO A365**
${v.ci_motivo === 'EJECUTADO Y MOVILIZADO' ? 'CIERRE EN CAMPO' : 'CIERRE EN MESA'}
CLIENTE: ${v.cliente}
MOTIVO: ${v.ci_motivo}
SUB MOTIVO: ${v.ci_sub}
TELÉFONO: ${v.telefono}
CONTRATA: ${v.contrata}
${lara(v)}REALIZADO POR: ${c.u}
ID DE LLAMADA: ${v.id_llamada}` }
];

function rechazo(tag, v, c){
  const head = `**MESA DE SEGUIMIENTO A365**
${tag} -- ${v.rc_servicio} / ${v.rc_tec}
PERSONA QUE CONTESTA: ${v.cliente}
TELÉFONO: ${v.telefono}
MOTIVO DEL RECHAZO: ${v.rc_motivo}
SUBMOTIVO DE RECHAZO: ${v.rc_sub}`;
  const mala = v.rc_motivo === 'MALA OFERTA' ? `
MOTIVO DEL RECHAZO: MALA OFERTA
SUBMOTIVO DE RECHAZO: ${v.rc_sub}
PAQUETE INGRESADO: ${v.paq_ing}
PAQUETE CORRECTO: ${v.paq_cor}` : '';
  return `${head}${mala}
${lara(v)}REALIZADO POR: ${c.u}
ID DE LLAMADA: ${v.id_llamada}`;
}

/* TOA: etiqueta en el texto copiado → campo */
const TOA_KEYWORDS = {
  sot:'SOT', sub_tipo:'Sub Tipo de Orden', direccion:'Direccion', distrito:'Distrito',
  servicio:'Tipo de Orden', plano:'Plano', cliente:'Nombre', cod_cliente:'Código de Cliente',
  celular:'Telefono', fecha:'Fecha de Programacion', franja:'Ventana Entrega'
};

/* Enlaces de la mesa. quick:true = visibles siempre en la barra */
const LINKS = [
  { t:'Laraigo', d:'TK de atención TC', url:'https://claro.laraigo.com/sign-in', quick:true },
  { t:'AICC', d:'Para realizar llamadas', url:'https://10.189.8.188:28090/service-cloud/aicc-web/index/index.html#/login', quick:true },
  { t:'TOA', d:'SG técnico en campo', url:'https://amx-peru.fs.ocs.oraclecloud.com/', quick:true },
  { t:'Incognito', d:'Niveles de conexión y equipos', url:'http://172.17.51.6/sac/Login_input', quick:true },
  { t:'ACS', d:'Incognito ACS: equipos y repetidor', url:'http://172.19.196.16:8080/acs/index.xhtml', quick:true },
  { t:'SIOP', d:'Marca tu asistencia', url:'https://siop.a365.com.pe/index.php' },
  { t:'360', d:'TK de atención TC', url:'https://claro360.com/plataforma360/' },
  { t:'Remedy', d:'SOT de reemplazo', url:'https://claro360.com/plataforma360/Peru/soporte_remoto' },
  { t:'Zimbra', d:'Webmail', url:'https://correo.grupoa365.com:8443/?loginOp=logout' },
  { t:'ODN', d:'FAT y clientes registrados', url:'https://192.168.57.45:31943/ncecommonwebsite/v1/newportal/index.html?refr-flags=e' },
  { t:'Skyway', d:'Conexión IPTV', url:'https://www.skywayplatform.com/skyway-platform/login?tenantCode=1086&backUrl' },
  { t:'CES Fija', d:'Verificación de servicios fijos', url:'http://intranetces.tim.com.pe/' },
  { t:'SISEF', d:'Gestión de TK cobertura AM0', url:'https://gestorsisef.claro.pe/ords/r/ws_srvfija/srvfija/login' },
  { t:'Geodir', d:'Mapas de cobertura', url:'https://maps.geodir.co/bravo-maps' },
  { t:'Factibilidad', d:'Factibilidad de cobertura', url:'https://172.19.90.243/portalfactibilidad/public/buscar-casa-direccion/31' }
];
