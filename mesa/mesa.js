
(function(){
/* Aparta la Fecha · Mesa de regalos (plantilla). Los datos viven en Supabase; las fotos en su almacenamiento o en /<evento>/mesa/img/. */
var CFG=window.AF_MESA||{};
var SLUG=String(CFG.slug||'').toLowerCase();
var SB_URL=String(window.AF_SUPABASE_URL||'').replace(/\/$/,''),SB_KEY=window.AF_SUPABASE_KEY||'';
var ARTE=CFG.arte||'/mesa/arte/';
var CACHE_KEY='af-mesa:'+SLUG;
var sb=null;
try{if(window.supabase&&SB_URL&&SB_KEY)sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'af-mesa-sesion'}})}catch(e){sb=null}
var PALETTES=[['rosa','Rosa','#C93D83'],['lila','Lila','#8248C0'],['durazno','Durazno','#C9533C'],['ciruela','Ciruela','#7B3B6E'],['cielo','Cielo','#2C5B8A'],['salvia','Salvia','#466B4B']];
var STORES=[['amazon','Amazon'],['liverpool','Liverpool'],['mercadolibre','Mercado Libre'],['palaciodehierro','El Palacio de Hierro'],['sears','Sears'],['walmart','Walmart'],['bodegaaurrera','Bodega Aurrera'],['coppel','Coppel'],['costco','Costco'],['sams','Sam\'s Club'],['homedepot','The Home Depot'],['ikea','IKEA'],['sanborns','Sanborns'],['suburbia','Suburbia'],['shein','SHEIN'],['elektra','Elektra'],['bestbuy','Best Buy'],['target','Target'],['etsy','Etsy'],['chedraui','Chedraui'],['soriana','Soriana'],['babycreysi','Baby Creysi'],['mibebe','Mi Bebé']];

var state=clean({});
/* Nunca se guardan nombres de invitados: la dinámica es que los papás adivinen. */
function clean(s){
  s=s&&typeof s==='object'?s:{};
  s.event=s.event||{};s.bank=s.bank||{};s.gifts=s.gifts||[];s.fund=s.fund||[];s.theme=s.theme||'rosa';
  s.gifts.forEach(function(g){g.givers=g.givers||[];g.contributions=g.contributions||[];g.givers.concat(g.contributions).forEach(function(c){delete c.name})});
  s.fund.forEach(function(c){delete c.name});
  return s;
}

var ui={filter:'todos',preview:false,canWrite:false,busy:false,modal:null,pending:null,pendingImg:'',version:0,loading:true,loadError:false,notFound:false,offline:false};
var MXN=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
function money(n){return MXN.format(Math.round(+n||0))}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function uid(){return Math.random().toString(36).slice(2,9)}
function sum(a){return (a||[]).reduce(function(t,c){return t+(+c.amount||0)},0)}
function plural(n,a,b){return n+' '+(n===1?a:b)}
function $(s){return document.querySelector(s)}
function safeUrl(u){u=String(u||'').trim();return /^https?:\/\//i.test(u)?u:''}
function safeImg(u){
  u=String(u||'');
  if(/^data:image\//.test(u))return u;
  if(/^\/[\w\-\/.]+\.(jpe?g|png|webp)(\?v=\w+)?$/i.test(u))return u;
  if(SB_URL&&u.indexOf(SB_URL+'/storage/v1/object/public/mesas/')===0&&!/["'<>\s]/.test(u))return u;
  return '';
}
function pageUrl(){return safeUrl(state.event.shareUrl)||(location.origin+location.pathname)}
function gift(id){return state.gifts.find(function(g){return g.id===id})}
function raised(g){return sum(g.contributions)}
function giftState(g){
  if(g.mode==='coop'){if(g.whole)return 'completo';if(g.status==='fondo')return 'fondo';return raised(g)>=g.price?'completo':'abierto'}
  return piecesOf(g)>=(g.qty||1)?'completo':'abierto';
}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function storeFromUrl(u){try{var host=new URL(u).hostname.replace(/^www\./,'');var hit=STORES.find(function(s){return host.indexOf(s[0])>-1});if(hit)return hit[1];var b=host.split('.')[0];return b.charAt(0).toUpperCase()+b.slice(1)}catch(e){return ''}}
function eventDate(){var e=state.event;if(!e.date)return null;var d=new Date(e.date+'T'+(e.time||'12:00'));return isNaN(d)?null:d}
function fmtDate(d){var s=d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});return s.charAt(0).toUpperCase()+s.slice(1)}
function fmtTime(t){if(!t)return '';var p=t.split(':');var d=new Date(2000,0,1,+p[0],+p[1]);return d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'})}
function daysLeft(d){var n=new Date();var a=new Date(n.getFullYear(),n.getMonth(),n.getDate());var b=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.round((b-a)/864e5)}
function waPhone(){var p=String(state.event.whatsapp||'').replace(/\D/g,'');if(p.length===10)p='52'+p;return p}
function piecesOf(g){return (g.givers||[]).reduce(function(t,x){return t+(+x.qty||1)},0)}
function leftOf(g){return Math.max(0,(g.qty||1)-piecesOf(g))}
function coordOn(){return String(state.event.coordWa||'').replace(/\D/g,'').length>=10}
function notifyPhone(){if(coordOn()){var p=String(state.event.coordWa).replace(/\D/g,'');return p.length===10?'52'+p:p}return waPhone()}
function notifyName(){return coordOn()?(state.event.coordName||'quien recibe los avisos'):(state.event.host||'')}
function waNotify(text){var p=notifyPhone();return p?'https://wa.me/'+p+'?text='+encodeURIComponent(text):''}
function fmtDay(d){try{var x=new Date(d+'T12:00');return isNaN(x)?'':x.toLocaleDateString('es-MX',{day:'numeric',month:'short'})}catch(e){return ''}}
function waTo(text){var p=waPhone();return p?'https://wa.me/'+p+'?text='+encodeURIComponent(text):''}
function mapsHref(e){
  var u=safeUrl(e.mapsUrl);if(u)return u;
  return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([e.place,e.address].filter(Boolean).join(', '));
}
function shareText(){
  /* El enlace de la mesa va primero y es el único: WhatsApp arma la vista previa (foto de portada) con el primer enlace del mensaje. */
  var e=state.event,d=eventDate(),baby=e.babyShort||e.baby||'';
  var t='🎀 '+(e.title||'Mesa de regalos')+'\n'+pageUrl();
  if(d)t+='\n\n📅 '+fmtDate(d)+(e.time?' · '+fmtTime(e.time):'');
  if(e.place)t+='\n📍 '+e.place;
  return t+'\n\nTe compartimos la mesa de regalos'+(baby?' de '+baby:'')+'. Puedes regalar algo de la lista o cooperar para los regalos grandes. 💕\n(En la página está el botón «Cómo llegar» al salón).';
}

var ICON={
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2z"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  balloons:'<svg viewBox="0 0 200 140" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><ellipse cx="70" cy="46" rx="24" ry="29" fill="currentColor" fill-opacity=".22"/><ellipse cx="112" cy="34" rx="26" ry="31" fill="currentColor" fill-opacity=".35"/><ellipse cx="146" cy="56" rx="21" ry="26" fill="currentColor" fill-opacity=".18"/><path d="M70 75c-4 18 8 30 30 58M112 65c-2 22-6 40-12 68M146 82c-8 18-24 30-46 51"/><path d="M88 120c4-6 20-6 24 0-4 6-20 6-24 0z" fill="currentColor"/></svg>',
  box:'<svg viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><rect x="16" y="40" width="88" height="54" rx="6"/><rect x="10" y="26" width="100" height="16" rx="5"/><path d="M60 26v68"/><path d="M60 26c-6-14-26-22-30-10-3 9 14 10 30 10zM60 26c6-14 26-22 30-10 3 9-14 10-30 10z"/></svg>'
};

var ART={nube:ARTE+'nube.webp',mariposa:ARTE+'mariposa.webp',dino:ARTE+'dino.webp',huevo:ARTE+'huevo.webp'};
/* ---------- Render ---------- */
function isAdmin(){return ui.canWrite&&!ui.preview}

function render(){
  var app=$('#app');
  app.className='app';app.setAttribute('data-p',state.theme||'rosa');
  var main=$('#main');
  if(!main){app.innerHTML='<div id="main"></div><div class="modal-wrap" id="modal" hidden></div><div class="toast" id="toast" role="status" aria-live="polite" hidden></div>';main=$('#main')}
  if(ui.loading||ui.loadError||ui.notFound){main.innerHTML=statusView();return}
  main.innerHTML=adminBar()+hero()+'<main class="wrap after-top">'+how()+'<h2 class="lista-h">Mis regalitos</h2>'+topBar()+grid()+fundCard()+'</main>'+footer()+helpFab()+
    (ui.canWrite&&ui.preview?'<button class="btn primary float" data-act="preview">Volver a modo anfitrión</button>':'');
  document.title='Mesa de regalos'+(state.event.title?' · '+state.event.title:'');
}

function statusView(){
  var body;
  if(ui.loading)body='<p>Cargando la mesa de regalos…</p>';
  else if(ui.notFound)body='<p><b>Esta mesa de regalos todavía no está lista.</b></p><p class="muted small">Vuelve a abrir el enlace en un rato.</p>';
  else body='<p><b>No pudimos cargar la mesa.</b></p><p class="muted small">Revisa tu conexión a internet e inténtalo de nuevo.</p><button class="btn primary" data-act="retry">Reintentar</button>';
  return '<div class="estado" role="status" aria-live="polite"><img class="huevo" src="'+ART.huevo+'" alt="">'+body+'</div>';
}

function adminBar(){
  if(!isAdmin())return '';
  var e=state.event,b=state.bank,miss=[];
  if(!waPhone())miss.push('<button data-act="edit-event">tu WhatsApp</button>');
  if(!b.clabe&&!b.card)miss.push('<button data-act="edit-bank">datos para transferencia</button>');
  if(!e.place&&!e.address)miss.push('<button data-act="edit-event">lugar del evento</button>');
  var tip=coordOn()?'':'<span>🤫 Para la dinámica de adivinar: <button data-act="edit-event">elige quién recibe los avisos</button></span>';
  var hasEx=state.gifts.some(function(g){return g.example||(g.contributions||[]).some(function(c){return c.example})||(g.givers||[]).some(function(c){return c.example})})||state.fund.some(function(c){return c.example});
  var setup='';
  if(miss.length||hasEx||tip){
    setup='<div class="setup"><div class="wrap">'+
      (miss.length?'<span><b>Falta:</b> '+miss.join(' · ')+'</span>':'')+tip+
      (hasEx?'<span>La lista tiene regalos de ejemplo. <button data-act="clear-examples">Quitar ejemplos</button></span>':'')+
      '</div></div>';
  }
  return '<div class="adminbar"><div class="wrap"><span class="tag">Modo anfitrión</span>'+
    '<button class="solid" data-act="add-gift">+ Agregar regalo</button>'+
    '<button data-act="edit-event">Evento</button>'+
    '<button data-act="edit-bank">Cuenta bancaria</button>'+
    '<button data-act="preview">Ver como invitado</button>'+
    '<button data-act="logout">Salir</button></div></div>'+setup;
}

function hero(){
  var e=state.event,d=eventDate(),admin=isAdmin(),facts='';
  if(d)facts+='<span class="fact">'+ICON.cal+esc(fmtDate(d))+'</span>';
  if(e.time)facts+='<span class="fact">'+ICON.clock+esc(fmtTime(e.time))+'</span>';
  var loc='';
  if(e.place||e.address){
    loc='<a class="loc" target="_blank" rel="noopener" href="'+esc(mapsHref(e))+'">'+ICON.pin+
      '<span class="loc-t"><b>'+esc(e.place||e.address)+'</b>'+(e.place&&e.address?'<small>'+esc(e.address)+'</small>':'')+'</span>'+
      '<span class="go">Cómo llegar ↗</span></a>';
  }
  var left=d?daysLeft(d):null;
  if(left!==null&&left>1)facts+='<span class="fact">Faltan&nbsp;<b class="num">'+left+'</b>&nbsp;días</span>';
  else if(left===1)facts+='<span class="fact">Es mañana</span>';
  else if(left===0)facts+='<span class="fact">Es hoy</span>';
  var G={nina:'👧 Niña',nino:'👦 Niño',sorpresa:'🎈 Sorpresa'};
  var cover=safeImg(e.cover)?'<img src="'+esc(safeImg(e.cover))+'" alt="Foto de portada">':'<div class="art">'+ICON.balloons+'</div>';
  var av=safeImg(e.avatar)?'<img src="'+esc(safeImg(e.avatar))+'" alt="Foto de '+esc(e.baby||'la bebé')+'">':'<span aria-hidden="true">'+esc(e.emoji||'🎀')+'</span>';
  var kind=String(e.kind||'').trim(),hasDe=/\s+de$/i.test(kind),bs=kind.replace(/\s+de$/i,'');
  var deTxt=hasDe?(e.gender==='nina'?'de nuestra bebé':'de nuestro bebé'):'';
  var title=e.baby?(bs?'<span class="bs">'+esc(bs.toUpperCase())+'</span>':'')+(deTxt?'<span class="de">'+deTxt+'</span>':'')+
      '<span class="nombre">'+esc(e.baby).toUpperCase().split(/\s+/).map(function(w){return '<span>'+w+'</span>'}).join('')+'</span>'
    :'<span class="nombre">'+esc(e.title||'Mesa de regalos')+'</span>';
  var share=pageUrl()?'<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(shareText())+'">'+ICON.wa+'Compartir por WhatsApp</a><button class="btn" data-act="copy-link">'+ICON.link+'Copiar enlace</button>':'';
  var sky='<div class="cielo" aria-hidden="true"><img class="nube n1" src="'+ART.nube+'" alt=""><img class="nube n2" src="'+ART.nube+'" alt="">'+
    '<img class="mariposa m1" src="'+ART.mariposa+'" alt=""><img class="mariposa m2" src="'+ART.mariposa+'" alt=""></div>';
  return '<header class="top">'+sky+'<div class="wrap"><div class="pcard">'+
    '<div class="cover">'+cover+(admin?'<label class="cam" for="in-cover" title="Cambiar foto de portada">'+ICON.cam+'<span class="vh">Cambiar foto de portada</span></label><input type="file" id="in-cover" class="vh" accept="image/*">':'')+'</div>'+
    '<div class="avatar"><div class="in">'+av+'</div>'+(admin?'<label class="cam" for="in-avatar" title="Cambiar foto de perfil">'+ICON.cam+'<span class="vh">Cambiar foto de perfil</span></label><input type="file" id="in-avatar" class="vh" accept="image/*">':'')+'</div>'+
    '<div class="pbody">'+
      '<div class="phead"><span class="eyebrow">Mesa de regalos</span>'+(admin?'<button class="editlink" data-act="edit-event">✏️ Editar</button>':'')+'</div>'+
      '<h1 class="titulo">'+title+'</h1>'+
      (e.honoree?'<p class="sub">'+esc(e.honoree)+'</p>':'')+
      (G[e.gender]?'<span class="chip-g">'+G[e.gender]+'</span>':'')+
      (facts?'<div class="facts">'+facts+'</div>':'')+loc+
      (e.message?'<p class="msg">'+esc(e.message)+'</p>':'')+
      (share?'<div class="row">'+share+'</div>':'')+
    '</div></div></div></header>';
}

function topBar(){
  var gs=state.gifts,done=gs.filter(function(g){return giftState(g)!=='abierto'}).length;
  var f=[['todos','Todos'],['cooperar','Para cooperar'],['disponibles','Disponibles'],['regalados','Ya regalados']];
  var cash='';
  if(isAdmin()){
    var coopTotal=0,fondoTotal=0;
    gs.forEach(function(g){if(g.mode==='coop'){var r=raised(g);coopTotal+=r;if(g.status==='fondo')fondoTotal+=r}});
    var free=sum(state.fund);
    cash='<div class="cash num"><span>Aportaciones registradas: <b>'+money(coopTotal+free)+'</b></span>'+
      '<span>En efectivo (colectas cerradas + aportación libre): <b>'+money(fondoTotal+free)+'</b></span></div>';
  }
  return '<div class="bar-top"><p class="stats"><b>'+plural(gs.length,'regalo','regalos')+'</b> · '+done+' ya '+(done===1?'cubierto':'cubiertos')+'</p>'+
    '<div class="filters" role="group" aria-label="Filtrar regalos">'+f.map(function(x){return '<button data-act="filter" data-f="'+x[0]+'" aria-pressed="'+(ui.filter===x[0])+'">'+x[1]+'</button>'}).join('')+'</div></div>'+cash;
}

var FILTERS={
  todos:function(){return true},
  cooperar:function(g){return g.mode==='coop'&&giftState(g)==='abierto'},
  disponibles:function(g){return giftState(g)==='abierto'},
  regalados:function(g){return giftState(g)!=='abierto'}
};

function grid(){
  function rank(g){return (giftState(g)==='abierto'?0:2)+(g.essential?0:1)}
  var list=state.gifts.filter(FILTERS[ui.filter]||FILTERS.todos).slice().sort(function(a,b){return rank(a)-rank(b)});
  if(!state.gifts.length){
    return '<section class="grid"><div class="empty"><p>'+(isAdmin()?'Tu mesa está vacía. Pega el enlace de cualquier tienda para agregar el primer regalo.':'Pronto agregaremos regalos a esta mesa.')+'</p>'+(isAdmin()?'<button class="btn primary" data-act="add-gift">Agregar regalo</button>':'')+'</div></section>';
  }
  if(!list.length)return '<section class="grid"><div class="empty"><p>No hay regalos en esta categoría.</p></div></section>';
  return '<section class="grid" aria-label="Regalos">'+list.map(card).join('')+'</section>';
}

function card(g){
  var st=giftState(g),coop=g.mode==='coop',r=raised(g),price=+g.price||0;
  var pct=coop&&price?Math.min(100,Math.round(r/price*100)):0;
  var nGiv=piecesOf(g),qty=g.qty||1,url=safeUrl(g.url);
  var badges=g.essential?'<span class="badge ess">★ Esencial</span>':'';
  if(g.example)badges+='<span class="badge ex">Ejemplo</span>';
  if(coop)badges+=g.whole?'<span class="badge ok">Ya lo regalaron</span>':st==='fondo'?'<span class="badge">Colecta cerrada</span>':st==='completo'?'<span class="badge ok">Meta alcanzada</span>':'<span class="badge">Para cooperar</span>';
  else if(st==='completo')badges+='<span class="badge ok">Ya lo regalaron</span>';
  var img=safeImg(g.img)?'<img src="'+esc(safeImg(g.img))+'" alt="'+esc(g.name)+'" loading="lazy">':ICON.box;
  var meter;
  if(coop&&g.whole){
    meter='<div class="meter"><div class="bar done" role="progressbar" aria-label="Regalado completo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i style="width:100%"></i></div>'+
      '<p class="small muted">Una sola persona lo regaló completo 🎁</p></div>';
  }else if(coop){
    var nC=(g.contributions||[]).length;
    var line=st==='abierto'?'Faltan '+money(price-r):st==='fondo'?'Lo reunido se entrega en efectivo':'¡Se juntó completo!';
    meter='<div class="meter"><div class="bar'+(st!=='abierto'?' done':'')+'" role="progressbar" aria-label="Avance de la colecta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><i style="width:'+pct+'%"></i></div>'+
      '<p class="meter-txt"><b>'+money(r)+'</b> de '+money(price)+' · '+pct+'%</p>'+
      '<p class="small muted">'+line+(nC?' · '+plural(nC,'persona cooperó','personas cooperaron'):'')+'</p></div>';
  }else{
    var lf=qty-nGiv;
    meter=qty>1?'<div class="meter"><div class="pieces" aria-label="'+nGiv+' de '+qty+' piezas apartadas">'+Array.from({length:Math.min(qty,12)},function(_,i){return '<i'+(i<nGiv?' class="on"':'')+'></i>'}).join('')+'</div>'+
      '<p class="meter-txt">Se necesitan <b>'+qty+'</b> · '+(lf<=0?'todas apartadas':(lf===1?'falta 1':'faltan '+lf))+'</p></div>'
      :'<p class="small muted">'+(nGiv?'Ya está apartado':'Disponible')+'</p>';
  }
  var primary=st==='abierto'?'<button class="btn primary block" data-act="give" data-id="'+esc(g.id)+'">'+(coop?'Cooperar':'Lo regalo yo')+'</button>'+
      (coop&&r<=0?'<button class="btn block" data-act="give-whole" data-id="'+esc(g.id)+'">Lo regalo completo</button>':'')
    :'<button class="btn block" disabled>'+(st==='fondo'?'Colecta cerrada':'Completo')+'</button>';
  var shop=url?'<a class="link" href="'+esc(url)+'" target="_blank" rel="noopener">Ver en '+esc(g.store||'la tienda')+' ↗</a>':'';
  var tools='';
  if(isAdmin()){
    var entries=coop?(g.contributions||[]):(g.givers||[]);
    tools='<div class="tools">'+
      '<button class="mini" data-act="edit-gift" data-id="'+esc(g.id)+'">Editar</button>'+
      '<button class="mini'+(g.essential?' on':'')+'" data-act="ess" data-id="'+esc(g.id)+'" aria-pressed="'+!!g.essential+'">★ Esencial</button>'+
      (st==='fondo'||g.whole?'':'<button class="mini" data-act="register" data-id="'+esc(g.id)+'">'+(coop?'Registrar aportación':'Marcar regalado')+'</button>')+
      (coop&&st==='abierto'&&r<=0?'<button class="mini" data-act="mark-whole" data-id="'+esc(g.id)+'">Marcar regalado completo</button>':'')+
      (coop?(g.status==='fondo'?'<button class="mini" data-act="reopen" data-id="'+esc(g.id)+'">Reabrir colecta</button>':(st==='abierto'?'<button class="mini" data-act="close-coop" data-id="'+esc(g.id)+'">Cerrar colecta</button>':'')):'')+
      '<button class="mini danger" data-act="del-gift" data-id="'+esc(g.id)+'">Eliminar</button></div>'+
      (g.whole?'<details class="log"><summary>Regalado completo</summary><ul><li><span>Una persona · '+esc(fmtDay(g.whole.date||''))+'</span><button class="x" aria-label="Quitar registro" data-act="del-whole" data-id="'+esc(g.id)+'">✕</button></li></ul></details>':'')+
      (entries.length?'<details class="log"><summary>'+(coop?plural(entries.length,'aportación anónima','aportaciones anónimas'):plural(nGiv,'pieza apartada','piezas apartadas'))+'</summary><ul>'+entries.map(function(c){
        var what=coop?'Aportación':plural(+c.qty||1,'pieza','piezas');
        return '<li><span>'+what+(c.date?' · '+esc(fmtDay(c.date)):'')+'</span>'+(coop?'<b>'+money(c.amount)+'</b>':'')+'<button class="x" aria-label="Quitar registro" data-act="del-entry" data-id="'+esc(g.id)+'" data-e="'+esc(c.id)+'">✕</button></li>'}).join('')+'</ul></details>':'');
  }
  return '<article class="gift'+(st!=='abierto'?' is-done':'')+(g.essential?' is-ess':'')+'">'+
    '<div class="ph">'+img+(badges?'<div class="badges">'+badges+'</div>':'')+'</div>'+
    '<div class="body">'+(g.store?'<p class="store">'+esc(g.store)+'</p>':'')+'<h3>'+esc(g.name)+'</h3>'+(g.size?'<p class="variant">'+esc(g.size)+'</p>':'')+
    '<p class="price">'+money(price)+(coop?'':' <span class="price-hint">precio regular</span>')+'</p>'+meter+
    '<div class="actions">'+primary+shop+'</div>'+tools+'</div></article>';
}

function fundCard(){
  var admin=isAdmin(),list='';
  if(admin&&state.fund.length){
    list='<details class="log"><summary>'+plural(state.fund.length,'aportación libre','aportaciones libres')+' · '+money(sum(state.fund))+'</summary><ul>'+state.fund.map(function(c){
      return '<li><span>Aportación'+(c.date?' · '+esc(fmtDay(c.date)):'')+'</span><b>'+money(c.amount)+'</b><button class="x" aria-label="Quitar registro" data-act="del-entry" data-id="fund" data-e="'+esc(c.id)+'">✕</button></li>'}).join('')+'</ul></details>';
  }
  return '<section class="fund"><div class="row"><div style="display:grid;gap:6px;min-width:0;flex:1 1 280px"><h2>Aportación libre</h2>'+
    '<p class="muted">¿Prefieres regalar efectivo? Transfiere la cantidad que quieras directo a la cuenta de los anfitriones.</p></div>'+
    '<div class="row"><button class="btn primary" data-act="give" data-id="fund">Hacer una aportación</button>'+(admin?'<button class="btn" data-act="register" data-id="fund">Registrar</button>':'')+'</div></div>'+list+'</section>';
}

function how(){
  return '<section class="how" aria-labelledby="how-h"><img class="dino" src="'+ART.dino+'" alt=""><h2 id="how-h">Cómo funciona</h2><ol class="steps">'+
    '<li><span><b>Elige un regalo.</b> Puedes comprarlo completo o cooperar para uno grande con la cantidad que quieras.</span></li>'+
    '<li><span><b>Cómpralo o transfiere.</b> Compra en la tienda del enlace, o transfiere tu aportación a la cuenta de los anfitriones.</span></li>'+
    '<li><span><b>Avisa por WhatsApp.</b> '+(coordOn()?'Si compras un regalo, el aviso le llega a '+esc(notifyName())+' para mantener la sorpresa. Si transfieres, el aviso les llega directo a '+esc(state.event.host||'los papás')+'.':'Así se aparta tu regalo para que nadie lo repita.')+'</span></li>'+
    '</ol><p class="note deal">🏷️ <b>Los precios son de referencia.</b> Mostramos el precio regular de cada tienda, pero muchas tienen promociones: al comprar es probable que te salga más barato.</p>'+
    '<p class="note secret">🤫 <b>Es sorpresa.</b> En esta página nunca aparece quién regaló qué: en el baby shower los papás intentarán adivinarlo.</p><p class="small muted">Si un regalo para cooperar no junta el monto completo antes del evento, lo reunido se entrega a los anfitriones como regalo en efectivo.</p></section>';
}

function footer(){
  var e=state.event;
  return '<footer class="foot"><div class="wrap"><img class="huevo" src="'+ART.huevo+'" alt="">'+
    '<p class="con">Con mucho amor,</p>'+(e.host?'<p class="firmas">'+esc(e.host)+'</p>':'')+
    (e.baby?'<p class="sello">'+esc(e.baby.toUpperCase())+'</p>':'')+
    '<div class="credito"><p>Mesa de regalos creada por <a href="https://www.instagram.com/apartalafecha.mx/" target="_blank" rel="noopener">apartalafecha.mx</a></p>'+
    '<a class="ig" href="https://www.instagram.com/apartalafecha.mx/" target="_blank" rel="noopener" aria-label="Instagram de Aparta la Fecha">'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>'+
    (ui.canWrite?'':'<button class="acceso" data-act="login">Acceso anfitriones</button>')+'</div>'+
    '</div></footer>';
}
function helpFab(){
  var e=state.event,baby=e.babyShort||e.baby||'';
  var href=waTo('¡Hola'+(e.host?' '+e.host:'')+'! 👋 Tengo una duda sobre la mesa de regalos'+(baby?' de '+baby:'')+'.');
  if(!href)return '';
  return '<a class="fab" target="_blank" rel="noopener" href="'+esc(href)+'" aria-label="¿Dudas? Escríbeles por WhatsApp a '+esc(e.host||'los anfitriones')+'">'+ICON.wa+'<span>¿Dudas?</span></a>';
}

/* ---------- Modales ---------- */
function openModal(html,ctx){
  ui.modal=ctx||{};var m=$('#modal');
  m.innerHTML='<div class="sheet" role="dialog" aria-modal="true">'+html+'</div>';m.hidden=false;
  var f=m.querySelector('input,button,a');if(f)try{f.focus({preventScroll:true})}catch(e){}
  updateWA();
}
function closeModal(){var m=$('#modal');if(!m)return;m.hidden=true;m.innerHTML='';ui.modal=null;ui.pending=null}

function bankBox(){
  var b=state.bank;
  if(!b.clabe&&!b.card)return '<p class="note warn">Los anfitriones todavía no agregan sus datos para transferencia. Escríbeles por WhatsApp para pedirlos.</p>';
  function row(label,val,copy){if(!val)return '';var id='cp'+uid();return '<div class="r"><span>'+label+'</span><div><code id="'+id+'">'+esc(val)+'</code>'+(copy?'<button class="mini" data-act="copy" data-t="'+id+'">Copiar</button>':'')+'</div></div>'}
  return '<div class="bank">'+row('Titular',b.holder)+row('Banco',b.bank)+row('CLABE',b.clabe,true)+row('Tarjeta',b.card,true)+row('Concepto',b.concept,false)+'</div>';
}

function giveModal(id){
  var writer=ui.canWrite&&!ui.preview;
  if(id==='fund'||gift(id).mode==='coop'){
    var g=id==='fund'?null:gift(id),left=g?Math.max(0,g.price-raised(g)):0;
    var chips=[300,500,1000];if(left>0&&chips.indexOf(left)<0)chips.push(left);
    chips=chips.filter(function(v){return !g||v<=left});
    var html='<h2>'+(g?'Cooperar para '+esc(g.name):'Aportación libre')+'</h2>'+
      (g?'<p class="muted num">Van '+money(raised(g))+' de '+money(g.price)+' · faltan <b>'+money(left)+'</b></p>':'')+
      nameField('transfer')+
      '<div class="field"><span class="legend" id="amt-l">¿Cuánto quieres aportar?</span><div class="chips" role="group" aria-labelledby="amt-l">'+chips.map(function(v){return '<button type="button" data-act="chip" data-v="'+v+'" aria-pressed="false">'+(g&&v===left?'Lo que falta · ':'')+money(v)+'</button>'}).join('')+'</div>'+
      '<input id="m-amt" type="number" inputmode="numeric" min="1" step="1" placeholder="Otra cantidad en pesos" aria-label="Cantidad en pesos"></div>'+
      '<span class="legend">Transfiere a esta cuenta</span>'+bankBox()+
      '<ol class="steps"><li><span>Haz la transferencia desde tu banco con la cantidad que elegiste.</span></li><li><span>Avisa por WhatsApp para que sumen tu aportación a la barra de avance. En la página aparece sin tu nombre.</span></li></ol>'+
      (g?'<p class="note">Si al final no se junta el total, tu aportación se entrega a los anfitriones como regalo en efectivo.</p>':'')+
      '<p class="err" id="m-err" hidden></p>'+
      '<div class="sheet-actions">'+waButton('transfer')+(writer?'<button class="btn primary" data-act="quick-reg">Registrar aportación</button>':'')+'<button class="btn" data-act="close">Cerrar</button></div>';
    if(g&&raised(g)<=0)html=html.replace('</h2>','</h2><p class="note">¿Prefieres regalarlo tú completo? <button type="button" class="linkbtn" data-act="give-whole" data-id="'+esc(g.id)+'">Cómpralo directo en la tienda</button></p>');
    openModal(html,{type:'coop',gid:id});
  }else{
    var gg=gift(id),url=safeUrl(gg.url),lf=leftOf(gg);ui.pcs=1;
    var html2='<h2>'+esc(gg.name)+'</h2><p class="muted num">'+money(gg.price)+((gg.qty||1)>1?' c/u':'')+(gg.store?' · '+esc(gg.store):'')+'</p>'+sizeNote(gg)+
      (lf>1?'<div class="field"><span class="legend" id="pcs-l">¿Cuántas piezas vas a regalar?</span><div class="stepper" role="group" aria-labelledby="pcs-l">'+
        '<button type="button" data-act="pcs" data-d="-1" aria-label="Una pieza menos" disabled>−</button><output id="m-pcs" aria-live="polite">1</output><button type="button" data-act="pcs" data-d="1" aria-label="Una pieza más">+</button></div>'+
        '<span class="hint">Faltan '+lf+' de '+(gg.qty||1)+'. Puedes regalar una o varias.</span></div>':'')+
      nameField()+
      '<ol class="steps">'+buyStep(gg)+'<li><span>Avisa por WhatsApp para que lo aparten y nadie lo repita.</span></li></ol>'+
      '<p class="err" id="m-err" hidden></p>'+
      '<div class="sheet-actions">'+(url?'<a class="btn" target="_blank" rel="noopener" href="'+esc(url)+'">Comprar en '+esc(gg.store||'la tienda')+' ↗</a>':'')+waButton()+
      (writer?'<button class="btn primary" data-act="quick-reg" id="m-reg">Registrar como regalado</button>':'')+'<button class="btn" data-act="close">Cerrar</button></div>';
    openModal(html2,{type:'unico',gid:id,max:lf});
  }
}
function buyStep(g){
  var amt=money(g.price)+((g.qty||1)>1?' por pieza':'');
  return '<li><div>Cómpralo en '+esc(g.store||'la tienda')+'. <b>¿Prefieres no ir a la tienda?</b> Transfiere el monto ('+amt+') a la cuenta de los papás y ellos se encargan de comprarlo.'+
    '<details class="tx"><summary>Ver datos para transferir</summary>'+bankBox()+'</details></div></li>';
}
function sizeNote(g){return g.size?'<p class="note size-note">👶 Cómpralo en: <b>'+esc(g.size)+'</b></p>':''}
function giveWhole(id){
  var gw=gift(id),url=safeUrl(gw.url),writer=ui.canWrite&&!ui.preview;
  var html='<h2>Regalar completo: '+esc(gw.name)+'</h2><p class="muted num">'+money(gw.price)+(gw.store?' · '+esc(gw.store):'')+'</p>'+sizeNote(gw)+
    nameField()+
    '<ol class="steps">'+buyStep(gw)+'<li><span>Avisa por WhatsApp para que lo marquen como regalado y ya nadie coopere para él.</span></li></ol>'+
    '<p class="err" id="m-err" hidden></p>'+
    '<div class="sheet-actions">'+(url?'<a class="btn" target="_blank" rel="noopener" href="'+esc(url)+'">Comprar en '+esc(gw.store||'la tienda')+' ↗</a>':'')+waButton()+
    (writer?'<button class="btn primary" data-act="quick-reg">Registrar como regalado completo</button>':'')+
    '<button class="btn" data-act="give" data-id="'+esc(gw.id)+'">Mejor coopero con una parte</button><button class="btn" data-act="close">Cerrar</button></div>';
  openModal(html,{type:'whole',gid:id});
}
function nameField(kind){
  if(kind==='transfer'){
    var pp=esc(state.event.host||'los papás');
    return '<div class="field"><label for="m-name">Tu nombre (opcional)</label><input id="m-name" autocomplete="name" placeholder="Para que '+pp+' sepan de quién es">'+
      '<span class="hint">El aviso de tu transferencia les llega directo a '+pp+'. En la página tu aportación aparece sin nombre.</span></div>';
  }
  if(!coordOn())return '<p class="note secret">🤫 Es sorpresa: tu nombre no aparece en la página. Los papás intentarán adivinar quién regaló qué.</p>';
  var n=esc(notifyName());
  return '<div class="field"><label for="m-name">Tu nombre (opcional)</label><input id="m-name" autocomplete="name" placeholder="Solo lo sabrá '+n+'">'+
    '<span class="hint">🤫 Es sorpresa: el aviso le llega a '+n+', no a los papás, y tu nombre no aparece en la página.</span></div>';
}
function waButton(kind){
  if(kind==='transfer'){
    if(!waPhone())return '<p class="note warn">Los anfitriones aún no agregan su WhatsApp.</p>';
    return '<a class="btn wa" id="m-wa" target="_blank" rel="noopener">'+ICON.wa+'Avisar a '+esc(state.event.host||'los papás')+'</a>';
  }
  if(!notifyPhone())return '<p class="note warn">Los anfitriones aún no agregan un WhatsApp para avisos.</p>';
  return '<a class="btn wa" id="m-wa" target="_blank" rel="noopener">'+ICON.wa+(coordOn()?'Avisar a '+esc(notifyName()):'Avisar por WhatsApp')+'</a>';
}
function updateWA(){
  var m=ui.modal,a=$('#m-wa');if(!m||!a)return;
  var e=state.event,tr=m.type==='coop',co=coordOn()&&!tr,nm=(co||tr)?(($('#m-name')||{}).value||'').trim():'',pcs=ui.pcs||1;
  var g=m.gid&&m.gid!=='fund'?gift(m.gid):null,item=g?'«'+g.name+'»'+(g.size?' ('+g.size+')':''):'';
  var baby=e.babyShort||e.baby||'la bebé',papas=e.host||'los papás';
  var to=tr?(e.host||''):notifyName();
  var hi='¡Hola'+(to?' '+to:'')+'! 👋'+(nm?' Soy '+nm+'.':'');
  var hope=co?'¡Espero que a '+papas+' les guste! 💕':'¡Espero que les guste! 💕';
  var secret=co?'\n\n🤫 Es sorpresa: por favor no les digas que fui yo.':'';
  var text;
  if(m.type==='whole'){
    text=hi+'\n\nLe voy a regalar '+item+' a '+baby+' 🎀 Lo compro yo completo. '+hope+'\n\n¿Me lo apartas en la mesa de regalos para que ya nadie coopere para él?'+secret;
  }else if(m.type==='coop'){
    var amt=+(($('#m-amt')||{}).value||0),how=amt>0?'Les transferí '+money(amt):'Les hice una transferencia';
    text=g?hi+'\n\n'+how+' para cooperar con '+item+', el regalo para '+baby+' 🎀 ¡Espero que les guste! 💕\n\n¿Me ayudan a sumarlo a la barra de avance?'
          :hi+'\n\n'+how+' como aportación libre para '+baby+' 🎀 ¡Espero que les sirva mucho! 💕';
  }else{
    text=hi+'\n\nLe voy a regalar '+(pcs>1?pcs+' piezas de ':'')+item+' a '+baby+' 🎀 '+hope+'\n\n¿'+(pcs>1?'Me las apartas en la mesa de regalos para que nadie las repita?':'Me lo apartas en la mesa de regalos para que nadie lo repita?')+secret;
  }
  a.href=tr?waTo(text):waNotify(text);
}

function giftForm(g){
  var isNew=!g;g=g||{mode:'unico',qty:1,url:'',name:'',store:'',price:''};ui.pendingImg=g.img||'';
  return '<h2>'+(isNew?'Agregar regalo':'Editar regalo')+'</h2><form class="form" data-form="gift" data-id="'+esc(g.id||'')+'" novalidate>'+
    '<div class="field"><label for="f-url">Enlace de la tienda</label><input id="f-url" type="text" inputmode="url" autocomplete="off" placeholder="Pega el link o lo que copiaste de la tienda" value="'+esc(g.url)+'">'+
      '<span class="hint">Pega el link, o el texto del botón «Compartir» de la app de la tienda. El nombre y la tienda se llenan solos, y el precio también si viene en el texto.</span><span class="auto-note" id="f-auto" hidden></span></div>'+
    '<div class="field"><label for="f-name">Nombre del regalo</label><input id="f-name" required value="'+esc(g.name)+'" data-auto="'+(g.name?'0':'1')+'" placeholder="Ej. Silla para comer"></div>'+
    '<div class="two"><div class="field"><label for="f-store">Tienda</label><input id="f-store" value="'+esc(g.store)+'" data-auto="'+(g.store?'0':'1')+'"></div>'+
    '<div class="field"><label for="f-price">Precio (MXN)</label><input id="f-price" type="number" inputmode="numeric" min="1" step="1" value="'+esc(g.price)+'" data-auto="'+(g.price?'0':'1')+'"></div></div>'+
    '<div class="field"><span class="legend">Tipo de regalo</span><div class="seg">'+
      '<label><input type="radio" name="f-mode" id="f-mode-u" value="unico"'+(g.mode!=='coop'?' checked':'')+'>Lo regala una persona<span>Alguien lo compra completo</span></label>'+
      '<label><input type="radio" name="f-mode" id="f-mode-c" value="coop"'+(g.mode==='coop'?' checked':'')+'>Para cooperar<span>Varias personas aportan hasta juntar el total, o alguien lo regala completo</span></label></div></div>'+
    '<div class="field"><label for="f-size">Talla, color o diseño (opcional)</label><input id="f-size" value="'+esc(g.size||'')+'" placeholder="Ej. Talla 3 a 6 meses"><span class="hint">Así los invitados compran la talla correcta.</span></div>'+
    '<label class="check"><input type="checkbox" id="f-ess"'+(g.essential?' checked':'')+'><span>★ Marcar como esencial<small>Aparece al principio de la lista con la etiqueta «Esencial».</small></span></label>'+
    '<div class="field" id="f-qty-wrap"'+(g.mode==='coop'?' hidden':'')+'><label for="f-qty">¿Cuántos quieren?</label><input id="f-qty" type="number" inputmode="numeric" min="1" step="1" value="'+esc(g.qty||1)+'"></div>'+
    '<div class="field"><span class="legend">Foto</span><div class="imgpick" id="f-drop"><div class="thumb" id="f-thumb">'+(ui.pendingImg?'<img src="'+esc(ui.pendingImg)+'" alt="">':'Sin foto')+'</div>'+
      '<div style="display:grid;gap:6px;min-width:0;flex:1"><div class="paste" id="f-paste" contenteditable="true" role="textbox" aria-label="Pegar foto del regalo" inputmode="none"></div>'+
      '<span class="hint">En la tienda, mantén presionada la foto y elige «Copiar»; luego toca el recuadro y elige «Pegar». En computadora también puedes arrastrarla o usar Ctrl+V.</span>'+
      '<input id="f-img" type="file" accept="image/*" aria-label="O sube la foto desde tu galería">'+
      '<button type="button" class="mini" data-act="clear-img"'+(ui.pendingImg?'':' hidden')+' id="f-clear">Quitar foto</button></div></div></div>'+
    '<p class="err" id="f-err" hidden></p>'+
    '<div class="sheet-actions"><button class="btn primary" type="submit">'+(isNew?'Agregar a la mesa':'Guardar cambios')+'</button><button class="btn" type="button" data-act="close">Cancelar</button></div></form>';
}

function eventForm(){
  var e=state.event,t=state.theme||'rosa',gd=e.gender||'';
  function f(id,label,val,extra,hint){return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" value="'+esc(val||'')+'" '+(extra||'')+'>'+(hint?'<span class="hint">'+hint+'</span>':'')+'</div>'}
  function g(v,l){return '<label><input type="radio" name="e-gender" value="'+v+'"'+(gd===v?' checked':'')+'>'+l+'</label>'}
  return '<h2>Perfil y evento</h2><form class="form" data-form="event" novalidate>'+
    '<div class="two">'+f('e-kind','Tipo de evento',e.kind,'placeholder="Baby Shower de"')+f('e-baby','Nombre de la bebé',e.baby,'placeholder="Ej. Emma"')+'</div>'+
    f('e-babyshort','Cómo le dicen (para los mensajes)',e.babyShort,'placeholder="Ej. Evangeline"','Así aparece en el WhatsApp: «Le voy a regalar … a Evangeline».')+
    '<div class="two">'+f('e-emoji','Emoji',e.emoji,'maxlength="8" placeholder="🍼"')+'<div class="field"><span class="legend">Es</span><div class="seg seg3">'+g('nina','👧 Niña')+g('nino','👦 Niño')+g('sorpresa','🎈 Sorpresa')+'</div></div></div>'+
    f('e-honoree','Frase corta (opcional)',e.honoree,'placeholder="Ej. ¡Ya casi llego!"')+
    '<div class="field"><label for="e-message">Mensaje para los invitados</label><textarea id="e-message" rows="3">'+esc(e.message||'')+'</textarea></div>'+
    '<div class="two">'+f('e-date','Fecha',e.date,'type="date"')+f('e-time','Hora',e.time,'type="time"')+'</div>'+
    f('e-place','Nombre del lugar',e.place,'placeholder="Ej. Salón de Fiestas Casa Ángel"')+
    f('e-address','Dirección',e.address,'placeholder="Calle, número, colonia, alcaldía"')+
    f('e-maps','Enlace de Google Maps',e.mapsUrl,'type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…"','En Google Maps abre el lugar, toca «Compartir» y pega aquí el enlace. Así el botón «Cómo llegar» abre exactamente ese lugar.')+
    '<div class="two">'+f('e-host','Sus nombres (papás)',e.host,'placeholder="Ej. Gustavo y Brenda"')+f('e-wa','Su WhatsApp',e.whatsapp,'type="tel" inputmode="tel" placeholder="55 1234 5678"','10 dígitos. Para dudas de los invitados.')+'</div>'+
    '<div class="field"><span class="legend">🤫 Quién recibe los avisos de regalos</span><span class="hint">Para la dinámica de adivinar, elijan a alguien de confianza (no ustedes). Esa persona sabrá quién regaló qué y les dirá qué marcar como apartado, sin nombres. Si lo dejan vacío, los avisos les llegan a ustedes.</span></div>'+
    '<div class="two">'+f('e-cname','Nombre',e.coordName,'placeholder="Ej. Tía Lupita"')+f('e-cwa','WhatsApp',e.coordWa,'type="tel" inputmode="tel" placeholder="55 1234 5678"')+'</div>'+
    f('e-share','Enlace de esta página',e.shareUrl||pageUrl(),'type="url" inputmode="url"','Es el enlace que se manda por WhatsApp.')+
    '<div class="field"><span class="legend">Color</span><div class="palettes">'+PALETTES.map(function(p){return '<label><input type="radio" name="e-pal" value="'+p[0]+'"'+(t===p[0]?' checked':'')+'><i style="background:'+p[2]+'"></i>'+p[1]+'</label>'}).join('')+'</div></div>'+
    ((safeImg(e.cover)||safeImg(e.avatar))?'<div class="row">'+(safeImg(e.cover)?'<label class="mini"><input type="checkbox" id="e-rmcover"> Quitar foto de portada</label>':'')+(safeImg(e.avatar)?'<label class="mini"><input type="checkbox" id="e-rmavatar"> Quitar foto de perfil</label>':'')+'</div>':'')+
    '<p class="err" id="f-err" hidden></p>'+
    '<div class="sheet-actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="close">Cancelar</button></div></form>';
}

function bankForm(){
  var b=state.bank;
  function f(id,label,val,extra,hint){return '<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" value="'+esc(val||'')+'" '+(extra||'')+'>'+(hint?'<span class="hint">'+hint+'</span>':'')+'</div>'}
  return '<h2>Cuenta para transferencias</h2><p class="muted small">Estos datos los ve cualquier persona con el enlace. Las aportaciones llegan directo a esta cuenta; si una colecta no se completa, ese dinero ya está contigo.</p>'+
    '<form class="form" data-form="bank" novalidate>'+
    f('b-holder','Titular',b.holder,'autocomplete="off"')+f('b-bank','Banco',b.bank,'placeholder="Ej. BBVA"')+
    f('b-clabe','CLABE interbancaria',b.clabe,'inputmode="numeric" autocomplete="off"','18 dígitos.')+
    f('b-card','Número de tarjeta (opcional)',b.card,'inputmode="numeric" autocomplete="off"','Útil para depósitos en OXXO o transferencias rápidas.')+
    f('b-concept','Concepto sugerido',b.concept,'placeholder="Regalo"')+
    '<p class="err" id="f-err" hidden></p>'+
    '<div class="sheet-actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="close">Cancelar</button></div></form>';
}

function registerForm(id){
  var g=id==='fund'?null:gift(id),coop=!g||g.mode==='coop';
  var lf=g&&!coop?leftOf(g):0;
  return '<h2>'+(coop?'Registrar aportación':'Marcar como regalado')+'</h2><p class="muted">'+(g?esc(g.name):'Aportación libre')+'</p>'+
    '<form class="form" data-form="register" data-id="'+esc(id)+'" novalidate>'+
    (coop?'<div class="field"><label for="r-amt">Monto recibido (MXN)</label><input id="r-amt" type="number" inputmode="numeric" min="1" step="1" required></div>':
      (lf>1?'<div class="field"><label for="r-pcs">¿Cuántas piezas?</label><input id="r-pcs" type="number" inputmode="numeric" min="1" max="'+lf+'" step="1" value="1"><span class="hint">Faltan '+lf+' de '+(g.qty||1)+'.</span></div>':''))+
    '<p class="note secret">🤫 Se registra sin nombre para no arruinar la sorpresa.</p>'+
    '<p class="err" id="f-err" hidden></p>'+
    '<div class="sheet-actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-act="close">Cancelar</button></div></form>';
}

function confirmModal(title,text,label,fn){
  ui.pending=fn;
  openModal('<h2>'+title+'</h2><p>'+text+'</p><div class="sheet-actions"><button class="btn primary" data-act="do-confirm">'+label+'</button><button class="btn" data-act="close">Cancelar</button></div>',{type:'confirm'});
}

/* ---------- Guardar en la base de datos ---------- */
function toast(msg){var t=$('#toast');if(!t)return;t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(function(){t.hidden=true},3800)}
function showErr(id,msg){var e=document.getElementById(id);if(e){e.textContent=msg;e.hidden=false}}

function cacheSave(){try{localStorage.setItem(CACHE_KEY,JSON.stringify({state:state,version:ui.version,t:Date.now()}))}catch(e){}}
function cacheLoad(){try{var c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return c&&c.state?c:null}catch(e){return null}}

function fetchMesa(){
  if(!sb)return Promise.reject(new Error('sin-config'));
  return sb.from('mesas').select('state,version').eq('slug',SLUG).maybeSingle().then(function(r){
    if(r.error)throw r.error;
    return r.data;
  });
}

/* Guarda solo si nadie más guardó antes (control por versión). */
function save(mut,msg,after){
  if(ui.busy||!ui.canWrite||!sb)return Promise.resolve(false);
  ui.busy=true;
  var base=ui.version,next=clean(JSON.parse(JSON.stringify(state)));mut(next);clean(next);
  var btns=document.querySelectorAll('.sheet button,.sheet a');btns.forEach(function(b){b.setAttribute('aria-disabled','true')});
  return sb.from('mesas').update({state:next,version:base+1}).eq('slug',SLUG).eq('version',base).select('version').then(function(r){
    if(r.error)throw r.error;
    if(r.data&&r.data.length){
      state=next;ui.version=r.data[0].version;cacheSave();closeModal();render();toast(msg);
      if(after)try{after()}catch(e){}
      return true;
    }
    /* No se actualizó: o alguien guardó antes, o la sesión ya no tiene permiso. */
    return fetchMesa().then(function(row){
      if(row&&row.version!==base){
        state=clean(row.state);ui.version=row.version;cacheSave();closeModal();render();
        toast('Alguien más guardó cambios hace un momento. Ya ves la versión más reciente; vuelve a intentarlo.');
      }else{
        ui.canWrite=false;closeModal();render();
        toast('Tu sesión terminó. Vuelve a entrar en «Acceso anfitriones».');
      }
      return false;
    });
  }).catch(function(err){
    var st=err&&(err.status||err.code);
    if(st===401||st===403||st==='42501'||st==='PGRST301'){ui.canWrite=false;closeModal();render();toast('Tu sesión terminó. Vuelve a entrar en «Acceso anfitriones».')}
    else toast('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    return false;
  }).then(function(ok){ui.busy=false;btns.forEach(function(b){b.removeAttribute('aria-disabled')});return ok});
}

/* ---------- Fotos en el almacenamiento ---------- */
function dataUrlToBlob(d){
  var p=d.split(','),mime=(p[0].match(/data:([^;]+)/)||[])[1]||'image/jpeg',bin=atob(p[1]),n=bin.length,u=new Uint8Array(n);
  for(var i=0;i<n;i++)u[i]=bin.charCodeAt(i);
  return new Blob([u],{type:mime});
}
function uploadImg(dataUrl,prefix){
  if(!/^data:image\//.test(dataUrl))return Promise.resolve(dataUrl);
  var b=dataUrlToBlob(dataUrl),ext=b.type==='image/png'?'png':b.type==='image/webp'?'webp':'jpg';
  var path=SLUG+'/'+(prefix||'foto')+'-'+Date.now().toString(36)+uid()+'.'+ext;
  return sb.storage.from('mesas').upload(path,b,{contentType:b.type,cacheControl:'31536000',upsert:false}).then(function(r){
    if(r.error){var e=new Error('upload');e.upload=true;throw e}
    return sb.storage.from('mesas').getPublicUrl(path).data.publicUrl;
  },function(){var e=new Error('upload');e.upload=true;throw e});
}
/* Borra del almacenamiento una foto que ya no se usa (si es nuestra). */
function dropImg(url){
  try{
    var pre=SB_URL+'/storage/v1/object/public/mesas/';
    if(!sb||!url||url.indexOf(pre)!==0)return;
    var path=decodeURIComponent(url.slice(pre.length).split('?')[0]);
    if(path.indexOf(SLUG+'/')!==0)return;
    var used=JSON.stringify(state).indexOf(url)>-1;if(used)return;
    sb.storage.from('mesas').remove([path]).then(function(){},function(){});
  }catch(e){}
}

/* ---------- Acceso de anfitriones ---------- */
function loginForm(){
  return '<h2>Acceso anfitriones</h2><p class="muted small">Entra con el correo y la contraseña de tu mesa de regalos.</p>'+
    '<form class="form" data-form="login" novalidate>'+
    '<div class="field"><label for="l-email">Correo</label><input id="l-email" type="email" autocomplete="username" inputmode="email" required></div>'+
    '<div class="field"><label for="l-pass">Contraseña</label><input id="l-pass" type="password" autocomplete="current-password" required></div>'+
    '<p class="err" id="f-err" hidden></p><p class="note" id="f-ok" hidden></p>'+
    '<div class="sheet-actions"><button class="btn primary" type="submit">Entrar</button>'+
    '<button class="btn" type="button" data-act="forgot">Olvidé mi contraseña</button>'+
    '<button class="btn" type="button" data-act="close">Cancelar</button></div></form>';
}
function newPassForm(){
  return '<h2>Crea tu contraseña nueva</h2>'+
    '<form class="form" data-form="newpass" novalidate>'+
    '<div class="field"><label for="p-1">Contraseña nueva</label><input id="p-1" type="password" autocomplete="new-password" minlength="8" required><span class="hint">Mínimo 8 caracteres.</span></div>'+
    '<div class="field"><label for="p-2">Repítela</label><input id="p-2" type="password" autocomplete="new-password" minlength="8" required></div>'+
    '<p class="err" id="f-err" hidden></p>'+
    '<div class="sheet-actions"><button class="btn primary" type="submit">Guardar contraseña</button><button class="btn" type="button" data-act="close">Cancelar</button></div></form>';
}
function checkWriter(session){
  if(!sb||!session){ui.canWrite=false;render();return Promise.resolve(false)}
  return sb.rpc('puedo_editar',{p_slug:SLUG}).then(function(r){
    ui.canWrite=!r.error&&r.data===true;render();return ui.canWrite;
  },function(){ui.canWrite=false;render();return false});
}
function doLogin(email,pass){
  if(!sb)return showErr('f-err','No hay conexión con la mesa. Inténtalo más tarde.');
  if(!email||!pass)return showErr('f-err','Escribe tu correo y tu contraseña.');
  var b=document.querySelector('form[data-form="login"] button[type="submit"]');if(b){b.disabled=true;b.textContent='Entrando…'}
  sb.auth.signInWithPassword({email:email,password:pass}).then(function(r){
    if(r.error){showErr('f-err',/invalid/i.test(r.error.message||'')?'El correo o la contraseña no son correctos.':'No se pudo entrar. Inténtalo de nuevo en un momento.');return}
    return checkWriter(r.data.session).then(function(ok){
      if(ok){closeModal();render();toast('¡Listo! Ya pueden editar su mesa.')}
      else{sb.auth.signOut();showErr('f-err','Esta cuenta no administra esta mesa de regalos.')}
    });
  },function(){showErr('f-err','No se pudo entrar. Revisa tu conexión.')}).then(function(){if(b&&document.body.contains(b)){b.disabled=false;b.textContent='Entrar'}});
}
function forgot(){
  var email=(($('#l-email')||{}).value||'').trim();
  if(!email)return showErr('f-err','Escribe tu correo arriba y vuelve a tocar «Olvidé mi contraseña».');
  sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}).then(function(r){
    var er=$('#f-err');if(er)er.hidden=true;
    if(r.error&&/rate|limit|seconds/i.test(r.error.message||''))return showErr('f-err','Ya enviamos un correo hace poco. Espera unos minutos y vuelve a intentarlo.');
    var ok=$('#f-ok');if(ok){ok.textContent='Si ese correo tiene una mesa, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.';ok.hidden=false}
  },function(){showErr('f-err','No se pudo enviar el correo. Revisa tu conexión.')});
}
function doNewPass(a,b){
  if(a.length<8)return showErr('f-err','La contraseña debe tener al menos 8 caracteres.');
  if(a!==b)return showErr('f-err','Las contraseñas no coinciden.');
  sb.auth.updateUser({password:a}).then(function(r){
    if(r.error)return showErr('f-err','No se pudo guardar. Abre de nuevo el enlace del correo.');
    closeModal();toast('Contraseña guardada.');
    sb.auth.getSession().then(function(s){checkWriter(s.data.session)});
  });
}
function logout(){
  ui.preview=false;
  (sb?sb.auth.signOut():Promise.resolve()).then(function(){},function(){}).then(function(){ui.canWrite=false;render();window.scrollTo(0,0);toast('Sesión cerrada.')});
}

/* ---------- Eventos ---------- */
document.addEventListener('click',function(ev){
  var el=ev.target.closest('[data-act]');
  if(!el){if(ev.target.id==='modal')closeModal();return}
  if(el.getAttribute('aria-disabled')==='true'&&el.tagName!=='A'){ev.preventDefault();return}
  var act=el.getAttribute('data-act'),id=el.getAttribute('data-id');
  switch(act){
    case 'close':closeModal();break;
    case 'filter':ui.filter=el.getAttribute('data-f');render();break;
    case 'preview':ui.preview=!ui.preview;render();window.scrollTo(0,0);break;
    case 'give':giveModal(id);break;
    case 'chip':
      document.querySelectorAll('.chips button').forEach(function(b){b.setAttribute('aria-pressed',String(b===el))});
      var a=$('#m-amt');if(a)a.value=el.getAttribute('data-v');updateWA();break;
    case 'copy':copyText(document.getElementById(el.getAttribute('data-t')));break;
    case 'copy-link':
      var span=document.createElement('code');span.textContent=state.event.shareUrl||'';copyText(span,true);break;
    case 'pcs':
      var mm=ui.modal,mx=Math.max(1,(mm&&mm.max)||1);
      ui.pcs=Math.min(mx,Math.max(1,(ui.pcs||1)+(+el.getAttribute('data-d'))));
      var o=$('#m-pcs');if(o)o.textContent=ui.pcs;
      document.querySelectorAll('[data-act="pcs"]').forEach(function(b){var d=+b.getAttribute('data-d');b.disabled=d<0?ui.pcs<=1:ui.pcs>=mx});
      var rb=$('#m-reg');if(rb)rb.textContent=ui.pcs>1?'Registrar '+ui.pcs+' piezas como regaladas':'Registrar como regalado';
      updateWA();break;
    case 'give-whole':giveWhole(id);break;
    case 'mark-whole':
      var gm=gift(id);
      confirmModal('¿Lo regaló una sola persona?','«'+esc(gm.name)+'» se marcará como regalado completo y se cerrará la opción de cooperar. Se registra sin nombre.','Sí, marcar',function(){
        save(function(s){s.gifts.find(function(x){return x.id===id}).whole={date:today()}},'Marcado como regalado completo')});
      break;
    case 'del-whole':
      confirmModal('¿Quitar este registro?','El regalo vuelve a estar disponible para cooperar o regalarlo completo.','Quitar',function(){
        save(function(s){delete s.gifts.find(function(x){return x.id===id}).whole},'Registro quitado')});
      break;
    case 'quick-reg':
      var m=ui.modal;
      if(m.type==='whole'){
        save(function(s){s.gifts.find(function(x){return x.id===m.gid}).whole={date:today()}},'Marcado como regalado completo');
      }else if(m.type==='coop'){
        var amt=Math.round(+($('#m-amt').value||0));
        if(!(amt>0)){showErr('m-err','Elige o escribe un monto mayor a cero.');break}
        save(function(s){var entry={id:uid(),amount:amt,date:today()};if(m.gid==='fund')s.fund.push(entry);else s.gifts.find(function(x){return x.id===m.gid}).contributions.push(entry)},'Aportación de '+money(amt)+' registrada');
      }else{
        var qp=ui.pcs||1;
        save(function(s){var g=s.gifts.find(function(x){return x.id===m.gid});(g.givers=g.givers||[]).push({id:uid(),qty:qp,date:today()})},qp>1?qp+' piezas marcadas como regaladas':'Marcado como regalado');
      }
      break;
    case 'add-gift':openModal(giftForm(null),{type:'form'});break;
    case 'edit-gift':openModal(giftForm(gift(id)),{type:'form'});break;
    case 'edit-event':openModal(eventForm(),{type:'form'});break;
    case 'edit-bank':openModal(bankForm(),{type:'form'});break;
    case 'register':openModal(registerForm(id),{type:'form'});break;
    case 'clear-img':ui.pendingImg='';$('#f-thumb').innerHTML='Sin foto';el.hidden=true;var fi=$('#f-img');if(fi)fi.value='';break;
    case 'del-gift':
      var g=gift(id);
      confirmModal('¿Eliminar este regalo?','Se quitará «'+esc(g.name)+'» de la mesa'+((g.contributions||[]).length?', junto con el registro de sus '+plural(g.contributions.length,'aportación','aportaciones')+'. El dinero ya recibido no se ve afectado':'')+'.','Sí, eliminar',function(){
        var oldImg=g.img;save(function(s){s.gifts=s.gifts.filter(function(x){return x.id!==id})},'Regalo eliminado',function(){dropImg(oldImg)})});
      break;
    case 'close-coop':
      var gc=gift(id),rc=raised(gc);
      confirmModal('¿Cerrar la colecta?','Se juntaron <b>'+money(rc)+'</b> de '+money(gc.price)+' para «'+esc(gc.name)+'». Al cerrarla ya no se aceptan aportaciones y lo reunido queda como regalo en efectivo en tu cuenta.','Cerrar colecta',function(){
        save(function(s){s.gifts.find(function(x){return x.id===id}).status='fondo'},'Colecta cerrada: '+money(rc)+' en efectivo')});
      break;
    case 'ess':
      var ge=gift(id);if(!ge)break;var on=!ge.essential;
      save(function(s){var x=s.gifts.find(function(y){return y.id===id});if(!x)return;if(on)x.essential=true;else delete x.essential},on?'Marcado como esencial':'Ya no es esencial');break;
    case 'reopen':save(function(s){s.gifts.find(function(x){return x.id===id}).status='abierto'},'Colecta reabierta');break;
    case 'del-entry':
      var eid=el.getAttribute('data-e');
      confirmModal('¿Quitar este registro?','Se borrará de la lista y del avance. Úsalo solo si fue un error de captura.','Quitar',function(){
        save(function(s){
          if(id==='fund'){s.fund=s.fund.filter(function(c){return c.id!==eid});return}
          var gg=s.gifts.find(function(x){return x.id===id});
          gg.contributions=(gg.contributions||[]).filter(function(c){return c.id!==eid});
          gg.givers=(gg.givers||[]).filter(function(c){return c.id!==eid});
        },'Registro quitado')});
      break;
    case 'clear-examples':
      confirmModal('¿Quitar los ejemplos?','Se borran los regalos y aportaciones marcados como «Ejemplo». Lo que tú agregaste se queda.','Quitar ejemplos',function(){
        save(function(s){
          s.gifts=s.gifts.filter(function(g){return !g.example});
          s.gifts.forEach(function(g){g.contributions=(g.contributions||[]).filter(function(c){return !c.example});g.givers=(g.givers||[]).filter(function(c){return !c.example})});
          s.fund=s.fund.filter(function(c){return !c.example});
        },'Ejemplos eliminados')});
      break;
    case 'do-confirm':if(ui.pending)ui.pending();break;
    case 'retry':ui.loadError=false;ui.loading=true;render();boot();break;
    case 'login':openModal(loginForm(),{type:'form'});break;
    case 'forgot':forgot();break;
    case 'logout':logout();break;
  }
});

function copyText(node,silentNode){
  var txt=node?node.textContent:'';
  function fallback(){
    if(!silentNode&&node){try{var r=document.createRange();r.selectNodeContents(node);var sel=window.getSelection();sel.removeAllRanges();sel.addRange(r)}catch(e){}toast('Mantén presionado el texto seleccionado para copiarlo.')}
    else toast(txt);
  }
  try{navigator.clipboard.writeText(txt).then(function(){toast('Copiado')},fallback)}catch(e){fallback()}
}

document.addEventListener('input',function(ev){
  var t=ev.target;
  if(t.id==='m-name'||t.id==='m-amt'){
    if(t.id==='m-amt')document.querySelectorAll('.chips button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-v')===t.value))});
    var er=$('#m-err');if(er)er.hidden=true;updateWA();
  }
  if(t.id==='f-url')autofill(t);
  if(t.id==='f-store'||t.id==='f-name'||t.id==='f-price')t.setAttribute('data-auto','0');
  if(t.id==='f-paste')t.innerHTML='';
});

document.addEventListener('change',function(ev){
  var t=ev.target;
  if(t.name==='f-mode'){var w=$('#f-qty-wrap');if(w)w.hidden=t.value==='coop'}
  if(t.name==='e-pal'){$('#app').setAttribute('data-p',t.value)}
  if(t.id==='f-img'&&t.files&&t.files[0])setImg(t.files[0]);
  if((t.id==='in-cover'||t.id==='in-avatar')&&t.files&&t.files[0]){
    var isCover=t.id==='in-cover';toast('Preparando la foto…');
    var prev=state.event[isCover?'cover':'avatar'];
    resizeImage(t.files[0],isCover?1400:480,!isCover).then(function(url){return uploadImg(url,isCover?'portada':'perfil')}).then(function(url){
      save(function(s){s.event[isCover?'cover':'avatar']=url},isCover?'Foto de portada actualizada':'Foto de perfil actualizada',function(){dropImg(prev)});
    }).catch(function(err){toast(err&&err.upload?'No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.':'No se pudo leer esa imagen. Prueba con un JPG o PNG.')});
  }
});

/* Centra el producto: si la foto tiene fondo liso, recorta el espacio vacío y la acomoda en 4:3 con el mismo color de fondo. */
function fitProduct(dataUrl){
  return new Promise(function(res){
    var im=new Image();
    im.onload=function(){
      try{
        var w=im.width,h=im.height,c=document.createElement('canvas');c.width=w;c.height=h;
        var x=c.getContext('2d');x.drawImage(im,0,0);var d=x.getImageData(0,0,w,h).data;
        var k=Math.max(4,Math.floor(Math.min(w,h)/25)),cs=[];
        [[0,0],[w-k,0],[0,h-k],[w-k,h-k]].forEach(function(p){for(var j=0;j<k;j++)for(var i=0;i<k;i++){var o=((p[1]+j)*w+p[0]+i)*4;cs.push([d[o],d[o+1],d[o+2]])}});
        var bg=[0,1,2].map(function(ch){var v=cs.map(function(q){return q[ch]}).sort(function(a,b){return a-b});return v[v.length>>1]});
        var dist=function(o){return Math.max(Math.abs(d[o]-bg[0]),Math.abs(d[o+1]-bg[1]),Math.abs(d[o+2]-bg[2]))};
        var spread=cs.reduce(function(t,q){return t+Math.max(Math.abs(q[0]-bg[0]),Math.abs(q[1]-bg[1]),Math.abs(q[2]-bg[2]))},0)/cs.length;
        if(spread>14)return res(dataUrl);
        var rows=new Uint32Array(h),cols=new Uint32Array(w);
        for(var j=0;j<h;j++)for(var i=0;i<w;i++){if(dist((j*w+i)*4)>22){rows[j]++;cols[i]++}}
        var y0=-1,y1=-1,x0=-1,x1=-1;
        for(j=0;j<h;j++)if(rows[j]>w*0.01){if(y0<0)y0=j;y1=j}
        for(i=0;i<w;i++)if(cols[i]>h*0.01){if(x0<0)x0=i;x1=i}
        if(y0<0||x0<0||y1-y0<10||x1-x0<10)return res(dataUrl);
        var bw=x1-x0,bh=y1-y0,pad=Math.round(Math.max(bw,bh)*0.08),cw=bw+2*pad,ch=bh+2*pad;
        if(cw/ch<4/3)cw=Math.round(ch*4/3);else ch=Math.round(cw*3/4);
        var sc=Math.min(1,640/cw),o=document.createElement('canvas');o.width=Math.round(cw*sc);o.height=Math.round(ch*sc);
        var ox=o.getContext('2d');ox.fillStyle='rgb('+bg.join(',')+')';ox.fillRect(0,0,o.width,o.height);
        ox.drawImage(c,x0,y0,bw,bh,Math.round((cw-bw)/2*sc),Math.round((ch-bh)/2*sc),Math.round(bw*sc),Math.round(bh*sc));
        res(o.toDataURL('image/jpeg',0.8));
      }catch(e){res(dataUrl)}
    };
    im.onerror=function(){res(dataUrl)};im.src=dataUrl;
  });
}
function setImg(file){
  if(!file||!/^image\//.test(file.type||'image/'))return showErr('f-err','Ese archivo no es una imagen. Prueba con un JPG o PNG.');
  resizeImage(file).then(fitProduct).then(function(url){
    ui.pendingImg=url;var th=$('#f-thumb');if(th)th.innerHTML='<img src="'+url+'" alt="">';
    var c=$('#f-clear');if(c)c.hidden=false;var er=$('#f-err');if(er)er.hidden=true;
  }).catch(function(){showErr('f-err','No se pudo leer esa imagen. Prueba con un JPG o PNG.')});
}

/* Pegar o arrastrar la foto del producto */
document.addEventListener('paste',function(ev){
  if(!$('#f-thumb'))return;
  var items=(ev.clipboardData&&ev.clipboardData.items)||[];
  for(var i=0;i<items.length;i++){
    if(items[i].kind==='file'&&items[i].type.indexOf('image/')===0){var f=items[i].getAsFile();if(f){ev.preventDefault();setImg(f);return}}
  }
  if(ev.target&&ev.target.id==='f-paste'){ev.preventDefault();showErr('f-err','Lo que pegaste no es una imagen. En la tienda, mantén presionada la foto y elige «Copiar».')}
});
document.addEventListener('keydown',function(ev){
  if(ev.target&&ev.target.id==='f-paste'&&!(ev.ctrlKey||ev.metaKey)&&ev.key!=='Tab')ev.preventDefault();
});
document.addEventListener('dragover',function(ev){var d=ev.target.closest&&ev.target.closest('#f-drop');if(d){ev.preventDefault();d.classList.add('drag')}});
document.addEventListener('dragleave',function(ev){var d=ev.target.closest&&ev.target.closest('#f-drop');if(d)d.classList.remove('drag')});
document.addEventListener('drop',function(ev){
  var d=ev.target.closest&&ev.target.closest('#f-drop');if(!d)return;ev.preventDefault();d.classList.remove('drag');
  var f=ev.dataTransfer&&ev.dataTransfer.files&&ev.dataTransfer.files[0];
  if(f)setImg(f);else showErr('f-err','No se pudo tomar esa imagen. Guárdala primero en tu equipo y súbela.');
});

/* Llenado automático a partir del enlace o del texto compartido */
var SHORT={'a.co':'Amazon','amzn.to':'Amazon','amzn.eu':'Amazon','meli.la':'Mercado Libre','mercadolivre.com':'Mercado Libre'};
function slugName(u){
  try{
    var segs=new URL(u).pathname.split('/'),best='';
    segs.forEach(function(s){
      try{s=decodeURIComponent(s)}catch(e){}
      s=s.replace(/^MLM-?\d+-?/i,'').replace(/_JM$/i,'').replace(/\.html?$/i,'');
      var words=s.split(/[-_+]+/).filter(function(w){return /[a-záéíóúñü]{2,}/i.test(w)});
      if(words.length>=2&&s.length>best.length)best=s;
    });
    if(!best)return '';
    var t=best.split(/[-_+]+/).filter(function(w){return w&&!/^\d{5,}$/.test(w)&&!/^[A-Z0-9]{10}$/.test(w)}).join(' ').trim();
    return t.charAt(0).toUpperCase()+t.slice(1);
  }catch(e){return ''}
}
function parsePrice(text){
  var m=String(text).match(/(?:\$|MXN|MN)\s?(\d{1,3}(?:[,.]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
  if(!m)return 0;
  var s=m[1];if(/[.,]\d{1,2}$/.test(s))s=s.replace(/[.,]\d{1,2}$/,'');
  return parseInt(s.replace(/[.,]/g,''),10)||0;
}
function storeOf(u){try{var h=new URL(u).hostname.replace(/^www\./,'');return SHORT[h]||storeFromUrl(u)}catch(e){return ''}}
function autofill(input){
  var raw=input.value,m=raw.match(/https?:\/\/[^\s"'<>]+/i),url=m?m[0].replace(/[).,;]+$/,''):'';
  var filled=[];
  var rest=raw.replace(/https?:\/\/[^\s"'<>]+/ig,' ');
  if(url&&raw.trim()!==url){input.value=url}
  var name=rest.split(/\n/).map(function(l){return l.trim()}).filter(Boolean)[0]||'';
  name=name.replace(/^(mira|checa|échale un ojo a|echale un ojo a|te comparto|te recomiendo|encontré|encontre|check out|look at)[^:]*:\s*/i,'')
    .replace(/\s*[:|–—-]\s*(amazon|liverpool|mercado ?libre|walmart|el palacio de hierro|coppel|sears|costco|shein)\b.*$/i,'')
    .replace(/\s*(en|on)\s+(amazon|liverpool|mercado ?libre|walmart)\b.*$/i,'')
    .replace(/\$\s?[\d.,]+.*$/,'').replace(/^["“«]+|["”»]+$/g,'').trim();
  if(name.length<3)name='';
  if(!name&&url)name=slugName(url);
  var price=parsePrice(rest);
  var fn=$('#f-name'),fs=$('#f-store'),fp=$('#f-price');
  if(name&&fn&&(fn.getAttribute('data-auto')==='1'||!fn.value)){fn.value=name.slice(0,120);fn.setAttribute('data-auto','1');filled.push('nombre')}
  var st=url?storeOf(url):'';
  if(st&&fs&&(fs.getAttribute('data-auto')==='1'||!fs.value)){fs.value=st;fs.setAttribute('data-auto','1');filled.push('tienda')}
  if(price&&fp&&(fp.getAttribute('data-auto')==='1'||!fp.value)){fp.value=price;fp.setAttribute('data-auto','1');filled.push('precio')}
  var note=$('#f-auto');
  if(note){
    if(filled.length){note.textContent='Se llenó: '+filled.join(', ')+'.'+(filled.indexOf('precio')<0?' Escribe el precio como aparece en la tienda.':' Revisa que el precio sea el actual.');note.hidden=false}
    else note.hidden=true;
  }
}

document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&ui.modal)closeModal()});

function resizeImage(file,max,square){
  max=max||640;
  return new Promise(function(res,rej){
    var fr=new FileReader();
    fr.onload=function(){var im=new Image();im.onload=function(){
      var sx=0,sy=0,sw=im.width,sh=im.height;
      if(square){var m=Math.min(sw,sh);sx=(sw-m)/2;sy=(sh-m)/2;sw=sh=m}
      var sc=Math.min(1,max/Math.max(sw,sh)),w=Math.round(sw*sc),h=Math.round(sh*sc);
      var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,sx,sy,sw,sh,0,0,w,h);
      res(c.toDataURL('image/jpeg',0.8))};im.onerror=rej;im.src=fr.result};
    fr.onerror=rej;fr.readAsDataURL(file);
  });
}

document.addEventListener('submit',function(ev){
  var f=ev.target,kind=f.getAttribute('data-form');if(!kind)return;ev.preventDefault();
  function v(id){var e=document.getElementById(id);return e?String(e.value||'').trim():''}
  if(kind==='gift'){
    var id=f.getAttribute('data-id'),name=v('f-name'),price=Math.round(+v('f-price')),url=v('f-url');
    var mode=(f.querySelector('input[name="f-mode"]:checked')||{}).value||'unico',qty=Math.max(1,Math.round(+v('f-qty')||1));
    if(!name)return showErr('f-err','Escribe el nombre del regalo.');
    if(!(price>0))return showErr('f-err','Escribe el precio en pesos, sin centavos.');
    if(url&&!safeUrl(url))return showErr('f-err','El enlace debe empezar con https://');
    var data={name:name,size:v('f-size'),store:v('f-store')||storeFromUrl(url),url:url,price:price,mode:mode,qty:mode==='coop'?1:qty,img:''};
    var ess=!!(document.getElementById('f-ess')||{}).checked;if(ess)data.essential=true;
    var prevImg=id&&gift(id)?gift(id).img:'',pend=ui.pendingImg||'';
    var sub=f.querySelector('button[type="submit"]');if(sub){sub.disabled=true;sub.textContent=/^data:/.test(pend)?'Subiendo foto…':'Guardando…'}
    (/^data:/.test(pend)?uploadImg(pend,'regalo'):Promise.resolve(pend)).then(function(img){
      data.img=img;
      return save(function(s){
        if(id){var g=s.gifts.find(function(x){return x.id===id});Object.assign(g,data);if(!ess)delete g.essential;g.example=false;g.contributions=g.contributions||[];g.givers=g.givers||[]}
        else s.gifts.push(Object.assign({id:uid(),status:'abierto',contributions:[],givers:[]},data));
      },id?'Regalo actualizado':'Regalo agregado a la mesa',function(){if(prevImg&&prevImg!==img)dropImg(prevImg)});
    }).catch(function(){showErr('f-err','No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.')})
      .then(function(){if(sub&&document.body.contains(sub)){sub.disabled=false;sub.textContent=id?'Guardar cambios':'Agregar a la mesa'}});
  }
  if(kind==='event'){
    var kindTxt=v('e-kind'),baby=v('e-baby');
    if(!kindTxt&&!baby)return showErr('f-err','Escribe el nombre de la bebé o el tipo de evento.');
    var wa=v('e-wa').replace(/\D/g,'');if(wa&&wa.length<10)return showErr('f-err','El WhatsApp debe tener 10 dígitos.');
    var share=v('e-share');if(share&&!safeUrl(share))return showErr('f-err','El enlace debe empezar con https://');
    var cwa=v('e-cwa').replace(/\D/g,'');if(cwa&&cwa.length<10)return showErr('f-err','El WhatsApp de quien recibe los avisos debe tener 10 dígitos.');
    if(cwa&&!v('e-cname'))return showErr('f-err','Escribe el nombre de quien recibe los avisos.');
    var maps=(v('e-maps').match(/https?:\/\/\S+/)||[''])[0];
    var pal=(f.querySelector('input[name="e-pal"]:checked')||{}).value||'rosa';
    var gen=(f.querySelector('input[name="e-gender"]:checked')||{}).value||'';
    var rmC=($('#e-rmcover')||{}).checked,rmA=($('#e-rmavatar')||{}).checked,oldC=state.event.cover,oldA=state.event.avatar;
    save(function(s){
      var old=s.event;
      s.event=Object.assign({},old,{kind:kindTxt,baby:baby,title:(kindTxt+' '+baby).trim(),emoji:v('e-emoji'),gender:gen,honoree:v('e-honoree'),message:v('e-message'),
        date:v('e-date'),time:v('e-time'),place:v('e-place'),address:v('e-address'),mapsUrl:maps,host:v('e-host'),whatsapp:v('e-wa'),shareUrl:share,
        coordName:v('e-cname'),coordWa:v('e-cwa'),babyShort:v('e-babyshort'),
        cover:rmC?'':(old.cover||''),avatar:rmA?'':(old.avatar||'')});
      s.theme=pal;
    },'Perfil guardado',function(){if(rmC)dropImg(oldC);if(rmA)dropImg(oldA)});
  }
  if(kind==='bank'){
    var clabe=v('b-clabe').replace(/\s/g,''),card=v('b-card').replace(/\s/g,'');
    if(clabe&&!/^\d{18}$/.test(clabe))return showErr('f-err','La CLABE debe tener 18 dígitos.');
    if(card&&!/^\d{15,16}$/.test(card))return showErr('f-err','El número de tarjeta debe tener 16 dígitos.');
    save(function(s){s.bank={holder:v('b-holder'),bank:v('b-bank'),clabe:clabe,card:card,concept:v('b-concept')}},'Cuenta guardada');
  }
  if(kind==='login')return doLogin(v('l-email'),v('l-pass'));
  if(kind==='newpass')return doNewPass(v('p-1'),v('p-2'));
  if(kind==='register'){
    var rid=f.getAttribute('data-id'),g2=rid==='fund'?null:gift(rid),coop=!g2||g2.mode==='coop';
    var amt=Math.round(+v('r-amt'));
    if(coop&&!(amt>0))return showErr('f-err','Escribe el monto recibido.');
    var lf2=g2&&!coop?leftOf(g2):0,pcs=Math.round(+v('r-pcs')||1);
    if(!coop&&(pcs<1||pcs>Math.max(1,lf2)))return showErr('f-err','Escribe entre 1 y '+Math.max(1,lf2)+' piezas.');
    save(function(s){
      if(rid==='fund'){s.fund.push({id:uid(),amount:amt,date:today()});return}
      var g=s.gifts.find(function(x){return x.id===rid});
      if(coop)(g.contributions=g.contributions||[]).push({id:uid(),amount:amt,date:today()});
      else (g.givers=g.givers||[]).push({id:uid(),qty:pcs,date:today()});
    },coop?'Aportación de '+money(amt)+' registrada':(pcs>1?pcs+' piezas marcadas como regaladas':'Marcado como regalado'));
  }
});

/* ---------- Arranque ---------- */
function boot(){
  return fetchMesa().then(function(row){
    ui.loading=false;
    if(!row){ui.notFound=true;render();return}
    state=clean(row.state);ui.version=row.version;ui.notFound=false;ui.loadError=false;ui.offline=false;cacheSave();render();
  }).catch(function(){
    ui.loading=false;
    var c=cacheLoad();
    if(c){state=clean(c.state);ui.version=c.version||0;ui.offline=true;render();toast('Sin conexión: ves la última versión guardada en este teléfono.')}
    else{ui.loadError=true;render()}
  });
}
render();
var started=boot();
if(sb){
  started.then(function(){
    return sb.auth.getSession().then(function(r){
      var s=r.data&&r.data.session;
      if(s)return checkWriter(s);
      if(/^#acceso$/.test(location.hash)&&!ui.notFound&&!ui.loadError)openModal(loginForm(),{type:'form'});
    });
  }).catch(function(){});
  sb.auth.onAuthStateChange(function(ev){
    /* No se llama a la base dentro de este aviso: se difiere un momento. */
    setTimeout(function(){
      if(ev==='PASSWORD_RECOVERY')openModal(newPassForm(),{type:'form'});
      if(ev==='SIGNED_OUT'&&ui.canWrite){ui.canWrite=false;render()}
    },0);
  });
}

})();
