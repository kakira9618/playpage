# PlayPage Privacy Policy (English)

*Last updated: January 22, 2026*

**Note:** If there is any inconsistency between this English version and the Japanese version, the Japanese version prevails.

## 1. What we collect

- **Page content you choose to process**: When you click "生成 / Generate", the extension captures the HTML of the page you are viewing (trimmed if very large) and sends it to the selected provider (Gemini API or Vertex AI) to generate an app.
- **Extension settings**: API keys, model names, prompts, language, and per-site prompt settings are stored locally in `chrome.storage.local`.
- **Generated artifacts**: Generated app HTML, description, and history are stored locally in `chrome.storage.local`.

## 2. How we use the data

- Page HTML is used only for the model request to the selected provider; the extension does not otherwise store or share it.
- Settings and history stay on your device unless you explicitly export them.

## 3. Where data goes

- Page HTML is sent over HTTPS to Google's Gemini API (`api.google.dev`) or Vertex AI (`*.aiplatform.googleapis.com`), depending on your provider choice.
- No other third parties receive your data.

## 4. Retention

- The extension does not retain page HTML after the model call completes.
- Settings and generation history remain in your browser until you delete or reset them (Options → Data Management).

## 5. Your choices

- We ask for your consent once before sending page HTML. You can review or reset this consent in Options.
- You may delete generation history or all stored data from Options at any time.

## 6. Security

- Requests use HTTPS. Generated code runs inside a sandboxed `iframe` under a restrictive Content Security Policy.

## 7. Contact

For questions or issues, contact: [@kakira9618](https://x.com/kakira9618).
