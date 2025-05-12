// Imports Firebase (Auth, Realtime Database)
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);
    const ADMIN_EMAILS = ["santosramonsteven@gmail.com", "evilgado6@gmail.com"];

    // --- 1. Selectores Globales ---
    console.log("[SELECTORS] Getting global elements...");
    const body = document.body; const root = document.documentElement;
    const headerLogo = $('#header-logo'); const mainContent = $('#main-content');
    const introAnimation = $('#intro-animation'); // Todavía lo seleccionamos para ocultarlo
    const userAuthButton = $('#user-auth-button');
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
    const themeManager = (() => {
        const swatches = $$('.theme-swatch');
        const themes = { green: { '--primary-color': '#00ff00', '--neon-glow': '0 0 10px rgba(0, 255, 0, 0.7)' }, red: { '--primary-color': '#ff1a1a', '--neon-glow': '0 0 12px rgba(255, 26, 26, 0.8)' }, purple: { '--primary-color': '#9933ff', '--neon-glow': '0 0 12px rgba(153, 51, 255, 0.8)' }, blue: { '--primary-color': '#007bff', '--neon-glow': '0 0 10px rgba(0, 123, 255, 0.7)' }};
        function applyTheme(themeName) { const theme = themes[themeName]; if (!theme) { console.warn(`Theme '${themeName}' not found...`); themeName = 'green'; } const activeTheme = themes[themeName]; Object.entries(activeTheme).forEach(([variable, value]) => { root.style.setProperty(variable, value); }); swatches.forEach(swatch => { swatch.classList.toggle('active', swatch.dataset.theme === themeName); }); updatePlaceholderImageColors(activeTheme['--primary-color'] || themes.green['--primary-color']); saveToLocalStorage('selectedThemePornitoo', themeName); }
        function updatePlaceholderImageColors(colorHex) { const color = colorHex.substring(1); $$('img[src*="via.placeholder.com"]').forEach(img => { const currentSrc = img.getAttribute('src'); if (!currentSrc) return; let newSrc = currentSrc; const colorRegex = /\/([0-9a-fA-F]{3,6})\?text=/; if (currentSrc.includes('/theme?text=')) { newSrc = currentSrc.replace('/theme?text=', `/${color}?text=`); } else { const match = currentSrc.match(colorRegex); if (match && match[1]) { newSrc = currentSrc.replace(colorRegex, `/${color}?text=`); } } if (newSrc !== currentSrc) { img.src = newSrc; } }); }
        function init() { swatches.forEach(swatch => { swatch.addEventListener('click', () => applyTheme(swatch.dataset.theme)); }); const savedTheme = loadFromLocalStorage('selectedThemePornitoo', 'green'); applyTheme(savedTheme); }
        return { init, applyTheme };
    })();

    // --- 6. Gestor de Idioma ---
    const languageManager = (() => {
        const langButtons = $$('.language-button');
        function setLanguage(lang) {
            if (!translations[lang]) { console.warn(`Language data for '${lang}' not found. Defaulting to '${currentLang}'.`); lang = currentLang; }
            console.log(`Setting language to: ${lang}`); currentLang = lang; document.documentElement.lang = lang; window.currentLang = lang;
            $$('[data-translate-key]').forEach(el => {
                const key = el.dataset.translateKey; const translation = translations[lang]?.[key];
                if (translation !== undefined) {
                    if (el.placeholder !== undefined) { el.placeholder = translation; }
                    else if (el.dataset.tooltip !== undefined) { el.dataset.tooltip = translation; if(el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'I') { el.setAttribute('title', translation); } }
                    else if (el.title !== undefined && !el.dataset.tooltip) { el.title = translation; }
                    else { el.textContent = translation; }
                }
            });
            updateAuthButtonUI(currentUser); langButtons.forEach(button => { button.classList.toggle('active', button.dataset.lang === lang); });
            saveToLocalStorage('selectedLangPornitoo', lang);
        }
        function getCurrentLang() { return currentLang; }
        function init() { langButtons.forEach(button => { button.addEventListener('click', (e) => { const newLang = e.target.dataset.lang; if (newLang) setLanguage(newLang); }); }); const savedLang = loadFromLocalStorage('selectedLangPornitoo', 'es'); currentLang = savedLang; window.currentLang = currentLang; }
        return { init, setLanguage, getCurrentLang };
    })();

    // --- 7. Gestor de Partículas ---
    const particleManager = (() => {
        const container = $('#particles'); const toggle = $('#particle-toggle'); let isActive = true;
        function createParticles(count = 50) { if (!container || !root) return; container.innerHTML = ''; const currentPrimaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim(); if (!currentPrimaryColor) { console.warn("Could not get primary color for particles."); return; } for (let i = 0; i < count; i++) { const particle = document.createElement('div'); particle.classList.add('particle'); particle.style.backgroundColor = currentPrimaryColor; const size = Math.random() * 3 + 1; particle.style.width = `${size}px`; particle.style.height = `${size}px`; const xStart = Math.random() * 100; particle.style.left = `${xStart}vw`; particle.style.setProperty('--x-start', `${xStart}vw`); particle.style.setProperty('--x-end', `${xStart + (Math.random() * 40 - 20)}vw`); const duration = Math.random() * 20 + 15; particle.style.animationDuration = `${duration}s`; particle.style.animationDelay = `-${Math.random() * duration}s`; container.appendChild(particle); } container.classList.toggle('active', isActive); }
        function toggleParticles(forceState) { isActive = forceState !== undefined ? forceState : !isActive; if(container) container.classList.toggle('active', isActive); if(toggle) toggle.checked = isActive; saveToLocalStorage('particlesActivePornitoo', isActive); }
        function init() { isActive = loadFromLocalStorage('particlesActivePornitoo', 'true') === 'true'; if (toggle) { toggle.checked = isActive; toggle.addEventListener('change', () => toggleParticles(toggle.checked)); } if (container && isActive) { setTimeout(createParticles, 100); } else if (container) { container.classList.remove('active'); } }
        return { init, toggle: toggleParticles, create: createParticles };
    })();

    // --- 8. Gestor de UI (Modales Comunes) ---
    const uiManager = (() => {
        function togglePanel(panel, forceState) { if (!panel) return; const isVisible = panel.classList.contains('visible'); const shouldBeVisible = forceState === undefined ? !isVisible : forceState; if (isVisible !== shouldBeVisible) { panel.classList.toggle('visible', shouldBeVisible); } }
        function toggleModal(modal, forceState) { if (!modal) return; const isVisible = modal.classList.contains('visible'); const shouldBeVisible = forceState === undefined ? !isVisible : forceState; if (isVisible !== shouldBeVisible) { modal.classList.toggle('visible', shouldBeVisible); } if (shouldBeVisible) hideLoginError(); if (!shouldBeVisible) { if(modal === requestVideoModal) requestVideoForm?.reset(); } }
        function init() {
             if (settingsButton && settingsPanel && closeSettingsButton) { settingsButton.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(settingsPanel); }); closeSettingsButton.addEventListener('click', () => togglePanel(settingsPanel, false)); document.addEventListener('click', (e) => { if (settingsPanel?.classList.contains('visible') && !settingsPanel.contains(e.target) && e.target !== settingsButton && !settingsButton?.contains(e.target)) { togglePanel(settingsPanel, false); } }, true); }
             if (loginModal && $('#close-login-modal')) { $('#close-login-modal').addEventListener('click', () => toggleModal(loginModal, false)); loginModal.addEventListener('click', (e) => { if (e.target === loginModal) toggleModal(loginModal, false); }); if (googleSignInButton) googleSignInButton.addEventListener('click', () => { hideLoginError(); authManager.signInWithGoogle(); }); if (signUpButton) signUpButton.addEventListener('click', () => { hideLoginError(); authManager.signUpWithEmailPassword(loginEmailInput.value, loginPasswordInput.value); }); if (signInButton) signInButton.addEventListener('click', () => { hideLoginError(); authManager.signInWithEmailPassword(loginEmailInput.value, loginPasswordInput.value); }); }
             if(requestVideoButton) requestVideoButton.addEventListener('click', () => { if(currentUser) { toggleModal(requestVideoModal, true); requestVideoForm?.reset(); showStatusMessage(requestVideoStatus, '', 'info', 0); } else { alert(translations[currentLang]?.login_needed_to_suggest || "Log in to suggest videos"); toggleModal(loginModal, true); } });
             if(requestVideoModal && closeRequestVideoModal) closeRequestVideoModal.addEventListener('click', () => toggleModal(requestVideoModal, false));
             if(requestVideoModal) requestVideoModal.addEventListener('click', (e) => { if(e.target === requestVideoModal) toggleModal(requestVideoModal, false); });
        }
        window.uiManager = { toggleModal };
        return { init, toggleModal, togglePanel };
    })();

    // --- 9. Gestor de Autenticación ---
    const authManager = (() => {
        const googleProvider = new GoogleAuthProvider();
        async function signInWithGoogle() { if(googleSignInButton) googleSignInButton.disabled = true; try {const r = await signInWithPopup(auth, googleProvider); console.log("Google Sign-In OK:",r.user.displayName); uiManager.toggleModal(loginModal, false);} catch(e){console.error("Google Sign-In Error:",e.code,e.message); showLoginError(e.code);} finally {if(googleSignInButton)googleSignInButton.disabled=false;} }
        async function signUpWithEmailPassword(email, password) { if(!email||!password){showLoginError("auth/missing-password");return;} if(signUpButton)signUpButton.disabled=true; if(signInButton)signInButton.disabled=true; try {const c=await createUserWithEmailAndPassword(auth,email,password); console.log("Sign Up OK:", c.user.uid); uiManager.toggleModal(loginModal, false);} catch(e){console.error("Sign Up Error:",e.code,e.message); showLoginError(e.code);} finally {if(signUpButton)signUpButton.disabled=false; if(signInButton)signInButton.disabled=false;} }
        async function signInWithEmailPassword(email, password) { if(!email||!password){showLoginError("auth/missing-password");return;} if(signUpButton)signUpButton.disabled=true; if(signInButton)signInButton.disabled=true; try {const c=await signInWithEmailAndPassword(auth,email,password); console.log("Sign In OK:", c.user.uid); uiManager.toggleModal(loginModal, false);} catch(e){console.error("Sign In Error:",e.code,e.message); let ec=e.code==='auth/user-not-found'||e.code==='auth/wrong-password'?'auth/invalid-credential':e.code; showLoginError(ec);} finally {if(signUpButton)signUpButton.disabled=false; if(signInButton)signInButton.disabled=false;} }
        async function logoutUser() { try {await signOut(auth);console.log("Sign Out OK");}catch(e){console.error("Sign Out Error",e);alert(`Error: ${e.message}`);} }
        function checkAdminStatus(user) { if (!user || !user.email) return false; return ADMIN_EMAILS.includes(user.email.toLowerCase()); }
        function init() {
            onAuthStateChanged(auth, (user) => {
                 console.log("Main Script Auth State Changed:", user ? `User Logged In (${user.uid})` : "User Logged Out");
                 const wasLoggedIn = !!currentUser; currentUser = user; isAdmin = checkAdminStatus(user);
                 updateAuthButtonUI(user);
                 if (adminFab) adminFab.style.display = isAdmin ? 'flex' : 'none';
                 if (requestVideoButton) requestVideoButton.style.display = (user && !isAdmin) ? 'flex' : 'none';
                 if (!wasLoggedIn || !user) { languageManager.setLanguage(languageManager.getCurrentLang()); }
                 if (document.getElementById('detail-view-container')) { const detailVideoId = new URLSearchParams(window.location.search).get('id'); if (detailVideoId) setupCommentForm(detailVideoId); }
                 setupRequestForm();
            });
            if (userAuthButton) { userAuthButton.addEventListener('click', () => { if (currentUser) { logoutUser(); } else { hideLoginError(); uiManager.toggleModal(loginModal, true); } }); }
            if (adminFab) { adminFab.addEventListener('click', () => { if (isAdmin) { console.log("Admin FAB clicked, redirecting to admin.html"); window.location.href = 'admin.html'; } }); }
        }
        function getCurrentUser() { return currentUser; }
        function isUserAdmin() { return isAdmin; }
        return { init, signInWithGoogle, signUpWithEmailPassword, signInWithEmailPassword, logoutUser, getCurrentUser, isUserAdmin };
    })();

    // --- 10. Update UI Auth Button/Sidebar ---
    function updateAuthButtonUI(user) {
         const userAuthBtn = $('#user-auth-button'); const userPhoto = userAuthBtn?.querySelector('img'); const userIcon = userAuthBtn?.querySelector('i.fa-user');
         const sidebarPhoto = $('#sidebar-user-photo'); const sidebarName = $('#sidebar-user-name');
         if (!userAuthBtn || !userPhoto || !userIcon) { /*console.warn("Header auth elements not found");*/ }
         const currentLang = languageManager.getCurrentLang ? languageManager.getCurrentLang() : 'es';
         if (user) {
             if(userAuthBtn) userAuthBtn.classList.add('logged-in'); const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'U')}&background=random&color=fff&size=40`;
             if(userPhoto) { userPhoto.src = photoURL; userPhoto.style.display = 'block'; } if(userIcon) userIcon.style.display = 'none';
             const logoutTooltipText = translations[currentLang]?.logout_tooltip || "Sign out"; if(userAuthBtn) { userAuthBtn.dataset.tooltip = logoutTooltipText; userAuthBtn.setAttribute('title', `${user.displayName || user.email || 'User Profile'} (${logoutTooltipText})`); }
             if (sidebarPhoto) sidebarPhoto.src = photoURL; if (sidebarName) sidebarName.textContent = user.displayName || user.email?.split('@')[0] || 'Usuario';
         } else {
             if(userAuthBtn) userAuthBtn.classList.remove('logged-in'); if(userPhoto) userPhoto.style.display = 'none'; if(userIcon) userIcon.style.display = 'block';
             const loginTooltipText = translations[currentLang]?.login_tooltip || "Login"; if(userAuthBtn) { userAuthBtn.dataset.tooltip = loginTooltipText; userAuthBtn.setAttribute('title', loginTooltipText); }
             if (sidebarPhoto) sidebarPhoto.src = 'https://via.placeholder.com/40/cccccc/ffffff?text=U'; if (sidebarName) sidebarName.textContent = 'Usuario';
         }
     }

    // --- 11. Lógica Específica de Página (Posters y Detalle) ---
    const pageLogic = (() => {
        function initIndexPage() {
            console.log("[PAGELOGIC] Initializing Index Page - Generating Posters");
            const posterContainer = $('#poster-container'); const loadingIndicator = $('#loading-indicator');
            if (!posterContainer || !loadingIndicator) { console.error("Index page elements missing for posters"); return; }
            posterContainer.innerHTML = ''; const itemsToDisplay = parseInt(userSettings.itemsPerPage || 40, 10);
            console.log(`[PAGELOGIC] Displaying ${itemsToDisplay} posters.`);
            for (let i = 1; i <= itemsToDisplay; i++) {
                const videoId = `sim-${i}`; const themeColorForPlaceholder = (getComputedStyle(root).getPropertyValue('--primary-color').trim() || '#00ff00').substring(1);
                const videoData = { title: `Video de Prueba ${i}`, posterUrl: `https://via.placeholder.com/300x300/${themeColorForPlaceholder}/000000?text=Video+${i}`};
                const defaultImgSrc = `https://via.placeholder.com/300x300/cccccc/000?text=N/A`; const errorImgSrc = `https://via.placeholder.com/300x300/ff0000/fff?text=Error`;
                const posterItem = document.createElement('a'); posterItem.href = `detail.html?id=${videoId}`; posterItem.classList.add('poster-item'); posterItem.dataset.id = videoId;
                posterItem.innerHTML = ` <div class="poster"> <img src="${videoData.posterUrl || defaultImgSrc}" alt="${videoData.title}" loading="lazy" onerror="this.onerror=null; this.src='${errorImgSrc}';"> </div> <h3 class="poster-title">${escapeHTML(videoData.title)}</h3> `;
                posterContainer.appendChild(posterItem);
            }
            themeManager.applyTheme(loadFromLocalStorage('selectedThemePornitoo', 'green')); loadingIndicator.style.display = 'none';
        }

        function initDetailPage() {
            console.log("[PAGELOGIC] Initializing Detail Page - Fetching from Firebase");
            const urlParams = new URLSearchParams(window.location.search); const itemId = urlParams.get('id');
            const pageTitleElement = $('#detail-page-title'); const detailTitle = $('#detail-title');
            const detailViews = $('#detail-views'); const detailDate = $('#detail-date');
            const detailDescription = $('#detail-description'); const videoPlayerIframe = $('#video-player-iframe');
            const relatedContainer = $('#related-items-container'); const videoLoadingIndicator = $('#video-loading-indicator');

            if (!itemId) { console.error("No item ID found in URL"); if (detailTitle) detailTitle.textContent = "Error: ID no encontrado"; if (pageTitleElement) pageTitleElement.textContent = "Error - Pornitoo"; return; }
            console.log(`[PAGELOGIC] Fetching details for video ID: ${itemId}`);
            if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'block'; if(videoPlayerIframe) videoPlayerIframe.style.opacity = '0';

            const videoRef = ref(db, 'videos/' + itemId);
            onValue(videoRef, (snapshot) => {
                if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'none'; if(videoPlayerIframe) videoPlayerIframe.style.opacity = '1';
                if (snapshot.exists()) {
                    const data = snapshot.val(); console.log("[PAGELOGIC] Video details loaded:", data);
                    const videoTitle = data.title || 'Video Sin Título';
                    if (pageTitleElement) pageTitleElement.textContent = `${videoTitle} - Pornitoo`;
                    if (detailTitle) detailTitle.textContent = videoTitle;
                    if (detailDescription) detailDescription.textContent = data.description || 'No hay descripción disponible.';
                    if (videoPlayerIframe) {
                        let finalVideoSrc = ''; const videoUrl = data.videoUrl || ''; const sourceType = data.sourceType || 'url';
                        if (!videoUrl) { console.warn("Video URL is missing"); videoPlayerIframe.style.display = 'none'; const errorMsg = document.createElement('p'); errorMsg.textContent = "Video no disponible."; errorMsg.style.color = "orange"; videoPlayerIframe.parentNode.appendChild(errorMsg); }
                        else { videoPlayerIframe.style.display = 'block'; if (sourceType === 'storage' || sourceType === 'url') { finalVideoSrc = videoUrl; } else if (sourceType === 'drive') { const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/; const match = videoUrl.match(driveRegex); if (match && match[1]) { finalVideoSrc = `https://drive.google.com/file/d/${match[1]}/preview`; } else { console.warn("Could not extract Google Drive File ID from URL:", videoUrl); finalVideoSrc = ''; videoPlayerIframe.parentNode.appendChild(document.createTextNode(" No se pudo generar enlace para Drive. ")); }} else { console.warn(`Unknown source type: ${sourceType}`); finalVideoSrc = ''; videoPlayerIframe.parentNode.appendChild(document.createTextNode(" Tipo de video no soportado. "));}}
                        if (finalVideoSrc) { videoPlayerIframe.src = finalVideoSrc; } else { videoPlayerIframe.style.display = 'none'; }
                        videoPlayerIframe.onload = () => { if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'none'; };
                        videoPlayerIframe.onerror = () => { if(videoLoadingIndicator) videoLoadingIndicator.textContent = 'Error al cargar video'; };
                    } else { if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'none'; }
                    if (detailViews) detailViews.textContent = formatViews(data.views);
                    if (detailDate) detailDate.textContent = formatDate(data.uploadTimestamp);
                    if (relatedContainer) { relatedContainer.innerHTML = ''; if (data.related && Array.isArray(data.related)) { /* Lógica para cargar relacionados */ } else { relatedContainer.innerHTML = `<p style="opacity: 0.7;">(Relacionados no disponibles)</p>`; } }
                    loadComments(itemId);
                    setupCommentForm(itemId);
                } else { console.error(`Data not found for item ID: ${itemId}`); if (detailTitle) detailTitle.textContent = "Error: Video no encontrado"; if (pageTitleElement) pageTitleElement.textContent = "Error - Pornitoo"; }
            }, (error) => { console.error(`Firebase Read Error (video/${itemId}):`, error); if(videoLoadingIndicator) videoLoadingIndicator.textContent = 'Error'; if (detailTitle) detailTitle.textContent = "Error al cargar datos"; if (pageTitleElement) pageTitleElement.textContent = "Error - Pornitoo"; });
        }

        function init() { if ($('#poster-container')) { initIndexPage(); } else if ($('#detail-view-container')) { initDetailPage(); } if (headerLogo) { headerLogo.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; }); } }
        return { init };
    })();

    // --- 12. Funciones de Comentarios (Detail Page) ---
    function loadComments(videoId) {
        const commentsContainer = document.getElementById('comments-container'); if (!commentsContainer) return;
        commentsContainer.innerHTML = `<p id="comments-loading" data-translate-key="chat_loading">${translations[currentLang]?.chat_loading || 'Loading comments...'}</p>`;
        const commentsRef = ref(db, `comments/${videoId}`);
        onValue(commentsRef, (snapshot) => {
            const loadingIndicator = document.getElementById('comments-loading'); if(loadingIndicator) loadingIndicator.remove();
            if (snapshot.exists()) {
                commentsContainer.innerHTML = ''; const commentsArray = [];
                 snapshot.forEach((childSnapshot) => { commentsArray.push({ key: childSnapshot.key, ...childSnapshot.val() }); });
                 if (commentsArray.length > 0 && commentsArray[0].timestamp) { commentsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); }
                 commentsArray.forEach(commentData => { displayComment(commentData.key, commentData); });
            } else { commentsContainer.innerHTML = `<p style="opacity: 0.7;" data-translate-key="no_comments">${translations[currentLang]?.no_comments || 'Be the first to comment.'}</p>`; }
        }, (error) => { console.error("Error loading comments:", error); commentsContainer.innerHTML = '<p style="color: red;">Error al cargar comentarios.</p>'; });
    }

    function displayComment(key, data) {
        const commentsContainer = document.getElementById('comments-container'); if (!commentsContainer || !data) return;
        const commentElement = document.createElement('div'); commentElement.classList.add('comment-item'); commentElement.id = `comment-${key}`;
        const userName = escapeHTML(data.userName || 'Anónimo'); const text = escapeHTML(data.text || '');
        const timestamp = data.timestamp ? formatDate(data.timestamp) : '';
        commentElement.innerHTML = ` <p class="comment-meta"><strong class="comment-author">${userName}</strong><span class="comment-date"> • ${timestamp}</span></p><p class="comment-text">${text}</p> `;
        commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
    }

    function setupCommentForm(videoId) {
        if (!videoId) return;
        const addCommentForm = document.getElementById('add-comment-form'); const commentInput = document.getElementById('comment-input'); const commentLoginPrompt = document.getElementById('comment-login-prompt'); const commentLoginLink = document.getElementById('comment-login-link');
        let submitCommentButton = document.getElementById('submit-comment-button');
        if (!addCommentForm || !commentInput || !submitCommentButton || !commentLoginPrompt || !commentLoginLink) { console.warn("Comment form elements not found."); return; }

        const user = authManager.getCurrentUser();
        let newSubmitButton = submitCommentButton.cloneNode(true);
        submitCommentButton.parentNode.replaceChild(newSubmitButton, submitCommentButton);
        submitCommentButton = newSubmitButton;

        commentInput.placeholder = translations[currentLang]?.comment_placeholder || "Write your comment...";
        submitCommentButton.textContent = translations[currentLang]?.comment_send_button || "Send";
        commentLoginPrompt.querySelector('span').textContent = translations[currentLang]?.login_needed_to_comment || "Log in to comment";

        if (user) {
            addCommentForm.style.display = 'block'; commentLoginPrompt.style.display = 'none';
            submitCommentButton.disabled = false;
             submitCommentButton.addEventListener('click', async () => {
                 const commentText = commentInput.value.trim(); if (commentText === '') return;
                 const commentData = { userId: user.uid, userName: user.displayName || 'Usuario Anónimo', text: commentText, timestamp: serverTimestamp() };
                 const commentsRef = ref(db, `comments/${videoId}`); const newCommentRef = push(commentsRef);
                 try {
                     submitCommentButton.disabled = true; await set(newCommentRef, commentData);
                     commentInput.value = ''; console.log("Comment added successfully!");
                 } catch (error) { console.error("Error adding comment:", error); alert("Error al enviar el comentario.");
                 } finally { submitCommentButton.disabled = false; }
             });
        } else {
            addCommentForm.style.display = 'none'; commentLoginPrompt.style.display = 'block';
            submitCommentButton.disabled = true;
             let currentLoginLink = commentLoginLink; let newLoginLink = currentLoginLink.cloneNode(true);
             currentLoginLink.parentNode.replaceChild(newLoginLink, currentLoginLink);
             newLoginLink.addEventListener('click', (e) => { e.preventDefault(); uiManager.toggleModal($('#login-modal'), true); });
        }
    }

    // --- 13. Lógica Formulario Sugerencia (Usuario) ---
    function setupRequestForm() {
        const user = authManager.getCurrentUser();
        if (requestVideoForm && submitRequestButton && requestTitleInput && requestUrlInput && requestReasonInput) {
             if(user) { requestTitleInput.disabled = false; requestUrlInput.disabled = false; requestReasonInput.disabled = false; submitRequestButton.disabled = false; }
             else { requestTitleInput.disabled = true; requestUrlInput.disabled = true; requestReasonInput.disabled = true; submitRequestButton.disabled = true; }
        }
    }
    if (requestVideoForm) {
        requestVideoForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const user = authManager.getCurrentUser();
            if (!user) { showStatusMessage(requestVideoStatus, translations[currentLang]?.login_needed_to_suggest || "Log in to suggest", 'error', 4000); return; }
            showStatusMessage(requestVideoStatus, 'Enviando...', 'info'); submitRequestButton.disabled = true;
            const title = requestTitleInput.value.trim(); const url = requestUrlInput.value.trim(); const reason = requestReasonInput.value.trim();
            if (!title || !reason) { showStatusMessage(requestVideoStatus, 'Error: Título y Razón son obligatorios.', 'error'); submitRequestButton.disabled = false; return; }
            const requestData = { title: title, url: url || null, reason: reason, status: 'pending', userId: user.uid, userEmail: user.email, timestamp: serverTimestamp() };
            try { const requestsRef = ref(db, 'videoRequests'); const newRequestRef = push(requestsRef); await set(newRequestRef, requestData); showStatusMessage(requestVideoStatus, translations[currentLang]?.request_sent_success || "Suggestion sent!", 'success', 4000); requestVideoForm.reset(); uiManager.toggleModal(requestVideoModal, false); }
            catch (error) { console.error("Error submitting video request:", error); showStatusMessage(requestVideoStatus, `Error: ${error.message}`, 'error'); }
            finally { submitRequestButton.disabled = false; }
        });
    }

    // --- 14. Lógica de Ajustes Avanzados ---
    const settingsManager = (() => {
        const defaultSettings = { particlesEnabled: true, itemsPerPage: "40", globalFontSize: "100", autoplayVideos: false, emailNotifications: true, pushNotifications: false, showOnlineStatus: true, highContrastMode: false, textToSpeechEnabled: false };
        function loadSettings() { userSettings = loadFromLocalStorage('userPornitooSettings', defaultSettings); applySettings(); updateSettingsUI(); }
        function saveSetting(key, value) { userSettings[key] = value; saveToLocalStorage('userPornitooSettings', userSettings); applySetting(key, value); }
        function applySettings() { console.log("Applying all user settings:", userSettings); Object.entries(userSettings).forEach(([key, value]) => { applySetting(key, value); }); }
        function applySetting(key, value) {
            console.log(`Applying setting: ${key} = ${value}`);
            switch (key) {
                case 'particlesEnabled': particleManager.toggle(value); break;
                case 'itemsPerPage': if (document.getElementById('poster-container')) { pageLogic.initIndexPage(); } break;
                case 'globalFontSize': document.documentElement.style.fontSize = `${value}%`; break;
                case 'autoplayVideos': console.log("Autoplay videos set to:", value); break;
                case 'highContrastMode': body.classList.toggle('high-contrast', value); console.log("High contrast mode:", value); break;
                default: break;
            }
        }
        function updateSettingsUI() {
            console.log("Updating settings UI from:", userSettings);
            document.querySelectorAll('[data-setting]').forEach(input => {
                const key = input.dataset.setting; if (userSettings.hasOwnProperty(key)) {
                    if (input.type === 'checkbox') { input.checked = userSettings[key]; }
                    else if (input.type === 'range' || input.tagName === 'SELECT') { input.value = userSettings[key]; }
                }
            });
        }
        function init() {
            loadSettings();
            document.querySelectorAll('[data-setting]').forEach(input => {
                input.addEventListener('change', (event) => { const key = event.target.dataset.setting; const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value; saveSetting(key, value); });
                 if (input.type === 'range') { input.addEventListener('input', (event) => { const key = event.target.dataset.setting; const value = event.target.value; if (key === 'globalFontSize') { document.documentElement.style.fontSize = `${value}%`; } }); }
            });
            const clearSearchHistoryBtn = $('#clear-search-history-btn');
            if(clearSearchHistoryBtn) {
                clearSearchHistoryBtn.addEventListener('click', () => {
                    const currentLangForConfirm = languageManager.getCurrentLang ? languageManager.getCurrentLang() : 'es';
                    const confirmMessageKey = 'confirm_clear_search_history'; const defaultConfirmMessage = "Are you sure you want to clear search history? (Simulated)";
                    const confirmText = translations[currentLangForConfirm]?.[confirmMessageKey] || defaultConfirmMessage;
                    if(confirm(confirmText)) { localStorage.removeItem('searchHistoryPornitoo'); const clearedMessageKey = 'search_history_cleared'; const defaultClearedMessage = "Search history cleared! (Simulated)"; alert(translations[currentLangForConfirm]?.[clearedMessageKey] || defaultClearedMessage); }
                });
            }
        }
        return { init, saveSetting, getUserSetting: (key) => userSettings[key] };
    })();

    // --- 15. Inicialización General de Módulos y Lógica de Intro (MODIFICADA) ---
    function startAppModules() {
        console.log("[START] Starting App Modules...");
        themeManager.init();
        languageManager.init();
        particleManager.init();
        uiManager.init();
        settingsManager.init();
        authManager.init();
        pageLogic.init();

        // --- Lógica de Animación de Intro (ELIMINADA/NEUTRALIZADA) ---
        console.log("[INTRO] Skipping intro animation logic.");
        if (introAnimation) {
            introAnimation.style.display = 'none'; // Ocultar el contenedor de la intro inmediatamente
            console.log("[INTRO] introAnimation element hidden.");
        } else {
            console.warn("[INTRO] introAnimation element not found, cannot hide it.");
        }

        if (mainContent) {
            mainContent.style.opacity = '1'; // Asegurar que el contenido principal sea visible
            mainContent.style.transition = 'none'; // Evitar cualquier transición de opacidad no deseada
            console.log("[INTRO] mainContent made visible.");
        } else {
            console.error("[INTRO] CRITICAL: mainContent element not found! Page content will not be visible.");
        }
        // --- Fin Lógica de Intro ---

        console.log("[START] App Modules Initialized.");
    }

    startAppModules();

} // --- Fin initializeAppLogic ---
