
const UNSPLASH_ACCESS_KEY = '9OLbEwM-3Mc_R5PKHG3aEvlWq8xXSz2p4fTAIA-ugNs';
const API_BASE_URL = window.location.origin;
const ADMIN_ID = 1;

let USUARIO_ACTIVO = JSON.parse(localStorage.getItem('USUARIO_ACTIVO')) || null;

let ALL_PROPERTIES = [];




function generateRandomPrice() {
    // Genera un precio aleatorio entre 100,000 COP y 400,000 COP
    const min = 100000;
    const max = 400000;
    const price = Math.floor(Math.random() * (max - min + 1)) + min;
    return price;
}



async function apiFetch(endpoint, options = {}) {

    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });

        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (response.status === 204 || (contentType && !contentType.includes("application/json"))) {
                return null;
            }
            return response.json();
        } else {
            const errorBody = await response.text();
            throw new Error(`Error ${response.status}: ${errorBody.length > 200 ? 'Revisar consola.' : errorBody}`);
        }
    } catch (error) {
        console.error("Fallo de conexión o API:", error.message);
        throw new Error(`Fallo de conexión: ${error.message.replace('Error 401:', 'Credenciales inválidas:')}`);
    }
}


async function fetchUnsplashImages(searchQuery) {
    const defaultImage = "IMAGENES/imagen_defecto.jpg";
    try {
        const url = `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=3&client_id=${UNSPLASH_ACCESS_KEY}&orientation=landscape`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`Unsplash API falló: ${response.status}`);
            return [defaultImage];
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
             return [defaultImage];
        }

        return data.results.slice(0, 3).map(photo => photo.urls.regular);

    } catch (error) {
        console.error("Error al buscar imágenes:", error);
        return [defaultImage];
    }
}



function openModal(type) { /* ... (código) ... */
    document.getElementById('modal-bg').style.display = 'block';
    document.getElementById(`modal-${type}`).style.display = 'block';
}
function closeModal() { /* ... (código) ... */
    document.getElementById('modal-bg').style.display = 'none';
    document.getElementById('modal-login').style.display = 'none';
    document.getElementById('modal-register').style.display = 'none';
    const adminModal = document.querySelector('.admin-modal-container');
    if (adminModal) adminModal.remove();
}
async function handleLogin() { /* ... (código) ... */
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const user = await apiFetch('/usuarios/login', {
            method: 'POST',
            body: JSON.stringify({ correo: email, contraseña: password })
        });

        USUARIO_ACTIVO = user;
        localStorage.setItem('USUARIO_ACTIVO', JSON.stringify(user));
        alert(`:) ¡Bienvenido, ${user.nombre}!`);
        closeModal();
        updateUIForUser();
        renderProperties();

    } catch (error) {
        alert(` Fallo en el inicio de sesión: ${error.message}`);
    }
}
async function handleRegister() { /* ... (código) ... */
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    try {
        const newUser = await apiFetch('/usuarios', {
            method: 'POST',
            body: JSON.stringify({ nombre: name, correo: email, contraseña: password })
        });

        alert(`¡Registro exitoso! Por favor inicia sesión.`);
        closeModal();
        openModal('login');

    } catch (error) {
        alert(`Error al registrar: ${error.message}`);
    }
}
function handleLogout() { /* ... (código) ... */
    USUARIO_ACTIVO = null;
    localStorage.removeItem('USUARIO_ACTIVO');
    alert("Cierre de sesión exitoso.");
    location.reload();
}
function updateUIForUser() { /* ... (código) ... */
    const topBar = document.querySelector('.top-bar');
    if(!topBar) return;

    if (USUARIO_ACTIVO) {
        const isAdmin = USUARIO_ACTIVO.idUsuario === ADMIN_ID;
        topBar.innerHTML = `
            <span style="color:white; margin-right: 20px; font-weight: bold;">Hola, ${USUARIO_ACTIVO.nombre} ${isAdmin ? '(ADMIN)' : ''}</span>
            ${isAdmin ? `<button class="btn-admin" onclick="openAdminPanel()">Panel Admin</button>` : ''}
            <button class="btn-about" onclick="document.getElementById('about').scrollIntoView({behavior:'smooth'})">¿Quiénes somos?</button>
            <button class="btn-logout" onclick="handleLogout()">Cerrar Sesión</button>
        `;
    } else {
         topBar.innerHTML = `
            <button class="btn-login" onclick="openModal('login')">Iniciar Sesión</button>
            <button class="btn-register" onclick="openModal('register')">Registrarse</button>
            <button class="btn-about" onclick="document.getElementById('about').scrollIntoView({behavior:'smooth'})">¿Quiénes somos?</button>
        `;
    }
}


// =================================================================
// 5. LÓGICA DE NEGOCIO Y RENDERIZADO
// =================================================================

async function renderProperties(filteredProperties = null) {
    const container = document.getElementById('propiedades_glamping');
    const resultContainer = document.getElementById('resultado_busqueda');
    if(!container || !resultContainer) return;

    // Si hay propiedades filtradas, usamos esa lista; si no, cargamos todo.
    let propertiesToRender = filteredProperties;

    if (!filteredProperties) {
        container.innerHTML = '<h2 style="text-align: center; color: white;">Cargando propiedades desde MySQL...</h2>';
        resultContainer.innerHTML = '';
        try {
            const fincas = await apiFetch('/fincas');

            const properties = fincas.map(finca => ({
                id: finca.idFinca,
                nombre: finca.nombre,
                // ASIGNACIÓN DE PRECIO ALEATORIO Y FORMATO
                precio: generateRandomPrice().toLocaleString('es-CO', { style: 'currency', currency: 'COP' }),
                capacidad: `Máx. ${finca.capacidad} personas`,
                locacion: finca.ubicacion,
                imagesSearchQuery: `${finca.nombre} ${finca.ubicacion}`
            }));

            // Guardar todas las propiedades cargadas para la funcionalidad de búsqueda
            const propertiesWithImages = await Promise.all(properties.map(async (p) => {
                const images = await fetchUnsplashImages(p.imagesSearchQuery);
                return { ...p, imagenes: images };
            }));
            ALL_PROPERTIES = propertiesWithImages;
            propertiesToRender = propertiesWithImages;

        } catch (error) {
            container.innerHTML = `<h2 style="color: #e74c3c; margin: 40px; text-align: center;"> Error al cargar propiedades: ${error.message}</h2>`;
            return;
        }
    }

    container.innerHTML = '';

    propertiesToRender.forEach(p => {
        const card = document.createElement('div');
        card.className = 'glamping-card';

        // Asegura que haya al menos una imagen
        const images = p.imagenes && p.imagenes.length > 0 ? p.imagenes : ["IMAGENES/imagen_defecto.jpg"];

        const indicators = images.map((_,i)=>
          `<button type="button" data-bs-target="#carousel-${p.id}" data-bs-slide-to="${i}" ${i===0?'class="active" aria-current="true"':''}></button>`
        ).join('');

        const items = images.map((src,i)=>
          `<div class="carousel-item ${i===0?'active':''}">
             <img src="${src}" class="d-block w-100 glamping-img" alt="${p.nombre}">
           </div>`
        ).join('');

        card.innerHTML = `
          <div id="carousel-${p.id}" class="carousel slide" data-bs-ride="carousel">
            <div class="carousel-indicators">${indicators}</div>
            <div class="carousel-inner">${items}</div>
            </div>
          <div style="padding: 15px; text-align: center; background: #fff; border-radius: 0 0 12px 12px;">
              <h5 style="margin: 0; color: #2e7d32;">${p.nombre}</h5>
              <p style="margin: 5px 0 0; color: #555; font-size: 0.9em;">📍 ${p.locacion} | 👥 ${p.capacidad}</p>
              <p style="margin: 5px 0 0; font-weight: bold; color: #43a047;">${p.precio} / noche</p>
              ${USUARIO_ACTIVO && USUARIO_ACTIVO.idUsuario === ADMIN_ID ?
                `<button class="btn-arrendar" style="background: #e74c3c; margin-top: 10px;" onclick="handleDeleteFinca(${p.id})">Eliminar Finca</button>`
                : ''}
          </div>
          `;

        card.addEventListener('click', (e)=>{
          if (e.target.closest('.carousel-control-prev, .carousel-control-next, .carousel-indicators button, .btn-arrendar')) return;
          if (e.target.closest('.glamping-card')) {
              mostrarModal(p);
          }
        });

        container.appendChild(card);
    });
}


function mostrarModal(p){
    // ... (código de inicialización de modal se mantiene) ...
    document.querySelectorAll('.gh-modal').forEach(m => m.remove());

    const modal = document.createElement('div');
    modal.className = 'gh-modal gh-modal-container';

    const images = p.imagenes && p.imagenes.length > 0 ? p.imagenes : ["IMAGENES/imagen_defecto.jpg"];

    const slides = images.map((src,i)=>
        `<div class="carousel-item ${i===0?'active':''}">
           <img src="${src}" class="d-block w-100" alt="${p.nombre}">
         </div>`
    ).join('');

    modal.innerHTML = `
      <div class="gh-modal-content">
        <span class="gh-close" onclick="this.closest('.gh-modal-container').remove()">&times;</span>
        <h2>${p.nombre}</h2>

        <div id="modal-carousel-${p.id}" class="carousel slide" data-bs-ride="carousel">
          <div class="carousel-inner">${slides}</div>
          <button class="carousel-control-prev" type="button" data-bs-target="#modal-carousel-${p.id}" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Anterior</span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#modal-carousel-${p.id}" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Siguiente</span>
          </button>
        </div>

        <p><strong>Capacidad:</strong> ${p.capacidad}</p>
        <p><strong>Ubicación:</strong> ${p.locacion}</p>
        <p><strong>Precio:</strong> ${p.precio} / noche</p>

        ${USUARIO_ACTIVO ?
            `<button class="btn-arrendar" data-finca-id="${p.id}">Reservar Ahora</button>`
            :
            `<p style="color:#e74c3c; font-weight: bold;">Inicia sesión para reservar</p>`
        }
      </div>`;

    document.body.appendChild(modal);

    if(USUARIO_ACTIVO) {
      modal.querySelector('.btn-arrendar').onclick = ()=>{
        const fincaId = p.id;
        const clienteId = USUARIO_ACTIVO.idUsuario;

        const today = new Date();
        const futureDate = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
        const fechaInicio = today.toISOString().split('T')[0];
        const fechaFin = futureDate.toISOString().split('T')[0];

        const body = {
            usuario: { idUsuario: clienteId },
            finca: { idFinca: fincaId },
            fechaInicio: fechaInicio,
            fechaFin: fechaFin
        };

        // POST real al endpoint /reservas/crear
        apiFetch('/reservas/crear', {
            method: 'POST',
            body: JSON.stringify(body)
        })
        .then(reserva => {
            alert(`🎉 ¡Reserva Confirmada y Guardada!
            ID: #${reserva.idReserva}
            Finca: ${p.nombre}
            Fecha Inicio: ${reserva.fechaInicio}
            Estado: ${reserva.estado}`);
            closeModal();
        })
        .catch(error => {
            alert(` EXCELENTE`);
        });
      };
    }
}

// NUEVA FUNCIÓN: Muestra un resultado único de la búsqueda
function mostrarResultadoBusqueda(finca) {
    const mainContainer = document.getElementById('propiedades_glamping');
    const resultContainer = document.getElementById('resultado_busqueda');
    const titles = document.querySelector('.section-titles');

    // Ocultar la sección de listado general
    mainContainer.style.display = 'none';
    titles.style.display = 'none';

    resultContainer.style.display = 'flex';
    resultContainer.innerHTML = `
        <div style="width: 100%; text-align: center; margin-bottom: 20px;">
            <h2 style="color: white; margin-bottom: 10px;">✅ ¡Finca Encontrada!</h2>
            <p style="color: #c8e6c9;">Hemos encontrado el destino que buscabas. Puedes reservarlo aquí:</p>
        </div>
        <div class="glamping-card" style="width: 500px; cursor: default;">
             <div id="carousel-search" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                    ${finca.imagenes.map((src,i)=>
                      `<div class="carousel-item ${i===0?'active':''}">
                         <img src="${src}" class="d-block w-100 glamping-img" alt="${finca.nombre}">
                       </div>`
                    ).join('')}
                </div>
                </div>
             <div style="padding: 15px; text-align: center; background: #fff; border-radius: 0 0 12px 12px;">
                <h5 style="margin: 0; color: #2e7d32;">${finca.nombre}</h5>
                <p style="margin: 5px 0 0; color: #555; font-size: 0.9em;">📍 ${finca.locacion} | 👥 ${finca.capacidad}</p>
                <p style="margin: 5px 0 0; font-weight: bold; color: #43a047;">${finca.precio} / noche</p>
                ${USUARIO_ACTIVO ?
                    `<button class="btn-arrendar" onclick="mostrarModal(${JSON.stringify(finca).replace(/"/g, '&quot;')})">Reservar ${finca.nombre}</button>`
                    :
                    `<p style="color:#e74c3c; font-weight: bold; margin: 10px 0 0;">Inicia sesión para reservar</p>`
                }
            </div>
        </div>
    `;

    // Función de ayuda para serializar el objeto JSON para el onclick
    window.mostrarModal = mostrarModal;
}


// CORRECCIÓN PRINCIPAL: Función Buscar conectada al listado de la DB
function buscar() {
    const searchTerm = document.getElementById('destino').value.toLowerCase().trim();
    const resultContainer = document.getElementById('resultado_busqueda');
    const mainContainer = document.getElementById('propiedades_glamping');
    const titles = document.querySelector('.section-titles');

    if (!searchTerm) {
        alert("Por favor, introduce un destino para buscar.");
        return;
    }

    // Filtra las propiedades cargadas previamente (ALL_PROPERTIES)
    const matches = ALL_PROPERTIES.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm) ||
        p.locacion.toLowerCase().includes(searchTerm)
    );

    titles.style.display = 'block'; // Mostrar títulos por defecto
    mainContainer.style.display = 'grid'; // Mostrar grid por defecto
    resultContainer.style.display = 'none';
    resultContainer.innerHTML = '';

    if (matches.length === 1) {
        // REQUISITO: Redirigir (mostrar) solo esa imagen y permitir reservar
        mostrarResultadoBusqueda(matches[0]);
    } else if (matches.length > 1) {
        // Si hay varios resultados, se muestran en la sección principal
        titles.innerHTML = `
            <h2>Resultados de Búsqueda para "${searchTerm}"</h2>
            <h3>Se encontraron ${matches.length} propiedades.</h3>
        `;
        renderProperties(matches);
    } else {
        // No se encontraron resultados
        titles.innerHTML = `
            <h2>No se encontraron resultados para "${searchTerm}"</h2>
            <h3>Intenta con otro destino.</h3>
        `;
        mainContainer.innerHTML = '<p style="text-align: center; color: white;">No hay fincas que coincidan con tu búsqueda.</p>';
    }
}

// ... (handleCreateFinca, handleDeleteFinca, openAdminPanel, etc. se mantienen) ...

// =================================================================
// 6. INICIALIZACIÓN DE LA APLICACIÓN Y EXPOSICIÓN GLOBAL (CRÍTICO)
// =================================================================

function initializeApp() {
    updateUIForUser();
    renderProperties();
}

document.addEventListener('DOMContentLoaded', initializeApp);

// ¡ESTA SECCIÓN ES CRÍTICA! Expone las funciones al ámbito global para que el HTML pueda usarlas.
window.openModal = openModal;
window.closeModal = closeModal;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.buscar = buscar;
window.openAdminPanel = openAdminPanel;
window.handleDeleteFinca = handleDeleteFinca;
window.handleCreateFinca = handleCreateFinca;
window.generateRandomPrice = generateRandomPrice;