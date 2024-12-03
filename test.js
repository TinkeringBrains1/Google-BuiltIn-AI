document.addEventListener("DOMContentLoaded", function () {
    const initialScreen = document.getElementById("initial-screen");
    const chatScreen = document.getElementById("chat-screen");
    const initialInput = document.getElementById("initial-input");
    const initialSendButton = document.getElementById("initial-send-button");
    const chatInput = document.getElementById("chat-input");
    const sendButton = document.getElementById("send-button");
    const chatContainer = document.getElementById("chat-container");
    const menuButton = document.getElementById("menu-button");
    const settingsDropdown = document.getElementById("settings-dropdown");
    const newChatButton = document.getElementById('new-chat-button');
    const token = 'At5afRe6AJJPUzOd04mEJPuJYBY4Ino/xYWH0l289VyoqRz7huNc9AuUZZyk3WkwU1GF/WlLR5XOeGqqaW9hkQgAAAB4eyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vY29pbmtmZGZqb2lqYW1obm5nbG1kZWdnZmhsY2puYW8iLCJmZWF0dXJlIjoiQUlQcm9tcHRBUElGb3JFeHRlbnNpb24iLCJleHBpcnkiOjE3NjA0ODYzOTl9';
  
    function addTrialToken(token) {
      const tokenElement = document.createElement('meta');
      tokenElement.httpEquiv = 'origin-trial';
      tokenElement.content = token;
      document.head.appendChild(tokenElement);   
    
    }
    
    addTrialToken(token);
  
  
  
    newChatButton.addEventListener('click', () => {
      // Clear the chat container
      chatContainer.innerHTML = '';
    
      // Switch back to the initial screen
      chatScreen.classList.add('hidden');
      initialScreen.classList.remove('hidden');
    
      // Reset the input fields
      initialInput.value = '';
      chatInput.value = '';
    });
      // Function to save chat history to local storage
    function saveChatHistory(history) {
      localStorage.setItem('chatHistory', JSON.stringify(history));
    }
  
    // Function to load chat history from local storage
    function loadChatHistory() {
      const history = localStorage.getItem('chatHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        parsedHistory.forEach(message => {
          addMessage(message.sender, message.text);
        });
      }
    }
  
    // Function to clear chat history
    function clearChatHistory() {
      localStorage.removeItem('chatHistory');
    }
  
    // ... other event listeners and functions ...
  
    // Load the chat history on page load
    window.addEventListener('load', () => {
      loadChatHistory();
    });
  
    // Clear the chat history when the browser window is closed
    window.addEventListener('beforeunload', () => {
      clearChatHistory();
    });
  
    // Function to switch to the chat screen with the user's initial message
    function switchToChatScreenWithMessage(message) {
      initialScreen.classList.add("hidden");
      chatScreen.classList.remove("hidden");
      addMessage("user", message);
      chatInput.value = ""; // Clear the input field on the chat screen
      chatInput.focus();
      fetchResponse(message);
    }
  
    initialSendButton.addEventListener("click", () => {
      const userMessage = initialInput.value.trim();
      if (userMessage) {
        switchToChatScreenWithMessage(userMessage);
        initialInput.value = ""; // Clear the initial input field
      }
    });
  
    sendButton.addEventListener("click", () => {
      const userMessage = chatInput.value.trim();
      if (userMessage) {
        addMessage("user", userMessage);
        chatInput.value = "";
        fetchResponse(userMessage);
      }
    });
  
    // Enable "Enter" key to submit messages in both input fields
    initialInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const userMessage = initialInput.value.trim();
        if (userMessage) {
          switchToChatScreenWithMessage(userMessage);
          initialInput.value = ""; // Clear the initial input field
        }
      }
    });
  
    chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const userMessage = chatInput.value.trim();
        if (userMessage) {
          addMessage("user", userMessage);
          chatInput.value = "";
          fetchResponse(userMessage);
        }
      }
    });
  
    // Function to add a message to the chat container
    function addMessage(sender, text) {
      const message = document.createElement("div");
      message.className = `message ${sender}`;
      message.textContent = text;
      chatContainer.appendChild(message);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  
    // Function to fetch a response from the backend API
    function fetchResponse(userMessage) {
      addMessage("bot", "Thinking...");
      fetch("http://localhost:3000/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: userMessage })
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        chatContainer.removeChild(chatContainer.lastChild); // Remove "Thinking..." message
        addMessage("bot", data.response); // Adjust based on your backend response structure
      })
      .catch((error) => {
        console.error("Error fetching response:", error);
        chatContainer.removeChild(chatContainer.lastChild); // Remove "Thinking..." message
        addMessage("bot", "Sorry, there was an error processing your request. Please try again later.");
      });
    }
  
    
    // Handle the menu button click
    menuButton.addEventListener('click', () => {
      settingsDropdown.classList.toggle('hidden');
  
      const rect = menuButton.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
  
      settingsDropdown.style.top = `${rect.bottom}px`;
      settingsDropdown.style.left = `${windowWidth - settingsDropdown.offsetWidth}px`;
      
      // Adjust top position to avoid overflow
      if (rect.bottom + settingsDropdown.offsetHeight > windowHeight) {
        settingsDropdown.style.top = `${rect.top - settingsDropdown.offsetHeight}px`;
      }
    });
  
  });
  
  
  