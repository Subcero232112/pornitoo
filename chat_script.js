// Imports Firebase (Auth, Realtime Database, Storage)
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getDatabase, ref, onValue, off, push, set, update, query, orderByChild, limitToLast, serverTimestamp, get, child, equalTo, onChildAdded // Importar onChildAdded
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
    if (!window.firebaseApp) { console.error("Chat Script: Firebase App object not found!"); return; }
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);
    const storage = getStorage(window.firebaseApp);

    const LEVEL_THRESHOLDS = { 5: 100, 10: 500, 30: 5000 };
    const XP_PER_MESSAGE = 10;
    const XP_LENGTH_BONUS = 0.1;
    const MIN_MESSAGE_INTERVAL = 3000;
    const LEVEL_PHOTO_REQUIRED = 5;
    const LEVEL_VIDEO_REQUIRED = 10;
    const LEVEL_CALL_REQUIRED = 30;

    // --- Selectores DOM (los que ya tenías más los nuevos/modificados) ---
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
    const chatLoginPromptDiv = document.getElementById('chat-login-prompt'); // Para mostrar si no está logueado
    const chatLoginButtonInline = document.getElementById('chat-login-button-inline'); // Botón para abrir modal de login

    const addUserButton = document.getElementById('add-chat-button');
    const addUserModal = document.getElementById('add-user-modal');
    const closeAddUserModal = document.getElementById('close-add-user-modal');
    const userSearchInput = document.getElementById('user-search-input');
    const userSearchResults = document.getElementById('user-search-results');
    const addUserStatus = document.getElementById('add-user-status');

    // Botón de usuario en el header del chat
    const chatUserAuthButton = document.getElementById('chat-user-auth-button');
    const chatHeaderUserAvatar = document.getElementById('chatHeaderUserAvatar'); // El <img> dentro del botón

    let currentUser = null;
    let currentChatId = null;
    let currentChatType = 'private';
    let currentChatLevel = 0;
    let otherParticipantInfo = {};
    let messageListeners = [];
    let lastMessageTimestamps = {};
    let isScrolledToBottom = true;

    // --- Funciones Utilitarias (ya las tenías) ---
    const escapeHTML = window.escapeHTML || function(str) { const div = document.createElement('div'); div.appendChild(document.createTextNode(str || '')); return div.innerHTML; };
    const formatDate = window.formatDate || function(timestamp) { if (!timestamp) return '--:--'; try { const date = new Date(timestamp); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return '--:--'; } };
    const showStatus = (element, message, type = 'info', autoHideDelay = 0) => { if (!element) return; element.textContent = message; element.className = 'admin-status'; element.classList.add(type); element.style.display = 'block'; if (autoHideDelay > 0) setTimeout(() => { if(element) element.style.display = 'none'; }, autoHideDelay); };
    const toggleModal = window.uiManager?.toggleModal || function(modal, forceState) { if (modal) modal.classList.toggle('visible', forceState); };

    // --- Lógica Principal ---

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Chat Script: User Logged In", user.uid);
            currentUser = { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
            saveUserInfo(user);
            loadUserChats();
            if (chatLoginPromptDiv) chatLoginPromptDiv.style.display = 'none';
            if (noChatSelectedDiv && !currentChatId) noChatSelectedDiv.style.display = 'flex'; // Si no hay chat seleccionado, mostrar prompt

            // MODIFICADO: Actualizar UI del botón de usuario en el header del chat
            if (chatUserAuthButton && chatHeaderUserAvatar) {
                chatHeaderUserAvatar.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email || 'U')}&background=random&color=fff&size=35`;
                chatUserAuthButton.classList.add('logged-in');
            }
        } else {
            console.log("Chat Script: User Logged Out");
            currentUser = null;
            currentChatId = null;
            otherParticipantInfo = {};
            clearChatUI();
            if (chatLoginPromptDiv) chatLoginPromptDiv.style.display = 'block'; // Mostrar prompt de login en el área de "no chat"
            if (noChatSelectedDiv) noChatSelectedDiv.style.display = 'flex';


            // MODIFICADO: Actualizar UI del botón de usuario en el header del chat
            if (chatUserAuthButton && chatHeaderUserAvatar) {
                chatHeaderUserAvatar.src = "https://via.placeholder.com/35/777777/ffffff?text=U"; // Placeholder
                chatUserAuthButton.classList.remove('logged-in');
            }
        }
    });

    function saveUserInfo(user) {
        const userRefDb = ref(db, `users/${user.uid}`); // Renombrada la variable para evitar conflicto con ref de storage
        update(userRefDb, {
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
            email: user.email,
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'U')}&background=random&color=fff&size=50`,
            lastSeen: serverTimestamp()
        }).catch(error => console.error("Error saving user info:", error));
    }

    function clearChatUI() {
        if (chatListContainer) chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">Inicia sesión para ver tus chats.</p>`;
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = ''; // Se llenará con noChatSelectedDiv si es necesario
        if (noChatSelectedDiv) noChatSelectedDiv.style.display = 'flex';
        if (chatMainHeader) chatMainHeader.style.display = 'none';
        if (messageInputContainer) messageInputContainer.style.display = 'none';
        messageListeners.forEach(({ ref, listener }) => off(ref, 'child_added', listener)); // Usar el tipo de evento correcto
        messageListeners = [];
        console.log("Chat UI Cleared");
    }

    function loadUserChats() {
        if (!currentUser || !chatListContainer) {
            if (chatListContainer) chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">Inicia sesión para cargar chats.</p>`;
            return;
        }
        console.log("Loading user chats for:", currentUser.uid);
        chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">Cargando tus chats...</p>`;

        const userChatsRef = ref(db, `userChats/${currentUser.uid}`);
        onValue(userChatsRef, (snapshot) => {
            // Primero limpiar la lista actual, excepto el mensaje de "cargando" si aún no hay chats.
            const loadingMsg = chatListContainer.querySelector('p');
            if (chatListContainer.children.length > 1 || !loadingMsg) { // Si hay más que solo el mensaje de carga, o no hay mensaje de carga
                chatListContainer.innerHTML = '';
            }

            if (snapshot.exists()) {
                if(loadingMsg && loadingMsg.parentNode === chatListContainer) loadingMsg.remove(); // Quitar "Cargando..."

                const chatIdsData = snapshot.val();
                const chatIds = Object.keys(chatIdsData);
                console.log("User has chats:", chatIds);
                if (chatIds.length === 0) {
                     chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">No tienes chats. ¡Inicia uno nuevo!</p>`;
                } else {
                    // Ordenar chats por el timestamp del último mensaje (si existe)
                    const sortedChatIds = chatIds.sort((a, b) => {
                        const tsA = chatIdsData[a]?.lastMessage?.timestamp || 0;
                        const tsB = chatIdsData[b]?.lastMessage?.timestamp || 0;
                        return tsB - tsA; // Descendente (más nuevo primero)
                    });
                    sortedChatIds.forEach(chatId => {
                        fetchChatDetails(chatId, chatIdsData[chatId]);
                    });
                }
            } else {
                console.log("User has no chats yet.");
                chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">No tienes chats. ¡Inicia uno nuevo!</p>`;
            }
        }, (error) => {
            console.error("Error loading user chats:", error);
            chatListContainer.innerHTML = `<p style="padding: 20px; text-align: center; color: red;">Error al cargar chats.</p>`;
        });
    }
    
    // Modificado para aceptar chatMetaFromUserChats opcionalmente
    async function fetchChatDetails(chatId, chatMetaFromUserChats = null) {
        const chatRefDb = ref(db, `chats/${chatId}`); // Renombrada
        try {
            const snapshot = await get(chatRefDb);
            if (snapshot.exists()) {
                const chatData = snapshot.val();
                let otherUserId = null;
                if (chatData.type === 'private' && chatData.participants) {
                    otherUserId = Object.keys(chatData.participants).find(uid => uid !== currentUser.uid);
                }

                let displayName = chatData.name || 'Grupo';
                let displayPic = chatData.photoURL || `https://via.placeholder.com/50/777777/ffffff?text=${displayName.charAt(0).toUpperCase()}`;
                let userLevel = chatData.participants?.[currentUser.uid]?.level || 0;
                
                // Usar lastMessage de chatMetaFromUserChats si está disponible (más actualizado para la lista)
                // o de chatData como fallback.
                const lastMessageData = chatMetaFromUserChats?.lastMessage || chatData.lastMessage;
                const lastMsgText = lastMessageData?.text || '';
                const lastMsgTimestamp = lastMessageData?.timestamp || null;

                if (otherUserId) {
                    const otherUserRef = ref(db, `users/${otherUserId}`);
                    const userSnap = await get(otherUserRef);
                    if (userSnap.exists()) {
                        const otherUserData = userSnap.val();
                        displayName = otherUserData.displayName || 'Usuario';
                        displayPic = otherUserData.photoURL || `https://via.placeholder.com/50/cccccc/ffffff?text=${displayName.charAt(0).toUpperCase()}`;
                    }
                }
                renderChatListItem(chatId, displayName, displayPic, lastMsgText, lastMsgTimestamp, userLevel, chatData.type || 'private');
            } else {
                console.warn(`Chat details not found for chatId: ${chatId}. Removing from user's list if an orphan.`);
                // Opcional: limpiar este chat de userChats si es un huérfano
                // const userChatEntryRef = ref(db, `userChats/${currentUser.uid}/${chatId}`);
                // remove(userChatEntryRef).catch(err => console.warn("Failed to remove orphan chat entry", err));
            }
        } catch (error) {
            console.error(`Error fetching details for chat ${chatId}:`, error);
        }
    }

    // Modificado para aceptar chatType
    function renderChatListItem(chatId, name, picUrl, lastMsg, timestamp, level, chatType = 'private') {
        if (!chatListContainer) return;
        
        let item = chatListContainer.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`);
        const newRender = !item;
        if(newRender) {
            item = document.createElement('div');
            item.classList.add('chat-list-item');
            item.dataset.chatId = chatId;
            item.dataset.chatType = chatType; // Guardar tipo de chat
            item.addEventListener('click', () => selectChat(chatId, name, picUrl, chatType)); // Pasar chatType
        }

        // Actualizar contenido
        item.innerHTML = `
            <img src="${escapeHTML(picUrl)}" alt="${escapeHTML(name)}" class="profile-pic">
            <div class="chat-info">
                <span class="chat-name">${escapeHTML(name)}</span>
                <span class="last-message">${escapeHTML(lastMsg)}</span>
            </div>
            ${timestamp ? `<span class="timestamp">${formatDate(timestamp)}</span>` : ''}
            ${level > 0 ? `<span class="level-indicator">Lv. ${level}</span>` : ''}
        `;

        if (newRender) {
            // Insertar manteniendo el orden (más reciente arriba) o simplemente añadir
            // Esta es una inserción simple, para ordenación real se necesitaría comparar con los existentes.
            const firstChild = chatListContainer.firstChild;
            if (firstChild) {
                chatListContainer.insertBefore(item, firstChild); // Añadir al principio (asumiendo que los datos vienen ordenados o se reordenan después)
            } else {
                chatListContainer.appendChild(item);
            }
        }
    }


    async function selectChat(chatId, name, picUrl, type) {
        console.log(`Selecting chat: ${chatId} (${name}), type: ${type}`);
        if (currentChatId === chatId) return;

        messageListeners.forEach(({ ref, listener }) => off(ref, 'child_added', listener)); // Usar el tipo de evento correcto
        messageListeners = [];

        currentChatId = chatId;
        currentChatType = type; // Establecer el tipo de chat actual
        otherParticipantInfo = {};

        document.querySelectorAll('.chat-list-item.active').forEach(el => el.classList.remove('active'));
        const activeListItem = chatListContainer.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`);
        if (activeListItem) activeListItem.classList.add('active');


        if (chatMainHeader) {
            if(activeChatPic) activeChatPic.src = picUrl;
            if(activeChatName) activeChatName.textContent = name;
            if(activeChatStatus) activeChatStatus.textContent = '';
            chatMainHeader.style.display = 'flex';
        }
        if (messageInputContainer) messageInputContainer.style.display = 'flex';
        if (noChatSelectedDiv) noChatSelectedDiv.style.display = 'none';
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = `<p id="chat-loading-indicator" style="text-align:center; color:var(--text-color-secondary); padding:20px;">Cargando mensajes...</p>`;
        
        loadMessages(chatId);

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

        if (type === 'private') {
            const chatRefDb = ref(db, `chats/${chatId}`); // Renombrada
            const chatSnap = await get(chatRefDb);
            if (chatSnap.exists()) {
                const chatData = chatSnap.val();
                const otherUserId = Object.keys(chatData.participants || {}).find(uid => uid !== currentUser.uid);
                if (otherUserId) {
                    const userRefDb = ref(db, `users/${otherUserId}`); // Renombrada
                    const userSnap = await get(userRefDb);
                    if (userSnap.exists()) {
                        otherParticipantInfo = { uid: otherUserId, ...userSnap.val() };
                        if(activeChatStatus) activeChatStatus.textContent = ''; // Implementar presencia real si es necesario
                    }
                }
            }
        }
    }

    function loadMessages(chatId) {
        if (!chatMessagesContainer || !currentUser) return;
        console.log(`Loading messages for chat: ${chatId}`);

        const messagesRefDb = ref(db, `messages/${chatId}`); // Renombrada
        const messagesQuery = query(messagesRefDb, orderByChild('timestamp'), limitToLast(50));

        // Limpiar listeners anteriores antes de añadir uno nuevo
        messageListeners.forEach(({ ref, listener }) => off(ref, 'child_added', listener)); // Usar el tipo de evento correcto
        messageListeners = [];
        
        // Usar onChildAdded para nuevos mensajes
        const childAddedListener = onChildAdded(messagesQuery, (snapshot) => {
            const loadingIndicator = document.getElementById('chat-loading-indicator');
            if (loadingIndicator && loadingIndicator.parentNode === chatMessagesContainer) {
                loadingIndicator.remove();
            }
            const messageData = snapshot.val();
            const messageKey = snapshot.key;
            displayMessage(messageKey, messageData);
        }, (error) => {
            console.error(`Error fetching messages for chat ${chatId}:`, error);
            if (chatMessagesContainer) chatMessagesContainer.innerHTML = `<p style="color: red; text-align:center;">Error al cargar mensajes.</p>`;
        });

        messageListeners.push({ ref: messagesQuery, listener: childAddedListener, type: 'child_added' });

        // Para asegurar que los mensajes iniciales cargados por limitToLast se muestren:
        // get(messagesQuery) podría ser una opción si onChildAdded no trae el set inicial inmediatamente,
        // pero usualmente onChildAdded se dispara para cada hijo existente que coincida y luego para los nuevos.
        // Daremos un pequeño tiempo para que se rendericen.
        setTimeout(scrollToBottom, 300);
    }
    
    // La función displayMessage que tenías es correcta.
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
        const senderNameHTML = !isSent && data.userName ? `<span class="sender-name">${escapeHTML(data.userName)}</span>` : '';

        let contentHTML = '';
        if (data.type === 'image' && data.mediaUrl) {
            messageElement.classList.add('media');
            contentHTML = `<img src="${escapeHTML(data.mediaUrl)}" alt="Imagen adjunta" loading="lazy" style="cursor:pointer;" onclick="window.open('${escapeHTML(data.mediaUrl)}', '_blank')">`;
        } else if (data.type === 'video' && data.mediaUrl) {
            messageElement.classList.add('media');
            contentHTML = `<video src="${escapeHTML(data.mediaUrl)}" controls preload="metadata" style="max-width: 100%; border-radius: 8px;"></video>`;
            if (data.text && data.text !== '[Video]') { // Si hay texto adicional con el video
                 contentHTML += `<span class="message-content" style="display:block; margin-top:5px;">${escapeHTML(data.text)}</span>`;
            }
        } else {
            contentHTML = `<span class="message-content">${escapeHTML(data.text || '')}</span>`;
        }

        messageElement.innerHTML = `
            ${senderNameHTML}
            ${contentHTML}
            <span class="message-timestamp">${timestamp}</span>
        `;
        
        // Insertar al principio ya que el contenedor está en flex-direction: column-reverse
        // o al final si no usas column-reverse y ajustas el scroll al fondo.
        // Dado que está column-reverse, prepend es correcto.
        chatMessagesContainer.insertBefore(messageElement, chatMessagesContainer.firstChild);

        // Actualizar preview en sidebar
        if(chatListContainer && currentChatId) { // Asegurarse que currentChatId está definido
            const listItem = chatListContainer.querySelector(`.chat-list-item[data-chat-id="${currentChatId}"]`);
            if(listItem) {
                const lastMsgElement = listItem.querySelector('.last-message');
                const timestampElement = listItem.querySelector('.timestamp');
                if(lastMsgElement) lastMsgElement.textContent = data.type === 'image' ? '[Imagen]' : (data.type === 'video' ? '[Video]' : escapeHTML(data.text || ''));
                if(timestampElement && data.timestamp) timestampElement.textContent = formatDate(data.timestamp);
            }
        }
        
        if (isScrolledToBottom || isSent) {
            scrollToBottom();
        }
    }

    // La función sendMessage que tenías es en su mayoría correcta.
    // Asegúrate que las referencias a la DB (ej. `ref(db)`) sean correctas para `update`.
    async function sendMessage() {
        if (!messageInput || !currentUser || !currentChatId || !sendButton) return;
        const text = messageInput.value.trim();
        if (text === '') return;

        const now = Date.now();
        const lastSent = lastMessageTimestamps[currentChatId] || 0;
        const isSpam = (now - lastSent) < MIN_MESSAGE_INTERVAL && text.length < 20; // Ejemplo de spam más específico
        if (isSpam && text.length < 10) { // Solo penalizar spam muy corto
             console.log("Anti-spam: Mensaje demasiado rápido y corto.");
             // Podrías mostrar un aviso al usuario aquí.
             // return; // Podrías incluso bloquear el envío
        }
        lastMessageTimestamps[currentChatId] = now;

        let xpGained = 0;
        if (!isSpam) { // Solo dar XP si NO es spam (según tu definición)
            xpGained = XP_PER_MESSAGE + Math.floor(text.length * XP_LENGTH_BONUS);
        }

        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo',
            userPhotoURL: currentUser.photoURL || null, // Opcional: guardar foto del remitente
            text: text,
            timestamp: serverTimestamp(),
            type: 'text'
        };

        const messagesChatRef = ref(db, `messages/${currentChatId}`);
        const newMessageRef = push(messagesChatRef); // Referencia al nuevo mensaje

        const updates = {};
        updates[`/messages/${currentChatId}/${newMessageRef.key}`] = messageData; // Guardar el mensaje

        // Actualizar lastMessage en el chat y en las listas de los participantes
        const lastMessageUpdate = {
            text: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
            timestamp: serverTimestamp(),
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email?.split('@')[0]
        };
        updates[`/chats/${currentChatId}/lastMessage`] = lastMessageUpdate;
        updates[`/userChats/${currentUser.uid}/${currentChatId}/lastMessage`] = lastMessageUpdate;
        // Si es chat privado, actualizar también para el otro participante
        if (currentChatType === 'private' && otherParticipantInfo && otherParticipantInfo.uid) {
            updates[`/userChats/${otherParticipantInfo.uid}/${currentChatId}/lastMessage`] = lastMessageUpdate;
        }


        if (xpGained > 0) {
            const participantRef = ref(db, `chats/${currentChatId}/participants/${currentUser.uid}`);
            try {
                const snapshot = await get(participantRef);
                let currentXP = 0;
                let currentLevel = 0;
                if (snapshot.exists()) {
                    currentXP = snapshot.val().xp || 0;
                    currentLevel = snapshot.val().level || 0;
                }
                let newXP = currentXP + xpGained;
                let newLevel = currentLevel;
                let nextLevelThresholdKey = (newLevel + 1).toString();

                while (LEVEL_THRESHOLDS[newLevel + 1] !== undefined && newXP >= LEVEL_THRESHOLDS[newLevel + 1]) {
                    newXP -= LEVEL_THRESHOLDS[newLevel + 1];
                    newLevel++;
                    console.log(`¡Nivel Subido! Usuario ${currentUser.uid} alcanzó nivel ${newLevel} en chat ${currentChatId}`);
                    // Aquí podrías mostrar una notificación en la UI sobre la subida de nivel
                }
                
                updates[`/chats/${currentChatId}/participants/${currentUser.uid}/xp`] = newXP;
                if (newLevel !== currentLevel) {
                    updates[`/chats/${currentChatId}/participants/${currentUser.uid}/level`] = newLevel;
                    currentChatLevel = newLevel; // Actualizar estado local
                    updateMediaPermissions();
                    // Actualizar indicador de nivel en la lista de chats
                    const chatListItem = chatListContainer.querySelector(`.chat-list-item[data-chat-id="${currentChatId}"] .level-indicator`);
                    if(chatListItem) chatListItem.textContent = `Lv. ${newLevel}`;
                }
            } catch (levelError) {
                console.error("Error updating XP/Level:", levelError);
            }
        }
        
        try {
            messageInput.disabled = true; sendButton.disabled = true;
            await update(ref(db), updates); // Aplicar todas las actualizaciones
            messageInput.value = '';
        } catch (error) {
            console.error("Error sending message or updating data:", error);
            // Considera no alertar, sino mostrar un error en la UI no intrusivo.
            // alert("Error al enviar el mensaje.");
            showStatus(messageInput, "Error al enviar", "error", 2000);

        } finally {
            if (currentUser) { // Solo re-habilitar si el usuario sigue logueado
                 messageInput.disabled = false; sendButton.disabled = false;
                 messageInput.focus();
            }
        }
    }

    // updateMediaPermissions, handleMediaUpload, sendMediaMessage son en su mayoría correctas.
    function updateMediaPermissions() {
        const canSendPhoto = currentChatLevel >= LEVEL_PHOTO_REQUIRED;
        const canSendVideo = currentChatLevel >= LEVEL_VIDEO_REQUIRED;
        const canCall = currentChatLevel >= LEVEL_CALL_REQUIRED;

        if (attachButtonLabel) {
            attachButtonLabel.classList.toggle('disabled', !canSendPhoto); // Habilitar si puede enviar fotos
            let title = "Adjuntar: ";
            if (canSendPhoto) title += `Foto (Nivel ${LEVEL_PHOTO_REQUIRED} ✓)`;
            else title += `Foto (Nivel ${LEVEL_PHOTO_REQUIRED} X)`;
            if (canSendVideo) title += `, Video (Nivel ${LEVEL_VIDEO_REQUIRED} ✓)`;
            else title += `, Video (Nivel ${LEVEL_VIDEO_REQUIRED} X)`;
            attachButtonLabel.title = title;
        }
        if (mediaUploadInput) {
            mediaUploadInput.disabled = !canSendPhoto; // Solo se puede clickear si se pueden fotos
            mediaUploadInput.accept = canSendVideo ? "image/*,video/mp4,video/quicktime,video/webm" : "image/*";
        }
        if (callButton) {
            callButton.classList.toggle('disabled', !canCall);
            callButton.title = `Llamada ${canCall ? '(✓)' : `(Nivel ${LEVEL_CALL_REQUIRED} X)`}`;
        }
        if (videoCallButton) {
            videoCallButton.classList.toggle('disabled', !canCall);
            videoCallButton.title = `Videollamada ${canCall ? '(✓)' : `(Nivel ${LEVEL_CALL_REQUIRED} X)`}`;
        }
    }

    function handleMediaUpload(event) {
        if (!currentUser || !currentChatId || !mediaUploadInput) return;
        const file = event.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (isImage && currentChatLevel < LEVEL_PHOTO_REQUIRED) {
            alert(`Necesitas nivel ${LEVEL_PHOTO_REQUIRED} para enviar fotos.`);
            mediaUploadInput.value = ''; return;
        }
        if (isVideo && currentChatLevel < LEVEL_VIDEO_REQUIRED) {
            alert(`Necesitas nivel ${LEVEL_VIDEO_REQUIRED} para enviar videos.`);
            mediaUploadInput.value = ''; return;
        }
        if (!isImage && !isVideo) {
            alert("Tipo de archivo no soportado. Solo imágenes o videos.");
            mediaUploadInput.value = ''; return;
        }
        // Limitar tamaño del archivo (ej. 10MB para imágenes, 50MB para videos)
        const maxSizeImage = 10 * 1024 * 1024; // 10MB
        const maxSizeVideo = 50 * 1024 * 1024; // 50MB
        if (isImage && file.size > maxSizeImage) {
            alert(`La imagen es demasiado grande (máx ${maxSizeImage/1024/1024}MB).`);
            mediaUploadInput.value = ''; return;
        }
        if (isVideo && file.size > maxSizeVideo) {
            alert(`El video es demasiado grande (máx ${maxSizeVideo/1024/1024}MB).`);
            mediaUploadInput.value = ''; return;
        }


        console.log(`Uploading ${isImage ? 'image' : 'video'}: ${file.name}`);
        if (mediaUploadProgress) mediaUploadProgress.style.display = 'block';
        if (attachButtonLabel) attachButtonLabel.classList.add('disabled'); // Deshabilitar temporalmente

        const filePath = `chatMedia/${currentChatId}/${Date.now()}_${file.name}`;
        const fileStorageRef = storageRef(storage, filePath); // Evitar conflicto de nombre con ref de DB
        const uploadTask = uploadBytesResumable(fileStorageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (mediaUploadProgress) mediaUploadProgress.style.width = progress + '%';
            },
            (error) => {
                console.error("Upload failed:", error);
                alert("Error al subir el archivo.");
                if (mediaUploadProgress) { mediaUploadProgress.style.display = 'none'; mediaUploadProgress.style.width = '0%';}
                updateMediaPermissions(); // Rehabilitar según nivel
                mediaUploadInput.value = '';
            },
            async () => {
                if (mediaUploadProgress) { mediaUploadProgress.style.display = 'none'; mediaUploadProgress.style.width = '0%';}
                updateMediaPermissions();
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    sendMediaMessage(downloadURL, isImage ? 'image' : 'video', file.name);
                } catch (error) {
                     console.error("Error getting download URL:", error);
                     alert("Error obteniendo la URL del archivo subido.");
                }
                mediaUploadInput.value = ''; // Limpiar para poder subir el mismo de nuevo
            }
        );
    }

    async function sendMediaMessage(url, type, fileName = '') {
        if (!currentUser || !currentChatId) return;

        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Usuario Anónimo',
            userPhotoURL: currentUser.photoURL || null,
            mediaUrl: url,
            type: type,
            text: type === 'image' ? `[Imagen] ${fileName}`.trim() : `[Video] ${fileName}`.trim(),
            timestamp: serverTimestamp()
        };

        const messagesChatRef = ref(db, `messages/${currentChatId}`);
        const newMessageRefKey = push(messagesChatRef).key; // Obtener la key primero

        const updates = {};
        updates[`/messages/${currentChatId}/${newMessageRefKey}`] = messageData;

        const lastMessageUpdate = { 
            text: messageData.text, 
            timestamp: serverTimestamp(), 
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email?.split('@')[0]
        };
        updates[`/chats/${currentChatId}/lastMessage`] = lastMessageUpdate;
        updates[`/userChats/${currentUser.uid}/${currentChatId}/lastMessage`] = lastMessageUpdate;
        if (currentChatType === 'private' && otherParticipantInfo && otherParticipantInfo.uid) {
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


    // --- BÚSQUEDA DE USUARIOS Y CREACIÓN DE CHAT ---
    function setupAddUserModal() {
        if (addUserButton) {
            addUserButton.addEventListener('click', () => {
                if (currentUser) {
                    if(addUserModal) toggleModal(addUserModal, true);
                    if (userSearchInput) userSearchInput.value = '';
                    if (userSearchResults) userSearchResults.innerHTML = '<p data-translate-key="type_to_search_user_prompt">Escribe para buscar usuarios...</p>';
                    if (addUserStatus) { addUserStatus.textContent = ''; addUserStatus.style.display = 'none';}
                } else {
                    alert("Inicia sesión para añadir usuarios.");
                    // Podrías abrir el modal de login aquí
                    // const loginModal = document.getElementById('login-modal');
                    // if (loginModal) toggleModal(loginModal, true);
                }
            });
        }
        if (closeAddUserModal) closeAddUserModal.addEventListener('click', () => { if(addUserModal) toggleModal(addUserModal, false); });
        if(addUserModal) addUserModal.addEventListener('click', (e) => { if(e.target === addUserModal) toggleModal(addUserModal, false); });

        if (userSearchInput) {
            let searchTimeout;
            userSearchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                const query = userSearchInput.value.trim();
                if (query.length === 0) {
                    if (userSearchResults) userSearchResults.innerHTML = '<p data-translate-key="type_to_search_user_prompt">Escribe para buscar usuarios...</p>';
                    return;
                }
                if (query.length < 3) {
                    if (userSearchResults) userSearchResults.innerHTML = '<p data-translate-key="min_3_chars_search_prompt">Mínimo 3 caracteres para buscar...</p>';
                    return;
                }
                searchTimeout = setTimeout(() => {
                    searchUsers(query);
                }, 500);
            });
        }
    }

    async function searchUsers(searchTerm) {
        if (!currentUser || !userSearchResults) return;
        const query = searchTerm.toLowerCase(); // No es necesario trim aquí, ya se hizo.
        
        console.log(`Searching for users matching: ${query}`);
        userSearchResults.innerHTML = '<p data-translate-key="searching_users_message">Buscando...</p>';

        // ADVERTENCIA: La siguiente búsqueda es MUY BÁSICA e INEFICIENTE para producción.
        // Lee todos los usuarios y filtra en el cliente. Esto no es escalable.
        // Para una solución real, considera usar Firebase Queries más específicas con índices,
        // o un servicio de búsqueda como Algolia.
        try {
            const usersRefDb = ref(db, 'users'); // Renombrada
            // Ejemplo con query por displayName (requiere índice en Firebase rules en '.indexOn': ['displayName_lowercase'])
            // const usersQuery = query(usersRefDb, orderByChild('displayName_lowercase'), startAt(query), endAt(query + '\uf8ff'), limitToLast(10));
            // Por ahora, mantenemos tu lógica original, pero con advertencias.
            const snapshot = await get(usersRefDb);

            userSearchResults.innerHTML = ''; // Limpiar
            let foundCount = 0;
            if (snapshot.exists()) {
                snapshot.forEach(userSnap => {
                    const userData = userSnap.val();
                    const uid = userSnap.key;
                    if (uid === currentUser.uid) return; // No mostrarse a sí mismo

                    // Para mejorar un poco, asegúrate de tener un campo en minúsculas para buscar si es posible
                    const nameMatch = userData.displayName?.toLowerCase().includes(query);
                    const emailMatch = userData.email?.toLowerCase().includes(query);

                    if (nameMatch || emailMatch) {
                        foundCount++;
                        const item = document.createElement('div');
                        item.classList.add('search-result-item');
                        item.innerHTML = `
                            <img src="${userData.photoURL || `https://via.placeholder.com/30/cccccc/ffffff?text=${(userData.displayName || 'U').charAt(0)}`}" alt="avatar" style="width:30px; height:30px; border-radius:50%; margin-right:10px;">
                            <span>${escapeHTML(userData.displayName || 'N/A')}</span>
                            <small style="margin-left: 5px; color: var(--text-color-secondary);">(${escapeHTML(userData.email || 'N/A')})</small>
                        `;
                        item.addEventListener('click', () => startOrOpenChat(uid, userData));
                        userSearchResults.appendChild(item);
                    }
                });
            }
            if (foundCount === 0) {
                userSearchResults.innerHTML = '<p data-translate-key="no_users_found_message">No se encontraron usuarios.</p>';
            }
        } catch (error) {
            console.error("Error searching users:", error);
            userSearchResults.innerHTML = `<p style="color:red;" data-translate-key="error_searching_users_message">Error al buscar usuarios: ${error.message}. Revisa las reglas de tu base de datos.</p>`;
        }
    }

    async function startOrOpenChat(otherUserId, otherUserData) {
        if (!currentUser || !otherUserId) return;
        console.log(`Attempting to start or open chat with ${otherUserId}`);
        if (addUserStatus) showStatus(addUserStatus, 'Abriendo chat...', 'info');

        const uids = [currentUser.uid, otherUserId].sort();
        const privateChatId = `private_${uids[0]}_${uids[1]}`;

        const chatRefDb = ref(db, `chats/${privateChatId}`); // Renombrada
        try {
            const chatSnapshot = await get(chatRefDb);
            let targetChatName = otherUserData.displayName || otherUserData.email?.split('@')[0] || 'Usuario';
            let targetChatPic = otherUserData.photoURL || `https://via.placeholder.com/50/cccccc/ffffff?text=${targetChatName.charAt(0).toUpperCase()}`;

            if (chatSnapshot.exists()) {
                console.log("Chat already exists:", privateChatId);
                selectChat(privateChatId, targetChatName, targetChatPic, 'private');
            } else {
                console.log("Creating new private chat:", privateChatId);
                const now = serverTimestamp();
                const newChatData = {
                    type: 'private',
                    createdAt: now,
                    createdBy: currentUser.uid,
                    participants: {
                        [currentUser.uid]: { joinedAt: now, level: 0, xp: 0, displayName: currentUser.displayName, photoURL: currentUser.photoURL },
                        [otherUserId]: { joinedAt: now, level: 0, xp: 0, displayName: otherUserData.displayName, photoURL: otherUserData.photoURL }
                    },
                    // Mensaje inicial opcional
                    lastMessage: { text: "Chat iniciado.", timestamp: now, senderId: "system" }
                };
                const updates = {};
                updates[`/chats/${privateChatId}`] = newChatData;
                updates[`/userChats/${currentUser.uid}/${privateChatId}`] = { lastMessage: newChatData.lastMessage, withUserId: otherUserId, withUserName: targetChatName, withUserPhoto: targetChatPic, type: 'private' };
                updates[`/userChats/${otherUserId}/${privateChatId}`] = { lastMessage: newChatData.lastMessage, withUserId: currentUser.uid, withUserName: currentUser.displayName, withUserPhoto: currentUser.photoURL, type: 'private' };

                await update(ref(db), updates);
                console.log("New chat created successfully.");
                selectChat(privateChatId, targetChatName, targetChatPic, 'private');
            }
            if(addUserModal) toggleModal(addUserModal, false); // Cerrar modal

        } catch (error) {
            console.error("Error starting or opening chat:", error);
            if (addUserStatus) showStatus(addUserStatus, `Error al iniciar chat: ${error.message}`, 'error', 3000);
        }
    }

    // --- Scroll y Listeners UI ---
    function scrollToBottom() {
        if (chatMessagesContainer) {
            requestAnimationFrame(() => {
                chatMessagesContainer.scrollTop = 0; // Para column-reverse
                isScrolledToBottom = true;
            });
        }
    }
    if (chatMessagesContainer) {
        chatMessagesContainer.addEventListener('scroll', () => {
            isScrolledToBottom = chatMessagesContainer.scrollTop === 0;
        });
    }

    setupAddUserModal(); // Inicializar listeners del modal de añadir usuario

    if (sendButton && messageInput) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    if (mediaUploadInput && attachButtonLabel) {
        attachButtonLabel.addEventListener('click', (e) => {
            if (attachButtonLabel.classList.contains('disabled')) {
                e.preventDefault();
                // El tooltip/title ya debería indicar el nivel necesario
                // alert(`Nivel ${LEVEL_PHOTO_REQUIRED} para fotos / ${LEVEL_VIDEO_REQUIRED} para videos.`);
                return;
            }
            mediaUploadInput.click();
        });
        mediaUploadInput.addEventListener('change', handleMediaUpload);
    }

    if(callButton) callButton.addEventListener('click', () => { if(!callButton.classList.contains('disabled')) alert("Llamada no implementada."); else alert(`Nivel ${LEVEL_CALL_REQUIRED} requerido para llamadas.`);});
    if(videoCallButton) videoCallButton.addEventListener('click', () => { if(!videoCallButton.classList.contains('disabled')) alert("Videollamada no implementada."); else alert(`Nivel ${LEVEL_CALL_REQUIRED} requerido para videollamadas.`);});
    
    // Si tienes un botón para abrir el modal de login desde el prompt de chat
    if (chatLoginButtonInline) {
        chatLoginButtonInline.addEventListener('click', () => {
            const loginModal = document.getElementById('login-modal');
            if (loginModal && window.uiManager && typeof window.uiManager.toggleModal === 'function') {
                window.uiManager.toggleModal(loginModal, true);
            } else if (loginModal) { // Fallback si uiManager no está
                loginModal.classList.add('visible');
            }
        });
    }

    console.log("Chat script logic fully initialized.");

} // --- Fin initializeChatLogic ---

