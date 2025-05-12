// Import Firebase modules ONCE at the top level if using modules properly
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Import Database functions if needed directly in this script (Realtime DB example)
// import { getDatabase, ref, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- 0. Firebase Initialization & Services ---
    // Firebase App instance is initialized in HTML and stored in window.firebaseApp
    const firebaseApp = window.firebaseApp;
    if (!firebaseApp) {
        console.error("Firebase app not initialized. Check your HTML setup.");
        // Display an error message to the user?
        const body = document.body;
        if(body) body.innerHTML = '<h1 style="color:red; text-align:center; margin-top: 50px;">Error Crítico: No se pudo inicializar Firebase. Revisa la configuración.</h1>';
        return; // Stop execution if Firebase isn't ready
    }
    const auth = getAuth(firebaseApp);
    // const db = getDatabase(firebaseApp); // Initialize DB if needed in this script directly

    // --- 1. Selectores Globales y Estado ---
    const body = document.body;
    const root = document.documentElement;
    const headerLogo = document.getElementById('header-logo');
    const mainContent = document.getElementById('main-content');
    const introAnimation = document.getElementById('intro-animation');
    const userAuthButton = document.getElementById('user-auth-button'); // The user icon/button
    const userPhotoElement = document.createElement('img'); // Create img element for user photo
    userPhotoElement.alt = 'User';
    userPhotoElement.style.display = 'none'; // Hide initially
    userAuthButton?.appendChild(userPhotoElement); // Add it inside the user-icon div
    const userIconElement = userAuthButton?.querySelector('i.fa-user');

    // Estado
    let currentLang = 'es'; // Default language
    let particlesActive = true; // Default particles state
    let currentUser = null; // Store Firebase user object

    // --- 2. Datos Simulados (Video) ---
    // Keep this if you are mixing static data with Firebase features
    // In a full Firebase app, this data would likely come from Firestore or Realtime DB
    const videoDataStore = {
        'peli-1': { title: "Título Película/Serie 1", videoSrc: "https://www.youtube.com/embed/VIDEO_ID_1", views: "1.2M", date: "2025-01-15", description: "Descripción detallada 1...", related: [ { id: 'peli-3', title: 'Título 3', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R3' }, { id: 'peli-4', title: 'Título 4', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R4' } ]},
        'peli-2': { title: "Título Película/Serie 2 (Largo)", videoSrc: "https://www.youtube.com/embed/VIDEO_ID_2", views: "850K", date: "2025-02-20", description: "Descripción 2...", related: [ { id: 'peli-1', title: 'Título 1', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R1' } ]},
        'peli-3': { title: "Título 3", videoSrc: "https://www.xvideos.com/video.otuouiof511/me_folle_a_mi_hermanastra_virgen_y_eyacule_es_su_apretado_cono_historia_completa", views: "2.5M", date: "2024-12-01", description: "Descripción 3...", related: []},
        'peli-4': { title: "Título 4", videoSrc: "https://www.xvideos.com/video.khcilvb3075/follando_duro_a_mi_madrastra_en_la_cocina_-_cory_chase", views: "500K", date: "2025-03-10", description: "Descripción 4...", related: []},
        'peli-5': { title: "Título 5", videoSrc: "https://www.xvideos.com/video.kvoikuhd1b7/primer_trio_familiar_-_gabriela_lopez", views: "990K", date: "2025-04-01", description: "Descripción 5...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-7': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
         'peli-1': { title: "Título Película/Serie 1", videoSrc: "https://www.youtube.com/embed/VIDEO_ID_1", views: "1.2M", date: "2025-01-15", description: "Descripción detallada 1...", related: [ { id: 'peli-3', title: 'Título 3', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R3' }, { id: 'peli-4', title: 'Título 4', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R4' } ]},
        'peli-2': { title: "Título Película/Serie 2 (Largo)", videoSrc: "https://www.youtube.com/embed/VIDEO_ID_2", views: "850K", date: "2025-02-20", description: "Descripción 2...", related: [ { id: 'peli-1', title: 'Título 1', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R1' } ]},
        'peli-3': { title: "Título 3", videoSrc: "https://www.xvideos.com/video.otuouiof511/me_folle_a_mi_hermanastra_virgen_y_eyacule_es_su_apretado_cono_historia_completa", views: "2.5M", date: "2024-12-01", description: "Descripción 3...", related: []},
        'peli-4': { title: "Título 4", videoSrc: "https://www.xvideos.com/video.khcilvb3075/follando_duro_a_mi_madrastra_en_la_cocina_-_cory_chase", views: "500K", date: "2025-03-10", description: "Descripción 4...", related: []},
        'peli-5': { title: "Título 5", videoSrc: "https://www.xvideos.com/video.kvoikuhd1b7/primer_trio_familiar_-_gabriela_lopez", views: "990K", date: "2025-04-01", description: "Descripción 5...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-7': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
         'peli-1': { title: "Título Película/Serie 1", videoSrc: "https://www.youtube.com/embed/VIDEO_ID_1", views: "1.2M", date: "2025-01-15", description: "Descripción detallada 1...", related: [ { id: 'peli-3', title: 'Título 3', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R3' }, { id: 'peli-4', title: 'Título 4', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R4' } ]},
        'peli-2': { title: "Título Película/Serie 2 (Largo)", videoSrc: "https://www.youtube.com/embed/VIDEO_ID_2", views: "850K", date: "2025-02-20", description: "Descripción 2...", related: [ { id: 'peli-1', title: 'Título 1', imgSrc: 'https://via.placeholder.com/100x56/1a1a1a/theme?text=R1' } ]},
        'peli-3': { title: "Título 3", videoSrc: "https://www.xvideos.com/video.otuouiof511/me_folle_a_mi_hermanastra_virgen_y_eyacule_es_su_apretado_cono_historia_completa", views: "2.5M", date: "2024-12-01", description: "Descripción 3...", related: []},
        'peli-4': { title: "Título 4", videoSrc: "https://www.xvideos.com/video.khcilvb3075/follando_duro_a_mi_madrastra_en_la_cocina_-_cory_chase", views: "500K", date: "2025-03-10", description: "Descripción 4...", related: []},
        'peli-5': { title: "Título 5", videoSrc: "https://www.xvideos.com/video.kvoikuhd1b7/primer_trio_familiar_-_gabriela_lopez", views: "990K", date: "2025-04-01", description: "Descripción 5...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-7': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
        'peli-6': { title: "Título 6", videoSrc: "https://www.xvideos.com/video.idfielf665c/pervma_-_alguna_vez_has_visto_a_una_milf_caliente_y_nunca_te_la_has_follado_incluso_si_es_tu", views: "1.8M", date: "2025-01-25", description: "Descripción 6...", related: []},
     };

    // --- 2.5 Translations ---
    const translations = {
         es: {
             page_title: "Pornitoo - Presentado por Subcero X Evilgado",
             search_placeholder: "Buscar títulos...", search_button: "Buscar",
             genre_select: "Género", genre_action: "Acción", genre_comedy: "Comedia",
             login_tooltip: "Iniciar sesión", chat_tooltip: "Ir al Chat", settings_tooltip: "Configuración",
             popular_title: "Populares Ahora",
             settings_title: "Ajustes", settings_theme_title: "Tema de Color", settings_language_title: "Idioma", settings_other_title: "Otros Ajustes",
             settings_particles: "Efecto Partículas:", settings_more_soon: "(Más ajustes próximamente...)",
             login_modal_title: "Iniciar Sesión / Registro",
             login_modal_text_firebase: "Inicia sesión para acceder a todas las funciones.", // Adjusted text
             login_modal_text_chat: "Necesitas iniciar sesión para chatear.", // Specific for chat page modal
             login_google_firebase: "Entrar con Google",
             login_google: "Entrar con Google (Demo)", // Keep old key for compatibility? Or remove.
             login_create_account: "Crear Cuenta (Demo)",
             back_button: "Volver", views_count: "Vistas", published_date: "Publicado:", related_videos_title: "Más Videos",
             poster_title_prefix: "Título",
             logout_tooltip: "Cerrar sesión", // New tooltip
             chat_page_title: "Chat General", // For chat.html header
             chat_loading: "Cargando mensajes...", // For chat.html
             chat_input_placeholder: "Escribe un mensaje...", // For chat.html input
             no_related_videos: "No hay videos relacionados.", // For detail page
             login_needed_for_chat: "Inicia sesión para chatear", // Tooltip/message for chat input when logged out
         },
         en: {
             page_title: "Pornitoo - Presented by Subcero X Evilgado",
             search_placeholder: "Search titles...", search_button: "Search",
             genre_select: "Genre", genre_action: "Action", genre_comedy: "Comedy",
             login_tooltip: "Login", chat_tooltip: "Go to Chat", settings_tooltip: "Settings",
             popular_title: "Popular Now",
             settings_title: "Settings", settings_theme_title: "Color Theme", settings_language_title: "Language", settings_other_title: "Other Settings",
             settings_particles: "Particle Effect:", settings_more_soon: "(More settings coming soon...)",
             login_modal_title: "Login / Sign Up",
             login_modal_text_firebase: "Sign in to access all features.",
             login_modal_text_chat: "You need to be logged in to chat.",
             login_google_firebase: "Sign in with Google",
             login_google: "Sign in with Google (Demo)",
             login_create_account: "Create Account (Demo)",
             back_button: "Back", views_count: "Views", published_date: "Published:", related_videos_title: "More Videos",
             poster_title_prefix: "Title",
             logout_tooltip: "Sign out",
             chat_page_title: "General Chat",
             chat_loading: "Loading messages...",
             chat_input_placeholder: "Type a message...",
             no_related_videos: "No related videos found.",
             login_needed_for_chat: "Log in to chat",
         }
     };

    // --- 3. Funciones Utilitarias ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);
    const saveToLocalStorage = (key, value) => { try { localStorage.setItem(key, value); } catch (e) { console.error("LocalStorage error:", e); } };
    const loadFromLocalStorage = (key, defaultValue) => { try { return localStorage.getItem(key) || defaultValue; } catch (e) { console.error("LocalStorage error:", e); return defaultValue; } };

    // --- 4. Gestor de Temas ---
    const themeManager = (() => {
        const swatches = $$('.theme-swatch');
        const themes = {
             green: { '--primary-color': '#00ff00', '--neon-glow': '0 0 10px rgba(0, 255, 0, 0.7)' },
             red: { '--primary-color': '#ff1a1a', '--neon-glow': '0 0 12px rgba(255, 26, 26, 0.8)' },
             purple: { '--primary-color': '#9933ff', '--neon-glow': '0 0 12px rgba(153, 51, 255, 0.8)' },
             blue: { '--primary-color': '#007bff', '--neon-glow': '0 0 10px rgba(0, 123, 255, 0.7)' }
        };

        function applyTheme(themeName) {
            const theme = themes[themeName];
            if (!theme) {
                console.warn(`Theme '${themeName}' not found. Applying default.`);
                themeName = 'green'; // Fallback to default
            }

            const activeTheme = themes[themeName]; // Use the potentially corrected theme name
            Object.entries(activeTheme).forEach(([variable, value]) => {
                root.style.setProperty(variable, value);
            });

            swatches.forEach(swatch => {
                swatch.classList.toggle('active', swatch.dataset.theme === themeName);
            });

            // Actualizar color de imágenes placeholder si usan 'theme'
            updatePlaceholderImageColors(activeTheme['--primary-color'] || themes.green['--primary-color']);

            saveToLocalStorage('selectedThemePornitoo', themeName);
            // console.log(`Theme applied: ${themeName}`);
        }

        function updatePlaceholderImageColors(colorHex) {
            const color = colorHex.substring(1); // Quitar #
             $$('img[src*="via.placeholder.com"]').forEach(img => {
                 const currentSrc = img.getAttribute('src'); // Usar getAttribute
                 if (!currentSrc) return;

                 let newSrc = currentSrc;
                 // Regex to find color hex between / and ?text=
                 const colorRegex = /\/([0-9a-fA-F]{3,6})\?text=/;

                 if (currentSrc.includes('/theme?text=')) { // Replace 'theme' placeholder explicitly
                    newSrc = currentSrc.replace('/theme?text=', `/${color}?text=`);
                 } else {
                     const match = currentSrc.match(colorRegex);
                     if (match && match[1]) { // If a hex color is found
                         newSrc = currentSrc.replace(colorRegex, `/${color}?text=`);
                     }
                 }
                 // Only update src if it actually changed
                 if (newSrc !== currentSrc) {
                    img.src = newSrc;
                 }
             });
         }

        function init() {
            swatches.forEach(swatch => {
                swatch.addEventListener('click', () => applyTheme(swatch.dataset.theme));
            });
            const savedTheme = loadFromLocalStorage('selectedThemePornitoo', 'green');
            applyTheme(savedTheme);
        }

        return { init, applyTheme };
    })();

    // --- 5. Gestor de Idioma ---
    const languageManager = (() => {
        const langButtons = $$('.language-button');

        function setLanguage(lang) {
            if (!translations[lang]) {
                console.warn(`Language ${lang} not found in translations. Using default '${currentLang}'.`);
                lang = currentLang; // Use existing if new one is invalid
            }
            currentLang = lang;
            document.documentElement.lang = lang; // Actualizar atributo lang del HTML
            window.currentLang = lang; // Make accessible globally for chat_script.js

            $$('[data-translate-key]').forEach(el => {
                const key = el.dataset.translateKey;
                const translation = translations[lang][key];

                if (translation !== undefined) {
                    if (el.placeholder !== undefined) {
                        el.placeholder = translation;
                    } else if (el.dataset.tooltip !== undefined) {
                        // Always update data-tooltip if present
                        el.dataset.tooltip = translation;
                         // Also update title if it's likely meant to be the same as tooltip (common for icons)
                         if(el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'BUTTON') {
                             el.setAttribute('title', translation);
                         }
                    } else if (el.title !== undefined) {
                        el.title = translation;
                    } else {
                         // Prefer textContent for security unless innerHTML is needed
                         el.textContent = translation;
                    }
                } else {
                     // console.warn(`Translation key "${key}" not found for language "${lang}".`);
                }
            });

            // Actualizar tooltip del botón de auth según estado y NUEVO idioma
             updateAuthButtonUI(currentUser); // Reuse the function

            // Actualizar botones de idioma activos
             langButtons.forEach(button => {
                 button.classList.toggle('active', button.dataset.lang === lang);
             });

            saveToLocalStorage('selectedLangPornitoo', lang);
            // console.log(`Language set to: ${lang}`);
        }

        function getCurrentLang() {
          return currentLang;
        }

        function init() {
            langButtons.forEach(button => {
                button.addEventListener('click', () => setLanguage(button.dataset.lang));
            });
            const savedLang = loadFromLocalStorage('selectedLangPornitoo', 'es');
            // Initial language setting is now deferred until auth state is known
            // setLanguage(savedLang); // DON'T call here
            currentLang = savedLang; // Set initial state variable though
            window.currentLang = currentLang; // Set global variable too
        }

        return { init, setLanguage, getCurrentLang };
    })();

    // --- 6. Gestor de Partículas ---
    const particleManager = (() => {
        const container = $('#particles');
        const toggle = $('#particle-toggle');
        let isActive = true; // Default state

        function createParticles(count = 50) {
            if (!container) return;
            container.innerHTML = ''; // Limpiar existentes
             // Ensure root element is available and styles are computed
             if (!root) return;
             const currentPrimaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim();
             if (!currentPrimaryColor) {
                 console.warn("Could not get primary color for particles.");
                 return;
             }

            for (let i = 0; i < count; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                particle.style.backgroundColor = currentPrimaryColor; // Usar color actual
                const size = Math.random() * 3 + 1;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                // Posición inicial aleatoria en X y abajo
                const xStart = Math.random() * 100;
                particle.style.left = `${xStart}vw`;
                particle.style.setProperty('--x-start', `${xStart}vw`);
                // Destino X aleatorio
                 particle.style.setProperty('--x-end', `${xStart + (Math.random() * 40 - 20)}vw`); // +/- 20vw de deriva

                const duration = Math.random() * 20 + 15; // 15 a 35 segundos
                particle.style.animationDuration = `${duration}s`;
                particle.style.animationDelay = `-${Math.random() * duration}s`; // Inicio aleatorio
                container.appendChild(particle);
            }
            container.classList.toggle('active', isActive); // Apply active state
        }

        function toggleParticles(forceState) {
             isActive = forceState !== undefined ? forceState : !isActive;
             if(container) container.classList.toggle('active', isActive);
             if(toggle) toggle.checked = isActive;
             saveToLocalStorage('particlesActivePornitoo', isActive);
             // console.log(`Particles ${isActive ? 'enabled' : 'disabled'}`);
         }

        function init() {
             isActive = loadFromLocalStorage('particlesActivePornitoo', 'true') === 'true';
             if (toggle) {
                 toggle.checked = isActive;
                 toggle.addEventListener('change', () => toggleParticles(toggle.checked));
             }
             // Create particles only if the container exists and is enabled
             if (container && isActive) {
                // Delay creation slightly to ensure theme color is applied
                setTimeout(createParticles, 100);
             } else if (container) {
                container.classList.remove('active'); // Ensure it's inactive if saved state is false
             }
         }

        return { init, toggle: toggleParticles, create: createParticles };
    })();

    // --- 7. Gestor de UI (Modales, Paneles) ---
    const uiManager = (() => {
        const settingsPanel = $('#settings-panel');
        const settingsButton = $('#settings-button');
        const closeSettingsButton = $('#close-settings-button');
        const loginModal = $('#login-modal');
        const googleSignInButton = $('#google-signin-button'); // Botón específico de Google
        const closeLoginButton = $('#close-login-modal');

        function togglePanel(panel, forceState) {
            if (!panel) return;
            const isVisible = panel.classList.contains('visible');
            const shouldBeVisible = forceState === undefined ? !isVisible : forceState;

            if (isVisible !== shouldBeVisible) {
                 panel.classList.toggle('visible', shouldBeVisible);
            }
        }
        function toggleModal(modal, forceState) {
             if (!modal) return;
             const isVisible = modal.classList.contains('visible');
             const shouldBeVisible = forceState === undefined ? !isVisible : forceState;

             if (isVisible !== shouldBeVisible) {
                 modal.classList.toggle('visible', shouldBeVisible);
            }
        }

        function init() {
            // Settings Panel
            if (settingsButton && settingsPanel && closeSettingsButton) {
                settingsButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePanel(settingsPanel);
                });
                closeSettingsButton.addEventListener('click', () => togglePanel(settingsPanel, false));
                 // Cerrar al hacer clic fuera del panel
                 document.addEventListener('click', (e) => {
                    // Check if panel exists and is visible
                    if (settingsPanel && settingsPanel.classList.contains('visible')) {
                         // Check if the click was outside the panel AND not on the toggle button
                         if (!settingsPanel.contains(e.target) && e.target !== settingsButton && !settingsButton.contains(e.target)) {
                              togglePanel(settingsPanel, false);
                         }
                    }
                 }, true); // Use capture phase to potentially catch clicks sooner
            }

            // Login Modal
             if (loginModal && closeLoginButton) {
                 // User auth button logic is handled in authManager.init
                 closeLoginButton.addEventListener('click', () => toggleModal(loginModal, false));
                 // Cerrar al hacer clic en el overlay
                 loginModal.addEventListener('click', (e) => {
                     if (e.target === loginModal) toggleModal(loginModal, false);
                 });
                 // Listener para el botón de Google Sign-In
                 if (googleSignInButton) {
                     googleSignInButton.addEventListener('click', () => {
                         authManager.signInWithGoogle();
                         // Don't necessarily close modal immediately, wait for auth state change or error
                         // toggleModal(loginModal, false);
                     });
                 }
             }
        }

        return { init, toggleModal, togglePanel };
    })();

    // --- 7.5. Gestor de Autenticación ---
    const authManager = (() => {
        const provider = new GoogleAuthProvider();

        async function signInWithGoogle() {
            console.log("Attempting Google Sign-In...");
            // Optionally show a loading indicator in the modal
            const signInButton = $('#google-signin-button');
            if(signInButton) signInButton.disabled = true;

            try {
                const result = await signInWithPopup(auth, provider);
                console.log("Google Sign-In Successful for:", result.user.displayName);
                uiManager.toggleModal($('#login-modal'), false); // Close modal on success
            } catch (error) {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error("Google Sign-In Error:", errorCode, errorMessage);
                // Display a more user-friendly error
                let displayError = `Error (${errorCode}): ${errorMessage}`;
                if (errorCode === 'auth/popup-closed-by-user') {
                    displayError = "Inicio de sesión cancelado.";
                } else if (errorCode === 'auth/network-request-failed') {
                    displayError = "Error de red. Inténtalo de nuevo.";
                }
                alert(`Error al iniciar sesión: ${displayError}`);
                uiManager.toggleModal($('#login-modal'), true); // Keep modal open on error
            } finally {
                 if(signInButton) signInButton.disabled = false; // Re-enable button
            }
        }

        async function logoutUser() {
            console.log("Attempting Sign-Out...");
            try {
                await signOut(auth);
                console.log("Sign-Out successful.");
                // UI update is handled by onAuthStateChanged
            } catch (error) {
                console.error("Sign-Out Error", error);
                alert(`Error al cerrar sesión: ${error.message}`);
            }
        }

        function init() {
            // Listener principal para cambios de estado de autenticación
             onAuthStateChanged(auth, (user) => {
                 console.log("Auth State Changed:", user ? `User Logged In (${user.uid})` : "User Logged Out");
                 const wasAlreadyLoggedIn = !!currentUser; // Check previous state
                 currentUser = user; // Actualizar estado global

                 updateAuthButtonUI(user); // Actualizar icono/botón de usuario
                 // Set initial language or re-translate AFTER knowing auth state
                 if (!wasAlreadyLoggedIn && user) { // First time login during this session
                    languageManager.setLanguage(languageManager.getCurrentLang());
                 } else if (wasAlreadyLoggedIn && !user) { // Just logged out
                    languageManager.setLanguage(languageManager.getCurrentLang());
                 } else if (!user && !wasAlreadyLoggedIn) { // Initial load, logged out
                    languageManager.setLanguage(languageManager.getCurrentLang());
                 }
                 // If already logged in on initial load, language is set then too.
             });

            // Configurar el botón de usuario (userAuthButton)
            if (userAuthButton) {
                userAuthButton.addEventListener('click', () => {
                    if (currentUser) {
                        // Si está logueado, hacer logout
                        logoutUser();
                    } else {
                        // Si no está logueado, abrir modal de login
                        uiManager.toggleModal($('#login-modal'), true);
                    }
                });
            }
        }

        function getCurrentUser() {
            return currentUser;
        }

        return { init, signInWithGoogle, logoutUser, getCurrentUser };
    })();

    // --- Función para Actualizar UI del Botón de Usuario ---
     function updateAuthButtonUI(user) {
         if (!userAuthButton || !userPhotoElement || !userIconElement) {
             // console.warn("Auth button UI elements not found.");
             return;
         }

         const currentLang = languageManager.getCurrentLang(); // Obtener idioma actual

         if (user) {
             // Logged In
             userAuthButton.classList.add('logged-in');
             userPhotoElement.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'U')}&background=random&color=fff&size=40`; // Use photo or generate avatar
             userPhotoElement.style.display = 'block';
             userIconElement.style.display = 'none';
             // Actualizar tooltip y title
             const logoutTooltipText = translations[currentLang]?.logout_tooltip || "Sign out";
             userAuthButton.dataset.tooltip = logoutTooltipText;
             userAuthButton.setAttribute('title', `${user.displayName || user.email || 'User Profile'} (${logoutTooltipText})`); // Title más descriptivo
         } else {
             // Logged Out
             userAuthButton.classList.remove('logged-in');
             userPhotoElement.style.display = 'none';
             userIconElement.style.display = 'block';
             // Actualizar tooltip y title
             const loginTooltipText = translations[currentLang]?.login_tooltip || "Login";
             userAuthButton.dataset.tooltip = loginTooltipText;
             userAuthButton.setAttribute('title', loginTooltipText); // Title simple
         }
     }

    // --- 8. Lógica Específica de Página ---
    const pageLogic = (() => {

        function initIndexPage() {
            // console.log("Initializing Index Page");
            const posterContainer = $('#poster-container');
            if (!posterContainer) return;

            posterContainer.innerHTML = ''; // Limpiar placeholders

            // Generar posters desde los datos simulados
            Object.entries(videoDataStore).forEach(([id, data]) => {
                if (!data || !data.title) return;

                const themeColor = getComputedStyle(root).getPropertyValue('--primary-color').trim().substring(1) || '00ff00';
                const defaultImgSrc = `https://via.placeholder.com/200x200/${themeColor}/ffffff?text=${encodeURIComponent(data.title.substring(0, 1))}`; // Default uses first letter
                 const errorImgSrc = `https://via.placeholder.com/200x200/ff0000/ffffff?text=Error`; // Error placeholder

                // Prioritize related image if available
                let imgSrc = defaultImgSrc;
                if (data.related && data.related.length > 0 && data.related[0].imgSrc) {
                     try {
                         // Attempt to use related image URL
                         let relatedUrl = new URL(data.related[0].imgSrc); // Validate URL format
                         if (relatedUrl.hostname.includes('placeholder.com')) {
                             // Try to resize placeholder URL
                             imgSrc = data.related[0].imgSrc.replace(/(\d+x\d+)/g, '200x200');
                         } else {
                             imgSrc = data.related[0].imgSrc; // Use external URL directly
                         }
                     } catch (e) {
                         imgSrc = defaultImgSrc; // Fallback if URL is invalid
                         console.warn(`Invalid related image URL for ${id}: ${data.related[0].imgSrc}`);
                     }
                }

                const posterItem = document.createElement('a');
                posterItem.href = `detail.html?id=${id}`;
                posterItem.classList.add('poster-item');
                posterItem.dataset.id = id;
                posterItem.innerHTML = `
                    <div class="poster">
                        <img src="${imgSrc}" alt="${data.title}" loading="lazy" onerror="this.onerror=null; this.src='${errorImgSrc}';">
                    </div>
                    <h3 class="poster-title">${data.title}</h3>
                `;
                posterContainer.appendChild(posterItem);
            });
        }

        function initDetailPage() {
            // console.log("Initializing Detail Page");
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('id');

            const detailTitle = $('#detail-title');
            const detailViews = $('#detail-views');
            const detailDate = $('#detail-date');
            const detailDescription = $('#detail-description');
            const videoPlayerIframe = $('#video-player-iframe');
            const relatedContainer = $('#related-items-container');
            const pageTitleElement = $('#detail-page-title');

            // Check if elements exist before proceeding
            if (!detailTitle || !detailViews || !detailDate || !detailDescription || !videoPlayerIframe || !relatedContainer || !pageTitleElement) {
                console.error("One or more detail page elements are missing from the DOM.");
                return;
            }

            if (!itemId || !videoDataStore[itemId]) {
                console.error(`Item ID not found or invalid: ${itemId}`);
                detailTitle.textContent = "Error: Contenido no encontrado";
                pageTitleElement.textContent = "Error - Pornitoo";
                detailDescription.textContent = "El contenido solicitado no existe o no se pudo cargar.";
                relatedContainer.innerHTML = "";
                videoPlayerIframe.src = "";
                detailViews.textContent = '---';
                detailDate.textContent = '---';
                // Optionally redirect: window.location.href = 'index.html';
                return;
            }

            const data = videoDataStore[itemId];

            // Populate content
            pageTitleElement.textContent = `${data.title || 'Detalle'} - Pornitoo`;
            detailTitle.textContent = data.title || 'Sin Título';
            detailViews.textContent = data.views || '---';
            detailDate.textContent = data.date || '---';
            detailDescription.textContent = data.description || 'No hay descripción.';
            videoPlayerIframe.src = data.videoSrc || '';

            // Populate related items
            relatedContainer.innerHTML = ''; // Clear placeholders first
            const themeColor = getComputedStyle(root).getPropertyValue('--primary-color').trim().substring(1) || '00ff00';
            const defaultRelatedImg = `https://via.placeholder.com/100x56/${themeColor}/ffffff?text=Rel`;
            const errorRelatedImg = `https://via.placeholder.com/100x56/ff0000/ffffff?text=Err`;

            if (data.related && data.related.length > 0) {
                data.related.forEach(related => {
                    // Check if the related item exists in our data store
                    if (videoDataStore[related.id]) {
                        const relatedLink = document.createElement('a');
                        relatedLink.href = `detail.html?id=${related.id}`;
                        relatedLink.classList.add('related-item');
                        relatedLink.innerHTML = `
                            <img src="${related.imgSrc || defaultRelatedImg}" alt="${related.title || 'Video Relacionado'}" loading="lazy" onerror="this.onerror=null; this.src='${errorRelatedImg}';">
                            <div class="related-item-info">
                                <h5>${related.title || 'Video Relacionado'}</h5>
                            </div>
                        `;
                        relatedContainer.appendChild(relatedLink);
                    }
                });
            }

            // If no related items were added, show the 'no related' message
            if (relatedContainer.children.length === 0) {
                const noRelatedKey = 'no_related_videos';
                // Ensure languageManager is initialized and getCurrentLang is available
                const lang = languageManager.getCurrentLang ? languageManager.getCurrentLang() : 'es';
                const noRelatedText = translations[lang]?.[noRelatedKey] || "No related videos.";
                relatedContainer.innerHTML = `<p style="opacity: 0.7;" data-translate-key="${noRelatedKey}">${noRelatedText}</p>`;
            }
        }

        function init() {
            // Determine which page logic to run based on unique elements
            if ($('#poster-container')) { // Element unique to index.html
                initIndexPage();
            } else if ($('#detail-view-content')) { // Element unique to detail.html
                initDetailPage();
            }
            // Chat page logic is in chat_script.js

             // Common listener for the header logo
             if (headerLogo) {
                 headerLogo.addEventListener('click', (e) => {
                     e.preventDefault(); // Prevent default if it's somehow an anchor
                     window.location.href = 'index.html'; // Navigate to index
                 });
             }
        }

        return { init };
    })();

    // --- 9. Inicialización General ---
    function initializeApp() {
        console.log("Initializing App Modules...");

        // 1. Auth Manager MUST init first to check login state ASAP
        // It now handles the initial language setting via its onAuthStateChanged callback
        authManager.init();

        // 2. Initialize other managers AFTER auth is listening
        themeManager.init();
        languageManager.init(); // Sets up listeners, actual translation happens via auth callback
        particleManager.init();
        uiManager.init(); // Configura listeners UI generales
        pageLogic.init(); // Ejecuta lógica específica de la página

        // 3. Handle Intro Animation (only runs once per session using localStorage)
        const introPlayed = loadFromLocalStorage('introPlayedOncePornitoo', 'false') === 'true';
        // Match CSS: total duration is ~4.5s, fade out starts ~4s
        const introFadeDelay = introPlayed ? 0 : 4000; // Start fade slightly before end
        const introHideDelay = introPlayed ? 0 : 4500; // Total duration before hiding

        if (introAnimation && introFadeDelay > 0) {
            mainContent.style.opacity = '0'; // Hide main content initially
            introAnimation.style.opacity = '1';
            introAnimation.style.display = 'flex';

            // Start fade out
            setTimeout(() => {
                if (introAnimation) introAnimation.style.opacity = '0';
            }, introFadeDelay);

            // Hide completely and show main content after full duration
            setTimeout(() => {
                 if (introAnimation) introAnimation.style.display = 'none';
                 if (mainContent) mainContent.style.opacity = '1';
                 saveToLocalStorage('introPlayedOncePornitoo', 'true');
            }, introHideDelay);

        } else {
             if (introAnimation) introAnimation.style.display = 'none';
             if (mainContent) mainContent.style.opacity = '1';
        }

        console.log("App Initialized.");
    }

    // Start the app initialization process
    initializeApp();

}); // Fin DOMContentLoaded

