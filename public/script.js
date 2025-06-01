 document.addEventListener('DOMContentLoaded', () => {
        const chatbox = document.getElementById('chatbox');
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        const newChatBtn = document.getElementById('newChatBtn');
        const chatHistoryEl = document.getElementById('chatHistoryEl');
        const themeToggle = document.getElementById('themeToggle');
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const saveToggle = document.getElementById('saveToggle');
        const body = document.body;

        let currentChatId = null; 
        let chatHistoryData = JSON.parse(localStorage.getItem('geminiChatHistoryPrepPortal')) || []; // Unique LS key
        let isRenaming = null;
        let saveToHistoryEnabled = true; 

        function initTheme() {
            const savedTheme = localStorage.getItem('prepPortalTheme'); // Unique LS key
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
                body.classList.add('dark-mode');
                body.classList.remove('light-mode');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                themeToggle.title = 'Switch to light mode';
            } else {
                body.classList.add('light-mode');
                body.classList.remove('dark-mode');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                themeToggle.title = 'Switch to dark mode';
            }
        }

        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            body.classList.toggle('light-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('prepPortalTheme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                themeToggle.title = 'Switch to light mode';
            } else {
                localStorage.setItem('prepPortalTheme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                themeToggle.title = 'Switch to dark mode';
            }
        });

        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mobileMenuBtn.innerHTML = sidebar.classList.contains('active') ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            if (sidebar.classList.contains('active')) {
                sidebar.scrollTop = 0; 
            }
        });

        saveToggle.addEventListener('change', function() {
            saveToHistoryEnabled = this.checked;
            localStorage.setItem('prepPortalSaveHistoryPref', saveToHistoryEnabled); // Unique LS key
        });

        function loadSavePreference() {
            const savedPref = localStorage.getItem('prepPortalSaveHistoryPref');
            if (savedPref !== null) {
                saveToHistoryEnabled = JSON.parse(savedPref);
                saveToggle.checked = saveToHistoryEnabled;
            } else {
                saveToggle.checked = true; 
                saveToHistoryEnabled = true;
            }
        }
        
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, 120); 
            this.style.height = newHeight + 'px';
        });

        function renderChatHistoryList() {
            chatHistoryEl.innerHTML = '';
            if (chatHistoryData.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.padding = '15px';
                emptyMsg.style.textAlign = 'center';
                emptyMsg.style.color = 'var(--text)';
                emptyMsg.style.opacity = '0.7';
                emptyMsg.textContent = 'No chat history yet';
                chatHistoryEl.appendChild(emptyMsg);
                return;
            }

            chatHistoryData.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

            chatHistoryData.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                if (chat.id === currentChatId) {
                    chatItem.classList.add('active-chat-item');
                }

                if (isRenaming === chat.id) {
                    const renameInput = document.createElement('input');
                    renameInput.className = 'rename-input';
                    renameInput.value = chat.title || (chat.messages[0]?.message.substring(0, 30) || 'New chat');
                    const handleRename = () => {
                        const newTitle = renameInput.value.trim();
                        if (newTitle) chat.title = newTitle;
                        chat.lastUpdated = Date.now();
                        localStorage.setItem('geminiChatHistoryPrepPortal', JSON.stringify(chatHistoryData));
                        isRenaming = null;
                        renderChatHistoryList();
                    };
                    renameInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleRename(); } });
                    renameInput.addEventListener('blur', handleRename);
                    chatItem.appendChild(renameInput);
                    setTimeout(() => renameInput.focus(), 0);
                } else {
                    const chatText = document.createElement('div');
                    chatText.className = 'chat-item-text';
                    const firstUserMsg = chat.messages.find(m => m.sender === 'user');
                    chatText.textContent = chat.title || (firstUserMsg?.message.substring(0, 25) + (firstUserMsg?.message.length > 25 ? '...' : '')) || `Chat ${chat.id.toString().slice(-4)}`;
                    
                    const chatActions = document.createElement('div');
                    chatActions.className = 'chat-item-actions';

                    const renameBtn = document.createElement('button');
                    renameBtn.className = 'chat-action-btn';
                    renameBtn.innerHTML = '<i class="fas fa-pen"></i>';
                    renameBtn.title = 'Rename chat';
                    renameBtn.addEventListener('click', e => { e.stopPropagation(); isRenaming = chat.id; renderChatHistoryList(); });

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'chat-action-btn';
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteBtn.title = 'Delete chat';
                    deleteBtn.addEventListener('click', e => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${chatText.textContent}"?`)) deleteChat(chat.id);
                    });

                    chatActions.appendChild(renameBtn);
                    chatActions.appendChild(deleteBtn);
                    chatItem.appendChild(chatText);
                    chatItem.appendChild(chatActions);
                }
                chatItem.addEventListener('click', () => {
                    loadChat(chat.id);
                    if (window.innerWidth < 768 && sidebar.classList.contains('active')) {
                        sidebar.classList.remove('active');
                        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                    }
                });
                chatHistoryEl.appendChild(chatItem);
            });
        }

        function deleteChat(chatIdToDelete) {
            chatHistoryData = chatHistoryData.filter(c => c.id !== chatIdToDelete);
            localStorage.setItem('geminiChatHistoryPrepPortal', JSON.stringify(chatHistoryData));
            if (currentChatId === chatIdToDelete) {
                if (chatHistoryData.length > 0) {
                    loadChat(chatHistoryData[0].id); // Load most recent
                } else {
                    startNewChat();
                }
            }
            renderChatHistoryList();
        }

        function showWelcomeMessage() {
            chatbox.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to Prep-Portal!</h2>
                    <p>Start a new chat or select from your history.</p>
                    <p>Ask me anything!</p>
                </div>`;
        }

        function startNewChat() {
            currentChatId = Date.now();
            chatbox.innerHTML = '';
            showWelcomeMessage();
            userInput.value = '';
            userInput.style.height = 'auto';
            // Add a new empty chat to history data so it can be titled on first message
            const newChatEntry = { id: currentChatId, title: null, messages: [], lastUpdated: Date.now() };
            const existingChatIndex = chatHistoryData.findIndex(c => c.id === currentChatId);
            if (existingChatIndex === -1) { // Only add if it truly doesn't exist
                 chatHistoryData.push(newChatEntry);
            }
            localStorage.setItem('geminiChatHistoryPrepPortal', JSON.stringify(chatHistoryData)); // Save immediately
            renderChatHistoryList(); 
        }
        
        newChatBtn.addEventListener('click', () => {
            startNewChat();
            if (window.innerWidth < 768 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        function loadChat(chatIdToLoad) {
            const chat = chatHistoryData.find(c => c.id === chatIdToLoad);
            if (!chat) {
                startNewChat(); 
                return;
            }
            currentChatId = chatIdToLoad;
            chatbox.innerHTML = '';
            if (chat.messages && chat.messages.length > 0) {
                chat.messages.forEach(msg => addMessageToUI(msg.message, msg.sender, false));
            } else {
                showWelcomeMessage(); // Show welcome if a loaded chat has no messages
            }
            chatbox.scrollTop = chatbox.scrollHeight;
            renderChatHistoryList(); 
        }
        
        function escapeHtml(unsafe) {
            return unsafe
                 .replace(/&/g, "&")
                 .replace(/</g, "<")
                 .replace(/>/g, ">")
            
                 .replace(/'/g, "'");
        }

        function formatBotMessageContent(content) {
            let rawContent = content; // Work with the raw content for placeholder replacement
            const codeBlocks = [];

            // 1. Temporarily replace code blocks with placeholders
            rawContent = rawContent.replace(/```([a-zA-Z]*)\n?([\s\S]*?)```/g, (match, lang, codeText) => {
                codeBlocks.push({ lang: lang || 'plaintext', code: codeText }); // Store raw code
                return `%%CODE_BLOCK_${codeBlocks.length - 1}%%`;
            });

            // 2. Escape the entire content that's NOT a code block placeholder
            let htmlContent = escapeHtml(rawContent);

            // 3. Apply Markdown-like formatting to the escaped content
            // Bold, Italics, Underline (using $1 for captured group)
            htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
            htmlContent = htmlContent.replace(/_(.*?)_/g, '<u>$1</u>');
            
            // Inline code: `code` - applied to escaped content. Content inside ` ` is already escaped.
            htmlContent = htmlContent.replace(/`([^`]+?)`/g, '<code>$1</code>');

            // Headlines (applied to escaped text, $1 is the headline text)
            htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');
            
            // Blockquotes ('> ' was escaped to '> ')
            htmlContent = htmlContent.replace(/^> (.*)/gim, '<blockquote>$1</blockquote>');

            // Lists: Convert individual list items
            htmlContent = htmlContent.replace(/^[\s]*[\-\*] (.*)/gim, '<li>$1</li>'); // Unordered
            htmlContent = htmlContent.replace(/^[\s]*\d+\. (.*)/gim, '<li>$1</li>'); // Ordered

            // Wrap consecutive <li> items in <ul>. This is a simplified approach.
            // A more robust parser would track list type (ul/ol) from the start.
            htmlContent = htmlContent.replace(/(<li>.*?<\/li>\s*)+/gim, (match) => {
                return `<ul>${match.replace(/<\/li>\s*<li>/g, '</li><li>')}</ul>`;
            });

            // Paragraphs: Wrap remaining lines/blocks not already handled
            let finalHtmlOutput = htmlContent.split(/\n\n+|\r\n\r\n+/).map(paragraph => {
                paragraph = paragraph.trim();
                if (!paragraph) return '';
                if (paragraph.match(/^<(ul|ol|h[1-3]|blockquote|pre|li)/i) || paragraph.startsWith('%%CODE_BLOCK_')) {
                    return paragraph;
                }
                return `<p>${paragraph.replace(/\n|\r\n/g, '<br>')}</p>`;
            }).join('');

            // 4. Restore actual code blocks, NOW escaping their original content
            finalHtmlOutput = finalHtmlOutput.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, index) => {
                const block = codeBlocks[parseInt(index)];
                return `<pre><code class="language-${block.lang}">${escapeHtml(block.code)}</code></pre>`;
            });
            
            return finalHtmlOutput;
        }


        function addMessageToUI(message, sender, shouldSaveToStorage = true) {
            if (chatbox.querySelector('.welcome-message') && chatbox.children.length === 1) {
                chatbox.innerHTML = '';
            }

            const container = document.createElement('div');
            container.className = `message-container ${sender}-message-container`;

            const avatar = document.createElement('div');
            avatar.className = `avatar ${sender}-avatar`;
            avatar.textContent = sender === 'user' ? 'Y' : 'P'; 

            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}-message`;

            if (sender === 'bot') {
                messageDiv.innerHTML = formatBotMessageContent(message);
            } else {
                messageDiv.innerHTML = escapeHtml(message).replace(/\n/g, '<br>'); 
            }

            if (sender === 'bot') {
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                copyBtn.title = 'Copy text';
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(message).then(() => {
                        copyBtn.innerHTML = '<i class="fas fa-check"></i>'; copyBtn.title = 'Copied!';
                        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; copyBtn.title = 'Copy text'; }, 2000);
                    }).catch(err => console.error('Failed to copy: ', err));
                });
                messageDiv.appendChild(copyBtn);
            }

            if (sender === 'user') {
                container.appendChild(messageDiv); container.appendChild(avatar);
            } else {
                container.appendChild(avatar); container.appendChild(messageDiv);
            }
            chatbox.appendChild(container);

            if (shouldSaveToStorage && saveToHistoryEnabled && currentChatId) {
                saveMessageToLocalStorage(message, sender);
            }
             // Scroll to bottom smoothly
            chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: 'smooth' });
        }

        function saveMessageToLocalStorage(message, sender) {
            let chat = chatHistoryData.find(c => c.id === currentChatId);
            if (!chat) { // Should have been created by startNewChat or found by loadChat
                // This case might happen if currentChatId is somehow not set, create it.
                 console.warn("Chat not found in saveMessageToLocalStorage, creating new one for ID:", currentChatId);
                 chat = { id: currentChatId, title: null, messages: [], lastUpdated: Date.now() };
                 chatHistoryData.push(chat);
            }
            chat.messages.push({ message, sender, timestamp: Date.now() });
            chat.lastUpdated = Date.now();
            if (!chat.title && sender === 'user' && chat.messages.filter(m=>m.sender==='user').length === 1) { 
                chat.title = message.substring(0,30) + (message.length > 30 ? "..." : "");
            }
            localStorage.setItem('geminiChatHistoryPrepPortal', JSON.stringify(chatHistoryData));
            renderChatHistoryList();
        }

        let typingIndicatorElement = null;
        function showTypingIndicator() {
            if (typingIndicatorElement && chatbox.contains(typingIndicatorElement)) return; 

            const container = document.createElement('div');
            container.className = 'message-container bot-message-container';
            typingIndicatorElement = container; 

            const avatar = document.createElement('div');
            avatar.className = 'avatar bot-avatar';
            avatar.textContent = 'P';

            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing-indicator-container';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('div');
                dot.className = 'typing-dot';
                typingDiv.appendChild(dot);
            }
            container.appendChild(avatar);
            container.appendChild(typingDiv);
            chatbox.appendChild(container);
            chatbox.scrollTo({ top: chatbox.scrollHeight, behavior: 'smooth' });
        }
        function removeTypingIndicator() {
            if (typingIndicatorElement && chatbox.contains(typingIndicatorElement)) {
                typingIndicatorElement.remove();
                typingIndicatorElement = null;
            }
        }

        async function sendMessageToServer() {
            const messageText = userInput.value.trim();
            if (!messageText) return;

            if (!currentChatId) { 
                startNewChat();
                // Since startNewChat is synchronous and updates currentChatId,
                // we can proceed. If it were async, await would be needed.
            }

            userInput.value = '';
            userInput.style.height = 'auto';
            addMessageToUI(messageText, 'user', true);
            showTypingIndicator();

            const currentChatSession = chatHistoryData.find(c => c.id === currentChatId);
            // Prepare history: all messages in the current chat *before* the one just sent by the user.
            const historyForAPI = currentChatSession?.messages
                .slice(0, -1) // Exclude the last message (the user's current input)
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.message }]
                })) || [];
            
            try {
                const response = await fetch('/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: messageText,
                        chatHistory: historyForAPI 
                    })
                });
                removeTypingIndicator();
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                addMessageToUI(data.answer, 'bot', true);

            } catch (error) {
                removeTypingIndicator();
                addMessageToUI(`Sorry, an error occurred: ${error.message}. Please try again.`, 'bot', false);
                console.error('Error sending message:', error);
            }
        }

        sendButton.addEventListener('click', sendMessageToServer);
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageToServer();
            }
        });

        // Click outside to close mobile sidebar
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) && 
                e.target !== mobileMenuBtn && !mobileMenuBtn.contains(e.target) // Check if click is on button itself or its icon
                ) {
                sidebar.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // --- Initialize ---
        initTheme();
        loadSavePreference();
        // renderChatHistoryList(); // Called by startNewChat or loadChat

        const lastChatIdString = localStorage.getItem('prepPortalLastActiveChatId'); // Unique LS Key
        const lastChatId = lastChatIdString ? parseInt(lastChatIdString) : null;
        
        // Attempt to find the last active chat
        let chatToLoad = null;
        if (lastChatId) {
            chatToLoad = chatHistoryData.find(c => c.id === lastChatId);
        }

        if (chatToLoad) {
            loadChat(chatToLoad.id);
        } else if (chatHistoryData.length > 0) {
            // If no last active or last active not found, load the most recent valid chat
            chatHistoryData.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0)); // Ensure sorted
            loadChat(chatHistoryData[0].id); 
        } else {
            startNewChat(); // Start fresh if no history at all
        }
        
        window.addEventListener('beforeunload', () => {
            if(currentChatId) {
                localStorage.setItem('prepPortalLastActiveChatId', currentChatId.toString());
            }
        });

    });