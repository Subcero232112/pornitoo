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
    if (window.firebaseApp) {
        initializeAppLogic();
    } else {
        console.warn("Main Script: Firebase not ready, waiting for event...");
        document.addEventListener('firebase-ready', initializeAppLogic, { once: true });
    }
});

// --- Función Principal App Logic ---
function initializeAppLogic() {
    console.log("Initializing Main App Logic...");
    // --- 0. Firebase Services y Constantes ---
    if (!window.firebaseApp) { console.error("Main Script: Firebase App object not found!"); return; }
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);
    const ADMIN_EMAILS = ["santosramonsteven@gmail.com", "evilgado6@gmail.com"];

    // --- 1. Selectores Globales ---
    const body = document.body; const root = document.documentElement;
    const headerLogo = $('#header-logo'); const mainContent = $('#main-content');
    const introAnimation = $('#intro-animation'); const userAuthButton = $('#user-auth-button');
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
    let userSettings = {}; // Para guardar las nuevas configuraciones

    // --- 3. Translations (Añadir nuevas claves para ajustes) ---
    const translations = {
         es: {
             index_page_title: "Inicio - Pornitoo", search_placeholder: "Buscar títulos...", search_button: "Buscar",
             login_tooltip: "Iniciar sesión", chat_tooltip: "Ir al Chat", settings_tooltip: "Configuración",
             popular_title: "Populares Ahora", loading: "Cargando...", settings_title: "Ajustes",
             settings_theme_title: "Tema de Color", settings_language_title: "Idioma", lang_es: "Español", lang_en: "English",
             settings_display_options: "Opciones de Visualización", settings_particles: "Efecto Partículas",
             settings_items_per_page: "Elementos por página:", settings_font_size: "Tamaño de Fuente Global:",
             settings_autoplay: "Autoplay Videos en Detalle", settings_notifications: "Notificaciones (Simulado)",
             settings_email_notif: "Notificaciones por Email", settings_push_notif: "Notificaciones Push",
             settings_privacy: "Privacidad (Simulado)", settings_show_online: "Mostrar Estado Online",
             settings_clear_search: "Limpiar Historial de Búsqueda", settings_clear_button: "Limpiar",
             settings_accessibility: "Accesibilidad (Simulado)", settings_high_contrast: "Modo Alto Contraste",
             settings_tts: "Habilitar Texto a Voz", settings_more_soon: "(Más ajustes próximamente...)",
             login_modal_title: "Iniciar Sesión / Registro", login_email_label: "Correo Electrónico",
             login_password_label: "Contraseña", login_signup_button: "Registrarse", login_signin_button: "Iniciar Sesión",
             login_divider_or: "O", login_google_firebase: "Continuar con Google",
             login_modal_text_firebase: "Regístrate o inicia sesión para acceder a todas las funciones.",
             back_button: "Volver", views_count: "Vistas", published_date: "Publicado:",
             related_videos_title: "Más Videos", description_title: "Descripción", comments_title: "Comentarios",
             logout_tooltip: "Cerrar sesión", chat_page_title: "Chat General", chat_loading: "Cargando mensajes...",
             chat_input_placeholder: "Escribe un mensaje...", no_related_videos: "No hay videos relacionados.",
             login_needed_for_chat: "Inicia sesión para chatear", login_needed_to_comment: "Inicia sesión para comentar",
             comment_placeholder: "Escribe tu comentario...", comment_send_button: "Enviar",
             suggest_video: "Sugerir Video", suggest_video_title: "Sugerir un Video",
             request_title_label: "Título del Video:", request_url_label: "URL del Video (Opcional):",
             request_url_placeholder: "Enlace a YouTube, Vimeo, Drive, etc.", request_reason_label: "Descripción o Razón:",
             request_reason_placeholder: "¿Por qué deberíamos añadir este video?", submit_suggestion_button: "Enviar Sugerencia",
             request_sent_success: "Sugerencia enviada. ¡Gracias!", login_needed_to_suggest: "Inicia sesión para sugerir videos",
             // Errores Auth
             "auth/invalid-email": "Correo no válido.", "auth/user-disabled": "Cuenta deshabilitada.",
             "auth/email-already-in-use": "Correo ya registrado.", "auth/weak-password": "Contraseña >6 caracteres.",
             "auth/operation-not-allowed": "Login por correo no habilitado.", "auth/invalid-credential": "Credenciales inválidas.",
             "auth/missing-password": "Falta contraseña.", "auth/network-request-failed": "Error de red.",
             "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.", "auth/popup-closed-by-user": "Login cancelado.",
             "error_default": "Error inesperado."
         },
         en: {
             index_page_title: "Home - Pornitoo", search_placeholder: "Search titles...", search_button: "Search",
             login_tooltip: "Login", chat_tooltip: "Go to Chat", settings_tooltip: "Settings",
             popular_title: "Popular Now", loading: "Loading...", settings_title: "Settings",
             settings_theme_title: "Color Theme", settings_language_title: "Language", lang_es: "Spanish", lang_en: "English",
             settings_display_options: "Display Options", settings_particles: "Particle Effect",
             settings_items_per_page: "Items per page:", settings_font_size: "Global Font Size:",
             settings_autoplay: "Autoplay Videos in Detail", settings_notifications: "Notifications (Simulated)",
             settings_email_notif: "Email Notifications", settings_push_notif: "Push Notifications",
             settings_privacy: "Privacy (Simulated)", settings_show_online: "Show Online Status",
             settings_clear_search: "Clear Search History", settings_clear_button: "Clear",
             settings_accessibility: "Accessibility (Simulated)", settings_high_contrast: "High Contrast Mode",
             settings_tts: "Enable Text-to-Speech", settings_more_soon: "(More settings coming soon...)",
             login_modal_title: "Login / Sign Up", login_email_label: "Email Address",
             login_password_label: "Password", login_signup_button: "Sign Up", login_signin_button: "Sign In",
             login_divider_or: "OR", login_google_firebase: "Continue with Google",
             login_modal_text_firebase: "Sign up or log in to access all features.",
             back_button: "Back", views_count: "Views", published_date: "Published:",
             related_videos_title: "More Videos", description_title: "Description", comments_title: "Comments",
             logout_tooltip: "Sign out", chat_page_title: "General Chat", chat_loading: "Loading messages...",
             chat_input_placeholder: "Type a message...", no_related_videos: "No related videos found.",
             login_needed_for_chat: "Log in to chat", login_needed_to_comment: "Log in to comment",
             comment_placeholder: "Write your comment...", comment_send_button: "Send",
             suggest_video: "Suggest Video", suggest_video_title: "Suggest a Video",
             request_title_label: "Video Title:", request_url_label: "Video URL (Optional):",
             request_url_placeholder: "Link to YouTube, Vimeo, Drive, etc.", request_reason_label: "Description or Reason:",
             request_reason_placeholder: "Why should we add this video?", submit_suggestion_button: "Send Suggestion",
             request_sent_success: "Suggestion sent. Thank you!", login_needed_to_suggest: "Log in to suggest videos",
             // Auth Errors
             "auth/invalid-email": "Invalid email.", "auth/user-disabled": "Account disabled.",
             "auth/email-already-in-use": "Email already registered.", "auth/weak-password": "Password >6 chars.",
             "auth/operation-not-allowed": "Email login not enabled.", "auth/invalid-credential": "Invalid credentials.",
             "auth/missing-password": "Password missing.", "auth/network-request-failed": "Network error.",
             "auth/too-many-requests": "Too many attempts. Try later.", "auth/popup-closed-by-user": "Login canceled.",
             "error_default": "Unexpected error."
         }
    };

    // --- 4. Funciones Utilitarias ---
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


    // --- 5. Gestor de Temas ---
    const themeManager = (() => {
        const swatches = $$('.theme-swatch');
        const themes = { green: { '--primary-color': '#00ff00', '--neon-glow': '0 0 10px rgba(0, 255, 0, 0.7)' }, red: { '--primary-color': '#ff1a1a', '--neon-glow': '0 0 12px rgba(255, 26, 26, 0.8)' }, purple: { '--primary-color': '#9933ff', '--neon-glow': '0 0 12px rgba(153, 51, 255, 0.8)' }, blue: { '--primary-color': '#007bff', '--neon-glow': '0 0 10px rgba(0, 123, 255, 0.7)' }};
        function applyTheme(themeName) { const theme = themes[themeName]; if (!theme) { console.warn(`Theme '${themeName}' not found...`); themeName = 'green'; } const activeTheme = themes[themeName]; Object.entries(activeTheme).forEach(([variable, value]) => { root.style.setProperty(variable, value); }); swatches.forEach(swatch => { swatch.classList.toggle('active', swatch.dataset.theme === themeName); }); updatePlaceholderImageColors(activeTheme['--primary-color'] || themes.green['--primary-color']); saveToLocalStorage('selectedThemePornitoo', themeName); }
        function updatePlaceholderImageColors(colorHex) { const color = colorHex.substring(1); $$('img[src*="via.placeholder.com"]').forEach(img => { const currentSrc = img.getAttribute('src'); if (!currentSrc) return; let newSrc = currentSrc; const colorRegex = /\/([0-9a-fA-F]{3,6})\?text=/; if (currentSrc.includes('/theme?text=')) { newSrc = currentSrc.replace('/theme?text=', `/${color}?text=`); } else { const match = currentSrc.match(colorRegex); if (match && match[1]) { newSrc = currentSrc.replace(colorRegex, `/${color}?text=`); } } if (newSrc !== currentSrc) { img.src = newSrc; } }); }
        function init() { swatches.forEach(swatch => { swatch.addEventListener('click', () => applyTheme(swatch.dataset.theme)); }); const savedTheme = loadFromLocalStorage('selectedThemePornitoo', 'green'); applyTheme(savedTheme); }
        return { init, applyTheme };
    })();

    // --- 6. Gestor de Idioma (REVISADO) ---
    const languageManager = (() => {
        const langButtons = $$('.language-button');
        function setLanguage(lang) {
            if (!translations[lang]) {
                console.warn(`Language data for '${lang}' not found. Defaulting to '${currentLang}'.`);
                lang = currentLang; // Mantener idioma actual si el nuevo no existe
            }
            console.log(`Setting language to: ${lang}`);
            currentLang = lang;
            document.documentElement.lang = lang; // Actualizar atributo lang del HTML
            window.currentLang = lang; // Para otros scripts

            $$('[data-translate-key]').forEach(el => {
                const key = el.dataset.translateKey;
                const translation = translations[lang]?.[key]; // Usar optional chaining

                if (translation !== undefined) {
                    if (el.placeholder !== undefined) { el.placeholder = translation; }
                    else if (el.dataset.tooltip !== undefined) { el.dataset.tooltip = translation; if(el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'I') { el.setAttribute('title', translation); } }
                    else if (el.title !== undefined && !el.dataset.tooltip) { el.title = translation; } // Solo si no tiene data-tooltip
                    else { el.textContent = translation; }
                } else {
                    // console.warn(`Translation key "${key}" not found for language "${lang}". Element content: "${el.textContent.trim()}"`);
                }
            });
            updateAuthButtonUI(currentUser); // Re-traducir tooltip de login/logout
            langButtons.forEach(button => { button.classList.toggle('active', button.dataset.lang === lang); });
            saveToLocalStorage('selectedLangPornitoo', lang);
        }
        function getCurrentLang() { return currentLang; }
        function init() {
            langButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const newLang = e.target.dataset.lang;
                    if (newLang) setLanguage(newLang);
                });
            });
            const savedLang = loadFromLocalStorage('selectedLangPornitoo', 'es');
            currentLang = savedLang; // Establecer estado inicial
            window.currentLang = currentLang;
            // La primera llamada a setLanguage se hará después de que auth esté listo
        }
        return { init, setLanguage, getCurrentLang };
    })();

    // --- 7. Gestor de Partículas ---
    const particleManager = (() => { /* ... (código idéntico) ... */ })();

    // --- 8. Gestor de UI (Modales Comunes) ---
    const uiManager = (() => {
        function togglePanel(panel, forceState) { if (!panel) return; const isVisible = panel.classList.contains('visible'); const shouldBeVisible = forceState === undefined ? !isVisible : forceState; if (isVisible !== shouldBeVisible) { panel.classList.toggle('visible', shouldBeVisible); } }
        function toggleModal(modal, forceState) { if (!modal) return; const isVisible = modal.classList.contains('visible'); const shouldBeVisible = forceState === undefined ? !isVisible : forceState; if (isVisible !== shouldBeVisible) { modal.classList.toggle('visible', shouldBeVisible); } if (shouldBeVisible) hideLoginError(); if (!shouldBeVisible) { if(modal === requestVideoModal) requestVideoForm?.reset(); } }
        function init() {
             if (settingsButton && settingsPanel && closeSettingsButton) { settingsButton.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(settingsPanel); }); closeSettingsButton.addEventListener('click', () => togglePanel(settingsPanel, false)); document.addEventListener('click', (e) => { if (settingsPanel?.classList.contains('visible') && !settingsPanel.contains(e.target) && e.target !== settingsButton && !settingsButton?.contains(e.target)) { togglePanel(settingsPanel, false); } }, true); }
             if (loginModal && $('#close-login-modal')) { $('#close-login-modal').addEventListener('click', () => toggleModal(loginModal, false)); loginModal.addEventListener('click', (e) => { if (e.target === loginModal) toggleModal(loginModal, false); }); if (googleSignInButton) googleSignInButton.addEventListener('click', () => { hideLoginError(); authManager.signInWithGoogle(); }); if (signUpButton) signUpButton.addEventListener('click', () => { hideLoginError(); authManager.signUpWithEmailPassword(loginEmailInput.value, loginPasswordInput.value); }); if (signInButton) signInButton.addEventListener('click', () => { hideLoginError(); authManager.signInWithEmailPassword(loginEmailInput.value, loginPasswordInput.value); }); }
             // Modal de Sugerencia de Usuario
             if(requestVideoButton) requestVideoButton.addEventListener('click', () => { if(currentUser) { toggleModal(requestVideoModal, true); requestVideoForm?.reset(); showStatusMessage(requestVideoStatus, '', 'info', 0); } else { alert(translations[currentLang]?.login_needed_to_suggest || "Log in to suggest videos"); toggleModal(loginModal, true); } });
             if(requestVideoModal && closeRequestVideoModal) closeRequestVideoModal.addEventListener('click', () => toggleModal(requestVideoModal, false));
             if(requestVideoModal) requestVideoModal.addEventListener('click', (e) => { if(e.target === requestVideoModal) toggleModal(requestVideoModal, false); });
        }
        window.uiManager = { toggleModal }; // Hacer accesible para admin_script si es necesario
        return { init, toggleModal, togglePanel };
    })();

    // --- 9. Gestor de Autenticación (Actualizado para Admin FAB) ---
    const authManager = (() => {
        const googleProvider = new GoogleAuthProvider();
        async function signInWithGoogle() { /* ... (igual) ... */ }
        async function signUpWithEmailPassword(email, password) { /* ... (igual) ... */ }
        async function signInWithEmailPassword(email, password) { /* ... (igual) ... */ }
        async function logoutUser() { /* ... (igual) ... */ }
        function checkAdminStatus(user) { if (!user || !user.email) return false; return ADMIN_EMAILS.includes(user.email.toLowerCase()); }
        function init() {
            onAuthStateChanged(auth, (user) => {
                 console.log("Main Script Auth State Changed:", user ? `User Logged In (${user.uid})` : "User Logged Out");
                 const wasLoggedIn = !!currentUser;
                 currentUser = user;
                 isAdmin = checkAdminStatus(user);
                 updateAuthButtonUI(user);
                 // Visibilidad del botón Admin FAB y Sugerir
                 if (adminFab) adminFab.style.display = isAdmin ? 'flex' : 'none';
                 if (requestVideoButton) requestVideoButton.style.display = (user && !isAdmin) ? 'flex' : 'none';

                 if (!wasLoggedIn || !user) { languageManager.setLanguage(languageManager.getCurrentLang()); }
                 if (document.getElementById('detail-view-container')) { const detailVideoId = new URLSearchParams(window.location.search).get('id'); if (detailVideoId) setupCommentForm(detailVideoId); }
                 setupRequestForm(); // Habilitar/deshabilitar form de sugerencia
            });
            if (userAuthButton) { userAuthButton.addEventListener('click', () => { if (currentUser) { logoutUser(); } else { hideLoginError(); uiManager.toggleModal(loginModal, true); } }); }
            // Listener para el Admin FAB (redirige a admin.html)
            if (adminFab) {
                adminFab.addEventListener('click', () => {
                    if (isAdmin) {
                        console.log("Admin FAB clicked, redirecting to admin.html");
                        window.location.href = 'admin.html';
                    }
                });
            }
        }
        function getCurrentUser() { return currentUser; }
        function isUserAdmin() { return isAdmin; }
        return { init, signInWithGoogle, signUpWithEmailPassword, signInWithEmailPassword, logoutUser, getCurrentUser, isUserAdmin };
    })();

    // --- 10. Update UI Auth Button/Sidebar ---
    function updateAuthButtonUI(user) { /* ... (código idéntico) ... */ }

    // --- 11. Lógica Específica de Página (Posters y Detalle) ---
    const pageLogic = (() => {
        function initIndexPage() {
            console.log("Initializing Index Page - Generating Posters");
            const posterContainer = $('#poster-container');
            const loadingIndicator = $('#loading-indicator');
            if (!posterContainer || !loadingIndicator) { console.error("Index page elements missing for posters"); return; }

            posterContainer.innerHTML = ''; // Limpiar indicador de carga o posters viejos
            const numberOfPosters = userSettings.itemsPerPage || 40; // Usar configuración o default

            // Simular carga de 40 videos (o usar datos reales de Firebase si ya los tienes aquí)
            for (let i = 1; i <= numberOfPosters; i++) {
                const videoId = `sim-${i}`;
                const videoData = {
                    title: `Video de Prueba ${i}`,
                    // Usar un placeholder cuadrado. El color se actualizará con el tema.
                    posterUrl: `https://via.placeholder.com/300x300/${themeManager.applyTheme ? 'theme' : '00ff00'}?text=Video+${i}`,
                    // Si tienes URLs reales de Firebase Storage, úsalas aquí
                    // posterUrl: `URL_REAL_POSTER_${i}`,
                };

                const defaultImgSrc = `https://via.placeholder.com/300x300/cccccc/000?text=N/A`;
                const errorImgSrc = `https://via.placeholder.com/300x300/ff0000/fff?text=Error`;

                const posterItem = document.createElement('a');
                posterItem.href = `detail.html?id=${videoId}`; // En una app real, el ID vendría de Firebase
                posterItem.classList.add('poster-item');
                posterItem.dataset.id = videoId;
                posterItem.innerHTML = `
                    <div class="poster">
                        <img src="${videoData.posterUrl || defaultImgSrc}" alt="${videoData.title}" loading="lazy" onerror="this.onerror=null; this.src='${errorImgSrc}';">
                    </div>
                    <h3 class="poster-title">${escapeHTML(videoData.title)}</h3>
                `;
                posterContainer.appendChild(posterItem);
            }
            // Asegurar que el tema se aplique a los placeholders
            themeManager.applyTheme(loadFromLocalStorage('selectedThemePornitoo', 'green'));
            loadingIndicator.style.display = 'none';
        }

        function initDetailPage() { /* ... (código idéntico para mostrar detalles y llamar a comments) ... */ }
        function init() {
            if ($('#poster-container')) { initIndexPage(); }
            else if ($('#detail-view-container')) { initDetailPage(); }
            if (headerLogo) { headerLogo.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; }); }
        }
        return { init };
    })();

    // --- 12. Funciones de Comentarios (Detail Page) ---
    function loadComments(videoId) { /* ... (código idéntico) ... */ }
    function displayComment(key, data) { /* ... (código idéntico) ... */ }
    function setupCommentForm(videoId) { /* ... (código idéntico) ... */ }

    // --- 13. Lógica Formulario Sugerencia (Usuario) ---
    function setupRequestForm() { /* ... (código idéntico para habilitar/deshabilitar) ... */ }
    if (requestVideoForm) { requestVideoForm.addEventListener('submit', async (e) => { /* ... (código idéntico) ... */ }); }

    // --- 14. NUEVO: Lógica de Ajustes Avanzados ---
    const settingsManager = (() => {
        const defaultSettings = {
            particlesEnabled: true,
            itemsPerPage: "40",
            globalFontSize: "100", // Porcentaje
            autoplayVideos: false,
            emailNotifications: true,
            pushNotifications: false,
            showOnlineStatus: true,
            highContrastMode: false,
            textToSpeechEnabled: false
            // Añadir más defaults si es necesario
        };

        function loadSettings() {
            userSettings = loadFromLocalStorage('userPornitooSettings', defaultSettings);
            applySettings();
            updateSettingsUI();
        }

        function saveSetting(key, value) {
            userSettings[key] = value;
            saveToLocalStorage('userPornitooSettings', userSettings);
            applySetting(key, value); // Aplicar cambio individual inmediatamente
        }

        function applySettings() {
            console.log("Applying all user settings:", userSettings);
            Object.entries(userSettings).forEach(([key, value]) => {
                applySetting(key, value);
            });
        }

        function applySetting(key, value) {
            console.log(`Applying setting: ${key} = ${value}`);
            switch (key) {
                case 'particlesEnabled':
                    particleManager.toggle(value);
                    break;
                case 'itemsPerPage':
                    // La recarga de posters la manejará initIndexPage al leer este valor
                    if (document.getElementById('poster-container')) { // Solo si estamos en index
                        pageLogic.initIndexPage(); // Re-renderizar posters
                    }
                    break;
                case 'globalFontSize':
                    document.documentElement.style.fontSize = `${value}%`;
                    break;
                case 'autoplayVideos':
                    // Esta lógica se aplicaría en la página de detalle al cargar el video
                    console.log("Autoplay videos set to:", value);
                    break;
                case 'highContrastMode':
                    body.classList.toggle('high-contrast', value);
                    console.log("High contrast mode:", value);
                    break;
                // Otros casos para emailNotifications, pushNotifications, showOnlineStatus, textToSpeechEnabled
                // necesitarían lógica real (placeholders por ahora)
                default:
                    // console.log(`Setting ${key} has no specific apply action.`);
                    break;
            }
        }

        function updateSettingsUI() {
            console.log("Updating settings UI from:", userSettings);
            document.querySelectorAll('[data-setting]').forEach(input => {
                const key = input.dataset.setting;
                if (userSettings.hasOwnProperty(key)) {
                    if (input.type === 'checkbox') {
                        input.checked = userSettings[key];
                    } else if (input.type === 'range' || input.tagName === 'SELECT') {
                        input.value = userSettings[key];
                    }
                }
            });
        }

        function init() {
            loadSettings(); // Cargar y aplicar al inicio

            // Listeners para los inputs de configuración
            document.querySelectorAll('[data-setting]').forEach(input => {
                input.addEventListener('change', (event) => {
                    const key = event.target.dataset.setting;
                    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
                    saveSetting(key, value);
                });
                 // Para el slider de rango, actualizar mientras se desliza (opcional)
                 if (input.type === 'range') {
                     input.addEventListener('input', (event) => {
                         const key = event.target.dataset.setting;
                         const value = event.target.value;
                         // Aplicar visualmente en tiempo real pero guardar solo en 'change'
                         if (key === 'globalFontSize') {
                             document.documentElement.style.fontSize = `${value}%`;
                         }
                     });
                 }
            });

            // Botón Limpiar Historial (Simulado)
            const clearSearchHistoryBtn = $('#clear-search-history-btn');
            if(clearSearchHistoryBtn) {
                clearSearchHistoryBtn.addEventListener('click', () => {
                    if(confirm(translations[currentLang]?.confirm_clear_search_history || "Are you sure you want to clear search history? (Simulated)")) {
                        localStorage.removeItem('searchHistoryPornitoo'); // Ejemplo
                        alert(translations[currentLang]?.search_history_cleared || "Search history cleared! (Simulated)");
                    }
                });
            }
        }
        return { init, saveSetting, getUserSetting: (key) => userSettings[key] };
    })();


    // --- 15. Inicialización General de Módulos ---
    function startAppModules() {
        console.log("Starting App Modules...");
        themeManager.init();
        languageManager.init();
        particleManager.init();
        uiManager.init();
        authManager.init(); // Auth se inicializa y luego llama a setLanguage y otras cosas
        settingsManager.init(); // Inicializar ajustes después de que el idioma base esté listo
        pageLogic.init();

         if (introAnimation) {
            const introPlayed = loadFromLocalStorage('introPlayedOncePornitoo', 'false') === 'true';
            const introDelay = introPlayed ? 0 : 2500; const fadeDuration = 500;
            if (introDelay > 0) {
                if(mainContent) mainContent.style.opacity = '0';
                introAnimation.style.display = 'flex'; introAnimation.style.opacity = '1';
                setTimeout(() => { introAnimation.style.opacity = '0'; introAnimation.style.pointerEvents = 'none'; if(mainContent) {mainContent.style.transition = `opacity ${fadeDuration}ms ease-in`; mainContent.style.opacity = '1';} setTimeout(() => { introAnimation.style.display = 'none'; }, fadeDuration); saveToLocalStorage('introPlayedOncePornitoo', 'true'); }, introDelay);
            } else { introAnimation.style.display = 'none'; if(mainContent) mainContent.style.opacity = '1'; }
         } else { if(mainContent) mainContent.style.opacity = '1'; }
        console.log("App Modules Initialized.");
    }

    startAppModules();

}
