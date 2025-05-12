// Imports Firebase (CORREGIDO)
import { // Solo initializeApp se importa de firebase-app si lo necesitaras aquí, pero ya está en HTML
    // initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // <-- CORREGIDO
import {
    getDatabase, ref, onValue, push, set, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Listener principal DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("[MAIN] DOMContentLoaded event fired.");
    if (window.firebaseApp) {
        console.log("[MAIN] Firebase App already available on DOMContentLoaded.");
        initializeAppLogic();
    } else {
        console.warn("[MAIN] Firebase not ready on DOMContentLoaded, waiting for 'firebase-ready' event...");
        document.addEventListener('firebase-ready', initializeAppLogic, { once: true });
    }
});

// --- Función Principal App Logic ---
function initializeAppLogic() {
    console.log("[MAIN] Initializing App Logic...");

    // --- Funciones Utilitarias (MOVIDAS AL PRINCIPIO) ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);
    const saveToLocalStorage = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error("LocalStorage save error:", e); } };
    const loadFromLocalStorage = (key, defaultValue) => { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : defaultValue; } catch (e) { console.error("LocalStorage load error:", e); return defaultValue; } };
    function showLoginError(errorCode) { if (!loginErrorMessage) return; const lang = getCurrentLang(); const message = translations[lang]?.[errorCode] || translations[lang]?.['error_default'] || `Error: ${errorCode}`; loginErrorMessage.textContent = message; loginErrorMessage.style.display = 'block'; }
    function hideLoginError() { if (loginErrorMessage) { loginErrorMessage.textContent = ''; loginErrorMessage.style.display = 'none'; } }
    function escapeHTML(str) { const div = document.createElement('div'); div.appendChild(document.createTextNode(str || '')); return div.innerHTML; }
    function formatViews(views) { if (views === undefined || views === null) return '---'; if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M'; if (views >= 1000) return (views / 1000).toFixed(1) + 'K'; return views.toString(); }
    function formatDate(timestamp) { if (!timestamp) return '---'; try { const date = new Date(timestamp); return date.toLocaleDateString(currentLang + '-' + currentLang.toUpperCase(), { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { console.error("Error formatting date:", e); return 'Fecha inválida'; } }
    function showStatusMessage(element, message, type = 'info', autoHideDelay = 0) { if (!element) return; element.textContent = message; element.className = 'admin-status'; element.classList.add(type); element.style.display = 'block'; if (autoHideDelay > 0) setTimeout(() => { if(element) element.style.display = 'none'; }, autoHideDelay); }


    // --- 0. Firebase Services y Constantes ---
    if (!window.firebaseApp) {
        console.error("[MAIN] FATAL: Firebase App object not found in initializeAppLogic!");
        const criticalErrorMsg = `<div style="color:red; background:black; padding:20px; border: 2px solid red; text-align:center; position:fixed; top:10px; left:10px; right:10px; z-index:9999;"><h1>Error Crítico</h1><p>No se pudo conectar con los servicios principales. La aplicación no puede continuar.</p><p>Por favor, revisa la consola (F12) para más detalles.</p></div>`;
        if(document.body) document.body.insertAdjacentHTML('afterbegin', criticalErrorMsg);
        return;
    }
    const auth = getAuth(window.firebaseApp); // Usar getAuth importado
    const db = getDatabase(window.firebaseApp);   // Usar getDatabase importado
    const ADMIN_EMAILS = ["santosramonsteven@gmail.com", "evilgado6@gmail.com"];

    // --- 1. Selectores Globales ---
    console.log("[SELECTORS] Getting global elements...");
    const body = document.body; const root = document.documentElement;
    const headerLogo = $('#header-logo'); const mainContent = $('#main-content');
    const introAnimation = $('#intro-animation'); const userAuthButton = $('#user-auth-button');
    console.log("[SELECTORS] mainContent:", mainContent);
    console.log("[SELECTORS] introAnimation:", introAnimation);

    const userPhotoElement = document.createElement('img'); userPhotoElement.alt = 'User'; userPhotoElement.style.display = 'none';
    if (userAuthButton) userAuthButton.appendChild(userPhotoElement);
    const userIconElement = userAuthButton?.querySelector('i.fa-user');
    // Login Modal
    const loginModal = $('#login-modal'); const loginEmailInput = $('#login-email');
    const loginPasswordInput = $('#login-password'); const signUpButton = $('#signup-button');
    const signInButton = $('#signin-button'); const googleSignInButton = $('#google-signin-button');
    const loginErrorMessage = $('#login-error-message');
    // Settings Panel
    const settingsPanel = $('#settings-panel'); const settingsButton = $('#settings-button');
    const closeSettingsButton = $('#close-settings-button');
    // Admin FAB
    const adminFab = $('#admin-fab');
    // User Request Video
    const requestVideoButton = $('#request-video-button');
    const requestVideoModal = $('#request-video-modal'); const closeRequestVideoModal = $('#close-request-video-modal');
    const requestVideoForm = $('#request-video-form'); const requestTitleInput = $('#request-title');
    const requestUrlInput = $('#request-url'); const requestReasonInput = $('#request-reason');
    const submitRequestButton = $('#submit-request-button'); const requestVideoStatus = $('#request-video-status');
    // Sidebar Chat (para updateAuthButtonUI)
    const sidebarUserPhoto = $('#sidebar-user-photo'); const sidebarUserName = $('#sidebar-user-name');

    // --- 2. Estado ---
    let currentLang = 'es'; let particlesActive = true; let currentUser = null; let isAdmin = false;
    let userSettings = {};

    // --- 3. Translations ---
    const translations = {
        es: { index_page_title: "Inicio - Pornitoo", search_placeholder: "Buscar títulos...", search_button: "Buscar", login_tooltip: "Iniciar sesión", chat_tooltip: "Ir al Chat", settings_tooltip: "Configuración", popular_title: "Populares Ahora", loading: "Cargando...", settings_title: "Ajustes", settings_theme_title: "Tema de Color", settings_language_title: "Idioma", lang_es: "Español", lang_en: "English", settings_display_options: "Opciones de Visualización", settings_particles: "Efecto Partículas", settings_items_per_page: "Elementos por página:", settings_font_size: "Tamaño de Fuente Global:", settings_autoplay: "Autoplay Videos en Detalle", settings_notifications: "Notificaciones (Simulado)", settings_email_notif: "Notificaciones por Email", settings_push_notif: "Notificaciones Push", settings_privacy: "Privacidad (Simulado)", settings_show_online: "Mostrar Estado Online", settings_clear_search: "Limpiar Historial de Búsqueda", settings_clear_button: "Limpiar", settings_accessibility: "Accesibilidad (Simulado)", settings_high_contrast: "Modo Alto Contraste", settings_tts: "Habilitar Texto a Voz", settings_more_soon: "(Más ajustes próximamente...)", login_modal_title: "Iniciar Sesión / Registro", login_email_label: "Correo Electrónico", login_password_label: "Contraseña", login_signup_button: "Registrarse", login_signin_button: "Iniciar Sesión", login_divider_or: "O", login_google_firebase: "Continuar con Google", login_modal_text_firebase: "Regístrate o inicia sesión para acceder a todas las funciones.", back_button: "Volver", views_count: "Vistas", published_date: "Publicado:", related_videos_title: "Más Videos", description_title: "Descripción", comments_title: "Comentarios", logout_tooltip: "Cerrar sesión", chat_page_title: "Chat General", chat_loading: "Cargando mensajes...", chat_input_placeholder: "Escribe un mensaje...", no_related_videos: "No hay videos relacionados.", login_needed_for_chat: "Inicia sesión para chatear", login_needed_to_comment: "Inicia sesión para comentar", comment_placeholder: "Escribe tu comentario...", comment_send_button: "Enviar", suggest_video: "Sugerir Video", suggest_video_title: "Sugerir un Video", request_title_label: "Título del Video:", request_url_label: "URL del Video (Opcional):", request_url_placeholder: "Enlace a YouTube, Vimeo, Drive, etc.", request_reason_label: "Descripción o Razón:", request_reason_placeholder: "¿Por qué deberíamos añadir este video?", submit_suggestion_button: "Enviar Sugerencia", request_sent_success: "Sugerencia enviada. ¡Gracias!", login_needed_to_suggest: "Inicia sesión para sugerir videos", "auth/invalid-email": "Correo no válido.", "auth/user-disabled": "Cuenta deshabilitada.", "auth/email-already-in-use": "Correo ya registrado.", "auth/weak-password": "Contraseña >6 caracteres.", "auth/operation-not-allowed": "Login por correo no habilitado.", "auth/invalid-credential": "Credenciales inválidas.", "auth/missing-password": "Falta contraseña.", "auth/network-request-failed": "Error de red.", "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.", "auth/popup-closed-by-user": "Login cancelado.", "error_default": "Error inesperado." },
        en: { index_page_title: "Home - Pornitoo", search_placeholder: "Search titles...", search_button: "Search", login_tooltip: "Login", chat_tooltip: "Go to Chat", settings_tooltip: "Settings", popular_title: "Popular Now", loading: "Loading...", settings_title: "Settings", settings_theme_title: "Color Theme", settings_language_title: "Language", lang_es: "Spanish", lang_en: "English", settings_display_options: "Display Options", settings_particles: "Particle Effect", settings_items_per_page: "Items per page:", settings_font_size: "Global Font Size:", settings_autoplay: "Autoplay Videos in Detail", settings_notifications: "Notifications (Simulated)", settings_email_notif: "Email Notifications", settings_push_notif: "Push Notifications", settings_privacy: "Privacy (Simulated)", settings_show_online: "Show Online Status", settings_clear_search: "Clear Search History", settings_clear_button: "Clear", settings_accessibility: "Accessibility (Simulated)", settings_high_contrast: "High Contrast Mode", settings_tts: "Enable Text-to-Speech", settings_more_soon: "(More settings coming soon...)", login_modal_title: "Login / Sign Up", login_email_label: "Email Address", login_password_label: "Password", login_signup_button: "Sign Up", login_signin_button: "Sign In", login_divider_or: "OR", login_google_firebase: "Continue with Google", login_modal_text_firebase: "Sign up or log in to access all features.", back_button: "Back", views_count: "Views", published_date: "Published:", related_videos_title: "More Videos", description_title: "Description", comments_title: "Comments", logout_tooltip: "Sign out", chat_page_title: "General Chat", chat_loading: "Loading messages...", chat_input_placeholder: "Type a message...", no_related_videos: "No related videos found.", login_needed_for_chat: "Log in to chat", login_needed_to_comment: "Log in to comment", comment_placeholder: "Write your comment...", comment_send_button: "Send", suggest_video: "Suggest Video", suggest_video_title: "Suggest a Video", request_title_label: "Video Title:", request_url_label: "Video URL (Optional):", request_url_placeholder: "Link to YouTube, Vimeo, Drive, etc.", request_reason_label: "Description or Reason:", request_reason_placeholder: "Why should we add this video?", submit_suggestion_button: "Send Suggestion", request_sent_success: "Suggestion sent. Thank you!", login_needed_to_suggest: "Log in to suggest videos", "auth/invalid-email": "Invalid email.", "auth/user-disabled": "Account disabled.", "auth/email-already-in-use": "Email already registered.", "auth/weak-password": "Password >6 chars.", "auth/operation-not-allowed": "Email login not enabled.", "auth/invalid-credential": "Invalid credentials.", "auth/missing-password": "Password missing.", "auth/network-request-failed": "Network error.", "auth/too-many-requests": "Too many attempts. Try later.", "auth/popup-closed-by-user": "Login canceled.", "error_default": "Unexpected error." }
    };

    // --- 5. Gestor de Temas ---
    const themeManager = (() => { /* ... (código idéntico) ... */ })();

    // --- 6. Gestor de Idioma ---
    const languageManager = (() => { /* ... (código idéntico) ... */ })();

    // --- 7. Gestor de Partículas ---
    const particleManager = (() => { /* ... (código idéntico) ... */ })();

    // --- 8. Gestor de UI (Modales Comunes) ---
    const uiManager = (() => { /* ... (código idéntico) ... */ })();
    window.uiManager = uiManager; // Hacer accesible globalmente si otros scripts lo necesitan

    // --- 9. Gestor de Autenticación ---
    const authManager = (() => { /* ... (código idéntico, incluyendo la redirección del adminFab a admin.html) ... */ })();

    // --- 10. Update UI Auth Button/Sidebar ---
    function updateAuthButtonUI(user) { /* ... (código idéntico) ... */ }

    // --- 11. Lógica Específica de Página (Posters y Detalle) ---
    const pageLogic = (() => { /* ... (código idéntico) ... */ })();

    // --- 12. Funciones de Comentarios (Detail Page) ---
    function loadComments(videoId) { /* ... (código idéntico) ... */ }
    function displayComment(key, data) { /* ... (código idéntico) ... */ }
    function setupCommentForm(videoId) { /* ... (código idéntico) ... */ }

    // --- 13. Lógica Formulario Sugerencia (Usuario) ---
    function setupRequestForm() { /* ... (código idéntico para habilitar/deshabilitar) ... */ }
    if (requestVideoForm) { requestVideoForm.addEventListener('submit', async (e) => { /* ... (código idéntico) ... */ }); }

    // --- 14. Lógica de Ajustes Avanzados ---
    const settingsManager = (() => { /* ... (código idéntico) ... */ })();

    // --- 15. Inicialización General de Módulos y Lógica de Intro ---
    function startAppModules() {
        console.log("[START] Starting App Modules...");
        themeManager.init();
        languageManager.init();
        particleManager.init();
        uiManager.init();
        settingsManager.init();
        authManager.init();
        pageLogic.init();

        console.log("[INTRO] Checking intro animation elements...");
        console.log("[INTRO] introAnimation element:", introAnimation);
        console.log("[INTRO] mainContent element:", mainContent);
        try {
            if (introAnimation && mainContent) {
                const introPlayed = loadFromLocalStorage('introPlayedOncePornitoo', 'false') === 'true';
                const introDelay = introPlayed ? 0 : 2800; const fadeDuration = 500;
                console.log(`[INTRO] introPlayed: ${introPlayed}, introDelay: ${introDelay}`);
                if (introDelay > 0) {
                    console.log("[INTRO] Running intro animation sequence.");
                    mainContent.style.opacity = '0'; mainContent.style.transition = 'none';
                    introAnimation.style.display = 'flex'; introAnimation.style.opacity = '1';
                    setTimeout(() => {
                        console.log("[INTRO] Timeout 1: Fading out intro, fading in main content.");
                        introAnimation.style.opacity = '0'; introAnimation.style.pointerEvents = 'none';
                        mainContent.style.transition = `opacity ${fadeDuration}ms ease-in-out`; mainContent.style.opacity = '1';
                        setTimeout(() => { console.log("[INTRO] Timeout 2: Hiding intro element completely."); introAnimation.style.display = 'none'; }, fadeDuration);
                        saveToLocalStorage('introPlayedOncePornitoo', 'true');
                    }, introDelay);
                } else {
                    console.log("[INTRO] Skipping intro animation (already played or delay is 0).");
                    introAnimation.style.display = 'none'; mainContent.style.opacity = '1'; mainContent.style.transition = 'none';
                }
            } else {
                console.warn("[INTRO] Intro animation or main content element not found. Skipping intro.");
                if (mainContent) { mainContent.style.opacity = '1'; mainContent.style.transition = 'none'; }
                else { console.error("[INTRO] CRITICAL: mainContent element not found!"); }
            }
        } catch (error) {
            console.error("[INTRO] Error during intro animation logic:", error);
            if (introAnimation) introAnimation.style.display = 'none';
            if (mainContent) { mainContent.style.opacity = '1'; mainContent.style.transition = 'none'; }
        }
        console.log("[START] App Modules Initialized.");
    }

    startAppModules();

} // --- Fin initializeAppLogic ---
