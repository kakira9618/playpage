// PlayPage background (MV3 Service Worker)
const SETTINGS_KEY = "vm_settings_v1";
const PDF_BYTE_LIMIT = 10 * 1024 * 1024; // 10MB safety cap for inline PDF

function storageGet(key) {
  return new Promise((resolve) => chrome.storage.local.get([key], resolve));
}

async function fetchPdfBinary(url, maxBytes = PDF_BYTE_LIMIT) {
  const resp = await fetch(url, { credentials: "include" });
  if (!resp.ok) {
    throw new Error(`Failed to fetch PDF (HTTP ${resp.status})`);
  }

  const mimeType = resp.headers.get("content-type") || "application/pdf";
  const contentLength = Number(resp.headers.get("content-length")) || 0;
  if (contentLength && contentLength > maxBytes) {
    throw new Error(
      `PDF too large: ${(contentLength / (1024 * 1024)).toFixed(1)}MB (limit ${(maxBytes / (1024 * 1024)).toFixed(1)}MB)`
    );
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    const buf = await resp.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      throw new Error(
        `PDF too large: ${(buf.byteLength / (1024 * 1024)).toFixed(1)}MB (limit ${(maxBytes / (1024 * 1024)).toFixed(1)}MB)`
      );
    }
    return { buffer: buf, mimeType, size: buf.byteLength };
  }

  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      throw new Error(
        `PDF too large: ${(received / (1024 * 1024)).toFixed(1)}MB (limit ${(maxBytes / (1024 * 1024)).toFixed(1)}MB)`
      );
    }
    chunks.push(value);
  }

  const all = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { buffer: all.buffer, mimeType, size: received };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function extractCandidateText(apiJson) {
  const parts = apiJson?.candidates?.[0]?.content?.parts || [];
  const texts = parts.map((p) => p?.text).filter(Boolean);
  return texts.join("\n").trim();
}

function safeParseVisualizerJson(text) {
  // 1) strict JSON
  try {
    return JSON.parse(text);
  } catch {}

  // 2) fenced ```json ... ```
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1]);
    } catch {}
  }

  // 3) last {...}
  const lastObj = text.match(/\{[\s\S]*\}\s*$/);
  if (lastObj?.[0]) {
    try {
      return JSON.parse(lastObj[0]);
    } catch {}
  }

  // 4) if it looks like HTML, treat as html
  if (/^\s*</.test(text)) {
    return { title: "", html: text };
  }

  return null;
}

async function callGeminiGenerateContent({
  provider,
  apiKey,
  model,
  promptText,
  projectId,
  location,
  accessToken,
  attachments
}) {
  // Determine endpoint based on provider
  let url;
  if (provider === "vertex-express") {
    // Vertex AI Express Mode endpoint - requires publishers/google/models/ prefix
    url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
  } else if (provider === "vertex-standard") {
    // Vertex AI Standard endpoint - requires project ID and location
    if (!projectId || !location) {
      throw new Error("Project ID and Location are required for Vertex AI Standard");
    }
    url = `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
  } else {
    // Default to Gemini API endpoint
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;
  }

  // Build content parts (optional inline attachments + text prompt)
  const parts = [];
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      if (!att?.data) continue;
      parts.push({
        inlineData: {
          mimeType: att.mimeType || "application/octet-stream",
          data: att.data
        }
      });
    }
  }
  parts.push({ text: promptText });

  // Structured Output (REST): camelCase keys
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          html: { type: "string" },
          description: { type: "string" }
        },
        required: ["html"],
        additionalProperties: false
      },
      temperature: 1.0,
      maxOutputTokens: 32768
    }
  };

  const bodyString = JSON.stringify(body);

  // Build headers based on provider
  const headers = {
    "Content-Type": "application/json"
  };

  if (provider === "vertex-standard") {
    // Use OAuth access token for Vertex AI Standard
    if (!accessToken) {
      throw new Error("Access token is required for Vertex AI Standard");
    }
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else {
    // Use API key for Gemini API and Vertex AI Express Mode
    headers["x-goog-api-key"] = apiKey;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: headers,
    body: bodyString
  });

  // Check if response is ok before trying to parse JSON
  if (!resp.ok) {
    const responseText = await resp.text();
    console.error("API Error Response:", responseText);
    throw new Error(`API error (${resp.status}): ${responseText.substring(0, 500)}`);
  }

  // Try to parse JSON, with better error handling
  let apiJson;
  try {
    const responseText = await resp.text();
    apiJson = JSON.parse(responseText);
  } catch (e) {
    console.error("JSON parse error:", e);
    throw new Error(`Failed to parse API response as JSON: ${e.message}`);
  }

  const text = extractCandidateText(apiJson);
  if (!text) throw new Error("API response missing candidate text");

  return { text };
}

// アイコンクリック時の処理
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  // content scriptが注入されているか確認し、なければ注入
  try {
    // i18n.jsとcontent.jsを順番に注入
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["i18n.js", "content.js"]
    });
  } catch (e) {
    // 既に注入済みの場合はエラーになることがあるので無視
  }

  // content scriptにトグルメッセージを送信
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANE" });
  } catch (e) {
    console.warn("Failed to send TOGGLE_PANE message:", e);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "OPEN_OPTIONS") {
        await chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return;
      }

      if (msg?.type === "PING_GEMINI") {
        const provider = msg.provider || "gemini-api";
        let callParams = {
          provider,
          model: msg.model,
          promptText: 'Return JSON only. {"title":"","html":"<!doctype html><html><body>ok</body></html>"}'
        };

        if (provider === "vertex-standard") {
          const got = await storageGet(SETTINGS_KEY);
          const s = got[SETTINGS_KEY] || {};
          callParams.projectId = s.vertexProjectId;
          callParams.location = s.vertexLocation;
          callParams.accessToken = s.vertexAccessToken;

          // Check token expiry
          if (!callParams.accessToken || Date.now() >= (s.vertexTokenExpiry || 0)) {
            throw new Error("Access token expired. Please re-authenticate.");
          }
        } else {
          callParams.apiKey = msg.apiKey;
        }

        const { text } = await callGeminiGenerateContent(callParams);
        const parsed = safeParseVisualizerJson(text);
        if (!parsed?.html) throw new Error("Ping failed: missing html");
        sendResponse({ ok: true });
        return;
      }

      if (msg?.type === "GENERATE_VISUALIZER") {
        const got = await storageGet(SETTINGS_KEY);
        const s = got[SETTINGS_KEY] || {};
        const provider = s.provider || "gemini-api";

        let callParams = {
          provider,
          promptText: msg.promptText
        };

        if (provider === "gemini-api") {
          callParams.apiKey = s.apiKey;
          callParams.model = s.model || "gemini-3-pro-preview";
          if (!callParams.apiKey) throw new Error("API Key is not set. Open extension options.");
        } else if (provider === "vertex-express") {
          callParams.apiKey = s.vertexApiKey;
          callParams.model = s.vertexModel || "gemini-3-pro-preview";
          if (!callParams.apiKey) throw new Error("API Key is not set. Open extension options.");
        } else if (provider === "vertex-standard") {
          callParams.projectId = s.vertexProjectId;
          callParams.location = s.vertexLocation;
          callParams.accessToken = s.vertexAccessToken;
          callParams.model = s.vertexStandardModel || "gemini-2.5-pro";

          // Check token expiry
          if (!callParams.accessToken || Date.now() >= (s.vertexTokenExpiry || 0)) {
            throw new Error("Access token expired. Please re-authenticate in Options.");
          }
        }

        if (msg?.pdf?.url) {
          const pdfData = await fetchPdfBinary(msg.pdf.url, PDF_BYTE_LIMIT);
          callParams.attachments = [
            {
              mimeType: msg.pdf.contentType || pdfData.mimeType || "application/pdf",
              data: arrayBufferToBase64(pdfData.buffer)
            }
          ];
        }

        const { text } = await callGeminiGenerateContent(callParams);

        const parsed = safeParseVisualizerJson(text);
        if (!parsed?.html) {
          const head = text.slice(0, 700);
          throw new Error(
            `API output is not valid {"html":...} JSON. First 700 chars:\n${head}`
          );
        }

        sendResponse({ ok: true, provider, model: callParams.model, data: parsed });
        return;
      }

      if (msg?.type === "OPEN_PRIVACY") {
        const lang = msg.lang || "ja";
        const file = lang === "ja" ? "privacy.html" : "privacy-en.html";
        const url = chrome.runtime.getURL(file);
        await chrome.tabs.create({ url });
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true; // keep channel open for async
});
