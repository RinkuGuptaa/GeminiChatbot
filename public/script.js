 document.addEventListener('DOMContentLoaded', () => {
            const chatbox = document.getElementById('chatbox');
            const userInput = document.getElementById('userInput');
            const sendButton = document.getElementById('sendButton');
            const newChatBtn = document.getElementById('newChatBtn');
            const chatHistory = document.getElementById('chatHistory');
            const themeToggle = document.getElementById('themeToggle');
            const sidebar = document.getElementById('sidebar');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const saveToggle = document.getElementById('saveToggle');
            const body = document.body;
            
            let currentChatId = Date.now();
            let chatHistoryData = JSON.parse(localStorage.getItem('chatHistory')) || [];
            let isRenaming = null;
            let saveToHistory = true;

            // Initialize theme
            function initTheme() {
                const savedTheme = localStorage.getItem('theme');
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                
                if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
                    body.classList.add('dark-mode');
                    body.classList.remove('light-mode');
                    themeToggle.textContent = '☀️';
                    themeToggle.title = 'Switch to light mode';
                } else {
                    body.classList.add('light-mode');
                    body.classList.remove('dark-mode');
                    themeToggle.textContent = '🌙';
                    themeToggle.title = 'Switch to dark mode';
                }
            }

            // Toggle theme
            themeToggle.addEventListener('click', () => {
                if (body.classList.contains('dark-mode')) {
                    body.classList.remove('dark-mode');
                    body.classList.add('light-mode');
                    localStorage.setItem('theme', 'light');
                    themeToggle.textContent = '🌙';
                    themeToggle.title = 'Switch to dark mode';
                } else {
                    body.classList.remove('light-mode');
                    body.classList.add('dark-mode');
                    localStorage.setItem('theme', 'dark');
                    themeToggle.textContent = '☀️';
                    themeToggle.title = 'Switch to light mode';
                }
            });

            // Toggle mobile menu
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });

            // Toggle save to history
            saveToggle.addEventListener('change', function() {
                saveToHistory = this.checked;
            });

            // Auto-resize textarea
            userInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });

            // Initialize chat history
            function loadChatHistory() {
                chatHistory.innerHTML = '';
                
                if (chatHistoryData.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.style.padding = '15px';
                    emptyMsg.style.textAlign = 'center';
                    emptyMsg.style.color = 'var(--text)';
                    emptyMsg.style.opacity = '0.7';
                    emptyMsg.textContent = 'No chat history yet';
                    chatHistory.appendChild(emptyMsg);
                    return;
                }
                
                chatHistoryData.forEach(chat => {
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    
                    if (isRenaming === chat.id) {
                        const renameInput = document.createElement('input');
                        renameInput.className = 'rename-input';
                        renameInput.value = chat.title || chat.messages[0]?.message.substring(0, 30) || 'New chat';
                        renameInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                chat.title = renameInput.value;
                                localStorage.setItem('chatHistory', JSON.stringify(chatHistoryData));
                                isRenaming = null;
                                loadChatHistory();
                            }
                        });
                        renameInput.addEventListener('blur', () => {
                            chat.title = renameInput.value;
                            localStorage.setItem('chatHistory', JSON.stringify(chatHistoryData));
                            isRenaming = null;
                            loadChatHistory();
                        });
                        chatItem.appendChild(renameInput);
                        renameInput.focus();
                    } else {
                        const chatText = document.createElement('div');
                        chatText.className = 'chat-item-text';
                        chatText.textContent = chat.title || chat.messages[0]?.message.substring(0, 30) + (chat.messages[0]?.message.length > 30 ? '...' : '') || 'New chat';
                        
                        const chatActions = document.createElement('div');
                        chatActions.className = 'chat-item-actions';
                        
                        const renameBtn = document.createElement('button');
                        renameBtn.className = 'chat-action-btn';
                        renameBtn.innerHTML = '✏️';
                        renameBtn.title = 'Rename chat';
                        renameBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            isRenaming = chat.id;
                            loadChatHistory();
                        });
                        
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'chat-action-btn';
                        deleteBtn.innerHTML = '🗑️';
                        deleteBtn.title = 'Delete chat';
                        deleteBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                        });
                        
                        chatActions.appendChild(renameBtn);
                        chatActions.appendChild(deleteBtn);
                        chatItem.appendChild(chatText);
                        chatItem.appendChild(chatActions);
                    }
                    
                    chatItem.addEventListener('click', () => {
                        loadChat(chat.id);
                        if (window.innerWidth < 768) {
                            sidebar.classList.remove('active');
                        }
                    });
                    chatHistory.appendChild(chatItem);
                });
            }

            // Delete a chat from history
            function deleteChat(chatId) {
                chatHistoryData = chatHistoryData.filter(c => c.id !== chatId);
                localStorage.setItem('chatHistory', JSON.stringify(chatHistoryData));
                
                if (currentChatId === chatId) {
                    currentChatId = Date.now();
                    chatbox.innerHTML = '';
                    showWelcomeMessage();
                }
                
                loadChatHistory();
            }

            // Show welcome message
            function showWelcomeMessage() {
                chatbox.innerHTML = `
                    <div class="welcome-message">
                        <h2>Welcome to Gemini</h2>
                        <p>Start a new chat or select from your history</p>
                        <p>Ask me anything!</p>
                    </div>
                `;
            }

            // Load a specific chat
            function loadChat(chatId) {
                currentChatId = chatId;
                const chat = chatHistoryData.find(c => c.id === chatId);
                chatbox.innerHTML = '';
                
                if (chat) {
                    chat.messages.forEach(msg => {
                        addMessage(msg.message, msg.sender, false);
                    });
                } else {
                    addMessage("Hello! I'm Gemini. How can I assist you today?", 'bot', false);
                }
            }

            // Enhanced content formatting with structured paragraphs
            function formatContent(content) {
                // First split into paragraphs while preserving code blocks
                let paragraphs = [];
                let tempContent = content;
                
                // Handle code blocks first
                while (tempContent.includes('```')) {
                    const codeStart = tempContent.indexOf('```');
                    const beforeCode = tempContent.substring(0, codeStart);
                    
                    if (beforeCode) {
                        paragraphs.push(...beforeCode.split('\n\n').filter(p => p.trim()));
                    }
                    
                    const codeEnd = tempContent.indexOf('```', codeStart + 3);
                    if (codeEnd === -1) break;
                    
                    const codeBlock = tempContent.substring(codeStart, codeEnd + 3);
                    paragraphs.push(codeBlock);
                    
                    tempContent = tempContent.substring(codeEnd + 3);
                }
                
                // Add remaining paragraphs
                if (tempContent) {
                    paragraphs.push(...tempContent.split('\n\n').filter(p => p.trim()));
                }
                
                // Process each paragraph
                let formattedContent = paragraphs.map(para => {
                    // Handle code blocks
                    if (para.startsWith('```') && para.endsWith('```')) {
                        const langMatch = para.match(/^```([a-z]*)/);
                        const lang = langMatch ? langMatch[1] : '';
                        const codeContent = para.slice(lang.length + 3, -3).trim();
                        return `<pre><code class="${lang}">${codeContent}</code></pre>`;
                    }
                    
                    // Handle lists
                    if (para.match(/^[\s]*[\-\*\+]\s/) || para.match(/^[\s]*\d+\.\s/)) {
                        const listItems = para.split('\n').filter(item => item.trim());
                        const isOrdered = para.match(/^[\s]*\d+\.\s/);
                        
                        const listContent = listItems.map(item => {
                            const cleanedItem = item.replace(/^[\s]*[\-\*\+]\s|^[\s]*\d+\.\s/, '');
                            return `<li>${processInlineFormatting(cleanedItem)}</li>`;
                        }).join('');
                        
                        return isOrdered ? `<ol>${listContent}</ol>` : `<ul>${listContent}</ul>`;
                    }
                    
                    // Handle headings
                    if (para.match(/^#{1,3}\s/)) {
                        const level = para.match(/^#+/)[0].length;
                        const headingText = para.replace(/^#+\s/, '');
                        return `<h${level}>${processInlineFormatting(headingText)}</h${level}>`;
                    }
                    
                    // Handle blockquotes
                    if (para.startsWith('> ')) {
                        const quoteText = para.substring(2);
                        return `<blockquote>${processInlineFormatting(quoteText)}</blockquote>`;
                    }
                    
                    // Regular paragraph
                    return `<p>${processInlineFormatting(para)}</p>`;
                }).join('');
                
                return formattedContent;
            }

            // Process inline formatting within paragraphs
            function processInlineFormatting(text) {
                return text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/_(.*?)_/g, '<u>$1</u>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/\n/g, '<br>');
            }

            // Add message to chat
            function addMessage(message, sender, shouldSave = true) {
                // Remove welcome message if it's the first message
                if (chatbox.querySelector('.welcome-message')) {
                    chatbox.innerHTML = '';
                }
                
                const container = document.createElement('div');
                container.className = `message-container ${sender}-message-container`;
                
                const avatar = document.createElement('div');
                avatar.className = `avatar ${sender}-avatar`;
                avatar.textContent = sender === 'user' ? 'Y' : 'G';
                
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${sender}-message`;
                messageDiv.innerHTML = sender === 'bot' ? formatContent(message) : processInlineFormatting(message);
                
                if (sender === 'bot') {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn';
                    copyBtn.textContent = 'Copy';
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(message);
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
                    });
                    messageDiv.appendChild(copyBtn);
                }
                
                container.appendChild(avatar);
                container.appendChild(messageDiv);
                chatbox.appendChild(container);
                
                if (shouldSave && saveToHistory) {
                    saveMessageToHistory(message, sender);
                }
                
                chatbox.scrollTop = chatbox.scrollHeight;
            }

            // Save message to chat history
            function saveMessageToHistory(message, sender) {
                let chat = chatHistoryData.find(c => c.id === currentChatId);
                
                if (!chat) {
                    chat = { id: currentChatId, title: null, messages: [] };
                    chatHistoryData.unshift(chat);
                }
                
                chat.messages.push({ message, sender, timestamp: Date.now() });
                localStorage.setItem('chatHistory', JSON.stringify(chatHistoryData));
                loadChatHistory();
            }

            // Show typing indicator
            function showTyping() {
                const container = document.createElement('div');
                container.className = 'message-container bot-message-container';
                container.id = 'typing-indicator';
                
                const avatar = document.createElement('div');
                avatar.className = 'avatar bot-avatar';
                avatar.textContent = 'G';
                
                const typingDiv = document.createElement('div');
                typingDiv.className = 'typing-indicator';
                
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'typing-dot';
                    typingDiv.appendChild(dot);
                }
                
                container.appendChild(avatar);
                container.appendChild(typingDiv);
                chatbox.appendChild(container);
                chatbox.scrollTop = chatbox.scrollHeight;
                
                return container;
            }

            // Send message to server
            async function sendMessage() {
                const message = userInput.value.trim();
                if (!message) return;
                
                userInput.value = '';
                userInput.style.height = 'auto';
                addMessage(message, 'user', true);
                
                const typingIndicator = showTyping();
                
                try {
                    const currentChat = chatHistoryData.find(c => c.id === currentChatId);
                    const chatHistory = currentChat?.messages.map(msg => ({
                        sender: msg.sender,
                        message: msg.message
                    })) || [];
                    
                    const response = await fetch('/ask', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            question: message,
                            chatHistory: chatHistory
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(await response.text());
                    }
                    
                    const data = await response.json();
                    chatbox.removeChild(typingIndicator);
                    addMessage(data.answer, 'bot', false); // Don't save bot responses to history
                    
                } catch (error) {
                    chatbox.removeChild(typingIndicator);
                    addMessage('Sorry, something went wrong. Please try again.', 'bot', false);
                    console.error('Error:', error);
                }
            }

            // New chat button
            newChatBtn.addEventListener('click', () => {
                currentChatId = Date.now();
                chatbox.innerHTML = '';
                showWelcomeMessage();
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('active');
                }
            });

            // Event listeners
            sendButton.addEventListener('click', sendMessage);
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth < 768 && 
                    !sidebar.contains(e.target) && 
                    e.target !== mobileMenuBtn) {
                    sidebar.classList.remove('active');
                }
            });

            // Initialize
            initTheme();
            loadChatHistory();
            showWelcomeMessage();
        });