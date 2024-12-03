from flask import Flask, request, jsonify
from cryptography.fernet import Fernet
import requests
import os
from urllib.parse import urlparse

app = Flask(__name__)

# Configure API keys
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY", "a787fbe684f445cea433dd89b18a137db35130f05981bee390d4dd7319ac2382")
GOOGLE_SAFE_BROWSING_API_KEY = os.getenv("GOOGLE_SAFE_BROWSING_API_KEY", "AIzaSyBTlMy6PUd2qNctm4qriJzniSHs_IL0qz4")
CHROME_EXTENSION_SECRET = os.getenv("CHROME_EXTENSION_SECRET", "shared_secret_with_extension")  # Shared secret

# Encryption key setup (should be stored securely in production)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
cipher = Fernet(ENCRYPTION_KEY.encode())

# API URLs
VIRUSTOTAL_FILE_SCAN_URL = "https://www.virustotal.com/api/v3/files"
VIRUSTOTAL_URL_SCAN_URL = "https://www.virustotal.com/api/v3/urls"
GOOGLE_SAFE_BROWSING_API_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

# Utility: Validate URL format
def is_valid_url(url):
    try:
        parsed = urlparse(url)
        return bool(parsed.netloc) and bool(parsed.scheme)
    except Exception:
        return False

# Utility: Encrypt data
def encrypt_data(data):
    """Encrypts data using AES encryption."""
    encoded_data = str(data).encode()
    return cipher.encrypt(encoded_data).decode()

# Utility: Decrypt data
def decrypt_data(encrypted_data):
    """Decrypts data using AES encryption."""
    decrypted_data = cipher.decrypt(encrypted_data.encode()).decode()
    return eval(decrypted_data)

# Scan file using VirusTotal
@app.route('/scan-file', methods=['POST'])
def scan_file():
    try:
        data = request.json
        file_url = data.get('url')

        if not file_url or not is_valid_url(file_url):
            return jsonify({"error": "Invalid or missing 'url' field"}), 400

        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        response = requests.post(
            VIRUSTOTAL_URL_SCAN_URL,
            headers=headers,
            data={"url": file_url}
        )

        if response.status_code == 200:
            result = response.json()
            malicious = any(
                item.get('category') == 'malicious'
                for item in result.get("data", {}).get("attributes", {}).get("last_analysis_results", {}).values()
            )
            return jsonify({"blocked": malicious})
        else:
            app.logger.error(f"VirusTotal API error: {response.status_code}, {response.text}")
            return jsonify({"error": "VirusTotal API error"}), response.status_code
    except Exception as e:
        app.logger.error(f"Error in /scan-file: {e}")
        return jsonify({"error": str(e)}), 500

# Scan URL using VirusTotal and Google Safe Browsing
@app.route('/scan-url', methods=['POST'])
def scan_url():
    try:
        data = request.json
        url = data.get('url')

        if not url or not is_valid_url(url):
            return jsonify({"error": "Invalid or missing 'url' field"}), 400

        # Scan URL with VirusTotal
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        vt_response = requests.post(
            VIRUSTOTAL_URL_SCAN_URL,
            headers=headers,
            data={"url": url}
        )
        vt_result = vt_response.json() if vt_response.status_code == 200 else {}
        vt_malicious = any(
            item.get('category') == 'malicious'
            for item in vt_result.get("data", {}).get("attributes", {}).get("last_analysis_results", {}).values()
        )

        # Scan URL with Google Safe Browsing
        gsb_payload = {
            "client": {"clientId": "your-app-name", "clientVersion": "1.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }
        gsb_response = requests.post(
            GOOGLE_SAFE_BROWSING_API_URL,
            params={"key": GOOGLE_SAFE_BROWSING_API_KEY},
            json=gsb_payload
        )
        gsb_result = gsb_response.json() if gsb_response.status_code == 200 else {}
        gsb_malicious = "matches" in gsb_result

        # Combine results
        blocked = vt_malicious or gsb_malicious
        return jsonify({
            "blocked": blocked,
            "virus_total": vt_malicious,
            "google_safe_browsing": gsb_malicious
        })
    except Exception as e:
        app.logger.error(f"Error in /scan-url: {e}")
        return jsonify({"error": str(e)}), 500

# Securely store and retrieve user data
@app.route('/store-data', methods=['POST'])
def store_data():
    try:
        data = request.json
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid data format. Expected JSON object"}), 400

        encrypted_data = encrypt_data(data)
        with open("user_data.enc", "w") as file:
            file.write(encrypted_data)
        return jsonify({"message": "Data stored securely"})
    except Exception as e:
        app.logger.error(f"Error in /store-data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/retrieve-data', methods=['GET'])
def retrieve_data():
    try:
        with open("user_data.enc", "r") as file:
            encrypted_data = file.read()
        decrypted_data = decrypt_data(encrypted_data)
        return jsonify(decrypted_data)
    except FileNotFoundError:
        return jsonify({"error": "No data found"}), 404
    except Exception as e:
        app.logger.error(f"Error in /retrieve-data: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,use_reloader='watchdog')
