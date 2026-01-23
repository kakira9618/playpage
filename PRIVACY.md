# PlayPage Privacy Policy

_Last updated: January 22, 2026_

## 1. What we collect
- **Page content you choose to process**: When you click “生成 / Generate”, the extension captures the HTML of the page you are viewing (trimmed to ~260 KB if very large) and sends it to the selected model provider (Gemini API or Vertex AI) to generate an app.
- **Extension settings**: API keys, model names, prompts, language, and per-site prompt settings are stored locally in `chrome.storage.local`.
- **Generated artifacts**: Generated app HTML, description, and history are stored locally in `chrome.storage.local`.

## 2. How we use the data
- Page HTML is used **only to request model output** from the selected provider and is not stored or transmitted elsewhere by the extension.
- Settings and history stay on your device unless you explicitly export them.

## 3. Where data goes
- Page HTML is sent over HTTPS to Google’s Gemini API (`api.google.dev`) or Vertex AI (`*.aiplatform.googleapis.com`) depending on your provider choice.
- No other third parties receive your data.

## 4. Retention
- The extension does not retain page HTML after the model call completes.
- Settings and generation history remain in your browser until you delete or reset them (Options → データ管理 / Data Management).

## 5. Your choices
- You must give one-time consent before any page HTML is sent. You can review or reset this consent in Options.
- You may clear generation history or all stored data from Options at any time.

## 6. Security
- Requests are sent via HTTPS. App code runs in a sandboxed iframe with a restrictive Content Security Policy.

## 7. Contact
- For questions or issues, please open an issue in the repository.
