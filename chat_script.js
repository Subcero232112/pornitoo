// Imports Firebase
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, push, set, onChildAdded, serverTimestamp, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Espera a que el DOM esté listo Y Firebase inicializado
// document.addEventListener('firebase-ready', () => {
//     initializeChatLogic();
// });
// O ejecutar directamente si confías en defer y que window.firebaseApp esté listo:
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseApp) {
        initializeChatLogic();
    } else {
        console.error("Firebase not ready when chat_script tried to run. Waiting for firebase-ready event or check init order.");
        // Escuchar el evento si aún no está listo
        document.addEventListener('firebase-ready', initializeChatLogic, { once: true });
    }
});


function initializeChatLogic() {
    console.log("Initializing Chat Logic...");

    // --- 1. Firebase Setup ---
    if (!window.firebaseApp) {
        console.error("Firebase app instance not found in chat_script!");
        alert("Error crítico: No se pudo conectar a Firebase para el chat.");
        return;
    }
    const auth = getAuth(window.firebaseApp);
    const db = getDatabase(window.firebaseApp);

    // --- 2. Selectors for Chat Interface ---
    const messagesList = document.getElementById('chat-messages'); // ID corregido
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('send-chat-message'); // ID corregido
    const chatLoadingIndicator = document.getElementById('chat-loading-indicator'); // ID corregido
    const chatLoginPrompt = document.getElementById('chat-login-prompt'); // ID corregido
    const chatLoginButton = document.getElementById('chat-login-button'); // ID corregido
    // Selectores para actualizar info de la lista de chats (si fuera necesario)
    const chatListLastMessage = document.querySelector('.chat-list-item[data-chat-id="general"] .last-message');
    const chatListTimestamp = document.querySelector('.chat-list-item[data-chat-id="general"] .timestamp');


    // --- 3. State ---
    let currentUser = null;
    let isScrolledToBottom = true; // Flag para auto-scroll inteligente
    const chatRoomId = 'general'; // Chat único por ahora
    const messagesRef = ref(db, `chats/${chatRoomId}`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50)); // Cargar últimos 50 mensajes

    // --- 4. Functions ---
    function escapeHTML(str) { /* ... (igual que antes) ... */
         const div = document.createElement('div'); div.appendChild(document.createTextNode(str)); return div.innerHTML;
     }
     function formatDate(timestamp) { /* ... (igual que antes) ... */
         if (!timestamp) return '---'; try { const date = new Date(timestamp); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } // Solo hora para chat
         catch (e) { console.error("Error formatting date:", e); return '--:--'; }
     }

    function displayMessage(key, messageData) {
        if (!messagesList || !messageData || !messageData.text) return;

        if (chatLoadingIndicator && chatLoadingIndicator.parentNode === messagesList) {
            chatLoadingIndicator.remove();
        }

        const messageId = `message-${key}`;
        if (document.getElementById(messageId)) return; // Evitar duplicados

        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.id = messageId;

        const isSent = currentUser && messageData.userId === currentUser.uid;
        messageElement.classList.add(isSent ? 'sent' : 'received');

        const timestamp = messageData.timestamp ? formatDate(messageData.timestamp) : formatDate(Date.now());
        const senderName = isSent ? '' : `<span class="sender-name">${escapeHTML(messageData.userName || 'Usuario')}</span>`;

        messageElement.innerHTML = `
            ${senderName}
            <span class="message-content">${escapeHTML(messageData.text)}</span>
            <span class="message-timestamp">${timestamp}</span>
        `;

        // Actualizar preview en sidebar (solo último mensaje)
        if(chatListLastMessage) chatListLastMessage.textContent = escapeHTML(messageData.text);
        if(chatListTimestamp) chatListTimestamp.textContent = timestamp;


        // Scroll inteligente: solo si ya estaba abajo o es mensaje propio
        const shouldScroll = isScrolledToBottom || isSent;
        messagesList.appendChild(messageElement);
        if (shouldScroll) {
            scrollToBottom();
        }
    }

    async function sendMessage() {
        if (!messageInput || !currentUser || !sendButton) return;
        const text = messageInput.value.trim();
        if (text === '') return;

        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Usuario Anónimo',
            // userPhoto: currentUser.photoURL || null, // Podrías incluirlo si quieres mostrar avatares en chat
            text: text,
            timestamp: serverTimestamp() // Usar timestamp del servidor
        };

        try {
            messageInput.disabled = true; sendButton.disabled = true;
            const newMessageRef = push(messagesRef);
            await set(newMessageRef, messageData);
            messageInput.value = '';
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Error al enviar el mensaje.");
        } finally {
            if (currentUser) { // Solo re-habilitar si sigue logueado
                 messageInput.disabled = false; sendButton.disabled = false;
                 messageInput.focus();
            }
        }
    }

    function scrollToBottom() {
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }

    // Detectar si el usuario ha hecho scroll hacia arriba
    if(messagesList) {
        messagesList.addEventListener('scroll', () => {
            const threshold = 10; // Píxeles de margen
            isScrolledToBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < threshold;
        });
    }


    function handleAuthStateChange(user) {
        currentUser = user;
        if (user) {
            console.log("Chat Auth: User Logged In", user.uid);
            if(chatLoginPrompt) chatLoginPrompt.style.display = 'none';
            if (messageInput) { messageInput.disabled = false; messageInput.placeholder = window.translations?.[window.currentLang || 'es']?.chat_input_placeholder || "Type a message..."; }
            if (sendButton) sendButton.disabled = false;
            loadMessages(); // Cargar mensajes al iniciar sesión
        } else {
            console.log("Chat Auth: User Logged Out");
             if (messageInput) { messageInput.disabled = true; messageInput.placeholder = window.translations?.[window.currentLang || 'es']?.login_needed_for_chat || "Log in to chat"; messageInput.value = '';}
            if (sendButton) sendButton.disabled = true;
            if (messagesList) messagesList.innerHTML = ''; // Limpiar mensajes
            if (chatLoadingIndicator && messagesList) messagesList.appendChild(chatLoadingIndicator); // Mostrar indicador de carga (que dirá login)
            if (chatLoadingIndicator) chatLoadingIndicator.textContent = window.translations?.[window.currentLang || 'es']?.login_needed_for_chat || "Log in to chat";
            if(chatLoginPrompt) chatLoginPrompt.style.display = 'flex'; // Mostrar prompt
        }
        // La UI del header/sidebar la actualiza script.js
    }

    function loadMessages() {
        if (!messagesList || !currentUser) return; // No cargar si no hay user o contenedor
        messagesList.innerHTML = ''; // Limpiar
         if (chatLoadingIndicator && messagesList) messagesList.appendChild(chatLoadingIndicator);
         chatLoadingIndicator.textContent = window.translations?.[window.currentLang || 'es']?.chat_loading || "Loading messages...";


        // Escuchar nuevos mensajes
        onChildAdded(messagesQuery, (snapshot) => {
             const messageData = snapshot.val();
             const messageKey = snapshot.key;
             displayMessage(messageKey, messageData);
         }, (error) => {
             console.error("Error fetching messages:", error);
              if (chatLoadingIndicator) chatLoadingIndicator.textContent = "Error al cargar mensajes.";
             if (chatLoadingIndicator?.style) chatLoadingIndicator.style.color = 'red';
         });
    }

    // --- 5. Event Listeners ---
    if (sendButton && messageInput) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
    }
    if (chatLoginButton) {
        chatLoginButton.addEventListener('click', () => {
            // Asumimos que uiManager está disponible globalmente o importado si usas módulos complejos
             if (window.uiManager && typeof window.uiManager.toggleModal === 'function' && window.$) {
                 window.uiManager.toggleModal(window.$('#login-modal'), true);
             } else {
                 // Fallback o aviso si uiManager no está listo/accesible
                 alert("Por favor, inicia sesión usando el icono de usuario en la cabecera.");
                 console.warn("uiManager no disponible para abrir modal desde chat_script");
             }
        });
    }

    // --- 6. Initial Auth Check ---
    onAuthStateChanged(auth, handleAuthStateChange);
    console.log("Chat script logic initialized.");

} 
