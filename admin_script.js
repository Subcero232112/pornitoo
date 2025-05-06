// Imports Firebase (Solo lo necesario para admin)
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, onValue, push, set, update, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Listener DOM Ready (Admin Script)
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté listo
    if (window.firebaseApp) {
        console.log("Admin Script: Firebase App already available.");
        initializeAppAdminLogic();
    } else {
        console.log("Admin Script: Waiting for firebase-ready event...");
        // Esperar evento si Firebase aún no está listo
        document.addEventListener('firebase-ready', initializeAppAdminLogic, { once: true });
    }
});

// --- Lógica Principal Admin ---
function initializeAppAdminLogic() {
    console.log("Initializing Admin Logic...");
    // Re-obtener referencias a Firebase
     if (!window.firebaseApp) {
        console.error("Admin Script: Firebase App object not found even after waiting!");
        return; // Salir si Firebase no está listo
    }
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);

    // Constantes y Selectores Admin/Sugerencias
    const ADMIN_EMAILS = ["santosramonsteven@gmail.com", "evilgado6@gmail.com"];
    const adminFab = document.getElementById('admin-fab');
    const adminPanel = document.getElementById('admin-panel'); // Selector Panel Admin
    console.log("Admin Panel Element Selected:", adminPanel); // Verificar si se encuentra
    const closeAdminPanelButton = document.getElementById('close-admin-panel-button');
    const adminUploadVideoBtn = document.getElementById('admin-upload-video-btn');
    const adminViewRequestsBtn = document.getElementById('admin-view-requests-btn');
    // Modales Admin
    const addVideoModal = document.getElementById('add-video-modal');
    const closeAddVideoModal = document.getElementById('close-add-video-modal');
    const addVideoForm = document.getElementById('add-video-form');
    const videoTitleInput = document.getElementById('video-title');
    const videoDescriptionInput = document.getElementById('video-description');
    const videoUrlInput = document.getElementById('video-url');
    const posterUrlInput = document.getElementById('poster-url');
    const videoGenreInput = document.getElementById('video-genre');
    const addVideoStatus = document.getElementById('add-video-status');
    const submitVideoButton = document.getElementById('submit-video-button');
    const requestIdToApproveInput = document.getElementById('request-id-to-approve');
    const viewRequestsModal = document.getElementById('view-requests-modal');
    const closeViewRequestsModal = document.getElementById('close-view-requests-modal');
    const requestsListContainer = document.getElementById('requests-list-container');
    const viewRequestsStatus = document.getElementById('view-requests-status');
    // Elementos Sugerencia Usuario
    const requestVideoButton = document.getElementById('request-video-button');
    const requestVideoModal = document.getElementById('request-video-modal');
    const closeRequestVideoModal = document.getElementById('close-request-video-modal');
    const requestVideoForm = document.getElementById('request-video-form');
    const requestTitleInput = document.getElementById('request-title');
    const requestUrlInput = document.getElementById('request-url');
    const requestReasonInput = document.getElementById('request-reason');
    const submitRequestButton = document.getElementById('submit-request-button');
    const requestVideoStatus = document.getElementById('request-video-status');

    let currentAdminUser = null;
    let isAdmin = false;

     // Función para mostrar mensajes de estado
     function showStatusMessage(element, message, type = 'info', autoHideDelay = 0) {
        if (!element) return;
        element.textContent = message;
        element.className = 'admin-status';
        element.classList.add(type);
        element.style.display = 'block';
        if (autoHideDelay > 0) {
            setTimeout(() => { if(element) element.style.display = 'none'; }, autoHideDelay);
        }
    }
     // Función para toggle simple (Mostrar/Ocultar Elementos como Paneles/Modales)
     function toggleElement(element, forceState) {
        if (!element) { console.warn("toggleElement called with null element"); return; }
        // Determinar si el elemento debería estar visible basado en el estado actual o forzado
        const currentlyVisible = element.classList.contains('visible') || element.style.display === 'block' || element.style.display === 'flex';
        const shouldBeVisible = forceState === undefined ? !currentlyVisible : forceState;

        // Usar clase 'visible' para paneles/modales que usan transiciones CSS
        const isModal = element.classList.contains('modal');
        const isPanel = element.classList.contains('panel') || element.classList.contains('admin-panel') || element.classList.contains('settings-panel');

        if (isModal || isPanel) {
             element.classList.toggle('visible', shouldBeVisible);
             console.log(`Toggled 'visible' class for #${element.id || 'element'}: ${shouldBeVisible}`);
        } else {
             // Usar display para otros elementos si no usan la clase 'visible'
             const displayStyle = shouldBeVisible ? (element.tagName === 'BUTTON' || element.tagName === 'DIV' ? 'flex' : 'block') : 'none';
             element.style.display = displayStyle;
             console.log(`Toggled display style for #${element.id || 'element'}: ${displayStyle}`);
        }

        // Limpiar formularios y mensajes de estado al cerrar modales específicos
        if (!shouldBeVisible) {
            if (element === addVideoModal && addVideoForm) addVideoForm.reset();
            if (element === requestVideoModal && requestVideoForm) requestVideoForm.reset();
            if (element === addVideoModal) showStatusMessage(addVideoStatus, '', 'info', 0);
            if (element === viewRequestsModal) showStatusMessage(viewRequestsStatus, '', 'info', 0);
            if (element === requestVideoModal) showStatusMessage(requestVideoStatus, '', 'info', 0);
        }
     }


    // --- Lógica de Visibilidad Admin/User y Setup Formularios ---
    onAuthStateChanged(auth, (user) => {
        currentAdminUser = user;
        isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
        console.log(`Admin Script Auth Check: User ${user ? user.email : 'null'}, isAdmin: ${isAdmin}`);

        if (adminFab) adminFab.style.display = isAdmin ? 'flex' : 'none';
        if (requestVideoButton) requestVideoButton.style.display = (user && !isAdmin) ? 'flex' : 'none';
        if (adminPanel && !isAdmin && adminPanel.classList.contains('visible')) {
             toggleElement(adminPanel, false);
        }
        // Habilitar/Deshabilitar forms
        const requestFormElements = [requestTitleInput, requestUrlInput, requestReasonInput, submitRequestButton];
        requestFormElements.forEach(el => { if (el) el.disabled = !user; });
        if (!user && requestVideoModal?.classList.contains('visible')) { toggleElement(requestVideoModal, false); }
        const addVideoFormElements = [videoTitleInput, videoDescriptionInput, videoUrlInput, posterUrlInput, videoGenreInput, submitVideoButton];
        addVideoFormElements.forEach(el => { if(el) el.disabled = !isAdmin; });
         if (!isAdmin && addVideoModal?.classList.contains('visible')) { toggleElement(addVideoModal, false); }
    });

    // --- Listeners UI Admin/Sugerencias ---

    // Panel Admin (Botón flotante) - VERSIÓN FUNCIONAL
    console.log("Admin FAB Element Selected (before listener):", adminFab); // Verificar selección del botón
    if (adminFab) {
         adminFab.addEventListener('click', (e) => {
             console.log("Admin FAB clicked!"); // Confirmar que el listener se ejecuta
             e.stopPropagation();
             if (adminPanel) {
                 console.log("Admin Panel found, calling toggleElement..."); // Confirmar que el panel se encontró
                 toggleElement(adminPanel); // <-- LA ACCIÓN PARA ABRIR/CERRAR
             } else {
                 console.error("Admin Panel element (#admin-panel) was null inside click listener!");
             }
         });
         console.log("Click listener added to Admin FAB.");
    } else {
        console.warn("Admin FAB element (#admin-fab) not found. Cannot add listener. (Might be hidden for non-admin)");
    }

    // --- Resto de Listeners (Igual que antes) ---
    // Botón cerrar Panel Admin
    if (closeAdminPanelButton) { closeAdminPanelButton.addEventListener('click', () => toggleElement(adminPanel, false)); }
    // Cerrar panel admin si click fuera
    document.addEventListener('click', (e) => { if (adminPanel?.classList.contains('visible') && !adminPanel.contains(e.target) && e.target !== adminFab && !adminFab?.contains(e.target)) { toggleElement(adminPanel, false); } }, true);
    // Botones dentro del panel admin
    if (adminUploadVideoBtn) adminUploadVideoBtn.addEventListener('click', () => { toggleElement(addVideoModal, true); toggleElement(adminPanel, false); addVideoForm?.reset(); requestIdToApproveInput.value=''; showStatusMessage(addVideoStatus,'');});
    if (adminViewRequestsBtn) adminViewRequestsBtn.addEventListener('click', () => { loadVideoRequests(); toggleElement(viewRequestsModal, true); toggleElement(adminPanel, false); });
    document.getElementById('admin-ban-user-btn')?.addEventListener('click', () => alert("Función Banear no implementada."));
    document.getElementById('admin-kick-user-btn')?.addEventListener('click', () => alert("Función Kick no implementada."));
    // Modales Admin/Sugerencia (Botones de cierre y click fuera)
    if (closeAddVideoModal) closeAddVideoModal.addEventListener('click', () => toggleElement(addVideoModal, false));
    if (closeViewRequestsModal) closeViewRequestsModal.addEventListener('click', () => toggleElement(viewRequestsModal, false));
    if (closeRequestVideoModal) closeRequestVideoModal.addEventListener('click', () => toggleElement(requestVideoModal, false));
    if(addVideoModal) addVideoModal.addEventListener('click', (e) => { if(e.target === addVideoModal) toggleElement(addVideoModal, false); });
    if(viewRequestsModal) viewRequestsModal.addEventListener('click', (e) => { if(e.target === viewRequestsModal) toggleElement(viewRequestsModal, false); });
    if(requestVideoModal) requestVideoModal.addEventListener('click', (e) => { if(e.target === requestVideoModal) toggleElement(requestVideoModal, false); });
    // Botón Sugerir Video (Usuario)
    if (requestVideoButton) requestVideoButton.addEventListener('click', () => { if(currentAdminUser) { toggleElement(requestVideoModal, true); requestVideoForm?.reset(); showStatusMessage(requestVideoStatus, '', 'info', 0); } else { alert(window.translations?.[window.currentLang || 'es']?.login_needed_to_suggest || "Log in to suggest videos"); } });


    // --- Lógica de Formularios (Subir y Sugerir) ---
    // Formulario Subir Video (Admin)
    if (addVideoForm) {
        addVideoForm.addEventListener('submit', async (e) => {
            e.preventDefault(); if (!isAdmin) { showStatusMessage(addVideoStatus, "Acción solo para administradores.", 'error', 5000); return; }
            showStatusMessage(addVideoStatus, 'Procesando...', 'info'); submitVideoButton.disabled = true;
            const title = videoTitleInput.value.trim(); const description = videoDescriptionInput.value.trim(); const sourceType = addVideoForm.querySelector('input[name="sourceType"]:checked')?.value;
            const videoUrl = videoUrlInput.value.trim(); const posterUrl = posterUrlInput.value.trim(); const genre = videoGenreInput.value; const requestId = requestIdToApproveInput.value;
            if (!title || !videoUrl || !posterUrl || !sourceType) { showStatusMessage(addVideoStatus, 'Error: Faltan campos obligatorios.', 'error'); submitVideoButton.disabled = false; return; }
            const videoData = { title, description, sourceType, videoUrl, posterUrl, genre: genre || null, uploadTimestamp: serverTimestamp(), views: 0 };
            const videosRef = ref(db, 'videos'); const newVideoRef = push(videosRef);
            try { await set(newVideoRef, videoData); showStatusMessage(addVideoStatus, `Video "${title}" añadido!`, 'success', 5000); addVideoForm.reset(); requestIdToApproveInput.value = ''; toggleElement(addVideoModal, false); if (requestId) { updateRequestStatus(requestId, 'approved'); } } catch (error) { console.error("Error adding video:", error); showStatusMessage(addVideoStatus, `Error: ${error.message}`, 'error'); } finally { submitVideoButton.disabled = false; }
        });
    }
    // Formulario Sugerir Video (Usuario)
    if (requestVideoForm) {
        requestVideoForm.addEventListener('submit', async (e) => {
             e.preventDefault(); const user = currentAdminUser; if (!user) { showStatusMessage(requestVideoStatus, "Inicia sesión para sugerir", 'error', 4000); return; }
             showStatusMessage(requestVideoStatus, 'Enviando...', 'info'); submitRequestButton.disabled = true;
             const title = requestTitleInput.value.trim(); const url = requestUrlInput.value.trim(); const reason = requestReasonInput.value.trim();
             if (!title || !reason) { showStatusMessage(requestVideoStatus, 'Error: Título y Razón son obligatorios.', 'error'); submitRequestButton.disabled = false; return; }
             const requestData = { title, url: url || null, reason, status: 'pending', userId: user.uid, userEmail: user.email, timestamp: serverTimestamp() };
             const requestsRef = ref(db, 'videoRequests'); const newRequestRef = push(requestsRef);
             try { await set(newRequestRef, requestData); showStatusMessage(requestVideoStatus, "Sugerencia enviada. ¡Gracias!", 'success', 4000); requestVideoForm.reset(); toggleElement(requestVideoModal, false); } catch (error) { console.error("Error submitting video request:", error); showStatusMessage(requestVideoStatus, `Error: ${error.message}`, 'error'); } finally { submitRequestButton.disabled = false; }
        });
    }

    // --- Lógica de Ver/Gestionar Solicitudes (Admin) ---
    function loadVideoRequests() { /* ... (código igual que antes) ... */ }
    function displayVideoRequest(id, data) { /* ... (código igual que antes) ... */ }
    function handleApproveRequest(id, data) { /* ... (código igual que antes) ... */ }
    function handleRejectRequest(id) { /* ... (código igual que antes) ... */ }
    function updateRequestStatus(id, status) { /* ... (código igual que antes) ... */ }

    console.log("Admin logic initialized successfully.");

} // --- Fin initializeAppAdminLogic ---
