// Imports Firebase (Auth, Realtime Database, Storage)
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getDatabase, ref, onValue, off, push, set, update, query, orderByChild, limitToLast, serverTimestamp, get, child, equalTo, orderByValue
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import {
    getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// Espera a que el DOM esté listo Y Firebase inicializado
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseApp) {
        initializeChatLogic();
    } else {
        console.warn("Chat Script: Firebase not ready, waiting for event...");
        document.addEventListener('firebase-ready', initializeChatLogic, { once: true });
    }
});

// --- Lógica Principal del Chat ---
function initializeChatLogic() {
    console.log("Initializing Chat Logic...");
    // --- 0. Firebase Services y Constantes ---
    if (!window.firebaseApp) { console.error("Chat Script: Firebase App object not found!"); return; }
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);
    const storage = getStorage(window.firebaseApp); // Inicializar Storage

    // Constantes de Niveles y Anti-Spam (Ajusta según necesidad)
    const LEVEL_THRESHOLDS = { 5: 100, 10: 500, 30: 5000 }; // Nivel: XP necesario
    const XP_PER_MESSAGE = 10; // XP base por mensaje válido
    const XP_LENGTH_BONUS = 0.1; // XP extra por caracter
    const MIN_MESSAGE_INTERVAL = 3000; // Milisegundos mínimos entre mensajes para contar XP (3 segundos)
    const LEVEL_PHOTO_REQUIRED = 5;
    const LEVEL_VIDEO_REQUIRED = 10;
    const LEVEL_CALL_REQUIRED = 30;

    // --- 1. Selectores DOM ---
    const chatListContainer = document.getElementById('chat-list-container');
    const chatMainArea = document.getElementById('chat-main-area');
    const chatMainHeader = document.getElementById('chat-main-header');
    const activeChatPic = document.getElementById('active-chat-pic');
    const activeChatName = document.getElementById('active-chat-name');
    const activeChatStatus = document.getElementById('active-chat-status');
    const callButton = document.getElementById('call-button');
    const videoCallButton = document.getElementById('video-call-button');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const messageInputContainer = document.getElementById('chat-input-area');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('send-chat-message');
    const attachButtonLabel = document.getElementById('attach-button-label');
    const mediaUploadInput = document.getElementById('media-upload-input');
    const mediaUploadProgress = document.getElementById('media-upload-progress');
    const noChatSelectedDiv = document.getElementById('no-chat-selected');
    const chatLoadingIndicator = document.getElementById('chat-loading-indicator'); // En mensajes
    const chatLoginPrompt = document.getElementById('chat-login-prompt'); // En mensajes
    const chatLoginButton = document.getElementById('chat-login-button'); // En mensajes
    // Modales y relacionados
    const addUserButton = document.getElementById('add-chat-button');
    const addUserModal = document.getElementById('add-user-modal');
    const closeAddUserModal = document.getElementById('close-add-user-modal');
    const userSearchInput = document.getElementById('user-search-input');
    const userSearchResults = document.getElementById('user-search-results');
    const addUserStatus = document.getElementById('add-user-status');
    // Tabs (Privado/Grupos) - Placeholder
    const tabPrivate = document.getElementById('tab-private');
    const tabGroups = document.getElementById('tab-groups');

    // --- 2. Estado de la Aplicación Chat ---
    let currentUser = null;
    let currentChatId = null; // ID del chat actualmente seleccionado
    let currentChatType = 'private'; // 'private' o 'group'
    let currentChatLevel = 0; // Nivel del usuario en el chat actual
    let otherParticipantInfo = {}; // Info del otro usuario en chat privado
    let messageListeners = []; // Para poder remover listeners al cambiar de chat
    let lastMessageTimestamps = {}; // Para anti-spam: { chatId: timestamp }
    let isScrolledToBottom = true; // Para scroll inteligente

    // --- 3. Funciones Utilitarias (pueden estar en script.js y ser globales) ---
    const $ = (selector) => document.querySelector(selector); // Asumiendo que existe globalmente
    const escapeHTML = window.escapeHTML || function(str) { const div = document.createElement('div'); div.appendChild(document.createTextNode(str || '')); return div.innerHTML; };
    const formatDate = window.formatDate || function(timestamp) { if (!timestamp) return '--:--'; try { const date = new Date(timestamp); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '--:--'; } };
    const showStatus = (element, message, type = 'info', autoHideDelay = 0) => { if (!element) return; element.textContent = message; element.className = 'admin-status'; element.classList.add(type); element.style.display = 'block'; if (autoHideDelay > 0) setTimeout(() => { if(element) element.style.display = 'none'; }, autoHideDelay); };
    const toggleModal = window.uiManager?.toggleModal || function(modal, forceState) { if (modal) modal.classList.toggle('visible', forceState); }; // Usar uiManager si existe

    // --- 4. Lógica Principal ---

    // 4.1 Autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Chat Script: User Logged In", user.uid);
            currentUser = { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
            // Guardar info básica del usuario en /users si no existe
            saveUserInfo(user);
            loadUserChats(); // Cargar la lista de chats del usuario
            if(chatLoginPrompt) chatLoginPrompt.style.display = 'none';
        } else {
            console.log("Chat Script: User Logged Out");
            currentUser = null;
            currentChatId = null;
            otherParticipantInfo = {};
            clearChatUI(); // Limpiar toda la interfaz de chat
            if(chatLoginPrompt) chatLoginPrompt.style.display = 'flex'; // Mostrar prompt de login
        }
        // Actualizar botón de auth en header (manejado por script.js)
        // window.updateAuthButtonUI?.(user); // Llamar si es necesario desde aquí
    });

    // 4.2 Guardar/Actualizar Info del Usuario en DB
    function saveUserInfo(user) {
        const userRef = ref(db, `users/${user.uid}`);
        update(userRef, { // Usar update para no sobrescribir otros datos
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
            email: user.email,
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'U')}&background=random&color=fff&size=50`,
            lastSeen: serverTimestamp() // Opcional: actualizar última conexión
        }).catch(error => console.error("Error saving user info:", error));
    }

    // 4.3 Limpiar UI del Chat
    function clearChatUI() {
        if (chatListContainer) chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">Inicia sesión para ver tus chats.</p>`;
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';
        if (noChatSelectedDiv) noChatSelectedDiv.style.display = 'flex';
        if (chatMainHeader) chatMainHeader.style.display = 'none';
        if (messageInputContainer) messageInputContainer.style.display = 'none';
        // Limpiar listeners de mensajes anteriores
        messageListeners.forEach(({ ref, listener }) => off(ref, 'child_added', listener));
        messageListeners = [];
        console.log("Chat UI Cleared");
    }

    // 4.4 Cargar Lista de Chats del Usuario
    function loadUserChats() {
        if (!currentUser || !chatListContainer) return;
        console.log("Loading user chats for:", currentUser.uid);
        chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">Cargando tus chats...</p>`;

        const userChatsRef = ref(db, `userChats/${currentUser.uid}`);
        // Usar onValue para actualizar la lista si se añaden/quitan chats
        onValue(userChatsRef, (snapshot) => {
            chatListContainer.innerHTML = ''; // Limpiar antes de renderizar
            if (snapshot.exists()) {
                const chatIds = snapshot.val(); // Objeto { chatId1: true, chatId2: true } o { chatId1: {lastMsgTimestamp: ...}, ...}
                console.log("User has chats:", Object.keys(chatIds));
                // Iterar sobre los IDs y obtener detalles de cada chat
                Object.keys(chatIds).forEach(chatId => {
                    fetchChatDetails(chatId);
                });
            } else {
                console.log("User has no chats yet.");
                chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">No tienes chats. ¡Inicia uno nuevo!</p>`;
            }
        }, (error) => {
            console.error("Error loading user chats:", error);
            chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: red;">Error al cargar chats.</p>`;
        });
    }

    // 4.5 Obtener Detalles de un Chat Específico para la Lista
    async function fetchChatDetails(chatId) {
        const chatRef = ref(db, `chats/${chatId}`);
        try {
            const snapshot = await get(chatRef);
            if (snapshot.exists()) {
                const chatData = snapshot.val();
                // Determinar el otro participante (si es chat privado)
                let otherUserId = null;
                if (chatData.type === 'private' && chatData.participants) {
                    otherUserId = Object.keys(chatData.participants).find(uid => uid !== currentUser.uid);
                }
                // Obtener info del otro usuario o usar nombre del grupo
                let displayName = chatData.name || 'Grupo Desconocido';
                let displayPic = chatData.photoURL || `https://via.placeholder.com/50/777777/ffffff?text=${displayName.charAt(0).toUpperCase()}`;
                let userLevel = chatData.participants?.[currentUser.uid]?.level || 0; // Nivel en este chat

                if (otherUserId) {
                    const otherUserRef = ref(db, `users/${otherUserId}`);
                    const userSnap = await get(otherUserRef);
                    if (userSnap.exists()) {
                        const otherUserData = userSnap.val();
                        displayName = otherUserData.displayName || 'Usuario';
                        displayPic = otherUserData.photoURL || `https://via.placeholder.com/50/cccccc/ffffff?text=${displayName.charAt(0).toUpperCase()}`;
                    }
                }
                renderChatListItem(chatId, displayName, displayPic, chatData.lastMessage?.text || '', chatData.lastMessage?.timestamp || null, userLevel);
            } else {
                console.warn(`Chat details not found for chatId: ${chatId}`);
                // Opcional: Remover de userChats si el chat no existe?
            }
        } catch (error) {
            console.error(`Error fetching details for chat ${chatId}:`, error);
        }
    }

    // 4.6 Renderizar un Item en la Lista de Chats
    function renderChatListItem(chatId, name, picUrl, lastMsg, timestamp, level) {
        if (!chatListContainer) return;
        // Evitar duplicados si onValue dispara rápido
        if (chatListContainer.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`)) return;

        const item = document.createElement('div');
        item.classList.add('chat-list-item');
        item.dataset.chatId = chatId; // Guardar ID para selección
        item.dataset.chatType = name === 'Chat General' ? 'group' : 'private'; // Asumiendo tipo

        item.innerHTML = `
            <img src="${escapeHTML(picUrl)}" alt="${escapeHTML(name)}" class="profile-pic">
            <div class="chat-info">
                <span class="chat-name">${escapeHTML(name)}</span>
                <span class="last-message">${escapeHTML(lastMsg)}</span>
            </div>
            ${timestamp ? `<span class="timestamp">${formatDate(timestamp)}</span>` : ''}
            ${level > 0 ? `<span class="level-indicator">Lv. ${level}</span>` : ''}
        `;

        item.addEventListener('click', () => selectChat(chatId, name, picUrl, item.dataset.chatType));

        // Insertar ordenado por timestamp (o simplemente añadir)
        // Lógica de ordenación más compleja omitida por simplicidad
        chatListContainer.appendChild(item);
    }

    // 4.7 Seleccionar un Chat
    async function selectChat(chatId, name, picUrl, type) {
        console.log(`Selecting chat: ${chatId} (${name})`);
        if (currentChatId === chatId) return; // Ya seleccionado

        // Limpiar listeners del chat anterior
        messageListeners.forEach(({ ref, listener }) => off(ref, 'child_added', listener));
        messageListeners = [];

        currentChatId = chatId;
        currentChatType = type;
        otherParticipantInfo = {}; // Resetear info del otro participante

        // Marcar como activo en la lista
        document.querySelectorAll('.chat-list-item.active').forEach(el => el.classList.remove('active'));
        chatListContainer.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`)?.classList.add('active');

        // Actualizar cabecera del chat principal
        if (chatMainHeader) {
            if(activeChatPic) activeChatPic.src = picUrl;
            if(activeChatName) activeChatName.textContent = name;
            if(activeChatStatus) activeChatStatus.textContent = ''; // Limpiar estado (podría cargarse 'online' luego)
            chatMainHeader.style.display = 'flex';
        }
        if (messageInputContainer) messageInputContainer.style.display = 'flex';
        if (noChatSelectedDiv) noChatSelectedDiv.style.display = 'none';

        // Cargar mensajes
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = `<p id="chat-loading-indicator">Cargando mensajes...</p>`; // Limpiar y mostrar carga
        loadMessages(chatId);

        // Obtener nivel del usuario en este chat y actualizar permisos
        try {
            const levelRef = ref(db, `chats/${chatId}/participants/${currentUser.uid}/level`);
            const snapshot = await get(levelRef);
            currentChatLevel = snapshot.exists() ? snapshot.val() : 0;
            console.log(`User level in chat ${chatId}: ${currentChatLevel}`);
            updateMediaPermissions();
        } catch (error) {
            console.error("Error fetching user level:", error);
            currentChatLevel = 0;
            updateMediaPermissions();
        }

        // Obtener info del otro participante si es privado
        if (type === 'private') {
            const chatRef = ref(db, `chats/${chatId}`);
            const chatSnap = await get(chatRef);
            if (chatSnap.exists()) {
                const chatData = chatSnap.val();
                const otherUserId = Object.keys(chatData.participants || {}).find(uid => uid !== currentUser.uid);
                if (otherUserId) {
                    const userRef = ref(db, `users/${otherUserId}`);
                    const userSnap = await get(userRef);
                    if (userSnap.exists()) {
                        otherParticipantInfo = { uid: otherUserId, ...userSnap.val() };
                        if(activeChatStatus) activeChatStatus.textContent = 'Online'; // Placeholder, necesitaría presencia real
                    }
                }
            }
        }
    }

    // 4.8 Cargar Mensajes del Chat Activo
    function loadMessages(chatId) {
        if (!chatMessagesContainer || !currentUser) return;
        console.log(`Loading messages for chat: ${chatId}`);

        const messagesRef = ref(db, `messages/${chatId}`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50)); // Cargar últimos 50

        // Limpiar listeners anteriores antes de añadir uno nuevo
        messageListeners.forEach(({ ref, listener }) => off(ref, 'child_added', listener));
        messageListeners = [];

        const listener = onChildAdded(messagesQuery, (snapshot) => {
             const messageData = snapshot.val();
             const messageKey = snapshot.key;
             // Asegurarse que el contenedor no tenga el mensaje de carga
             const loadingIndicator = document.getElementById('chat-loading-indicator');
             if(loadingIndicator && loadingIndicator.parentNode === chatMessagesContainer) {
                 loadingIndicator.remove();
             }
             displayMessage(messageKey, messageData);
         }, (error) => {
             console.error(`Error fetching messages for chat ${chatId}:`, error);
             if (chatMessagesContainer) chatMessagesContainer.innerHTML = `<p style="color: red;">Error al cargar mensajes.</p>`;
         });

         // Guardar referencia al listener para poder quitarlo después
         messageListeners.push({ ref: messagesQuery, listener: listener });

         // Scroll inicial al fondo después de un pequeño delay para permitir renderizado
         setTimeout(scrollToBottom, 300);
    }

    // 4.9 Mostrar un Mensaje en la UI
    function displayMessage(key, data) {
        if (!chatMessagesContainer || !data) return;
        const messageId = `message-${key}`;
        if (document.getElementById(messageId)) return; // Evitar duplicados

        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.id = messageId;

        const isSent = currentUser && data.userId === currentUser.uid;
        messageElement.classList.add(isSent ? 'sent' : 'received');

        const timestamp = data.timestamp ? formatDate(data.timestamp) : '';
        const senderName = !isSent ? `<span class="sender-name">${escapeHTML(data.userName || 'Usuario')}</span>` : '';

        let contentHTML = '';
        if (data.type === 'image' && data.mediaUrl) {
            messageElement.classList.add('media');
            contentHTML = `<img src="${escapeHTML(data.mediaUrl)}" alt="Imagen adjunta" loading="lazy">`;
        } else if (data.type === 'video' && data.mediaUrl) {
            messageElement.classList.add('media');
            // Usar etiqueta video con controles
            contentHTML = `<video src="${escapeHTML(data.mediaUrl)}" controls preload="metadata" style="max-width: 100%; border-radius: 8px;"></video>`;
        } else {
            // Mensaje de texto normal
            contentHTML = `<span class="message-content">${escapeHTML(data.text || '')}</span>`;
        }

        messageElement.innerHTML = `
            ${senderName}
            ${contentHTML}
            <span class="message-timestamp">${timestamp}</span>
        `;

        // Insertar al principio ya que el contenedor está en flex-direction: column-reverse
        chatMessagesContainer.insertBefore(messageElement, chatMessagesContainer.firstChild);

        // Actualizar preview en sidebar
        if(chatListContainer) {
            const listItem = chatListContainer.querySelector(`.chat-list-item[data-chat-id="${currentChatId}"]`);
            if(listItem) {
                const lastMsgElement = listItem.querySelector('.last-message');
                const timestampElement = listItem.querySelector('.timestamp');
                if(lastMsgElement) lastMsgElement.textContent = data.type === 'image' ? '[Imagen]' : (data.type === 'video' ? '[Video]' : escapeHTML(data.text || ''));
                if(timestampElement) timestampElement.textContent = timestamp;
            }
        }

        // Scroll inteligente
        if (isScrolledToBottom || isSent) {
            scrollToBottom();
        }
    }

    // 4.10 Enviar Mensaje
    async function sendMessage() {
        if (!messageInput || !currentUser || !currentChatId || !sendButton) return;
        const text = messageInput.value.trim();
        if (text === '') return;

        // --- Anti-Spam Básico ---
        const now = Date.now();
        const lastSent = lastMessageTimestamps[currentChatId] || 0;
        const isSpam = (now - lastSent) < MIN_MESSAGE_INTERVAL;
        if (isSpam) {
             console.log("Anti-spam: Mensaje demasiado rápido.");
             // Opcional: Mostrar aviso al usuario
        }
        lastMessageTimestamps[currentChatId] = now; // Actualizar timestamp del último mensaje

        // --- Calcular XP (Solo si no es spam) ---
        let xpGained = 0;
        if (!isSpam) {
            xpGained = XP_PER_MESSAGE + Math.floor(text.length * XP_LENGTH_BONUS);
        }

        // --- Preparar Datos Mensaje ---
        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Usuario Anónimo',
            text: text,
            timestamp: serverTimestamp(), // Usar timestamp del servidor
            type: 'text' // Tipo por defecto
        };

        // --- Guardar en DB ---
        const messagesRef = ref(db, `messages/${currentChatId}`);
        const newMessageRef = push(messagesRef);
        const chatRef = ref(db, `chats/${currentChatId}`);
        const userChatRefSelf = ref(db, `userChats/${currentUser.uid}/${currentChatId}`);
        // Referencia al chat del otro usuario (si es privado)
        let userChatRefOther = null;
        if (currentChatType === 'private' && otherParticipantInfo.uid) {
            userChatRefOther = ref(db, `userChats/${otherParticipantInfo.uid}/${currentChatId}`);
        }

        try {
            messageInput.disabled = true; sendButton.disabled = true;

            // 1. Guardar el mensaje
            await set(newMessageRef, messageData);

            // 2. Actualizar lastMessage y timestamp en chat y userChats
            const lastMessageUpdate = {
                text: text.substring(0, 30) + (text.length > 30 ? '...' : ''), // Preview corto
                timestamp: serverTimestamp(),
                senderId: currentUser.uid // Quién envió el último
            };
            const updates = {};
            updates[`/chats/${currentChatId}/lastMessage`] = lastMessageUpdate;
            updates[`/userChats/${currentUser.uid}/${currentChatId}/lastMessage`] = lastMessageUpdate;
            if (userChatRefOther) {
                updates[`/userChats/${otherParticipantInfo.uid}/${currentChatId}/lastMessage`] = lastMessageUpdate;
            }

            // 3. Actualizar XP y Nivel (si no es spam)
            if (xpGained > 0) {
                const participantRef = ref(db, `chats/${currentChatId}/participants/${currentUser.uid}`);
                const snapshot = await get(participantRef);
                let currentXP = 0;
                let currentLevel = 0;
                if (snapshot.exists()) {
                    currentXP = snapshot.val().xp || 0;
                    currentLevel = snapshot.val().level || 0;
                }
                let newXP = currentXP + xpGained;
                let newLevel = currentLevel;

                // Comprobar si sube de nivel
                let nextLevel = newLevel + 1;
                let xpNeeded = LEVEL_THRESHOLDS[nextLevel] || Infinity; // XP para el siguiente nivel

                while (newXP >= xpNeeded) {
                    newLevel = nextLevel;
                    newXP -= xpNeeded; // Restar XP usado para subir
                    console.log(`¡Nivel Subido! Usuario ${currentUser.uid} alcanzó nivel ${newLevel} en chat ${currentChatId}`);
                    nextLevel++;
                    xpNeeded = LEVEL_THRESHOLDS[nextLevel] || Infinity;
                }

                updates[`/chats/${currentChatId}/participants/${currentUser.uid}/xp`] = newXP;
                if (newLevel !== currentLevel) {
                    updates[`/chats/${currentChatId}/participants/${currentUser.uid}/level`] = newLevel;
                    currentChatLevel = newLevel; // Actualizar estado local
                    updateMediaPermissions(); // Actualizar botones
                    // Opcional: Mostrar notificación de subida de nivel
                }
            }

            // Aplicar todas las actualizaciones juntas
            await update(ref(db), updates);

            messageInput.value = ''; // Limpiar input

        } catch (error) {
            console.error("Error sending message or updating data:", error);
            alert("Error al enviar el mensaje.");
        } finally {
            if (currentUser) {
                 messageInput.disabled = false; sendButton.disabled = false;
                 messageInput.focus();
            }
        }
    }

    // 4.11 Actualizar Permisos de Media/Llamada según Nivel
    function updateMediaPermissions() {
        const canSendPhoto = currentChatLevel >= LEVEL_PHOTO_REQUIRED;
        const canSendVideo = currentChatLevel >= LEVEL_VIDEO_REQUIRED;
        const canCall = currentChatLevel >= LEVEL_CALL_REQUIRED;

        if (attachButtonLabel) {
            attachButtonLabel.classList.toggle('disabled', !canSendPhoto);
            attachButtonLabel.title = canSendPhoto ? "Adjuntar Foto/Video" : `Adjuntar Foto (Nivel ${LEVEL_PHOTO_REQUIRED}) / Video (Nivel ${LEVEL_VIDEO_REQUIRED})`;
        }
        if (mediaUploadInput) {
            mediaUploadInput.disabled = !canSendPhoto;
            // Ajustar 'accept' dinámicamente si solo permite fotos al principio
            mediaUploadInput.accept = canSendVideo ? "image/*,video/mp4,video/quicktime,video/webm" : "image/*";
        }
        if (callButton) callButton.classList.toggle('disabled', !canCall);
        if (videoCallButton) videoCallButton.classList.toggle('disabled', !canCall);
    }

    // 4.12 Manejar Subida de Media (Placeholder/Básico)
    function handleMediaUpload(event) {
        if (!currentUser || !currentChatId) return;
        const file = event.target.files?.[0];
        if (!file) return;

        // Verificar nivel antes de subir
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/'); // Ajusta tipos si es necesario
        if (isImage && currentChatLevel < LEVEL_PHOTO_REQUIRED) {
            alert(`Necesitas nivel ${LEVEL_PHOTO_REQUIRED} para enviar fotos.`);
            return;
        }
        if (isVideo && currentChatLevel < LEVEL_VIDEO_REQUIRED) {
             alert(`Necesitas nivel ${LEVEL_VIDEO_REQUIRED} para enviar videos.`);
            return;
        }
        if (!isImage && !isVideo) {
            alert("Tipo de archivo no soportado.");
            return;
        }

        console.log(`Uploading ${isImage ? 'image' : 'video'}: ${file.name}`);
        if (mediaUploadProgress) mediaUploadProgress.style.display = 'block';
        if (attachButtonLabel) attachButtonLabel.classList.add('disabled'); // Deshabilitar mientras sube

        // Crear referencia en Storage (ej. /chatMedia/{chatId}/{timestamp}_{filename})
        const filePath = `chatMedia/${currentChatId}/${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
                if (mediaUploadProgress) mediaUploadProgress.style.width = progress + '%';
            },
            (error) => {
                console.error("Upload failed:", error);
                alert("Error al subir el archivo.");
                if (mediaUploadProgress) mediaUploadProgress.style.display = 'none';
                if (attachButtonLabel) updateMediaPermissions(); // Rehabilitar según nivel
            },
            async () => {
                // Upload completed successfully, now get the download URL
                if (mediaUploadProgress) mediaUploadProgress.style.display = 'none';
                if (attachButtonLabel) updateMediaPermissions(); // Rehabilitar según nivel
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log('File available at', downloadURL);
                    // Enviar mensaje con la URL
                    sendMediaMessage(downloadURL, isImage ? 'image' : 'video');
                } catch (error) {
                     console.error("Error getting download URL:", error);
                     alert("Error obteniendo la URL del archivo subido.");
                }
            }
        );
        // Limpiar input para permitir subir el mismo archivo de nuevo
        event.target.value = null;
    }

    // 4.13 Enviar Mensaje de Media
    async function sendMediaMessage(url, type) {
        if (!currentUser || !currentChatId) return;

        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Usuario Anónimo',
            mediaUrl: url,
            type: type, // 'image' o 'video'
            text: type === 'image' ? '[Imagen]' : '[Video]', // Texto para preview/notificación
            timestamp: serverTimestamp()
        };

        // Guardar mensaje y actualizar lastMessage (similar a sendMessage)
        const messagesRef = ref(db, `messages/${currentChatId}`);
        const newMessageRef = push(messagesRef);
        const lastMessageUpdate = { text: messageData.text, timestamp: serverTimestamp(), senderId: currentUser.uid };
        const updates = {};
        updates[`/messages/${currentChatId}/${newMessageRef.key}`] = messageData;
        updates[`/chats/${currentChatId}/lastMessage`] = lastMessageUpdate;
        updates[`/userChats/${currentUser.uid}/${currentChatId}/lastMessage`] = lastMessageUpdate;
        if (currentChatType === 'private' && otherParticipantInfo.uid) {
            updates[`/userChats/${otherParticipantInfo.uid}/${currentChatId}/lastMessage`] = lastMessageUpdate;
        }

        try {
            await update(ref(db), updates);
            console.log(`${type} message sent successfully.`);
        } catch (error) {
            console.error(`Error sending ${type} message:`, error);
            alert(`Error al enviar ${type}.`);
        }
    }

    // 4.14 Añadir Usuario / Iniciar Chat (Placeholder/Básico)
    function setupAddUserModal() {
        if (addUserButton) {
            addUserButton.addEventListener('click', () => {
                if (currentUser) {
                    toggleModal(addUserModal, true);
                    if (userSearchInput) userSearchInput.value = '';
                    if (userSearchResults) userSearchResults.innerHTML = '';
                    showStatus(addUserStatus, '', 'info', 0);
                } else {
                    alert("Inicia sesión para añadir usuarios.");
                }
            });
        }
        if (closeAddUserModal) closeAddUserModal.addEventListener('click', () => toggleModal(addUserModal, false));
        if(addUserModal) addUserModal.addEventListener('click', (e) => { if(e.target === addUserModal) toggleModal(addUserModal, false); });

        if (userSearchInput) {
            // Usar 'input' para búsqueda en tiempo real (requiere debounce) o 'change'/'blur'
            let searchTimeout;
            userSearchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchUsers(userSearchInput.value);
                }, 500); // Esperar 500ms después de dejar de escribir
            });
        }
    }

    async function searchUsers(searchTerm) {
        if (!currentUser || !userSearchResults) return;
        const query = searchTerm.trim().toLowerCase();
        if (query.length < 3) { // Mínimo 3 caracteres para buscar
            userSearchResults.innerHTML = '';
            return;
        }
        console.log(`Searching for users matching: ${query}`);
        userSearchResults.innerHTML = '<p>Buscando...</p>';

        // --- Implementación de Búsqueda (¡REQUIERE MEJORAS!) ---
        // Esta búsqueda básica solo funciona bien si buscas el displayName EXACTO o email EXACTO.
        // Firebase RTDB no tiene búsqueda de texto completo nativa.
        // Opciones:
        // 1. Descargar TODOS los usuarios y filtrar en cliente (NO ESCALABLE).
        // 2. Usar query `orderByChild('displayName').equalTo(query)` (solo búsqueda exacta).
        // 3. Usar `startAt(query).endAt(query + '\uf8ff')` (búsqueda por prefijo, requiere indexación).
        // 4. Estructurar datos para búsqueda (ej. /userSearchIndex/{lowercaseName}: uid).
        // 5. Usar un servicio externo como Algolia sincronizado con Firebase.

        // Ejemplo MUY BÁSICO (NO RECOMENDADO PARA PRODUCCIÓN - Lento e ineficiente):
        try {
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            userSearchResults.innerHTML = ''; // Limpiar
            let found = false;
            if (snapshot.exists()) {
                snapshot.forEach(userSnap => {
                    const userData = userSnap.val();
                    const uid = userSnap.key;
                    // No mostrarse a sí mismo en los resultados
                    if (uid === currentUser.uid) return;

                    const nameMatch = userData.displayName?.toLowerCase().includes(query);
                    const emailMatch = userData.email?.toLowerCase().includes(query);

                    if (nameMatch || emailMatch) {
                        found = true;
                        const item = document.createElement('div');
                        item.classList.add('search-result-item');
                        item.textContent = `${userData.displayName || 'N/A'} (${userData.email || 'N/A'})`;
                        item.addEventListener('click', () => startOrOpenChat(uid, userData));
                        userSearchResults.appendChild(item);
                    }
                });
            }
            if (!found) {
                userSearchResults.innerHTML = '<p>No se encontraron usuarios.</p>';
            }
        } catch (error) {
            console.error("Error searching users:", error);
            userSearchResults.innerHTML = '<p style="color:red;">Error al buscar.</p>';
        }
    }

    async function startOrOpenChat(otherUserId, otherUserData) {
        if (!currentUser || !otherUserId) return;
        console.log(`Starting or opening chat with ${otherUserId}`);
        showStatus(addUserStatus, 'Abriendo chat...', 'info');

        // 1. Generar un ID de chat predecible para chat privado 1-a-1
        // Ordenar UIDs para que siempre sea el mismo ID sin importar quién inicia
        const uids = [currentUser.uid, otherUserId].sort();
        const privateChatId = `private_${uids[0]}_${uids[1]}`;

        // 2. Verificar si el chat ya existe en /chats
        const chatRef = ref(db, `chats/${privateChatId}`);
        try {
            const chatSnapshot = await get(chatRef);

            if (chatSnapshot.exists()) {
                // El chat ya existe, simplemente selecciónalo
                console.log("Chat already exists:", privateChatId);
                selectChat(privateChatId, otherUserData.displayName || 'Usuario', otherUserData.photoURL || '', 'private');
            } else {
                // El chat NO existe, créalo
                console.log("Creating new private chat:", privateChatId);
                const now = serverTimestamp();
                // Crear datos iniciales del chat
                const newChatData = {
                    type: 'private',
                    createdAt: now,
                    participants: {
                        [currentUser.uid]: { joinedAt: now, level: 0, xp: 0 },
                        [otherUserId]: { joinedAt: now, level: 0, xp: 0 }
                    },
                    lastMessage: { text: "Chat iniciado", timestamp: now, senderId: "system" } // Mensaje inicial
                };
                // Crear referencias para las listas de chats de ambos usuarios
                const updates = {};
                updates[`/chats/${privateChatId}`] = newChatData;
                updates[`/userChats/${currentUser.uid}/${privateChatId}`] = { // Guardar referencia en la lista del usuario actual
                     // Podrías guardar aquí el timestamp del último mensaje leído por ESTE usuario
                     // O simplemente 'true' para indicar pertenencia
                     lastMessage: newChatData.lastMessage // Copiar último mensaje para ordenación/preview
                };
                updates[`/userChats/${otherUserId}/${privateChatId}`] = { // Guardar referencia en la lista del OTRO usuario
                     lastMessage: newChatData.lastMessage
                };

                await update(ref(db), updates); // Realizar todas las escrituras
                console.log("New chat created successfully.");
                // Seleccionar el chat recién creado
                selectChat(privateChatId, otherUserData.displayName || 'Usuario', otherUserData.photoURL || '', 'private');
            }
            // Cerrar modal después de iniciar/abrir chat
            toggleModal(addUserModal, false);

        } catch (error) {
            console.error("Error starting or opening chat:", error);
            showStatus(addUserStatus, `Error al iniciar chat: ${error.message}`, 'error');
        }
    }

    // 4.15 Scroll al fondo
    function scrollToBottom() {
        if (chatMessagesContainer) {
            // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
            requestAnimationFrame(() => {
                chatMessagesContainer.scrollTop = 0; // Ir al inicio (porque es column-reverse)
                isScrolledToBottom = true; // Resetear flag
            });
        }
    }
     // Detectar scroll del usuario
     if(chatMessagesContainer) {
        chatMessagesContainer.addEventListener('scroll', () => {
            // Si scrollTop es > 0 (en modo reverse), significa que no está al fondo
            isScrolledToBottom = chatMessagesContainer.scrollTop === 0;
        });
    }


    // --- 5. Inicializar Listeners UI ---
    setupAddUserModal();
    if (sendButton && messageInput) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    }
    if (mediaUploadInput && attachButtonLabel) {
        // Listener en el label para simular click en input oculto
        attachButtonLabel.addEventListener('click', (e) => {
             // Prevenir si está deshabilitado por nivel
             if(attachButtonLabel.classList.contains('disabled')) {
                 e.preventDefault();
                 alert(`Necesitas nivel ${LEVEL_PHOTO_REQUIRED} para adjuntar.`);
                 return;
             }
             mediaUploadInput.click(); // Abre el selector de archivos
        });
        mediaUploadInput.addEventListener('change', handleMediaUpload);
    }
    // Listeners para botones de llamada (placeholders)
    if(callButton) callButton.addEventListener('click', () => { if(!callButton.classList.contains('disabled')) alert("Llamada no implementada."); else alert(`Nivel ${LEVEL_CALL_REQUIRED} requerido.`);});
    if(videoCallButton) videoCallButton.addEventListener('click', () => { if(!videoCallButton.classList.contains('disabled')) alert("Videollamada no implementada."); else alert(`Nivel ${LEVEL_CALL_REQUIRED} requerido.`);});


    console.log("Chat script logic fully initialized.");

} // --- Fin initializeChatLogic ---
