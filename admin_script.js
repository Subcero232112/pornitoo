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
        document.addEventListener('firebase-ready', initializeAppAdminLogic, { once: true });
    }
});

// --- Lógica Principal Admin ---
function initializeAppAdminLogic() {
    console.log("Initializing Admin Logic...");
    // Re-obtener referencias a Firebase
     if (!window.firebaseApp) {
        console.error("Admin Script: Firebase App object not found even after waiting!");
        return;
    }
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);

    // Constantes y Selectores Admin/Sugerencias
    const ADMIN_EMAILS = ["santosramonsteven@gmail.com", "evilgado6@gmail.com"];
    const adminFab = document.getElementById('admin-fab');
    const adminPanel = document.getElementById('admin-panel');
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
     // Función para toggle simple
     function toggleElement(element, forceState) {
        if (!element) { console.warn("toggleElement called with null element"); return; }
        const currentlyVisible = element.classList.contains('visible') || element.style.display === 'block' || element.style.display === 'flex';
        const shouldBeVisible = forceState === undefined ? !currentlyVisible : forceState;
        // Detect if it's a modal or panel based on ID or class maybe?
        const isModal = element.classList.contains('modal');
        const isPanel = element.classList.contains('panel') || element.classList.contains('admin-panel') || element.classList.contains('settings-panel');

        if (isModal || isPanel) {
             element.classList.toggle('visible', shouldBeVisible);
             console.log(`Toggled 'visible' class for ${element.id || 'element'}: ${shouldBeVisible}`);
        } else {
             // Fallback to display style if not using 'visible' class consistently
             const displayStyle = shouldBeVisible ? (element.tagName === 'BUTTON' || element.tagName === 'DIV' ? 'flex' : 'block') : 'none';
             element.style.display = displayStyle;
             console.log(`Toggled display style for ${element.id || 'element'}: ${displayStyle}`);
        }

        if (!shouldBeVisible) { // Cleanup on close
            if (element === addVideoModal) addVideoForm?.reset();
            if (element === requestVideoModal) requestVideoForm?.reset();
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
        // Habilitar/deshabilitar forms
        const requestFormElements = [requestTitleInput, requestUrlInput, requestReasonInput, submitRequestButton];
        requestFormElements.forEach(el => { if (el) el.disabled = !user; });
        if (!user && requestVideoModal?.classList.contains('visible')) { toggleElement(requestVideoModal, false); }

        // Habilitar/deshabilitar form de añadir video (aunque ya está en un panel/modal admin)
        const addVideoFormElements = [videoTitleInput, videoDescriptionInput, videoUrlInput, posterUrlInput, videoGenreInput, submitVideoButton];
        addVideoFormElements.forEach(el => { if(el) el.disabled = !isAdmin; });
         if (!isAdmin && addVideoModal?.classList.contains('visible')) { toggleElement(addVideoModal, false); }
    });

    // --- Listeners UI Admin/Sugerencias ---

    // Panel Admin (Botón flotante)
    if (adminFab) {
         console.log("Admin FAB found, adding listener.");
         adminFab.addEventListener('click', (e) => {
             console.log("Admin FAB clicked!"); // <-- Log para ver si el click se registra
             e.stopPropagation();
             if (adminPanel) {
                 console.log("Admin Panel found, attempting to toggle with alert test.");
                 // *** PRUEBA CON ALERT ***
                 alert("¡Clic detectado en botón admin!"); // <-- ¡LA PRUEBA!
                 // *** FIN PRUEBA ***

                 // toggleElement(adminPanel); // <-- LÍNEA ORIGINAL COMENTADA
             } else {
                 console.error("Admin Panel element (#admin-panel) not found when FAB clicked!");
             }
         });
    } else {
        // Solo mostrar este error si se espera que el botón exista (ej. si el usuario DEBERÍA ser admin)
        // Podríamos añadir un chequeo de isAdmin aquí, pero es más simple dejarlo así por ahora.
        console.warn("Admin FAB element (#admin-fab) not found in admin_script.js. Button might be hidden correctly for non-admins.");
    }

    // Botón cerrar Panel Admin
    if (closeAdminPanelButton) {
        closeAdminPanelButton.addEventListener('click', () => toggleElement(adminPanel, false));
    }
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
    if (requestVideoButton) requestVideoButton.addEventListener('click', () => {
        if(currentAdminUser) { toggleElement(requestVideoModal, true); requestVideoForm?.reset(); showStatusMessage(requestVideoStatus, '', 'info', 0); }
        else { alert(window.translations?.[window.currentLang || 'es']?.login_needed_to_suggest || "Log in to suggest videos"); }
    });

    // --- Lógica de Formularios ---

    // Formulario Subir Video (Admin)
    if (addVideoForm) {
        addVideoForm.addEventListener('submit', async (e) => { /* ... (código igual que antes) ... */
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
        requestVideoForm.addEventListener('submit', async (e) => { /* ... (código igual que antes) ... */
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
    function loadVideoRequests() { /* ... (código igual que antes) ... */
        if (!isAdmin) { console.warn("Attempted to load requests without admin rights."); return; } if (!requestsListContainer) return;
        requestsListContainer.innerHTML = `<p>${window.translations?.[window.currentLang || 'es']?.loading || 'Loading...'}</p>`; const requestsRef = ref(db, 'videoRequests');
        onValue(requestsRef, (snapshot) => { requestsListContainer.innerHTML = ''; if (snapshot.exists()) { let hasPending = false; snapshot.forEach(childSnapshot => { const requestId = childSnapshot.key; const requestData = childSnapshot.val(); if (requestData.status === 'pending' || !requestData.status) { hasPending = true; displayVideoRequest(requestId, requestData); } }); if (!hasPending) { requestsListContainer.innerHTML = `<p>${window.translations?.[window.currentLang || 'es']?.no_pending_requests || 'No pending requests.'}</p>`; } } else { requestsListContainer.innerHTML = `<p>${window.translations?.[window.currentLang || 'es']?.no_pending_requests || 'No pending requests.'}</p>`; } }, (error) => { console.error("Error loading video requests:", error); requestsListContainer.innerHTML = `<p style="color:red;">Error cargando solicitudes.</p>`; });
    }
    function displayVideoRequest(id, data) { /* ... (código igual que antes, asegúrate que escapeHTML existe si no es global) ... */
        if (!requestsListContainer) return; const item = document.createElement('div'); item.classList.add('request-item'); item.dataset.requestId = id;
        const requestDate = data.timestamp ? window.formatDate?.(data.timestamp) || new Date(data.timestamp).toLocaleDateString() : 'N/A'; const submitterInfo = data.userEmail || data.userId || 'Desconocido';
        item.innerHTML = ` <h4>${escapeHTML(data.title || 'Sin Título')}</h4> ${data.url ? `<p><strong>URL:</strong> <a href="${escapeHTML(data.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(data.url)}</a></p>` : ''} <p><strong>Razón:</strong> ${escapeHTML(data.reason || 'N/A')}</p> <p><small>Solicitado por: ${escapeHTML(submitterInfo)} el ${requestDate}</small></p> <div class="request-actions"> <button class="button-approve small" data-id="${id}">Aprobar</button> <button class="button-reject small" data-id="${id}">Rechazar</button> </div> `;
        item.querySelector('.button-approve').addEventListener('click', () => handleApproveRequest(id, data)); item.querySelector('.button-reject').addEventListener('click', () => handleRejectRequest(id)); requestsListContainer.appendChild(item);
    }
    function handleApproveRequest(id, data) { /* ... (código igual que antes) ... */
        console.log("Approving request:", id, data); if(videoTitleInput) videoTitleInput.value = data.title || ''; if(videoDescriptionInput) videoDescriptionInput.value = data.reason || ''; if(videoUrlInput) videoUrlInput.value = data.url || ''; if(posterUrlInput) posterUrlInput.value = ''; if(requestIdToApproveInput) requestIdToApproveInput.value = id; if(addVideoForm) addVideoForm.querySelector('input[name="sourceType"][value="url"]').checked = true; if(videoGenreInput) videoGenreInput.value = ''; toggleElement(viewRequestsModal, false); toggleElement(addVideoModal, true); showStatusMessage(addVideoStatus, window.translations?.[window.currentLang || 'es']?.request_approved_fill_form || "Request approved...", 'info');
    }
    function handleRejectRequest(id) { /* ... (código igual que antes) ... */
         const confirmReject = confirm(window.translations?.[window.currentLang || 'es']?.confirm_reject_request || "Are you sure?"); if (confirmReject) { console.log("Rejecting request:", id); updateRequestStatus(id, 'rejected'); }
    }
    function updateRequestStatus(id, status) { /* ... (código igual que antes) ... */
        const requestRef = ref(db, `videoRequests/${id}/status`); set(requestRef, status) .then(() => { console.log(`Request ${id} status updated to ${status}`); showStatusMessage(viewRequestsStatus, `Solicitud ${status === 'rejected' ? 'rechazada' : 'procesada'}.`, 'success', 3000); const itemElement = requestsListContainer?.querySelector(`.request-item[data-request-id="${id}"]`); if(itemElement) itemElement.remove(); }) .catch(error => { console.error(`Error updating request ${id} status:`, error); showStatusMessage(viewRequestsStatus, `Error actualizando estado: ${error.message}`, 'error'); });
    }

    console.log("Admin logic initialized.");

}
