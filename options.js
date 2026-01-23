const STORAGE_KEY = "vm_settings_v1";
const STORE_PREFIX = "vm_store_v1";
const COST_HISTORY_KEY = "vm_cost_history_v1";
const VERTEX_SCOPE = "https://www.googleapis.com/auth/cloud-platform.read-only";

// Current language (will be set on load)
let currentLang = "ja";

// Site prompts data
let sitePrompts = [];

function storageGet(key) {
  return new Promise((resolve) => chrome.storage.local.get([key], resolve));
}
function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

// i18n helper
function t(key, params = {}) {
  return window.I18N.getMessage(currentLang, key, params);
}

function formatDateTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(currentLang === "ja" ? "ja-JP" : "en-US", {
      timeZone: currentLang === "ja" ? "Asia/Tokyo" : "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

// コスト履歴を取得
async function getCostHistory() {
  const got = await storageGet(COST_HISTORY_KEY);
  return got[COST_HISTORY_KEY] || { history: [] };
}

// 月ごとの累計コストを計算
async function getMonthlyTotals() {
  const costHistory = await getCostHistory();
  const monthlyCosts = {};

  for (const record of costHistory.history) {
    const date = new Date(record.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyCosts[monthKey]) {
      monthlyCosts[monthKey] = {
        totalCost: 0,
        totalTokens: 0,
        count: 0
      };
    }

    monthlyCosts[monthKey].totalCost += record.totalCost || 0;
    monthlyCosts[monthKey].totalTokens += record.totalTokens || 0;
    monthlyCosts[monthKey].count++;
  }

  return monthlyCosts;
}

// 月間累計コスト表示を更新
async function updateMonthlyCostDisplay() {
  const el = document.getElementById("monthlyCostDisplay");
  if (!el) return;

  const monthlyCosts = await getMonthlyTotals();
  const months = Object.keys(monthlyCosts).sort().reverse();

  if (months.length === 0) {
    el.innerHTML = `<div style="color:#666; font-size:13px;">${t("options.noCostHistory")}</div>`;
    return;
  }

  // 当月を強調表示
  const currentMonth = new Date();
  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

  // 当月のデータを取得
  const currentMonthData = monthlyCosts[currentMonthKey];
  const currentMonthLabel = currentLang === "ja"
    ? `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`
    : `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

  let html = `<div style="font-size:13px; line-height:1.7;">`;

  // 当月のサマリー表示
  if (currentMonthData) {
    html += `<div style="padding:12px; background:rgba(0, 96, 206, 0.08); border:1px solid rgba(0, 96, 206, 0.2); border-radius:6px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:600;">${currentMonthLabel}</span>
        <span style="font-weight:600; color:#0060CE; font-size:16px;">$${currentMonthData.totalCost.toFixed(6)}</span>
      </div>
      <div style="font-size:12px; color:#666;">
        <div>${t("options.requestCount")}: ${currentMonthData.count}${currentLang === "ja" ? "回" : ""}</div>
        <div>${t("options.totalTokens")}: ${currentMonthData.totalTokens.toLocaleString()}</div>
        <div>${t("options.avgCostPerRequest")}: $${(currentMonthData.totalCost / currentMonthData.count).toFixed(6)}</div>
      </div>
    </div>`;
  }

  // 過去の月の折りたたみ
  const pastMonths = months.filter(m => m !== currentMonthKey);
  if (pastMonths.length > 0) {
    html += `<details style="margin-top:12px;">
      <summary style="
        padding:8px 12px;
        background:#f8f9fa;
        border:1px solid #e8e8e8;
        border-radius:6px;
        cursor:pointer;
        font-weight:500;
      ">
        ${currentLang === "ja" ? `過去の月 (${pastMonths.length}ヶ月分)` : `Past Months (${pastMonths.length})`}
      </summary>
      <div style="margin-top:8px;">`;

    for (const month of pastMonths) {
      const data = monthlyCosts[month];
      const [year, monthNum] = month.split("-");
      const monthLabel = currentLang === "ja"
        ? `${year}年${parseInt(monthNum)}月`
        : `${year}-${monthNum}`;

      html += `<details style="margin-bottom:4px;">
        <summary style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:8px 12px;
          background:#f8f9fa;
          border-radius:6px;
          border:1px solid #e8e8e8;
          cursor:pointer;
        ">
          <span style="font-weight:500; text-align:left;">${monthLabel}</span>
          <span style="font-weight:600; color:#0060CE; margin-left:auto;">$${data.totalCost.toFixed(6)}</span>
        </summary>
        <div style="padding:8px 12px; font-size:12px; color:#666;">
          <div>${t("options.requestCount")}: ${data.count}${currentLang === "ja" ? "回" : ""}</div>
          <div>${t("options.totalTokens")}: ${data.totalTokens.toLocaleString()}</div>
          <div>${t("options.avgCostPerRequest")}: $${(data.totalCost / data.count).toFixed(6)}</div>
        </div>
      </details>`;
    }

    html += `</div></details>`;
  }

  html += `<div style="margin-top:12px; padding-top:12px; border-top:1px solid #e8e8e8; color:#666; font-size:12px;">`;
  html += t("options.costEstimateNote");
  html += `</div>`;

  html += `</div>`;
  el.innerHTML = html;
}

// Update all UI text based on current language
function updateUIText() {
  // Update elements with data-i18n attribute (text content)
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  // Update elements with data-i18n-html attribute (inner HTML)
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    el.innerHTML = t(key);
  });

  // Update title
  document.title = t("options.title");

  // Update html lang attribute
  document.documentElement.lang = currentLang === "ja" ? "ja" : "en";

  // Update API key help link based on language
  const apiKeyHelpLink = document.getElementById("apiKeyHelpLink");
  if (apiKeyHelpLink) {
    apiKeyHelpLink.href = currentLang === "ja"
      ? "https://ai.google.dev/gemini-api/docs/api-key?hl=ja"
      : "https://ai.google.dev/gemini-api/docs/api-key";
  }
}

function setStatus(msg, cls) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = cls || "";
}

// Get default prompt for AtCoder
function getDefaultAtCoderPrompt(lang) {
  return window.I18N.getDefaultPrompt(lang, "atcoder");
}

// Generate unique ID for site prompts
function generateId() {
  return `site_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

// Create default site prompts with AtCoder
function getDefaultSitePrompts() {
  return [
    {
      id: "atcoder",
      url: "https://atcoder.jp/",
      promptJa: window.I18N.getDefaultPrompt("ja", "atcoder"),
      promptEn: window.I18N.getDefaultPrompt("en", "atcoder")
    }
  ];
}

// Render site prompts UI
function renderSitePrompts() {
  const container = document.getElementById("sitePromptsContainer");
  if (!container) return;

  container.innerHTML = "";

  sitePrompts.forEach((site, index) => {
    const item = document.createElement("div");
    item.className = "site-prompt-item";
    item.dataset.siteId = site.id;

    const promptKey = currentLang === "ja" ? "promptJa" : "promptEn";
    const prompt = site[promptKey] || "";

    item.innerHTML = `
      <div class="site-url-row">
        <label style="font-weight: 600; min-width: 80px;">${t("options.siteUrl")}</label>
        <input type="text" class="site-url-input" value="${escapeHtml(site.url)}" placeholder="${t("options.siteUrlPlaceholder")}">
        <button class="remove-site-btn" data-index="${index}">${t("options.removeSite")}</button>
      </div>
      <div style="margin-bottom: 4px;">
        <label style="font-weight: 600;">${t("options.sitePrompt")}</label>
      </div>
      <textarea class="site-prompt-textarea" rows="8" placeholder="${t("options.sitePrompt")}">${escapeHtml(prompt)}</textarea>
      <button class="reset-btn reset-site-prompt-btn" data-index="${index}">${t("options.resetDefault")}</button>
    `;

    container.appendChild(item);
  });

  // Wire up event listeners
  container.querySelectorAll(".remove-site-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      removeSitePrompt(index);
    });
  });

  container.querySelectorAll(".reset-site-prompt-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      resetSitePromptToDefault(index);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addSitePrompt() {
  const newSite = {
    id: generateId(),
    url: "",
    promptJa: "",
    promptEn: ""
  };
  sitePrompts.push(newSite);
  renderSitePrompts();
}

function removeSitePrompt(index) {
  sitePrompts.splice(index, 1);
  renderSitePrompts();
}

function resetSitePromptToDefault(index) {
  const site = sitePrompts[index];
  if (!site) return;

  // Check if it's AtCoder
  if (site.url.includes("atcoder.jp")) {
    const promptKey = currentLang === "ja" ? "promptJa" : "promptEn";
    site[promptKey] = window.I18N.getDefaultPrompt(currentLang, "atcoder");
    renderSitePrompts();
    setStatus(t("options.sitePromptReset"), "ok");
  } else {
    // For other sites, just clear or use generic
    const promptKey = currentLang === "ja" ? "promptJa" : "promptEn";
    site[promptKey] = "";
    renderSitePrompts();
    setStatus(t("options.sitePromptReset"), "ok");
  }
}

// Collect site prompts from UI
function collectSitePromptsFromUI() {
  const container = document.getElementById("sitePromptsContainer");
  if (!container) return;

  const items = container.querySelectorAll(".site-prompt-item");
  const promptKey = currentLang === "ja" ? "promptJa" : "promptEn";

  items.forEach((item, index) => {
    const urlInput = item.querySelector(".site-url-input");
    const promptTextarea = item.querySelector(".site-prompt-textarea");

    if (sitePrompts[index]) {
      sitePrompts[index].url = urlInput.value.trim();
      sitePrompts[index][promptKey] = promptTextarea.value;
    }
  });
}

// Update provider settings visibility
function updateProviderVisibility() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value || "gemini-api";
  const geminiSettings = document.getElementById("geminiApiSettings");
  const vertexExpressSettings = document.getElementById("vertexExpressSettings");
  const vertexStandardSettings = document.getElementById("vertexStandardSettings");

  geminiSettings.style.display = provider === "gemini-api" ? "block" : "none";
  vertexExpressSettings.style.display = provider === "vertex-express" ? "block" : "none";
  vertexStandardSettings.style.display = provider === "vertex-standard" ? "block" : "none";
}

async function load() {
  // Load language first
  currentLang = await window.I18N.getCurrentLanguage();
  document.getElementById("language").value = currentLang;
  updateUIText();

  // Load settings
  const got = await storageGet(STORAGE_KEY);
  const s = got[STORAGE_KEY] || {};

  // Load provider setting (default to gemini-api)
  const provider = s.provider || "gemini-api";
  document.getElementById("providerGeminiApi").checked = provider === "gemini-api";
  document.getElementById("providerVertexExpress").checked = provider === "vertex-express";
  document.getElementById("providerVertexStandard").checked = provider === "vertex-standard";
  updateProviderVisibility();

  // Load Gemini API settings
  document.getElementById("apiKey").value = s.apiKey || "";
  document.getElementById("model").value = s.model || "gemini-3-pro-preview";

  // Load Vertex AI Express settings
  document.getElementById("vertexApiKey").value = s.vertexApiKey || "";
  document.getElementById("vertexModel").value = s.vertexModel || "gemini-3-pro-preview";

  // Load Vertex AI Standard settings
  document.getElementById("vertexProjectId").value = s.vertexProjectId || "";
  document.getElementById("vertexLocation").value = s.vertexLocation || "us-central1";
  document.getElementById("vertexOAuthClientId").value = s.vertexOAuthClientId || "";
  document.getElementById("vertexStandardModel").value = s.vertexStandardModel || "gemini-2.5-pro";

  // Update auth status
  updateAuthStatus();

  // Display redirect URI
  updateRedirectUriDisplay();

  // Load generic prompt
  const genericPromptKey = currentLang === "ja" ? "promptBaseGenericJa" : "promptBaseGenericEn";
  const genericPrompt = s[genericPromptKey] || s.promptBaseGeneric || window.I18N.getDefaultPrompt(currentLang, "generic");
  document.getElementById("promptBaseGeneric").value = genericPrompt;

  // Load site prompts (with migration from old format)
  if (s.sitePrompts && Array.isArray(s.sitePrompts)) {
    sitePrompts = s.sitePrompts;
  } else {
    // Migrate from old AtCoder-specific format
    sitePrompts = getDefaultSitePrompts();

    // Check if there were old AtCoder prompts and migrate them
    const oldAtCoderJa = s.promptBaseAtCoderJa || s.promptBaseAtCoder || s.promptBase;
    const oldAtCoderEn = s.promptBaseAtCoderEn;

    if (oldAtCoderJa || oldAtCoderEn) {
      sitePrompts[0].promptJa = oldAtCoderJa || window.I18N.getDefaultPrompt("ja", "atcoder");
      sitePrompts[0].promptEn = oldAtCoderEn || window.I18N.getDefaultPrompt("en", "atcoder");
    }
  }

  renderSitePrompts();

  updatePrivacyUI(s);

  // 月間コスト表示を更新
  updateMonthlyCostDisplay();
}

async function save() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value || "gemini-api";
  const apiKey = document.getElementById("apiKey").value.trim();
  const model = document.getElementById("model").value.trim() || "gemini-3-pro-preview";
  const vertexApiKey = document.getElementById("vertexApiKey").value.trim();
  const vertexModel = document.getElementById("vertexModel").value.trim() || "gemini-3-pro-preview";
  const vertexProjectId = document.getElementById("vertexProjectId").value.trim();
  const vertexLocation = document.getElementById("vertexLocation").value.trim() || "us-central1";
  const vertexOAuthClientId = document.getElementById("vertexOAuthClientId").value.trim();
  const vertexStandardModel = document.getElementById("vertexStandardModel").value.trim() || "gemini-2.5-pro";
  const promptBaseGeneric = document.getElementById("promptBaseGeneric").value;

  // Collect site prompts from UI
  collectSitePromptsFromUI();

  // Get current settings to preserve other language's prompts
  const got = await storageGet(STORAGE_KEY);
  const existingSettings = got[STORAGE_KEY] || {};

  // Determine which prompt key to save based on current language
  const genericKey = currentLang === "ja" ? "promptBaseGenericJa" : "promptBaseGenericEn";

  const updatedSettings = {
    ...existingSettings,
    provider,
    apiKey,
    model,
    vertexApiKey,
    vertexModel,
    vertexProjectId,
    vertexLocation,
    vertexOAuthClientId,
    vertexStandardModel,
    [genericKey]: promptBaseGeneric,
    // Keep backward compatibility
    promptBaseGeneric: currentLang === "ja" ? promptBaseGeneric : existingSettings.promptBaseGeneric,
    // Save site prompts
    sitePrompts: sitePrompts
  };

  await storageSet({
    [STORAGE_KEY]: updatedSettings
  });
  setStatus(t("options.saved"), "ok");
  updatePrivacyUI(updatedSettings);
}

async function changeLanguage() {
  const newLang = document.getElementById("language").value;
  if (newLang === currentLang) return;

  // Save current prompts before switching
  await save();

  // Update language
  currentLang = newLang;
  await window.I18N.setCurrentLanguage(newLang);

  // Reload UI with new language
  updateUIText();

  // Reload prompts for new language
  const got = await storageGet(STORAGE_KEY);
  const s = got[STORAGE_KEY] || {};

  const genericPromptKey = currentLang === "ja" ? "promptBaseGenericJa" : "promptBaseGenericEn";
  const genericPrompt = s[genericPromptKey] || window.I18N.getDefaultPrompt(currentLang, "generic");
  document.getElementById("promptBaseGeneric").value = genericPrompt;

  // Reload site prompts (they should already be saved, but re-render with new language)
  if (s.sitePrompts && Array.isArray(s.sitePrompts)) {
    sitePrompts = s.sitePrompts;
  }
  renderSitePrompts();

  // 月間コスト表示を更新
  updateMonthlyCostDisplay();

  setStatus(t("options.saved"), "ok");
}

function resetPromptGeneric() {
  document.getElementById("promptBaseGeneric").value = window.I18N.getDefaultPrompt(currentLang, "generic");
  setPromptStatus(t("options.promptResetGeneric"), "ok");
}

function setPromptStatus(msg, cls) {
  const el = document.getElementById("promptStatus");
  if (el) {
    el.textContent = msg;
    el.className = cls || "";
  }
}

async function savePrompts() {
  // Collect site prompts from UI
  collectSitePromptsFromUI();

  const promptBaseGeneric = document.getElementById("promptBaseGeneric").value;

  // Get current settings to preserve other settings
  const got = await storageGet(STORAGE_KEY);
  const existingSettings = got[STORAGE_KEY] || {};

  // Determine which prompt key to save based on current language
  const genericKey = currentLang === "ja" ? "promptBaseGenericJa" : "promptBaseGenericEn";

  await storageSet({
    [STORAGE_KEY]: {
      ...existingSettings,
      [genericKey]: promptBaseGeneric,
      // Keep backward compatibility
      promptBaseGeneric: currentLang === "ja" ? promptBaseGeneric : existingSettings.promptBaseGeneric,
      // Save site prompts
      sitePrompts: sitePrompts
    }
  });
  setPromptStatus(t("options.saved"), "ok");
}

// OAuth authentication functions
function updateRedirectUriDisplay() {
  const redirectUri = chrome.identity.getRedirectURL();
  const displayEl = document.getElementById("redirectUriDisplay");
  if (displayEl) {
    displayEl.textContent = redirectUri;
  }
}

function copyRedirectUri() {
  const redirectUri = chrome.identity.getRedirectURL();
  navigator.clipboard.writeText(redirectUri).then(() => {
    const btn = document.getElementById("copyRedirectUri");
    const originalText = btn.textContent;
    btn.textContent = t("options.copiedToClipboard");
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error("Failed to copy:", err);
  });
}

async function updateAuthStatus() {
  const got = await storageGet(STORAGE_KEY);
  const s = got[STORAGE_KEY] || {};
  const hasToken = !!s.vertexAccessToken;
  const tokenExpiry = s.vertexTokenExpiry || 0;
  const isExpired = Date.now() >= tokenExpiry;

  const statusEl = document.getElementById("authStatus");
  const authenticateBtn = document.getElementById("authenticateButton");
  const revokeBtn = document.getElementById("revokeAuthButton");

  if (hasToken && !isExpired) {
    statusEl.textContent = t("options.authStatusAuthenticated");
    statusEl.className = "ok";
    authenticateBtn.style.display = "none";
    revokeBtn.style.display = "inline-block";
  } else {
    statusEl.textContent = t("options.authStatusNotAuthenticated");
    statusEl.className = "ng";
    authenticateBtn.style.display = "inline-block";
    revokeBtn.style.display = "none";
  }
}

async function authenticate() {
  try {
    const clientId = document.getElementById("vertexOAuthClientId").value.trim();
    if (!clientId) {
      setStatus(t("options.authFailed", { error: "OAuth Client ID is required" }), "ng");
      return;
    }

    setStatus(t("options.testing"), "");

    // Build OAuth URL
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = VERTEX_SCOPE;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    // Launch OAuth flow
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (url) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(url);
          }
        }
      );
    });

    // Parse access token from response URL
    const params = new URLSearchParams(responseUrl.split('#')[1]);
    const accessToken = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    // Save token
    const got = await storageGet(STORAGE_KEY);
    const existingSettings = got[STORAGE_KEY] || {};
    await storageSet({
      [STORAGE_KEY]: {
        ...existingSettings,
        vertexAccessToken: accessToken,
        vertexTokenExpiry: Date.now() + (expiresIn * 1000)
      }
    });

    setStatus(t("options.authSuccess"), "ok");
    updateAuthStatus();
  } catch (e) {
    console.error("OAuth error:", e);
    setStatus(t("options.authFailed", { error: String(e.message || e) }), "ng");
  }
}

async function revokeAuth() {
  const got = await storageGet(STORAGE_KEY);
  const existingSettings = got[STORAGE_KEY] || {};

  // Remove token from storage
  delete existingSettings.vertexAccessToken;
  delete existingSettings.vertexTokenExpiry;

  await storageSet({ [STORAGE_KEY]: existingSettings });

  setStatus(t("options.authRevoked"), "ok");
  updateAuthStatus();
}

function updatePrivacyUI(existingSettings) {
  const statusEl = document.getElementById("privacyStatus");
  if (!statusEl) return;
  const s = (existingSettings && existingSettings[STORAGE_KEY]) || existingSettings || {};
  const consent = s.privacyConsentGiven;
  const ts = s.privacyConsentTs;

  if (consent) {
    const when = ts ? ` (${formatDateTime(ts)})` : "";
    statusEl.textContent = t("options.privacyStatusConsented") + when;
    statusEl.className = "ok";
  } else {
    statusEl.textContent = t("options.privacyStatusNotConsented");
    statusEl.className = "ng";
  }
}

async function resetPrivacyConsent() {
  const got = await storageGet(STORAGE_KEY);
  const existingSettings = got[STORAGE_KEY] || {};
  delete existingSettings.privacyConsentGiven;
  delete existingSettings.privacyConsentTs;
  await storageSet({ [STORAGE_KEY]: existingSettings });
  updatePrivacyUI(existingSettings);
  setStatus(t("options.privacyResetDone"), "ok");
}

function openPrivacyPolicyPage() {
  const lang = currentLang || "ja";
  chrome.runtime.sendMessage({ type: "OPEN_PRIVACY", lang }).catch(() => {
    const file = lang === "ja" ? "privacy.html" : "privacy-en.html";
    const url = chrome.runtime.getURL(file);
    window.open(url, "_blank", "noopener");
  });
}

async function test() {
  setStatus(t("options.testing"), "");
  const provider = document.querySelector('input[name="provider"]:checked')?.value || "gemini-api";

  let apiKey, model;
  if (provider === "gemini-api") {
    apiKey = document.getElementById("apiKey").value.trim();
    model = document.getElementById("model").value.trim() || "gemini-3-pro-preview";
  } else if (provider === "vertex-express") {
    apiKey = document.getElementById("vertexApiKey").value.trim();
    model = document.getElementById("vertexModel").value.trim() || "gemini-3-pro-preview";
  } else if (provider === "vertex-standard") {
    // For vertex-standard, check if we have a valid token
    const got = await storageGet(STORAGE_KEY);
    const s = got[STORAGE_KEY] || {};
    if (!s.vertexAccessToken || Date.now() >= (s.vertexTokenExpiry || 0)) {
      setStatus(t("options.authFailed", { error: "Please authenticate first" }), "ng");
      return;
    }
    // Token will be retrieved by background script
    model = document.getElementById("vertexStandardModel").value.trim() || "gemini-2.5-pro";
  }

  if (!apiKey && provider !== "vertex-standard") {
    setStatus(t("options.apiKeyNotSet"), "ng");
    return;
  }

  const res = await chrome.runtime.sendMessage({ type: "PING_GEMINI", provider, apiKey, model });
  if (res?.ok) setStatus(t("options.testOk"), "ok");
  else setStatus(t("options.testNg", { error: res?.error || "unknown error" }), "ng");
}

function setImportStatus(msg, cls) {
  const el = document.getElementById("importStatus");
  el.textContent = msg;
  el.className = cls || "";
}

async function exportData() {
  try {
    setImportStatus(t("options.exporting"), "");

    // Get all data from chrome.storage.local
    const allData = await new Promise((resolve) => chrome.storage.local.get(null, resolve));

    // Download as JSON file
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `playpage-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setImportStatus(t("options.exportComplete"), "ok");
  } catch (e) {
    setImportStatus(t("options.exportFailed", { error: String(e) }), "ng");
  }
}

async function importData() {
  const fileInput = document.getElementById("importFile");
  fileInput.click();
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    setImportStatus(t("options.importing"), "");

    const text = await file.text();
    const data = JSON.parse(text);

    // Data validation
    if (typeof data !== "object" || data === null) {
      throw new Error(t("options.invalidDataFormat"));
    }

    // Confirm before overwriting
    const shouldOverwrite = confirm(t("options.importConfirm"));

    if (!shouldOverwrite) {
      setImportStatus(t("options.importCancelled"), "");
      event.target.value = "";
      return;
    }

    // Save to chrome.storage.local
    await new Promise((resolve) => chrome.storage.local.set(data, resolve));

    // Reload UI
    await load();

    setImportStatus(t("options.importComplete"), "ok");
    event.target.value = "";
  } catch (e) {
    setImportStatus(t("options.importFailed", { error: String(e) }), "ng");
    event.target.value = "";
  }
}

async function exportAndClearHistory() {
  try {
    // Confirm dialog
    const shouldProceed = confirm(t("options.exportHistoryConfirm"));

    if (!shouldProceed) {
      setImportStatus(t("options.cancelled"), "");
      return;
    }

    setImportStatus(t("options.exportingHistory"), "");

    // Get all data from chrome.storage.local
    const allData = await new Promise((resolve) => chrome.storage.local.get(null, resolve));

    // Extract history data only (keys starting with vm_store_v1:)
    const historyData = {};
    const historyKeys = [];
    for (const key in allData) {
      if (key.startsWith(STORE_PREFIX + ":")) {
        historyData[key] = allData[key];
        historyKeys.push(key);
      }
    }

    // No history data
    if (historyKeys.length === 0) {
      setImportStatus(t("options.noHistoryToDelete"), "");
      return;
    }

    // Download history data as JSON file
    const dataStr = JSON.stringify(historyData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `playpage-history-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setImportStatus(t("options.exportCompleteDeleting"), "");

    // Delete history data
    await new Promise((resolve) => chrome.storage.local.remove(historyKeys, resolve));

    setImportStatus(t("options.historyDeleteComplete", { count: historyKeys.length }), "ok");
  } catch (e) {
    setImportStatus(t("options.error", { error: String(e) }), "ng");
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Event listeners for provider selection
  document.getElementById("providerGeminiApi").addEventListener("change", () => updateProviderVisibility());
  document.getElementById("providerVertexExpress").addEventListener("change", () => updateProviderVisibility());
  document.getElementById("providerVertexStandard").addEventListener("change", () => updateProviderVisibility());

  // Event listeners for OAuth authentication
  document.getElementById("authenticateButton").addEventListener("click", () => authenticate().catch(e => setStatus(String(e), "ng")));
  document.getElementById("revokeAuthButton").addEventListener("click", () => revokeAuth().catch(e => setStatus(String(e), "ng")));
  document.getElementById("copyRedirectUri").addEventListener("click", () => copyRedirectUri());

  document.getElementById("save").addEventListener("click", () => save().catch(e => setStatus(String(e), "ng")));
  document.getElementById("test").addEventListener("click", () => test().catch(e => setStatus(String(e), "ng")));
  document.getElementById("language").addEventListener("change", () => changeLanguage().catch(e => setStatus(String(e), "ng")));
  document.getElementById("resetPromptGeneric").addEventListener("click", () => resetPromptGeneric());
  document.getElementById("addSitePrompt").addEventListener("click", () => addSitePrompt());
  document.getElementById("savePrompts").addEventListener("click", () => savePrompts().catch(e => setPromptStatus(String(e), "ng")));
  document.getElementById("exportData").addEventListener("click", () => exportData());
  document.getElementById("importData").addEventListener("click", () => importData());
  document.getElementById("importFile").addEventListener("change", (e) => handleImportFile(e));
  document.getElementById("exportAndClearHistory").addEventListener("click", () => exportAndClearHistory());
  document.getElementById("privacyShowPolicy").addEventListener("click", () => openPrivacyPolicyPage());
  document.getElementById("privacyResetConsent").addEventListener("click", () => resetPrivacyConsent().catch(e => setStatus(String(e), "ng")));

  load().catch((e) => setStatus(String(e), "ng"));
});
