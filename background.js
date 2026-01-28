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

// Gemini API料金レート (per million tokens)
// Note: Vertex AI Express Mode and Standard use the same pricing as Gemini API
const PRICING_RATES = {
  // Gemini 2.5 Pro
  "gemini-2.5-pro": {
    input: { threshold: 200000, low: 1.25, high: 2.50 },
    output: { threshold: 200000, low: 10.00, high: 15.00 }
  },
  // Gemini 2.5 Flash
  "gemini-2.5-flash": {
    input: { default: 0.30, audio: 1.00 },
    output: { default: 2.50 }
  },
  // Gemini 2.5 Flash-Lite
  "gemini-2.5-flash-lite": {
    input: { default: 0.10, audio: 0.30 },
    output: { default: 0.40 }
  },
  // Gemini 3 Pro プレビュー
  "gemini-3-pro-preview": {
    input: { threshold: 200000, low: 2.00, high: 4.00 },
    output: { threshold: 200000, low: 12.00, high: 18.00 }
  },
  // Gemini 3 Flash プレビュー
  "gemini-3-flash-preview": {
    input: { default: 0.50, audio: 1.00 },
    output: { default: 3.00 }
  },
  // Gemini 2.0 Flash
  "gemini-2.0-flash": {
    input: { default: 0.10, audio: 0.70 },
    output: { default: 0.40 }
  },
  // Gemini 2.0 Flash Lite
  "gemini-2.0-flash-lite": {
    input: { default: 0.075, audio: 0.075 },
    output: { default: 0.30 }
  }
};

function calculateCost(model, inputTokens, outputTokens, modalityDetails = null) {
  const rates = PRICING_RATES[model];
  if (!rates) {
    // 未知のモデルの場合はGemini 2.5 Flashの料金を使用
    return calculateCost("gemini-2.5-flash", inputTokens, outputTokens, modalityDetails);
  }

  let inputCost = 0;
  let outputCost = 0;

  // 入力トークンのコスト計算
  if (rates.input.threshold !== undefined) {
    // 閾値ベースの料金（例: ≤200K tokens = 低料金, >200K = 高料金）
    // このタイプのモデル（Proなど）はmodality関係なく同じ料金
    if (inputTokens <= rates.input.threshold) {
      inputCost = (inputTokens / 1000000) * rates.input.low;
    } else {
      inputCost = (inputTokens / 1000000) * rates.input.high;
    }
  } else {
    // 固定料金モデル（Flash系）: modalityDetailsがあれば詳細計算
    if (modalityDetails?.promptTokensDetails && Array.isArray(modalityDetails.promptTokensDetails)) {
      // Modality別に計算
      for (const detail of modalityDetails.promptTokensDetails) {
        const modality = detail.modality || "TEXT";
        const tokenCount = detail.tokenCount || 0;

        // AUDIO のみ特別料金、それ以外（TEXT/IMAGE/VIDEO）は default
        if (modality === "AUDIO") {
          const audioRate = rates.input.audio || rates.input.default || 0;
          inputCost += (tokenCount / 1000000) * audioRate;
        } else {
          // TEXT, IMAGE, VIDEO は同じ料金
          const defaultRate = rates.input.default || 0;
          inputCost += (tokenCount / 1000000) * defaultRate;
        }
      }
    } else {
      // modalityDetailsがない場合は従来通りの計算
      inputCost = (inputTokens / 1000000) * (rates.input.default || 0);
    }
  }

  // 出力トークンのコスト計算
  // Note: 出力トークンの料金階層も入力トークン数（プロンプトサイズ）に基づいて決まる
  if (rates.output.threshold !== undefined) {
    // 閾値ベースの料金（入力トークン数に基づく）
    if (inputTokens <= rates.output.threshold) {
      outputCost = (outputTokens / 1000000) * rates.output.low;
    } else {
      outputCost = (outputTokens / 1000000) * rates.output.high;
    }
  } else {
    // 固定料金
    outputCost = (outputTokens / 1000000) * (rates.output.default || 0);
  }

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    // デバッグ用：modality別の詳細も返す
    modalityBreakdown: modalityDetails?.promptTokensDetails || null
  };
}

function safeParseAppJson(text) {
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

  // トークン使用情報を抽出
  const usageMetadata = apiJson?.usageMetadata || {};
  const inputTokens = usageMetadata.promptTokenCount || 0;
  const outputTokens = usageMetadata.candidatesTokenCount || 0;
  const totalTokens = usageMetadata.totalTokenCount || (inputTokens + outputTokens);

  // Modality別の詳細を抽出（利用可能な場合）
  const modalityDetails = {
    promptTokensDetails: usageMetadata.promptTokensDetails || null,
    candidatesTokensDetails: usageMetadata.candidatesTokensDetails || null
  };

  // コスト計算（modality詳細を渡す）
  const costInfo = calculateCost(model, inputTokens, outputTokens, modalityDetails);

  return {
    text,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
      ...costInfo
    }
  };
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
        const parsed = safeParseAppJson(text);
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

        const { text, usage } = await callGeminiGenerateContent(callParams);

        const parsed = safeParseAppJson(text);
        if (!parsed?.html) {
          const head = text.slice(0, 700);
          throw new Error(
            `API output is not valid {"html":...} JSON. First 700 chars:\n${head}`
          );
        }

        sendResponse({ ok: true, provider, model: callParams.model, data: parsed, usage });
        return;
      }

      if (msg?.type === "OPEN_PRIVACY") {
        const lang = msg.lang || "ja";
        const url = lang === "ja"
          ? "https://github.com/kakira9618/playpage/blob/master/PRIVACY.md"
          : "https://github.com/kakira9618/playpage/blob/master/PRIVACY_EN.md";
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
