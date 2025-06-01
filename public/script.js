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

        let currentChatId = null; // Will be set by startNewChat or loadChat
        let chatHistoryData = JSON.parse(localStorage.getItem('geminiChatHistory')) || [];
        let isRenaming = null;
        let saveToHistoryEnabled = true; // Default, will be updated from localStorage

        function initTheme() {
            const savedTheme = localStorage.getItem('theme');
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
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                themeToggle.title = 'Switch to light mode';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                themeToggle.title = 'Switch to dark mode';
            }
        });

        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mobileMenuBtn.innerHTML = sidebar.classList.contains('active') ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });

        saveToggle.addEventListener('change', function() {
            saveToHistoryEnabled = this.checked;
            localStorage.setItem('saveChatHistoryPreference', saveToHistoryEnabled);
        });

        function loadSavePreference() {
            const savedPref = localStorage.getItem('saveChatHistoryPreference');
            if (savedPref !== null) {
                saveToHistoryEnabled = JSON.parse(savedPref);
                saveToggle.checked = saveToHistoryEnabled;
            } else {
                saveToggle.checked = true; // Default if not set
                saveToHistoryEnabled = true;
            }
        }
        
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, 120); // Max height 120px
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
                    chatItem.style.backgroundColor = 'var(--primary-dark)'; // Highlight active chat
                    chatItem.style.color = 'white';
                }

                if (isRenaming === chat.id) {
                    const renameInput = document.createElement('input');
                    renameInput.className = 'rename-input';
                    renameInput.value = chat.title || (chat.messages[0]?.message.substring(0, 30) || 'New chat');
                    const handleRename = () => {
                        const newTitle = renameInput.value.trim();
                        if (newTitle) chat.title = newTitle;
                        chat.lastUpdated = Date.now();
                        localStorage.setItem('geminiChatHistory', JSON.stringify(chatHistoryData));
                        isRenaming = null;
                        renderChatHistoryList();
                    };
                    renameInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleRename(); });
                    renameInput.addEventListener('blur', handleRename);
                    chatItem.appendChild(renameInput);
                    setTimeout(() => renameInput.focus(), 0);
                } else {
                    const chatText = document.createElement('div');
                    chatText.className = 'chat-item-text';
                    const firstUserMsg = chat.messages.find(m => m.sender === 'user');
                    chatText.textContent = chat.title || (firstUserMsg?.message.substring(0, 25) + (firstUserMsg?.message.length > 25 ? '...' : '')) || `Chat ${chat.id.toString().slice(-4)}`;
                    if (chat.id === currentChatId) chatText.style.color = 'white';


                    const chatActions = document.createElement('div');
                    chatActions.className = 'chat-item-actions';

                    const renameBtn = document.createElement('button');
                    renameBtn.className = 'chat-action-btn';
                    renameBtn.innerHTML = '<i class="fas fa-pen"></i>';
                    renameBtn.title = 'Rename chat';
                    if (chat.id === currentChatId) renameBtn.style.color = 'white';
                    renameBtn.addEventListener('click', e => { e.stopPropagation(); isRenaming = chat.id; renderChatHistoryList(); });

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'chat-action-btn';
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteBtn.title = 'Delete chat';
                     if (chat.id === currentChatId) deleteBtn.style.color = 'white';
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
            localStorage.setItem('geminiChatHistory', JSON.stringify(chatHistoryData));
            if (currentChatId === chatIdToDelete) {
                startNewChat();
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
            renderChatHistoryList(); // To unhighlight previous active chat
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
                console.warn("Chat not found, starting new one:", chatIdToLoad);
                startNewChat(); // Fallback if chat is somehow missing
                return;
            }
            currentChatId = chatIdToLoad;
            chatbox.innerHTML = '';
            chat.messages.forEach(msg => addMessageToUI(msg.message, msg.sender, false));
            chatbox.scrollTop = chatbox.scrollHeight;
            renderChatHistoryList(); // To highlight current active chat
        }
        
        function escapeHtml(unsafe) {
            return unsafe
                 .replace(/&/g, "&")
                 .replace(/</g, "<")
                 .replace(/>/g, ">")
                 .replace(/'/g, "'");
        }

        function formatBotMessageContent(content) {
            // Basic escaping first for safety, then apply markdown-like transformations
            let htmlContent = escapeHtml(content);

            // Code blocks (```lang\ncode```) - Handle multiline correctly
            htmlContent = htmlContent.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
                // Unescape things that shouldn't be escaped inside code blocks
                const unescapedCode = code
                    .replace(/</g, '<')
                    .replace(/>/g, '>')
                    .replace(/&/g, '&');
                return `<pre><code class="language-${lang || 'plaintext'}">${unescapedCode}</code></pre>`;
            });
             // Simpler code blocks (```code```) for single line or unspecified lang
            htmlContent = htmlContent.replace(/```([\s\S]*?)```/g, (match, code) => {
                const unescapedCode = code
                    .replace(/</g, '<')
                    .replace(/>/g, '>')
                    .replace(/&/g, '&');
                return `<pre><code class="language-plaintext">${unescapedCode}</code></pre>`;
            });


            // Bold: **text**
            htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Italics: *text*
            htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
             // Underline: _text_ (less common in Markdown, but was in your original)
            htmlContent = htmlContent.replace(/_(.*?)_/g, '<u>$1</u>');
            // Inline code: `code`
            htmlContent = htmlContent.replace(/`([^`]+)`/g, (match, code) => `<code>${escapeHtml(code)}</code>`); // Re-escape code content just in case

            // Headlines: #, ##, ###
            htmlContent = htmlContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            htmlContent = htmlContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            htmlContent = htmlContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');

            // Unordered lists: - item or * item
            htmlContent = htmlContent.replace(/^[\s]*[\-\*] (.*)/gim, '<li>$1</li>');
            htmlContent = htmlContent.replace(/<\/li>\n<li>/gim, '</li><li>'); // Fix newlines between list items
            htmlContent = htmlContent.replace(/((<li>.*<\/li>\s*)+)/gim, '<ul>$1</ul>');


            // Ordered lists: 1. item
            htmlContent = htmlContent.replace(/^[\s]*\d+\. (.*)/gim, '<li>$1</li>');
            // htmlContent = htmlContent.replace(/<\/li>\n<li>/gim, '</li><li>'); // Already handled
            htmlContent = htmlContent.replace(/((<li>.*<\/li>\s*)+)/gim, (match, p1, offset, string) => {
                 // Check if it's already wrapped in <ul> to avoid double wrapping after unordered list pass
                const preceedingChar = offset > 4 ? string.substring(offset-4, offset) : "";
                if (preceedingChar === "<ul>") return p1; // already in ul
                return /<ul><li>.*<\/li><\/ul>/.test(match) ? match :'<ol>$1</ol>';
            });


            // Blockquotes: > quote
            htmlContent = htmlContent.replace(/^> (.*)/gim, '<blockquote>$1</blockquote>');
            
            // Paragraphs: Split by double newlines, then wrap non-list/block elements
            // This is tricky after other replacements. Simpler: wrap remaining lines in <p> if not already in block.
            // For simplicity now, just replace single newlines with <br> for non-block elements
            // A more robust parser would build an AST.
             return htmlContent.split(/\n\n+|\r\n\r\n+/).map(paragraph => {
                if (paragraph.match(/^<(ul|ol|li|h[1-3]|blockquote|pre)/)) {
                    return paragraph; // Already a block element
                }
                return `<p>${paragraph.replace(/\n|\r\n/g, '<br>')}</p>`; // Wrap in <p> and convert inner newlines
            }).join('');
        }


        function addMessageToUI(message, sender, shouldSaveToStorage = true) {
            if (chatbox.querySelector('.welcome-message')) {
                chatbox.innerHTML = '';
            }

            const container = document.createElement('div');
            container.className = `message-container ${sender}-message-container`;

            const avatar = document.createElement('div');
            avatar.className = `avatar ${sender}-avatar`;
            avatar.textContent = sender === 'user' ? 'Y' : 'P'; // You : Prep-Portal

            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}-message`;

            if (sender === 'bot') {
                messageDiv.innerHTML = formatBotMessageContent(message);
            } else {
                messageDiv.innerHTML = escapeHtml(message).replace(/\n/g, '<br>'); // User messages: escape and nl2br
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
            chatbox.scrollTop = chatbox.scrollHeight;
        }

        function saveMessageToLocalStorage(message, sender) {
            let chat = chatHistoryData.find(c => c.id === currentChatId);
            if (!chat) {
                chat = { id: currentChatId, title: null, messages: [], lastUpdated: Date.now() };
                chatHistoryData.push(chat);
            }
            chat.messages.push({ message, sender, timestamp: Date.now() });
            chat.lastUpdated = Date.now();
            if (!chat.title && sender === 'user' && chat.messages.filter(m=>m.sender==='user').length === 1) { // Set title on first user message
                chat.title = message.substring(0,30);
            }
            localStorage.setItem('geminiChatHistory', JSON.stringify(chatHistoryData));
            renderChatHistoryList();
        }

        let typingIndicatorElement = null;
        function showTypingIndicator() {
            if (typingIndicatorElement) return; // Already showing

            const container = document.createElement('div');
            container.className = 'message-container bot-message-container';
            typingIndicatorElement = container; // Store ref

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
            chatbox.scrollTop = chatbox.scrollHeight;
        }
        function removeTypingIndicator() {
            if (typingIndicatorElement) {
                typingIndicatorElement.remove();
                typingIndicatorElement = null;
            }
        }

        async function sendMessageToServer() {
            const messageText = userInput.value.trim();
            if (!messageText) return;

            if (!currentChatId) { // If no chat is active, start a new one
                startNewChat();
                 // Need a slight delay for currentChatId to be set if startNewChat is async or has timeouts
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            userInput.value = '';
            userInput.style.height = 'auto';
            addMessageToUI(messageText, 'user', true);
            showTypingIndicator();

            const currentChat = chatHistoryData.find(c => c.id === currentChatId);
            const historyForAPI = currentChat?.messages
                .slice(0, -1) // Exclude the current user message just added to UI
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
                    throw new Error(errorData.error || `Server error: ${response.status}`);
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

        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) && e.target !== mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Initialize
        initTheme();
        loadSavePreference();
        renderChatHistoryList();

        // Load last active chat or start new
        const lastChatId = localStorage.getItem('lastActiveChatId');
        const lastChat = chatHistoryData.find(c => c.id === parseInt(lastChatId));

        if (lastChat) {
            loadChat(lastChat.id);
        } else if (chatHistoryData.length > 0) {
            loadChat(chatHistoryData[0].id); // Load most recent if no last active
        } else {
            startNewChat();
        }
        // Persist last active chat ID
        window.addEventListener('beforeunload', () => {
            if(currentChatId) {
                localStorage.setItem('lastActiveChatId', currentChatId);
            }
        });

    });