import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, push, set, onChildAdded, serverTimestamp, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Firebase Setup ---
    const firebaseApp = window.firebaseApp; // Get initialized app from global scope (or import if using modules)
    if (!firebaseApp) {
        console.error("Firebase app not initialized for chat. Check HTML setup.");
        alert("Error de configuración. No se puede cargar el chat.");
        return;
    }
    const auth = getAuth(firebaseApp);
    const db = getDatabase(firebaseApp);

    // --- 2. Selectors for Chat Interface ---
    const messagesList = document.getElementById('chat-messages-list');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-send-button');
    const chatLoadingIndicator = document.querySelector('.chat-loading');
    const userAuthButtonChat = document.getElementById('user-auth-button'); // Auth button in chat header

    // --- 3. State ---
    let currentUser = null; // Store current user
    const chatRoomId = 'general'; // Use a specific room ID
    const messagesRef = ref(db, `chats/${chatRoomId}`);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50)); // Get last 50 messages ordered by time

    // --- 4. Functions ---

    // Function to display a message in the UI
    function displayMessage(key, messageData) {
        if (!messagesList || !messageData || !messageData.text) return; // Basic validation

        // Hide loading indicator once first message is displayed
        if (chatLoadingIndicator && chatLoadingIndicator.style.display !== 'none') {
            chatLoadingIndicator.style.display = 'none';
        }

        const messageId = `message-${key}`;
        // Avoid adding duplicate messages if listener fires multiple times somehow
        if (document.getElementById(messageId)) {
            return;
        }

        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message');
        messageElement.id = messageId;

        const isSent = currentUser && messageData.userId === currentUser.uid;
        messageElement.classList.add(isSent ? 'sent' : 'received');

        const avatarUrl = messageData.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(messageData.userName || 'U')}&background=random&color=fff`;

        // Format timestamp
        let timeString = '';
        if (messageData.timestamp) {
            try {
                const date = new Date(messageData.timestamp);
                 // Check if the date is valid before formatting
                 if (!isNaN(date.getTime())) {
                     timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 } else {
                     console.warn("Invalid timestamp received:", messageData.timestamp);
                     // Optionally display a placeholder or server time if available immediately
                     // timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 }

            } catch (e) {
                console.error("Error formatting timestamp:", e);
            }
        }


        // Structure: [Avatar (if received)] [Bubble]
        messageElement.innerHTML = `
            ${!isSent ? `<img src="${avatarUrl}" alt="${messageData.userName || 'Avatar'}" class="message-avatar">` : ''}
            <div class="message-bubble">
                ${!isSent ? `<span class="message-sender">${messageData.userName || 'Usuario'}</span>` : ''}
                <span class="message-text">${escapeHTML(messageData.text)}</span>
                <span class="message-time">${timeString}</span>
            </div>
        `;

        messagesList.appendChild(messageElement);

        // Auto-scroll to the bottom
        scrollToBottom();
    }

    // Function to send a message
    async function sendMessage() {
        if (!messageInput || !currentUser) return; // Need input and logged-in user

        const text = messageInput.value.trim();
        if (text === '') return; // Don't send empty messages

        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || 'Usuario Anónimo',
            userPhoto: currentUser.photoURL || null, // Store photo URL
            text: text,
            timestamp: serverTimestamp() // Use Firebase server time
        };

        try {
            // Disable input while sending
            messageInput.disabled = true;
            sendButton.disabled = true;

            const newMessageRef = push(messagesRef); // Generate unique key
            await set(newMessageRef, messageData);

            messageInput.value = ''; // Clear input field
            console.log("Message sent:", newMessageRef.key);

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Error al enviar el mensaje."); // Inform user
        } finally {
            // Re-enable input regardless of success/failure
             if (currentUser) { // Only re-enable if still logged in
                 messageInput.disabled = false;
                 sendButton.disabled = false;
                 messageInput.focus(); // Set focus back to input
             }
        }
    }

    // Function to scroll message list to bottom
    function scrollToBottom() {
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }

    // Utility to escape HTML to prevent XSS
     function escapeHTML(str) {
         const div = document.createElement('div');
         div.appendChild(document.createTextNode(str));
         return div.innerHTML;
     }


    // Function to handle user authentication state changes specific to chat
    function handleAuthStateChange(user) {
        currentUser = user;
        if (user) {
            // User is logged in
            console.log("Chat Auth: User Logged In", user.uid);
            if (messageInput) messageInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            if (messageInput) messageInput.placeholder = translations[window.currentLang || 'es']?.chat_input_placeholder || "Type a message..."; // Use translated placeholder
            // Load messages ONLY when logged in (based on security rules)
            loadMessages();
        } else {
            // User is logged out
            console.log("Chat Auth: User Logged Out");
            if (messageInput) messageInput.disabled = true;
            if (sendButton) sendButton.disabled = true;
            if (messagesList) messagesList.innerHTML = '<div class="chat-loading" data-translate-key="login_needed_for_chat">Inicia sesión para ver y enviar mensajes.</div>'; // Clear messages/show login prompt
            if (messageInput) messageInput.placeholder = translations[window.currentLang || 'es']?.login_needed_for_chat || "Log in to chat";
            // Optional: Show login modal automatically if user tries to access chat directly when logged out
            // uiManager.toggleModal($('#login-modal'), true); // Assuming uiManager is accessible or replicated here
        }
         // Update the header auth button UI (handled by the main script.js listener)
         // updateAuthButtonUI(user); // This function is in script.js
    }

    // Function to load initial messages and listen for new ones
    function loadMessages() {
        if (!messagesList) return;
         // Clear existing messages before loading/listening
         messagesList.innerHTML = ''; // Clear previous content
         if (chatLoadingIndicator) chatLoadingIndicator.style.display = 'block'; // Show loading

        // Listen for new messages added to the chat room
         onChildAdded(messagesQuery, (snapshot) => {
             const messageData = snapshot.val();
             const messageKey = snapshot.key;
             displayMessage(messageKey, messageData);
         }, (error) => {
             console.error("Error fetching messages:", error);
             if (messagesList) messagesList.innerHTML = `<div class="chat-loading error">Error al cargar mensajes: ${error.message}</div>`;
             if (chatLoadingIndicator) chatLoadingIndicator.style.display = 'none';
         });

         // Optional: Handle message removal or changes if needed
         // onChildRemoved(...)
         // onChildChanged(...)
    }


    // --- 5. Event Listeners ---
    if (sendButton && messageInput) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter (not Shift+Enter)
                e.preventDefault(); // Prevent default newline behavior
                sendMessage();
            }
        });
    }

    // Listen for auth state changes
    onAuthStateChanged(auth, handleAuthStateChange);

    // --- 6. Initial Setup ---
    // Initial UI state is set by handleAuthStateChange when the listener fires.
    console.log("Chat script loaded.");

}); // Fin DOMContentLoaded


