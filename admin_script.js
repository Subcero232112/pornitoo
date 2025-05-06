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
    const adminPanel = document.getElementById('admin-panel'); // <-- Selector clave
    console.log("Admin Panel Element Selected (in initializeAppAdminLogic):", adminPanel); // <-- DEBUG: Verifica si se encuentra el panel
    const closeAdminPanelButton = document.getElementById('close-admin-panel-button');
    const adminUploadVideoBtn = document.getElementById('admin-upload-video-btn');
    const adminViewRequestsBtn = document.getElementById('admin-view-requests-btn');
    // ... (otros selectores iguales que antes) ...
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
     function showStatusMessage(element, message, type = 'info', autoHideDelay = 0) { /* ... (igual que antes) ... */ }
     // Función para toggle simple
     function toggleElement(element, forceState) {
        if (!element) { console.warn("toggleElement called with null element"); return; }
        const currentlyVisible = element.classList.contains('visible') || element.style.display === 'block' || element.style.display === 'flex';
        const shouldBeVisible = forceState === undefined ? !currentlyVisible : forceState;
        const isModal = element.classList.contains('modal');
        const isPanel = element.classList.contains('panel') || element.classList.contains('admin-panel') || element.classList.contains('settings-panel');

        if (isModal || isPanel) {
             element.classList.toggle('visible', shouldBeVisible);
             console.log(`Toggled 'visible' class for ${element.id || 'element'}: ${shouldBeVisible}`);
        } else {
             const displayStyle = shouldBeVisible ? (element.tagName === 'BUTTON' || element.tagName === 'DIV' ? 'flex' : 'block') : 'none';
             element.style.display = displayStyle;
             console.log(`Toggled display style for ${element.id || 'element'}: ${displayStyle}`);
        }
        if (!shouldBeVisible) { /* ... (cleanup igual que antes) ... */ }
     }


    // --- Lógica de Visibilidad Admin/User y Setup Formularios ---
    onAuthStateChanged(auth, (user) => { /* ... (código igual que antes) ... */ });

    // --- Listeners UI Admin/Sugerencias ---

    // Panel Admin (Botón flotante)
    console.log("Admin FAB Element Selected (before listener):", adminFab); // <-- DEBUG: Verifica si se encuentra el botón
    if (adminFab) {
         adminFab.addEventListener('click', (e) => {
             console.log("Admin FAB clicked! (Listener executing)"); // <-- DEBUG: Confirma ejecución
             e.stopPropagation();
             if (adminPanel) {
                 console.log("Admin Panel found inside listener, calling toggleElement..."); // <-- DEBUG: Confirma que encuentra el panel aquí
                 toggleElement(adminPanel); // <-- INTENTA ABRIR/CERRAR EL PANEL
                 // Loggear estado DESPUÉS de intentar el toggle
                 console.log(`Admin Panel toggled. Has 'visible' class now: ${adminPanel.classList.contains('visible')}`);
                 // Forzar lectura de estilo computado puede ser útil
                 if (window.getComputedStyle) {
                    console.log(`Admin Panel computed display: ${window.getComputedStyle(adminPanel).display}`);
                    console.log(`Admin Panel computed left: ${window.getComputedStyle(adminPanel).left}`);
                    console.log(`Admin Panel computed opacity: ${window.getComputedStyle(adminPanel).opacity}`);
                    console.log(`Admin Panel computed visibility: ${window.getComputedStyle(adminPanel).visibility}`);
                 }
             } else {
                 console.error("Admin Panel element (#admin-panel) was null inside click listener!"); // <-- DEBUG: Error si no encuentra el panel
             }
         });
         console.log("Click listener successfully added to Admin FAB."); // <-- DEBUG: Confirma que se añadió
    } else {
        console.error("Element #admin-fab not found when trying to add listener."); // <-- DEBUG: Error si no encuentra el botón
    }

    // ... (Resto de listeners para close buttons, otros botones admin, forms, etc., igual que antes) ...
     // Botón cerrar Panel Admin
    if (closeAdminPanelButton) { closeAdminPanelButton.addEventListener('click', () => toggleElement(adminPanel, false)); }
    document.addEventListener('click', (e) => { if (adminPanel?.classList.contains('visible') && !adminPanel.contains(e.target) && e.target !== adminFab && !adminFab?.contains(e.target)) { toggleElement(adminPanel, false); } }, true);
    if (adminUploadVideoBtn) adminUploadVideoBtn.addEventListener('click', () => { toggleElement(addVideoModal, true); toggleElement(adminPanel, false); addVideoForm?.reset(); requestIdToApproveInput.value=''; showStatusMessage(addVideoStatus,'');});
    if (adminViewRequestsBtn) adminViewRequestsBtn.addEventListener('click', () => { loadVideoRequests(); toggleElement(viewRequestsModal, true); toggleElement(adminPanel, false); });
    document.getElementById('admin-ban-user-btn')?.addEventListener('click', () => alert("Función Banear no implementada."));
    document.getElementById('admin-kick-user-btn')?.addEventListener('click', () => alert("Función Kick no implementada."));
    if (closeAddVideoModal) closeAddVideoModal.addEventListener('click', () => toggleElement(addVideoModal, false));
    if (closeViewRequestsModal) closeViewRequestsModal.addEventListener('click', () => toggleElement(viewRequestsModal, false));
    if (closeRequestVideoModal) closeRequestVideoModal.addEventListener('click', () => toggleElement(requestVideoModal, false));
    if(addVideoModal) addVideoModal.addEventListener('click', (e) => { if(e.target === addVideoModal) toggleElement(addVideoModal, false); });
    if(viewRequestsModal) viewRequestsModal.addEventListener('click', (e) => { if(e.target === viewRequestsModal) toggleElement(viewRequestsModal, false); });
    if(requestVideoModal) requestVideoModal.addEventListener('click', (e) => { if(e.target === requestVideoModal) toggleElement(requestVideoModal, false); });
    if (requestVideoButton) requestVideoButton.addEventListener('click', () => { if(currentAdminUser) { toggleElement(requestVideoModal, true); requestVideoForm?.reset(); showStatusMessage(requestVideoStatus, '', 'info', 0); } else { alert("Inicia sesión para sugerir"); } });


    // --- Lógica de Formularios ---
    // Formulario Subir Video (Admin)
    if (addVideoForm) { addVideoForm.addEventListener('submit', async (e) => { /* ... (código igual) ... */ }); }
    // Formulario Sugerir Video (Usuario)
    if (requestVideoForm) { requestVideoForm.addEventListener('submit', async (e) => { /* ... (código igual) ... */ }); }

    // --- Lógica de Ver/Gestionar Solicitudes (Admin) ---
    function loadVideoRequests() { /* ... (código igual) ... */ }
    function displayVideoRequest(id, data) { /* ... (código igual) ... */ }
    function handleApproveRequest(id, data) { /* ... (código igual) ... */ }
    function handleRejectRequest(id) { /* ... (código igual) ... */ }
    function updateRequestStatus(id, status) { /* ... (código igual) ... */ }

    console.log("Admin logic initialized.");

} // --- Fin initializeAppAdminLogic ---
