// Listen for messages and process only those from the trusted origin
window.addEventListener("message", (event) => {
  if (event.origin === "https://trusted-site.com") {
    // Process allowed messages here
    console.log("Message received:", event.data);
  } else {
    console.warn("Blocked unauthorized message:", event.data);
  }
});

// Function to check if the current page is blacklisted
function checkBlacklist() {
  chrome.storage.local.get('blacklist', ({ blacklist = [] }) => {
    const currentUrl = window.location.href;

    if (blacklist.includes(currentUrl)) {
      console.log(`This page is blacklisted: ${currentUrl}`);
      // Optional: Add action, e.g., redirect or show a warning
    }
  });
}

// Run the blacklist check when the content script is loaded
document.addEventListener("DOMContentLoaded", checkBlacklist);
