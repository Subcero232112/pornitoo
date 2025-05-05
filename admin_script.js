import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, push, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté listo (si usas el evento)
    if (window.firebaseApp) {
        initializeAppAdminLogic();
    } else {
        document.addEventListener('firebase-ready', initializeAppAdminLogic, { once: true });
    }
});

function initializeAppAdminLogic() {
    console.log("Initializing Admin Logic...");
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);

    // Selectores del Formulario Admin
    const addVideoForm = document.getElementById('add-video-form');
    const videoTitleInput = document.getElementById('video-title');
    const videoDescriptionInput = document.getElementById('video-description');
    const videoUrlInput = document.getElementById('video-url');
    const posterUrlInput = document.getElementById('poster-url');
    const videoGenreInput = document.getElementById('video-genre');
    const adminStatusDiv = document.getElementById('admin-status');
    const adminLoginPrompt = document.getElementById('admin-login-prompt');
    const adminLoginLink = document.getElementById('admin-login-link');

    // --- Autenticación y Visibilidad del Formulario ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuario logueado - ¡Aquí deberías verificar si es ADMIN!
            // Por ahora, simplemente mostramos el form si está logueado
            console.log("Admin page: User logged in:", user.uid);
            if (addVideoForm) addVideoForm.style.display = 'block';
            if (adminLoginPrompt) adminLoginPrompt.style.display = 'none';

            // En una app real:
            // checkAdminRole(user.uid).then(isAdmin => {
            //     if (isAdmin) {
            //        addVideoForm.style.display = 'block';
            //        adminLoginPrompt.style.display = 'none';
            //     } else {
            //        showStatus('No tienes permisos de administrador.', 'error');
            //        addVideoForm.style.display = 'none';
            //        adminLoginPrompt.style.display = 'block';
            //        adminLoginPrompt.textContent = 'Acceso denegado. No eres administrador.';
            //     }
            // });

        } else {
            // Usuario no logueado
            console.log("Admin page: User logged out.");
            if (addVideoForm) addVideoForm.style.display = 'none';
            if (adminLoginPrompt) adminLoginPrompt.style.display = 'block';
            // Añadir listener al enlace de login (si existe y el modal está en esta página)
            if (adminLoginLink && window.uiManager && typeof window.uiManager.toggleModal === 'function') {
                 // Clonar para evitar listeners duplicados si auth cambia varias veces
                 let currentLoginLink = adminLoginLink;
                 let newLoginLink = currentLoginLink.cloneNode(true);
                 currentLoginLink.parentNode.replaceChild(newLoginLink, currentLoginLink);
                 newLoginLink.addEventListener('click', (e) => {
                      e.preventDefault();
                      // Asumiendo que el modal y uiManager de script.js están disponibles
                      window.uiManager.toggleModal(document.getElementById('login-modal'), true);
                 });
            }
        }
    });

    // --- Manejador del Envío del Formulario ---
    if (addVideoForm) {
        addVideoForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitar envío real del formulario
            showStatus('Procesando...', 'info'); // Mensaje temporal

            // Obtener valores del formulario
            const title = videoTitleInput.value.trim();
            const description = videoDescriptionInput.value.trim();
            const sourceType = document.querySelector('input[name="sourceType"]:checked').value;
            const videoUrl = videoUrlInput.value.trim();
            const posterUrl = posterUrlInput.value.trim();
            const genre = videoGenreInput.value; // Puede estar vacío

            // Validación básica
            if (!title || !videoUrl || !posterUrl) {
                showStatus('Error: Título, URL de Video y URL de Póster son obligatorios.', 'error');
                return;
            }

            // Construir objeto de datos
            const videoData = {
                title: title,
                description: description,
                sourceType: sourceType,
                videoUrl: videoUrl,
                posterUrl: posterUrl,
                genre: genre || null, // Guardar null si no se selecciona género
                uploadTimestamp: serverTimestamp(), // Usar timestamp del servidor
                views: 0 // Inicializar vistas
                // Podrías añadir 'uploaderUid: auth.currentUser.uid' si quieres saber quién lo subió
            };

            // Guardar en Firebase Realtime Database
            try {
                const videosRef = ref(db, 'videos');
                const newVideoRef = push(videosRef); // Generar ID único

                await set(newVideoRef, videoData);

                showStatus(`Video "${title}" añadido correctamente con ID: ${newVideoRef.key}`, 'success');
                addVideoForm.reset(); // Limpiar formulario

            } catch (error) {
                console.error("Error adding video to database:", error);
                showStatus(`Error al añadir el video: ${error.message}`, 'error');
            }
        });
    }

    // --- Función para mostrar mensajes de estado ---
    function showStatus(message, type = 'info') { // type puede ser 'info', 'success', 'error'
        if (!adminStatusDiv) return;
        adminStatusDiv.textContent = message;
        adminStatusDiv.className = ''; // Limpiar clases anteriores
        adminStatusDiv.classList.add(type);
        adminStatusDiv.style.display = 'block';

        // Ocultar después de unos segundos (opcional)
        if (type === 'success') {
            setTimeout(() => {
                 adminStatusDiv.style.display = 'none';
            }, 5000); // Ocultar éxito después de 5s
        }
    }

    // --- Función placeholder para verificar rol de admin (NECESITA IMPLEMENTACIÓN REAL) ---
    // async function checkAdminRole(uid) {
    //     // Implementación REAL: Consulta tu base de datos (ej. /admins/{uid})
    //     // para ver si el UID pertenece a un administrador.
    //     console.warn("Verificación de rol de Admin NO IMPLEMENTADA. Permitido por defecto si está logueado.");
    //     return true; // Permitir por ahora si está logueado
    // }

} // Fin initializeAppAdminLogic
