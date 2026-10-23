// Modo demostración de GlampingHub para GitHub Pages.
// En GitHub Pages no corre el servidor Java, así que aquí se simula la API REST en el navegador
// con las mismas reglas de ReservaServiceImpl. Con Spring Boot corriendo este archivo no hace nada.
(function () {
  'use strict';
  var esDemo = /\.github\.io$/.test(location.hostname) || /[?&]demo\b/.test(location.search);
  if (!esDemo) return;

  var IMG = function (id) { return 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=1200&q=80'; };
  var FINCAS = [
    { idFinca: 1, nombre: 'Glamping Bosque Andino', ubicacion: 'Guatavita', capacidad: 4,
      fotos: ['photo-1502856755506-d8626589ef19', 'photo-1470265164177-33def6c4a87e', 'photo-1593053272490-e0ed6d6a42c5'] },
    { idFinca: 2, nombre: 'Cabaña del Lago', ubicacion: 'Guatapé', capacidad: 6,
      fotos: ['photo-1470770841072-f978cf4d019e', 'photo-1552335270-a1cdfc205557', 'photo-1762119594738-fb27265d5d03'] },
    { idFinca: 3, nombre: 'Finca El Cafetal', ubicacion: 'Salento', capacidad: 10,
      fotos: ['photo-1611781638782-0d3cae1cd22e', 'photo-1613498248726-8922766cebdb', 'photo-1666990986811-9a6dcc77cfb0'] },
    { idFinca: 4, nombre: 'Domo Estrellado', ubicacion: 'Villa de Leyva', capacidad: 2,
      fotos: ['photo-1761788457227-7b50e0f63c87', 'photo-1761788457326-d14fad23b308', 'photo-1779713802753-ccea01c1c651'] },
    { idFinca: 5, nombre: 'Refugio de Montaña', ubicacion: 'Sierra Nevada', capacidad: 5,
      fotos: ['photo-1666113907288-076e616f0b1e', 'photo-1682020193756-4f1948a1de17', 'photo-1661805945058-1012dc588d7e'] },
    { idFinca: 6, nombre: 'Camping Río Claro', ubicacion: 'Antioquia', capacidad: 8,
      fotos: ['photo-1657664069074-8b245ee46be9', 'photo-1633524792530-25a41459e618', 'photo-1738838072982-d0e578967643'] }
  ];
  var CUENTA_DEMO = { idUsuario: 2, nombre: 'Visitante', correo: 'demo@glampinghub.co', contraseña: 'demo123' };

  var guardado = {
    leer: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    escribir: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  var usuarios = function () { return guardado.leer('GH_DEMO_USUARIOS', [CUENTA_DEMO]); };
  var publico = function (u) { return { idUsuario: u.idUsuario, nombre: u.nombre, correo: u.correo }; };
  var respuesta = function (cuerpo, estado) {
    var esTexto = typeof cuerpo === 'string';
    return new Response(esTexto ? cuerpo : JSON.stringify(cuerpo), {
      status: estado || 200,
      headers: { 'Content-Type': esTexto ? 'text/plain; charset=utf-8' : 'application/json' }
    });
  };
  var leerCuerpo = function (init) { try { return JSON.parse((init && init.body) || '{}'); } catch (e) { return {}; } };

  var fetchReal = window.fetch.bind(window);
  window.fetch = function (entrada, init) {
    init = init || {};
    var url = new URL(typeof entrada === 'string' ? entrada : entrada.url, location.href);
    var metodo = (init.method || 'GET').toUpperCase();

    // Imágenes: se sirven fotos fijas en lugar de consultar la API de Unsplash en cada visita.
    if (url.hostname === 'api.unsplash.com') {
      var q = url.searchParams.get('query') || '';
      var f = FINCAS.filter(function (x) { return q.indexOf(x.nombre) === 0; })[0];
      return Promise.resolve(respuesta({ results: (f ? f.fotos : []).map(function (id) { return { urls: { regular: IMG(id) } }; }) }));
    }
    if (url.origin !== location.origin) return fetchReal(entrada, init);

    var ruta = url.pathname;
    // GET /fincas
    if (ruta === '/fincas' && metodo === 'GET') {
      return Promise.resolve(respuesta(FINCAS.map(function (x) {
        return { idFinca: x.idFinca, nombre: x.nombre, ubicacion: x.ubicacion, capacidad: x.capacidad };
      })));
    }
    // POST /usuarios (registro)
    if (ruta === '/usuarios' && metodo === 'POST') {
      var nuevo = leerCuerpo(init), lista = usuarios();
      if (lista.some(function (u) { return u.correo === nuevo.correo; })) return Promise.resolve(respuesta('Ya existe una cuenta con ese correo.', 400));
      var u = { idUsuario: lista.reduce(function (m, x) { return Math.max(m, x.idUsuario); }, 1) + 1, nombre: nuevo.nombre, correo: nuevo.correo, contraseña: nuevo['contraseña'] };
      lista.push(u); guardado.escribir('GH_DEMO_USUARIOS', lista);
      return Promise.resolve(respuesta(publico(u), 201));
    }
    // POST /usuarios/login
    if (ruta === '/usuarios/login' && metodo === 'POST') {
      var cred = leerCuerpo(init);
      var hallado = usuarios().filter(function (x) { return x.correo === cred.correo && x['contraseña'] === cred['contraseña']; })[0];
      return Promise.resolve(hallado ? respuesta(publico(hallado)) : respuesta('Correo o contraseña incorrectos.', 401));
    }
    // POST /reservas/crear: mismas validaciones que ReservaServiceImpl.crearReserva
    if (ruta === '/reservas/crear' && metodo === 'POST') {
      var r = leerCuerpo(init);
      if (!r.usuario || !r.usuario.idUsuario) return Promise.resolve(respuesta('El ID de Usuario es obligatorio para crear una reserva.', 400));
      if (!r.finca || !r.finca.idFinca) return Promise.resolve(respuesta('El ID de Finca es obligatorio para crear una reserva.', 400));
      var finca = FINCAS.filter(function (x) { return x.idFinca === r.finca.idFinca; })[0];
      if (!finca) return Promise.resolve(respuesta('Finca no encontrada con ID: ' + r.finca.idFinca, 400));
      var reservas = guardado.leer('GH_DEMO_RESERVAS', []);
      var reserva = { idReserva: reservas.length + 1, fechaInicio: r.fechaInicio, fechaFin: r.fechaFin, estado: 'PENDIENTE', idFinca: finca.idFinca, idUsuario: r.usuario.idUsuario };
      reservas.push(reserva); guardado.escribir('GH_DEMO_RESERVAS', reservas);
      return Promise.resolve(respuesta(reserva, 201));
    }
    if (/^\/(fincas|usuarios|reservas|clientes|administradores|notificaciones)(\/|$)/.test(ruta)) {
      return Promise.resolve(respuesta('Esta función necesita el servidor Java con MySQL.', 501));
    }
    return fetchReal(entrada, init);
  };

  // Funciones del panel de administración (solo existen con el servidor real)
  ['openAdminPanel', 'handleDeleteFinca', 'handleCreateFinca'].forEach(function (n) {
    if (typeof window[n] !== 'function') window[n] = function () { alert('El panel de administración necesita el servidor Java con MySQL.'); };
  });

  // Aviso de demostración
  document.addEventListener('DOMContentLoaded', function () {
    // closeModal original falla si el modal de login ya se quitó del DOM
    window.closeModal = function () {
      ['modal-bg', 'modal-login', 'modal-register'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.style.display = 'none';
      });
      document.querySelectorAll('.gh-modal-container').forEach(function (m) { m.remove(); });
    };
    var aviso = document.createElement('div');
    aviso.setAttribute('role', 'note');
    aviso.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:760px;margin:0 auto;background:rgba(18,34,24,.94);color:#fff;font:14px/1.45 Roboto,system-ui,sans-serif;padding:12px 44px 12px 16px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.35)';
    aviso.innerHTML = '<b>Demostración en línea.</b> El servidor real es Java 21 + Spring Boot + MySQL; aquí la API se simula en tu navegador para que puedas buscar, registrarte y reservar. ' +
      'Cuenta de prueba: <b>demo@glampinghub.co</b> / <b>demo123</b>. No uses una contraseña real. ' +
      '<a href="https://github.com/luism7p7/glampinghub" style="color:#a5d6a7">Ver el código</a>' +
      '<button type="button" aria-label="Cerrar aviso" style="position:absolute;right:10px;top:8px;background:none;border:0;color:#fff;font-size:20px;cursor:pointer">&times;</button>';
    aviso.querySelector('button').onclick = function () { aviso.remove(); };
    document.body.appendChild(aviso);
  });
})();
