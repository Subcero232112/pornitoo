// Imports Firebase (Asegúrate que estén todos los necesarios)
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getDatabase, ref, onValue, push, set, serverTimestamp // Opcional: query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Espera a que el DOM esté listo Y Firebase inicializado (si usas el evento)
// Alternativa simple: Confiar en 'defer' y que window.firebaseApp esté listo.
// document.addEventListener('firebase-ready', () => {
//     initializeAppLogic();
// });
// O ejecutar directamente si confías en defer:
document.addEventListener('DOMContentLoaded', () => {
    // Comprobar si Firebase falló en inicializarse
    if (!window.firebaseApp && !document.querySelector('div[style*="Error Crítico"]')) {
         console.warn("Firebase App object not found, waiting or init failed silently?");
         // Podrías reintentar o mostrar un error diferente aquí
         // Por ahora, asumimos que el error ya se mostró si falló
    } else if (window.firebaseApp){
        console.log("DOM ready and Firebase App detected. Initializing app logic...");
        initializeAppLogic();
    } else {
        console.log("DOM ready but Firebase init failed (error shown). App logic will not run.");
    }
});


function initializeAppLogic() {
    // --- 0. Firebase Services (Ya inicializado en HTML, obtener referencias) ---
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);

    // --- 1. Selectores Globales y Estado ---
    const body = document.body;
    const root = document.documentElement;
    const headerLogo = document.getElementById('header-logo');
    const mainContent = document.getElementById('main-content');
    const introAnimation = document.getElementById('intro-animation');
    const userAuthButton = document.getElementById('user-auth-button');
    const userPhotoElement = document.createElement('img'); // Create img element for user photo
    userPhotoElement.alt = 'User'; userPhotoElement.style.display = 'none';
    userAuthButton?.appendChild(userPhotoElement); // Add it inside the user-icon div
    const userIconElement = userAuthButton?.querySelector('i.fa-user');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const signUpButton = document.getElementById('signup-button');
    const signInButton = document.getElementById('signin-button');
    const googleSignInButton = document.getElementById('google-signin-button');
    const loginErrorMessage = document.getElementById('login-error-message');
    // Selectores Sidebar Chat (para actualizar info usuario)
    const sidebarUserPhoto = document.getElementById('sidebar-user-photo');
    const sidebarUserName = document.getElementById('sidebar-user-name');


    // Estado
    let currentLang = 'es';
    let particlesActive = true;
    let currentUser = null;

    // --- 2. Translations (Incluir errores y textos de comentarios) ---
    const translations = {
         es: {
             page_title: "Pornitoo - Presentado por Subcero X Evilgado",
             index_page_title: "Inicio - Pornitoo",
             search_placeholder: "Buscar títulos...", search_button: "Buscar",
             genre_select: "Género", genre_action: "Acción", genre_comedy: "Comedia",
             login_tooltip: "Iniciar sesión", chat_tooltip: "Ir al Chat", settings_tooltip: "Configuración",
             popular_title: "Populares Ahora", loading: "Cargando...",
             settings_title: "Ajustes", settings_theme_title: "Tema de Color", settings_language_title: "Idioma", settings_other_title: "Otros Ajustes",
             settings_particles: "Efecto Partículas:", settings_more_soon: "(Más ajustes próximamente...)",
             login_modal_title: "Iniciar Sesión / Registro",
             login_email_label: "Correo Electrónico", login_password_label: "Contraseña",
             login_signup_button: "Registrarse", login_signin_button: "Iniciar Sesión",
             login_divider_or: "O", login_google_firebase: "Continuar con Google",
             login_modal_text_firebase: "Regístrate o inicia sesión para acceder a todas las funciones.",
             login_modal_text_chat: "Necesitas iniciar sesión para chatear.",
             back_button: "Volver", views_count: "Vistas", published_date: "Publicado:", related_videos_title: "Más Videos",
             description_title: "Descripción", comments_title: "Comentarios",
             logout_tooltip: "Cerrar sesión",
             chat_page_title: "Chat General", chat_loading: "Cargando mensajes...",
             chat_input_placeholder: "Escribe un mensaje...", no_related_videos: "No hay videos relacionados.",
             login_needed_for_chat: "Inicia sesión para chatear", login_needed_to_comment: "Inicia sesión para comentar", // <-- Nuevo
             comment_placeholder: "Escribe tu comentario...", comment_send_button: "Enviar", // <-- Nuevo
             // Errores comunes de Auth
             "auth/invalid-email": "El formato del correo no es válido.", "auth/user-disabled": "Esta cuenta ha sido deshabilitada.",
             "auth/email-already-in-use": "Este correo ya está registrado.", "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
             "auth/operation-not-allowed": "El inicio de sesión por correo/contraseña no está habilitado.",
             "auth/invalid-credential": "Credenciales inválidas.", "auth/missing-password": "Falta la contraseña.",
             "auth/network-request-failed": "Error de red. Revisa tu conexión.", "auth/too-many-requests": "Demasiados intentos fallidos. Intenta más tarde.",
             "auth/popup-closed-by-user": "Inicio de sesión cancelado.", "error_default": "Ocurrió un error inesperado."
         },
         en: {
             page_title: "Pornitoo - Presented by Subcero X Evilgado",
             index_page_title: "Home - Pornitoo",
             search_placeholder: "Search titles...", search_button: "Search",
             genre_select: "Genre", genre_action: "Action", genre_comedy: "Comedy",
             login_tooltip: "Login", chat_tooltip: "Go to Chat", settings_tooltip: "Settings",
             popular_title: "Popular Now", loading: "Loading...",
             settings_title: "Settings", settings_theme_title: "Color Theme", settings_language_title: "Language", settings_other_title: "Other Settings",
             settings_particles: "Particle Effect:", settings_more_soon: "(More settings coming soon...)",
             login_modal_title: "Login / Sign Up",
             login_email_label: "Email Address", login_password_label: "Password",
             login_signup_button: "Sign Up", login_signin_button: "Sign In",
             login_divider_or: "OR", login_google_firebase: "Continue with Google",
             login_modal_text_firebase: "Sign up or log in to access all features.",
             login_modal_text_chat: "You need to be logged in to chat.",
             back_button: "Back", views_count: "Views", published_date: "Published:", related_videos_title: "More Videos",
             description_title: "Description", comments_title: "Comments",
             logout_tooltip: "Sign out",
             chat_page_title: "General Chat", chat_loading: "Loading messages...",
             chat_input_placeholder: "Type a message...", no_related_videos: "No related videos found.",
             login_needed_for_chat: "Log in to chat", login_needed_to_comment: "Log in to comment", // <-- New
             comment_placeholder: "Write your comment...", comment_send_button: "Send", // <-- New
             // Common Auth Errors
             "auth/invalid-email": "Invalid email format.", "auth/user-disabled": "This account has been disabled.",
             "auth/email-already-in-use": "This email is already registered.", "auth/weak-password": "Password should be at least 6 characters.",
             "auth/operation-not-allowed": "Email/password sign-in is not enabled.",
             "auth/invalid-credential": "Invalid credentials.", "auth/missing-password": "Password is missing.",
             "auth/network-request-failed": "Network error. Check your connection.", "auth/too-many-requests": "Too many failed attempts. Try again later.",
             "auth/popup-closed-by-user": "Sign-in canceled.", "error_default": "An unexpected error occurred."
         }
     };

    // --- 3. Funciones Utilitarias ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);
    const saveToLocalStorage = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { console.error("LocalStorage error:", e); } };
    const loadFromLocalStorage = (key, defaultValue) => { try { return localStorage.getItem(key) || defaultValue; } catch (e) { console.error("LocalStorage error:", e); return defaultValue; } };

    function showLoginError(errorCode) { /* ... (igual que antes) ... */
        if (!loginErrorMessage) return;
        const lang = getCurrentLang();
        const message = translations[lang]?.[errorCode] || translations[lang]?.['error_default'] || `Error: ${errorCode}`;
        loginErrorMessage.textContent = message; loginErrorMessage.style.display = 'block';
    }
    function hideLoginError() { /* ... (igual que antes) ... */
        if (loginErrorMessage) { loginErrorMessage.textContent = ''; loginErrorMessage.style.display = 'none'; }
    }
    function escapeHTML(str) { /* ... (igual que antes) ... */
         const div = document.createElement('div'); div.appendChild(document.createTextNode(str)); return div.innerHTML;
     }
     function formatViews(views) { /* ... (igual que antes) ... */
         if (views === undefined || views === null) return '---'; if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
         if (views >= 1000) return (views / 1000).toFixed(1) + 'K'; return views.toString();
     }
     function formatDate(timestamp) { /* ... (igual que antes) ... */
         if (!timestamp) return '---'; try { const date = new Date(timestamp); return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }); }
         catch (e) { console.error("Error formatting date:", e); return 'Fecha inválida'; }
     }


    // --- 4. Gestor de Temas ---
    const themeManager = (() => { /* ... (código idéntico) ... */
        const swatches = $$('.theme-swatch');
        const themes = { green: { '--primary-color': '#00ff00', '--neon-glow': '0 0 10px rgba(0, 255, 0, 0.7)' }, red: { '--primary-color': '#ff1a1a', '--neon-glow': '0 0 12px rgba(255, 26, 26, 0.8)' }, purple: { '--primary-color': '#9933ff', '--neon-glow': '0 0 12px rgba(153, 51, 255, 0.8)' }, blue: { '--primary-color': '#007bff', '--neon-glow': '0 0 10px rgba(0, 123, 255, 0.7)' }};
        function applyTheme(themeName) { const theme = themes[themeName]; if (!theme) { console.warn(`Theme '${themeName}' not found...`); themeName = 'green'; } const activeTheme = themes[themeName]; Object.entries(activeTheme).forEach(([variable, value]) => { root.style.setProperty(variable, value); }); swatches.forEach(swatch => { swatch.classList.toggle('active', swatch.dataset.theme === themeName); }); updatePlaceholderImageColors(activeTheme['--primary-color'] || themes.green['--primary-color']); saveToLocalStorage('selectedThemePornitoo', themeName); }
        function updatePlaceholderImageColors(colorHex) { const color = colorHex.substring(1); $$('img[src*="via.placeholder.com"]').forEach(img => { const currentSrc = img.getAttribute('src'); if (!currentSrc) return; let newSrc = currentSrc; const colorRegex = /\/([0-9a-fA-F]{3,6})\?text=/; if (currentSrc.includes('/theme?text=')) { newSrc = currentSrc.replace('/theme?text=', `/${color}?text=`); } else { const match = currentSrc.match(colorRegex); if (match && match[1]) { newSrc = currentSrc.replace(colorRegex, `/${color}?text=`); } } if (newSrc !== currentSrc) { img.src = newSrc; } }); }
        function init() { swatches.forEach(swatch => { swatch.addEventListener('click', () => applyTheme(swatch.dataset.theme)); }); const savedTheme = loadFromLocalStorage('selectedThemePornitoo', 'green'); applyTheme(savedTheme); }
        return { init, applyTheme };
    })();

    // --- 5. Gestor de Idioma ---
    const languageManager = (() => { /* ... (código idéntico) ... */
        const langButtons = $$('.language-button');
        function setLanguage(lang) { if (!translations[lang]) { console.warn(`Language ${lang} not found...`); lang = currentLang; } currentLang = lang; document.documentElement.lang = lang; window.currentLang = lang; $$('[data-translate-key]').forEach(el => { const key = el.dataset.translateKey; const translation = translations[lang][key]; if (translation !== undefined) { if (el.placeholder !== undefined) { el.placeholder = translation; } else if (el.dataset.tooltip !== undefined) { el.dataset.tooltip = translation; if(el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'I') { el.setAttribute('title', translation); } } else if (el.title !== undefined) { el.title = translation; } else { el.textContent = translation; } } }); updateAuthButtonUI(currentUser); langButtons.forEach(button => { button.classList.toggle('active', button.dataset.lang === lang); }); saveToLocalStorage('selectedLangPornitoo', lang); }
        function getCurrentLang() { return currentLang; }
        function init() { langButtons.forEach(button => { button.addEventListener('click', () => setLanguage(button.dataset.lang)); }); const savedLang = loadFromLocalStorage('selectedLangPornitoo', 'es'); currentLang = savedLang; window.currentLang = currentLang; }
        return { init, setLanguage, getCurrentLang };
    })();

    // --- 6. Gestor de Partículas ---
    const particleManager = (() => { /* ... (código idéntico) ... */
        const container = $('#particles'); const toggle = $('#particle-toggle'); let isActive = true;
        function createParticles(count = 50) { if (!container || !root) return; container.innerHTML = ''; const currentPrimaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim(); if (!currentPrimaryColor) { console.warn("Could not get primary color for particles."); return; } for (let i = 0; i < count; i++) { const particle = document.createElement('div'); particle.classList.add('particle'); particle.style.backgroundColor = currentPrimaryColor; const size = Math.random() * 3 + 1; particle.style.width = `${size}px`; particle.style.height = `${size}px`; const xStart = Math.random() * 100; particle.style.left = `${xStart}vw`; particle.style.setProperty('--x-start', `${xStart}vw`); particle.style.setProperty('--x-end', `${xStart + (Math.random() * 40 - 20)}vw`); const duration = Math.random() * 20 + 15; particle.style.animationDuration = `${duration}s`; particle.style.animationDelay = `-${Math.random() * duration}s`; container.appendChild(particle); } container.classList.toggle('active', isActive); }
        function toggleParticles(forceState) { isActive = forceState !== undefined ? forceState : !isActive; if(container) container.classList.toggle('active', isActive); if(toggle) toggle.checked = isActive; saveToLocalStorage('particlesActivePornitoo', isActive); }
        function init() { isActive = loadFromLocalStorage('particlesActivePornitoo', 'true') === 'true'; if (toggle) { toggle.checked = isActive; toggle.addEventListener('change', () => toggleParticles(toggle.checked)); } if (container && isActive) { setTimeout(createParticles, 100); } else if (container) { container.classList.remove('active'); } }
        return { init, toggle: toggleParticles, create: createParticles };
    })();

    // --- 7. Gestor de UI ---
    const uiManager = (() => { /* ... (código idéntico) ... */
        const settingsPanel = $('#settings-panel'); const settingsButton = $('#settings-button'); const closeSettingsButton = $('#close-settings-button'); const loginModal = $('#login-modal'); const closeLoginButton = $('#close-login-modal');
        function togglePanel(panel, forceState) { if (!panel) return; const isVisible = panel.classList.contains('visible'); const shouldBeVisible = forceState === undefined ? !isVisible : forceState; if (isVisible !== shouldBeVisible) { panel.classList.toggle('visible', shouldBeVisible); } }
        function toggleModal(modal, forceState) { if (!modal) return; const isVisible = modal.classList.contains('visible'); const shouldBeVisible = forceState === undefined ? !isVisible : forceState; if (isVisible !== shouldBeVisible) { modal.classList.toggle('visible', shouldBeVisible); } if (shouldBeVisible) hideLoginError(); }
        function init() { if (settingsButton && settingsPanel && closeSettingsButton) { settingsButton.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(settingsPanel); }); closeSettingsButton.addEventListener('click', () => togglePanel(settingsPanel, false)); document.addEventListener('click', (e) => { if (settingsPanel && settingsPanel.classList.contains('visible')) { if (!settingsPanel.contains(e.target) && e.target !== settingsButton && !settingsButton.contains(e.target)) { togglePanel(settingsPanel, false); } } }, true); } if (loginModal && closeLoginButton) { closeLoginButton.addEventListener('click', () => toggleModal(loginModal, false)); loginModal.addEventListener('click', (e) => { if (e.target === loginModal) toggleModal(loginModal, false); }); if (googleSignInButton) { googleSignInButton.addEventListener('click', () => { hideLoginError(); authManager.signInWithGoogle(); }); } if (signUpButton && loginEmailInput && loginPasswordInput) { signUpButton.addEventListener('click', () => { hideLoginError(); const email = loginEmailInput.value; const password = loginPasswordInput.value; if (!email || !password) { showLoginError("auth/missing-password"); return; } authManager.signUpWithEmailPassword(email, password); }); } if (signInButton && loginEmailInput && loginPasswordInput) { signInButton.addEventListener('click', () => { hideLoginError(); const email = loginEmailInput.value; const password = loginPasswordInput.value; if (!email || !password) { showLoginError("auth/missing-password"); return; } authManager.signInWithEmailPassword(email, password); }); } } }
        return { init, toggleModal, togglePanel };
    })();

    // --- 7.5. Gestor de Autenticación ---
    const authManager = (() => { /* ... (código idéntico) ... */
        const googleProvider = new GoogleAuthProvider();
        async function signInWithGoogle() { console.log("Attempting Google Sign-In..."); if(googleSignInButton) googleSignInButton.disabled = true; try { const result = await signInWithPopup(auth, googleProvider); console.log("Google Sign-In Successful:", result.user.displayName); uiManager.toggleModal($('#login-modal'), false); } catch (error) { console.error("Google Sign-In Error:", error.code, error.message); showLoginError(error.code); } finally { if(googleSignInButton) googleSignInButton.disabled = false; } }
        async function signUpWithEmailPassword(email, password) { console.log("Attempting Email/Password Sign Up..."); if(signUpButton) signUpButton.disabled = true; if(signInButton) signInButton.disabled = true; try { const userCredential = await createUserWithEmailAndPassword(auth, email, password); console.log("Email/Password Sign Up Successful:", userCredential.user.uid); uiManager.toggleModal($('#login-modal'), false); } catch (error) { console.error("Email/Password Sign Up Error:", error.code, error.message); showLoginError(error.code); } finally { if(signUpButton) signUpButton.disabled = false; if(signInButton) signInButton.disabled = false; } }
        async function signInWithEmailPassword(email, password) { console.log("Attempting Email/Password Sign In..."); if(signUpButton) signUpButton.disabled = true; if(signInButton) signInButton.disabled = true; try { const userCredential = await signInWithEmailAndPassword(auth, email, password); console.log("Email/Password Sign In Successful:", userCredential.user.uid); uiManager.toggleModal($('#login-modal'), false); } catch (error) { console.error("Email/Password Sign In Error:", error.code, error.message); let errorCode = error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' ? 'auth/invalid-credential' : error.code; showLoginError(errorCode); } finally { if(signUpButton) signUpButton.disabled = false; if(signInButton) signInButton.disabled = false; } }
        async function logoutUser() { console.log("Attempting Sign-Out..."); try { await signOut(auth); console.log("Sign-Out successful."); } catch (error) { console.error("Sign-Out Error", error); alert(`Error al cerrar sesión: ${error.message}`); } }
        function init() { onAuthStateChanged(auth, (user) => { console.log("Auth State Changed:", user ? `User Logged In (${user.uid})` : "User Logged Out"); const wasLoggedIn = !!currentUser; currentUser = user; updateAuthButtonUI(user); if (!wasLoggedIn || !user) { languageManager.setLanguage(languageManager.getCurrentLang()); } // Setup comment form reactivity in detail page if applicable if (document.getElementById('detail-view-container')) { setupCommentForm(new URLSearchParams(window.location.search).get('id')); } }); if (userAuthButton) { userAuthButton.addEventListener('click', () => { if (currentUser) { logoutUser(); } else { hideLoginError(); uiManager.toggleModal($('#login-modal'), true); } }); } }
        function getCurrentUser() { return currentUser; }
        return { init, signInWithGoogle, signUpWithEmailPassword, signInWithEmailPassword, logoutUser, getCurrentUser };
    })();

    // --- 7.6. Función para Actualizar UI del Botón de Usuario Y SIDEBAR ---
     function updateAuthButtonUI(user) { /* ... (código idéntico) ... */
         // Actualiza #user-auth-button (header) y #sidebar-user-photo / #sidebar-user-name (chat)
         const userAuthBtn = $('#user-auth-button'); const userPhoto = userAuthBtn?.querySelector('img'); const userIcon = userAuthBtn?.querySelector('i.fa-user');
         const sidebarPhoto = $('#sidebar-user-photo'); const sidebarName = $('#sidebar-user-name');
         if (!userAuthBtn || !userPhoto || !userIcon) return;
         const currentLang = languageManager.getCurrentLang ? languageManager.getCurrentLang() : 'es';
         if (user) {
             userAuthBtn.classList.add('logged-in'); const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'U')}&background=random&color=fff&size=40`;
             userPhoto.src = photoURL; userPhoto.style.display = 'block'; userIcon.style.display = 'none';
             const logoutTooltipText = translations[currentLang]?.logout_tooltip || "Sign out"; userAuthBtn.dataset.tooltip = logoutTooltipText; userAuthBtn.setAttribute('title', `${user.displayName || user.email || 'User Profile'} (${logoutTooltipText})`);
             if (sidebarPhoto) sidebarPhoto.src = photoURL; if (sidebarName) sidebarName.textContent = user.displayName || user.email?.split('@')[0] || 'Usuario';
         } else {
             userAuthBtn.classList.remove('logged-in'); userPhoto.style.display = 'none'; userIcon.style.display = 'block';
             const loginTooltipText = translations[currentLang]?.login_tooltip || "Login"; userAuthBtn.dataset.tooltip = loginTooltipText; userAuthBtn.setAttribute('title', loginTooltipText);
             if (sidebarPhoto) sidebarPhoto.src = 'https://via.placeholder.com/40/cccccc/ffffff?text=U'; if (sidebarName) sidebarName.textContent = 'Usuario';
         }
     }

    // --- 8. Lógica Específica de Página (Actualizada para Firebase RTDB) ---
    const pageLogic = (() => {

        function initIndexPage() { /* ... (código con onValue de la respuesta anterior) ... */
            console.log("Initializing Index Page - Fetching from Firebase");
            const posterContainer = $('#poster-container'); const loadingIndicator = $('#loading-indicator');
            if (!posterContainer || !loadingIndicator) { console.error("Index page elements missing"); return; }
            loadingIndicator.style.display = 'block'; posterContainer.innerHTML = '';
            const videosRef = ref(db, 'videos');
            onValue(videosRef, (snapshot) => {
                posterContainer.innerHTML = ''; loadingIndicator.style.display = 'none';
                if (snapshot.exists()) {
                    const videosData = snapshot.val(); console.log("Videos data loaded:", Object.keys(videosData).length);
                    Object.entries(videosData).forEach(([id, data]) => {
                        if (!data || !data.title || !data.posterUrl) { console.warn(`Skipping video ID ${id}: Missing title or posterUrl`); return; }
                        const defaultImgSrc = `https://via.placeholder.com/200x200/cccccc/000?text=N/A`; const errorImgSrc = `https://via.placeholder.com/200x200/ff0000/fff?text=Error`;
                        const posterItem = document.createElement('a'); posterItem.href = `detail.html?id=${id}`; posterItem.classList.add('poster-item'); posterItem.dataset.id = id;
                        posterItem.innerHTML = ` <div class="poster"> <img src="${data.posterUrl || defaultImgSrc}" alt="${data.title}" loading="lazy" onerror="this.onerror=null; this.src='${errorImgSrc}';"> </div> <h3 class="poster-title">${data.title}</h3> `;
                        posterContainer.appendChild(posterItem);
                    });
                     // Re-apply theme in case placeholders changed color
                     themeManager.applyTheme(loadFromLocalStorage('selectedThemePornitoo', 'green'));
                } else { console.log("No videos found in database."); posterContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-color-secondary);">No hay videos disponibles.</p>`; }
            }, (error) => { console.error("Firebase Read Error (videos):", error); posterContainer.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: red;">Error al cargar los videos.</p>`; loadingIndicator.style.display = 'none'; });
        }

        function initDetailPage() { /* ... (código con onValue y llamadas a comments de la respuesta anterior) ... */
            console.log("Initializing Detail Page - Fetching from Firebase");
            const urlParams = new URLSearchParams(window.location.search); const itemId = urlParams.get('id');
            const pageTitleElement = $('#detail-page-title'); const detailTitle = $('#detail-title'); const detailViews = $('#detail-views'); const detailDate = $('#detail-date'); const detailDescription = $('#detail-description'); const videoPlayerIframe = $('#video-player-iframe'); const relatedContainer = $('#related-items-container'); const videoLoadingIndicator = $('#video-loading-indicator');
            if (!itemId) { console.error("No item ID found in URL"); if (detailTitle) detailTitle.textContent = "Error: ID no encontrado"; if (pageTitleElement) pageTitleElement.textContent = "Error - Pornitoo"; return; }
            console.log(`Workspaceing details for video ID: ${itemId}`);
            // Mostrar indicador de carga del video
            if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'block';
            if(videoPlayerIframe) videoPlayerIframe.style.opacity = '0'; // Ocultar iframe mientras carga

            const videoRef = ref(db, 'videos/' + itemId);
            onValue(videoRef, (snapshot) => {
                if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'none'; // Ocultar indicador
                if(videoPlayerIframe) videoPlayerIframe.style.opacity = '1'; // Mostrar iframe

                if (snapshot.exists()) {
                    const data = snapshot.val(); console.log("Video details loaded:", data);
                    const videoTitle = data.title || 'Video Sin Título';
                    if (pageTitleElement) pageTitleElement.textContent = `${videoTitle} - Pornitoo`;
                    if (detailTitle) detailTitle.textContent = videoTitle;
                    if (detailDescription) detailDescription.textContent = data.description || 'No hay descripción disponible.';
                    if (videoPlayerIframe) {
                        videoPlayerIframe.src = data.videoUrl || '';
                        // Opcional: esperar a que el iframe cargue para ocultar el indicador
                         videoPlayerIframe.onload = () => { if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'none'; };
                         videoPlayerIframe.onerror = () => { if(videoLoadingIndicator) videoLoadingIndicator.textContent = 'Error al cargar video'; };
                    } else {
                        if(videoLoadingIndicator) videoLoadingIndicator.style.display = 'none';
                    }
                    if (detailViews) detailViews.textContent = formatViews(data.views);
                    if (detailDate) detailDate.textContent = formatDate(data.uploadTimestamp);

                    // Cargar Relacionados (Ejemplo básico - necesitaría otra consulta)
                    if (relatedContainer) { relatedContainer.innerHTML = ''; if (data.related && Array.isArray(data.related)) { /* fetchRelatedVideos(data.related); */ } else { relatedContainer.innerHTML = '<p style="opacity: 0.7;">(Relacionados no disponibles)</p>'; } }

                    // Cargar y configurar comentarios
                    loadComments(itemId);
                    setupCommentForm(itemId); // Setup form reactivity based on auth state

                } else { console.error(`Data not found for item ID: ${itemId}`); if (detailTitle) detailTitle.textContent = "Error: Video no encontrado"; if (pageTitleElement) pageTitleElement.textContent = "Error - Pornitoo"; }
            }, (error) => { console.error(`Firebase Read Error (video/${itemId}):`, error); if(videoLoadingIndicator) videoLoadingIndicator.textContent = 'Error'; if (detailTitle) detailTitle.textContent = "Error al cargar datos"; if (pageTitleElement) pageTitleElement.textContent = "Error - Pornitoo"; });
        }


        function init() {
            // Determinar qué página lógica ejecutar
            if ($('#poster-container')) { initIndexPage(); }
            else if ($('#detail-view-container')) { initDetailPage(); }
            // La lógica del chat está en chat_script.js

             // Listener común para el logo
             if (headerLogo) { headerLogo.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'index.html'; }); }
        }

        return { init };
    })();

    // --- 9. Funciones de Comentarios ---
    function loadComments(videoId) { /* ... (código de la respuesta anterior) ... */
        const commentsContainer = document.getElementById('comments-container'); if (!commentsContainer) return;
        commentsContainer.innerHTML = '<p id="comments-loading" data-translate-key="chat_loading">Cargando comentarios...</p>';
        languageManager.setLanguage(languageManager.getCurrentLang()); // Traducir 'Cargando...'

        const commentsRef = ref(db, `comments/${videoId}`);
        // const commentsQuery = query(commentsRef, orderByChild('timestamp')); // Para ordenar por timestamp (requiere índice .indexOn en reglas)

        onValue(commentsRef, (snapshot) => {
            const loadingIndicator = document.getElementById('comments-loading'); if(loadingIndicator) loadingIndicator.remove();
            if (snapshot.exists()) {
                commentsContainer.innerHTML = ''; // Limpiar antes de añadir
                // Convertir a array y ordenar si es necesario (si no se usa query)
                const commentsArray = [];
                 snapshot.forEach((childSnapshot) => {
                     commentsArray.push({ key: childSnapshot.key, ...childSnapshot.val() });
                 });
                 // Ordenar por timestamp descendente (más nuevos primero) si existe timestamp
                 if (commentsArray.length > 0 && commentsArray[0].timestamp) {
                     commentsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                 }
                 // Mostrar comentarios
                 commentsArray.forEach(commentData => {
                     displayComment(commentData.key, commentData);
                 });

            } else { commentsContainer.innerHTML = '<p style="opacity: 0.7;" data-translate-key="no_comments">Sé el primero en comentar.</p>'; languageManager.setLanguage(languageManager.getCurrentLang()); }
        }, (error) => { console.error("Error loading comments:", error); commentsContainer.innerHTML = '<p style="color: red;">Error al cargar comentarios.</p>'; });
    }

    function displayComment(key, data) { /* ... (código de la respuesta anterior, usando escapeHTML) ... */
        const commentsContainer = document.getElementById('comments-container'); if (!commentsContainer || !data) return;
        const commentElement = document.createElement('div'); commentElement.classList.add('comment-item'); commentElement.id = `comment-${key}`;
        const userName = escapeHTML(data.userName || 'Anónimo'); const text = escapeHTML(data.text || '');
        // Usar Date.now() si serverTimestamp no está configurado correctamente
        const timestamp = data.timestamp ? formatDate(data.timestamp) : formatDate(Date.now());
        commentElement.innerHTML = ` <p class="comment-meta"><strong class="comment-author">${userName}</strong><span class="comment-date"> • ${timestamp}</span></p><p class="comment-text">${text}</p> `;
        commentsContainer.appendChild(commentElement); // Añadir al final (más antiguos primero)
        // commentsContainer.insertBefore(commentElement, commentsContainer.firstChild); // Añadir al principio (más nuevos primero)
    }

    function setupCommentForm(videoId) { /* ... (código de la respuesta anterior, usando Date.now() por simplicidad) ... */
        if (!videoId) return; // No configurar si no hay videoId
        const addCommentForm = document.getElementById('add-comment-form'); const commentInput = document.getElementById('comment-input'); const submitCommentButton = document.getElementById('submit-comment-button'); const commentLoginPrompt = document.getElementById('comment-login-prompt'); const commentLoginLink = document.getElementById('comment-login-link');
        if (!addCommentForm || !commentInput || !submitCommentButton || !commentLoginPrompt || !commentLoginLink) return; // Salir si faltan elementos

        const user = authManager.getCurrentUser();

        if (user) {
            addCommentForm.style.display = 'block'; commentLoginPrompt.style.display = 'none';
            // Clonar botón para evitar listeners duplicados
             let currentSubmitButton = document.getElementById('submit-comment-button'); // Re-seleccionar por si acaso
             let newSubmitButton = currentSubmitButton.cloneNode(true);
             currentSubmitButton.parentNode.replaceChild(newSubmitButton, currentSubmitButton);

             newSubmitButton.addEventListener('click', async () => {
                 const commentText = commentInput.value.trim(); if (commentText === '') return;
                 // Usar Date.now() como fallback simple para timestamp si serverTimestamp es complejo
                 const commentData = { userId: user.uid, userName: user.displayName || 'Usuario Anónimo', text: commentText, timestamp: Date.now() }; // serverTimestamp()
                 const commentsRef = ref(db, `comments/${videoId}`); const newCommentRef = push(commentsRef);
                 try {
                     newSubmitButton.disabled = true; await set(newCommentRef, commentData);
                     commentInput.value = ''; console.log("Comment added successfully!");
                 } catch (error) { console.error("Error adding comment:", error); alert("Error al enviar el comentario.");
                 } finally { newSubmitButton.disabled = false; }
             });
        } else {
            addCommentForm.style.display = 'none'; commentLoginPrompt.style.display = 'block';
             commentLoginLink.replaceWith(commentLoginLink.cloneNode(true)); // Evitar listeners duplicados
             document.getElementById('comment-login-link').addEventListener('click', (e) => { e.preventDefault(); uiManager.toggleModal($('#login-modal'), true); });
        }
        // Traducir placeholders/botones del form
        languageManager.setLanguage(languageManager.getCurrentLang());
    }

    // --- 10. Inicialización General de Módulos ---
    function startAppModules() {
        console.log("Starting App Modules...");
        themeManager.init();
        languageManager.init(); // Prepara listeners, pero el idioma se setea post-auth
        particleManager.init();
        uiManager.init();
        authManager.init(); // Inicia escucha de Auth, lo que seteará idioma inicial y UI de auth
        pageLogic.init();   // Inicia la lógica específica de la página (que ahora depende de auth y db)
        // ... otros módulos ...

         // Lógica intro animation (debe ir después de que los elementos existan)
         if (introAnimation) {
            const introPlayed = loadFromLocalStorage('introPlayedOncePornitoo', 'false') === 'true';
            const introDelay = introPlayed ? 0 : 2500; // Tiempo visible más corto
            const fadeDuration = 500; // Duración del fade out CSS

            if (introDelay > 0) {
                mainContent.style.opacity = '0'; // Ocultar main content
                introAnimation.style.display = 'flex';
                introAnimation.style.opacity = '1';

                setTimeout(() => {
                     introAnimation.style.opacity = '0'; // Iniciar fade out
                     introAnimation.style.pointerEvents = 'none'; // Desactivar interacción
                     mainContent.style.transition = `opacity ${fadeDuration}ms ease-in`; // Preparar fade in
                     mainContent.style.opacity = '1'; // Iniciar fade in

                     // Opcional: Ocultar completamente después de la animación
                     setTimeout(() => {
                         introAnimation.style.display = 'none';
                     }, fadeDuration);

                     saveToLocalStorage('introPlayedOncePornitoo', 'true');
                }, introDelay);
            } else {
                 introAnimation.style.display = 'none'; // Ocultar inmediatamente
                 mainContent.style.opacity = '1'; // Mostrar contenido
            }
         } else {
             mainContent.style.opacity = '1'; // Asegurar que el contenido sea visible si no hay intro
         }

        console.log("App Initialized.");
    }

    // Llamar a la inicialización de los módulos
    startAppModules();

} // Fin initializeAppLogic
        });
