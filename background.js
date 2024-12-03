// Utility function for encryption and decryption
const cryptoUtils = {
    key: null,

    async generateKey() {
        if (!this.key) {
            this.key = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
        }
        return this.key;
    },

    async encrypt(data) {
        const key = await this.generateKey();
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
        const encodedData = new TextEncoder().encode(JSON.stringify(data));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            encodedData
        );
        return {
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encrypted)),
        };
    },

    async decrypt(encrypted) {
        const key = await this.generateKey();
        const iv = new Uint8Array(encrypted.iv);
        const encryptedData = new Uint8Array(encrypted.data);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedData
        );
        return JSON.parse(new TextDecoder().decode(decrypted));
    },
};

// Utility function to send scan requests
const sendScanRequest = async (endpoint, data) => {
    try {
        const response = await fetch(`http://127.0.0.1:5000/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return response.json();
    } catch (error) {
        console.error(`Error sending scan request to ${endpoint}:`, error);
        return { blocked: false }; // Default to not blocked on error
    }
};

// Utility function to show notifications
const showNotification = (title, message) => {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: title,
        message: message,
    });
};

// Monitor file downloads and scan
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    console.log("Download detected:", downloadItem);

    const result = await sendScanRequest("scan-file", {
        fileName: downloadItem.filename,
        url: downloadItem.finalUrl,
    });

    if (result.blocked) {
        showNotification("Threat Detected", `The file ${downloadItem.filename} was blocked.`);
        console.warn(`Blocked download: ${downloadItem.filename}`);
    }
});

// Intercept HTTP requests and scan URLs
chrome.webRequest.onBeforeRequest.addListener(
    async (details) => {
        const encryptedData = await cryptoUtils.decrypt(await chrome.storage.sync.get("encryptedBlacklist"));
        const blacklist = encryptedData.blacklist || [];
        const requestUrl = new URL(details.url);

        // Check against the blacklist first
        if (blacklist.includes(requestUrl.hostname)) {
            console.warn(`Blocked request to blacklisted domain: ${details.url}`);
            showNotification("Threat Detected", `The website ${details.url} was blocked.`);
            return { cancel: true };
        }

        // If not blacklisted, scan the URL
        const result = await sendScanRequest("scan-url", { url: details.url });

        if (result.blocked) {
            showNotification("Threat Detected", `The website ${details.url} was blocked.`);
            console.warn(`Blocked request to malicious URL: ${details.url}`);
            return { cancel: true };
        }

        return { cancel: false };
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);

// Initialize storage with encrypted whitelist and blacklist
(async () => {
    const data = await chrome.storage.sync.get("encryptedBlacklist");
    if (!data.encryptedBlacklist) {
        const defaultData = {
            whitelist: ["example.com"],
            blacklist: ["bad-site.com"],
        };
        const encrypted = await cryptoUtils.encrypt(defaultData);
        await chrome.storage.sync.set({ encryptedBlacklist: encrypted });
        console.log("Initialized encrypted storage with default data.");
    }
})();

