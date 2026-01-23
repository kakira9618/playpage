// PlayPage content script

// 二重読み込み防止
if (window.__VM_CONTENT_LOADED__) {
  // 既にロード済みの場合は何もしない
} else {
  window.__VM_CONTENT_LOADED__ = true;

const SETTINGS_KEY = "vm_settings_v1";
const STORE_PREFIX = "vm_store_v1";
const COST_HISTORY_KEY = "vm_cost_history_v1";

const SIDE_PANE_ID = "vm-side-pane";
const MATHJAX_BUNDLE_PATH = "mathjax/tex-svg-full.js";
const MATHJAX_CONFIG_PATH = "mathjax/config.js";

// 生成中フラグ（UIの折りたたみによる中断を防ぐため）
let isGenerating = false;

// 初期化済みフラグ（二重初期化防止）
let isInitialized = false;

// 全画面化フラグ
let isFullscreen = false;

// Current language (will be set on init)
let currentLang = "ja";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

// i18n helper function
function t(key, params = {}) {
  if (window.I18N) {
    return window.I18N.getMessage(currentLang, key, params);
  }
  return key;
}

// ========== AtCoderコンテスト時間チェック ==========

// AtCoderの問題ページかどうか判定
function isAtCoderTaskPage() {
  return /^https:\/\/atcoder\.jp\/contests\/[^/]+\/tasks\/[^/]+/.test(location.href);
}

// AtCoderのページ内のscriptタグからコンテスト時刻を取得
function getContestTimeFromPage() {
  const scripts = document.querySelectorAll("script");
  for (const script of scripts) {
    const text = script.textContent || "";

    // startTime と endTime を探す（moment形式）
    const startMatch = text.match(/var\s+startTime\s*=\s*moment\(["']([^"']+)["']\)/);
    const endMatch = text.match(/var\s+endTime\s*=\s*moment\(["']([^"']+)["']\)/);

    if (startMatch && endMatch) {
      const startTime = new Date(startMatch[1]);
      const endTime = new Date(endMatch[1]);
      if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
        return { startTime, endTime };
      }
    }
  }
  return null;
}

// コンテスト開催中かどうかチェック
function checkContestStatus() {
  const times = getContestTimeFromPage();
  if (!times) {
    return { status: "unknown", message: t("contest.timeError") };
  }

  const now = new Date();
  if (now >= times.startTime && now < times.endTime) {
    return {
      status: "during",
      message: t("contest.duringContest")
    };
  }

  return { status: "ok" };
}

// ========== ユーティリティ ==========

// Get default prompt based on language and site type
function getDefaultPromptForLang(lang, type) {
  if (window.I18N) {
    return window.I18N.getDefaultPrompt(lang, type);
  }
  // Fallback to Japanese defaults
  if (type === "atcoder") {
    return String.raw`プログラミングの課題の問題文と仕様、サンプル入出力が与えられるので、動作理解のために役立つ、問題文の内容を忠実に表現したアプリをJavaScriptで作成してください。

入力用のインターフェースを作っても良いが、必ず標準入力を自由に入力できるようにして、サンプルケースはボタンを押すだけで簡単に適用できるようにすること。
また、動作理解に役立つサンプルケースやコーナーケース、オーバーフローとなるケース等をいくつか独自に考えて追加してもよい。

与えた入力に対して、全探索やシミュレーションで、確実に答えを計算し、その出力や過程も表示するようにしてください。

アプリ部分についての表現は自由とするが、以下の点には気をつけること

- mod 998244353 などで「有理数」の出力を求められた場合
  - 本来の出力（整数）と、有理数での出力（分数表記 1/3 など）を両方表示すること

アプリの説明（descriptionフィールド）は必ず日本語で記述してください。`;
  }
  return String.raw`Webページの内容が与えられるので、その内容を理解するためのインタラクティブなアプリをJavaScriptで作成してください。

以下の点に注意してください：
- ページの主要な情報を視覚的にわかりやすく表示すること
- ユーザーが操作できるインタラクティブな要素を含めること
- 必要に応じて入力フォームや操作パネルを設けること
- シンプルで使いやすいUIを心がけること

アプリの説明（descriptionフィールド）は必ず日本語で記述してください。`;
}

function simpleMarkdownToHtml(md) {
  if (!md) return "";

  let html = md;

  // コードブロック (```) を保護
  const codeBlocks = [];
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return placeholder;
  });

  // インラインコード (`)
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINECODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  // 改行を保持しつつ、行ごとに処理
  const lines = html.split("\n");
  const processed = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 見出し
    if (/^#{1,6} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s*/, "");
      processed.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // 箇条書きリスト
    if (/^[-*] /.test(line)) {
      if (!inList || listType !== "ul") {
        if (inList) processed.push(`</${listType}>`);
        processed.push("<ul>");
        inList = true;
        listType = "ul";
      }
      const text = line.replace(/^[-*]\s*/, "");
      processed.push(`<li>${text}</li>`);
      continue;
    }

    // 番号付きリスト
    if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== "ol") {
        if (inList) processed.push(`</${listType}>`);
        processed.push("<ol>");
        inList = true;
        listType = "ol";
      }
      const text = line.replace(/^\d+\.\s*/, "");
      processed.push(`<li>${text}</li>`);
      continue;
    }

    // リスト終了
    if (inList && line.trim() === "") {
      processed.push(`</${listType}>`);
      inList = false;
      listType = null;
      processed.push("<br>");
      continue;
    }

    // 通常の行
    if (line.trim() !== "") {
      processed.push(line);
    } else {
      processed.push("<br>");
    }
  }

  if (inList) {
    processed.push(`</${listType}>`);
  }

  html = processed.join("\n");

  // 強調 (**, __)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // イタリック (*, _)
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // リンク
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // インラインコードを復元
  inlineCodes.forEach((code, i) => {
    html = html.replace(`__INLINECODE_${i}__`, code);
  });

  // コードブロックを復元
  codeBlocks.forEach((code, i) => {
    html = html.replace(`__CODEBLOCK_${i}__`, code);
  });

  return html;
}

// Basic sanitizer to strip scripts/styles/event handlers from HTML fragments
function sanitizeHtml(html) {
  if (!html) return "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Remove script and style tags
  doc.querySelectorAll("script, style").forEach((el) => el.remove());

  // Remove event handler attributes and javascript: URLs
  doc.querySelectorAll("*").forEach((el) => {
    // Remove on* attributes
    [...el.attributes].forEach((attr) => {
      const name = attr.name;
      const value = attr.value || "";
      if (name.startsWith("on")) {
        el.removeAttribute(name);
      } else if (["href", "src", "xlink:href"].includes(name) && /^javascript:/i.test(value)) {
        el.removeAttribute(name);
      }
    });
  });

  return doc.body.innerHTML;
}

function normalizedCurrentUrl() {
  try {
    const u = new URL(location.href);
    u.hash = "";
    return u.toString();
  } catch {
    return location.href;
  }
}

function isProbablyPdfUrl(url) {
  const lowered = (url || "").toLowerCase();
  return lowered.endsWith(".pdf") || lowered.includes(".pdf?");
}

function detectPdfPage() {
  const url = normalizedCurrentUrl();
  const contentType = document.contentType || "";
  const hasPdfEmbed =
    !!document.querySelector("embed[type='application/pdf'], object[type='application/pdf']");
  const embedIsStandalone = hasPdfEmbed && (document.body?.children?.length || 0) === 1;

  const isPdf = isProbablyPdfUrl(url) || contentType === "application/pdf" || embedIsStandalone;
  if (!isPdf) return null;

  return { url, contentType };
}

function buildPdfPlaceholderHtml(url) {
  const title = currentLang === "ja" ? "PDFドキュメント" : "PDF Document";
  const desc =
    currentLang === "ja"
      ? "PDFバイナリを別途送信します。AI側で内容を抽出してください。"
      : "The PDF binary is attached separately. Please extract and use its contents.";

  return `<article data-playpage-source="pdf" style="font-family:sans-serif;">
    <h1 style="margin:0 0 8px 0;">${title}</h1>
    <p style="margin:0 0 4px 0; color:#333;">${escapeHtml(url || "")}</p>
    <p style="margin:0; color:#555; font-size:14px;">${desc}</p>
  </article>`;
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

function taskStorageKey() {
  return `${STORE_PREFIX}:${location.origin}${location.pathname}`;
}

// コスト履歴を取得
async function getCostHistory() {
  const got = await storageGet([COST_HISTORY_KEY]);
  return got[COST_HISTORY_KEY] || { history: [] };
}

// コスト履歴を保存
async function saveCostHistory(costHistory) {
  await storageSet({ [COST_HISTORY_KEY]: costHistory });
}

// コスト履歴に記録を追加
async function addCostRecord(usage, model, elapsedTime) {
  const costHistory = await getCostHistory();
  const record = {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    model,
    elapsedTime,
    inputTokens: usage.inputTokens || 0,
    outputTokens: usage.outputTokens || 0,
    totalTokens: usage.totalTokens || 0,
    inputCost: usage.inputCost || 0,
    outputCost: usage.outputCost || 0,
    totalCost: usage.totalCost || 0
  };
  costHistory.history.push(record);
  await saveCostHistory(costHistory);
  return record;
}


function nowTitle(versionNo) {
  const dt = new Intl.DateTimeFormat(currentLang === "ja" ? "ja-JP" : "en-US", {
    timeZone: currentLang === "ja" ? "Asia/Tokyo" : undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
  return `v${versionNo}: ${dt}`;
}

// ========== 共通UI関数 ==========

function sidePaneExists() {
  return !!document.getElementById(SIDE_PANE_ID);
}

function setStatus(text) {
  const el = document.getElementById("vm-status");
  if (el) {
    el.textContent = text || "";
    el.style.display = text ? "block" : "none";
  }
}

function setPrimaryButtonLabel(hasHistory) {
  const btn = document.getElementById("vm-make");
  if (!btn) return;
  btn.textContent = hasHistory ? t("pane.regenerate") : t("pane.generate");
}

function setExtraPromptLabel(hasHistory) {
  const label = document.getElementById("vm-extra-label");
  const textarea = document.getElementById("vm-extra");
  if (!label || !textarea) return;

  if (hasHistory) {
    label.textContent = t("pane.freePromptRegenerate");
    textarea.placeholder = t("pane.freePromptRegeneratePlaceholder");
  } else {
    label.textContent = t("pane.freePromptInitial");
    textarea.placeholder = t("pane.freePromptInitialPlaceholder");
  }
}

function updateButtonStates(generating) {
  const makeBtn = document.getElementById("vm-make");
  const collapseBtn = document.getElementById("vm-collapse");

  if (makeBtn) {
    makeBtn.disabled = generating;
    if (generating) {
      makeBtn.style.opacity = "0.6";
      makeBtn.style.cursor = "not-allowed";
    } else {
      makeBtn.style.opacity = "1";
      makeBtn.style.cursor = "pointer";
    }
  }

  if (collapseBtn) {
    collapseBtn.disabled = generating;
    collapseBtn.title = generating ? t("pane.cannotCloseWhileGenerating") : "";
    if (generating) {
      collapseBtn.style.opacity = "0.6";
      collapseBtn.style.cursor = "not-allowed";
    } else {
      collapseBtn.style.opacity = "1";
      collapseBtn.style.cursor = "pointer";
    }
  }
}

function injectCspIfMissing(html) {
  const hasCsp = /http-equiv=["']Content-Security-Policy["']/i.test(html);
  if (hasCsp) return html;

  // Block network; allow only self / extension resources and data/blob for scripts (for srcdoc/data URIs)
  const csp =
    "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'self' chrome-extension: data: blob:";

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(
      /<head[^>]*>/i,
      (m) => `${m}\n<meta http-equiv="Content-Security-Policy" content="${csp}">\n`
    );
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"></head><body>${html}</body></html>`;
}

function maybeHasMath(html) {
  if (!html) return false;
  return /(?:\$\$[\s\S]+?\$\$)|(?:\$[^$\n]+\$)|(?:\\\([^)]*\\\))|(?:\\\[[\s\S]*?\\\])|(<math[\s>])/i.test(
    html
  );
}

async function injectMathJax(html) {
  if (!maybeHasMath(html)) return html;

  const configSrc = chrome.runtime.getURL(MATHJAX_CONFIG_PATH);
  const bundleSrc = chrome.runtime.getURL(MATHJAX_BUNDLE_PATH);

  const scripts = `
    <script src="${configSrc}" defer></script>
    <script src="${bundleSrc}" defer></script>
  `;

  let out = html;

  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${scripts}\n`);
  } else {
    const hasBody = /<body[^>]*>/i.test(out);
    out = `<!doctype html><html><head>${scripts}</head>${hasBody ? "" : "<body>"}${out}${
      hasBody ? "" : "</body>"
    }</html>`;
  }

  return out;
}

async function renderHtmlToIframe(html) {
  const iframe = document.getElementById("vm-iframe");
  if (!iframe) return;
  let finalHtml = html || "";
  try {
    finalHtml = await injectMathJax(finalHtml);
  } catch (e) {
    console.warn("MathJax injection skipped due to error:", e);
  }
  iframe.srcdoc = injectCspIfMissing(finalHtml);
}

async function collectPageHtmlForPrompt() {
  const pdfInfo = detectPdfPage();
  if (pdfInfo) {
    return {
      html: buildPdfPlaceholderHtml(pdfInfo.url),
      trimmed: false,
      isPdf: true,
      pdf: {
        url: pdfInfo.url,
        contentType: pdfInfo.contentType || "application/pdf"
      }
    };
  }

  const full = document.documentElement?.outerHTML || "";
  const MAX = 260_000;
  if (full.length <= MAX) {
    return { html: full, trimmed: false, isPdf: false, pdf: null };
  }
  const head = full.slice(0, 200_000);
  const tail = full.slice(-60_000);
  return {
    html: head + "\n<!-- [TRIMMED] middle omitted -->\n" + tail,
    trimmed: true,
    isPdf: false,
    pdf: null
  };
}

function buildPrompt(
  problemHtml,
  { isRegenerate, extra, currentHtml, currentDescription, trimmed, promptBase, isPdf }
) {
  const base = promptBase || getDefaultPromptForLang(currentLang, "generic");

  let p = `${base}\n`;
  if (isPdf) {
    const pdfNote =
      currentLang === "ja"
        ? "このページはPDFです。PDFファイル本体を別途送信しています。テキストを抽出してからアプリを作成してください。"
        : "The current page is a PDF. The PDF file is attached separately; please extract its text/content before building the app.";
    p += `\n${pdfNote}\n`;
  }
  if (trimmed) {
    const trimNote = currentLang === "ja"
      ? "(注) ページHTMLは長いため一部トリムされています。"
      : "(Note) Page HTML has been trimmed due to length.";
    p += `\n${trimNote}\n`;
  }

  const pageHtmlLabel = currentLang === "ja" ? "対象ページHTML" : "Target Page HTML";
  p += `\n【${pageHtmlLabel}】\n\`\`\`html\n${problemHtml}\n\`\`\`\n`;

  if (isRegenerate) {
    const improvementLabel = currentLang === "ja" ? "改善指示（自由プロンプト）" : "Improvement Instructions (Free Prompt)";
    const noneLabel = currentLang === "ja" ? "(なし)" : "(none)";
    const currentHtmlLabel = currentLang === "ja" ? "現在のアプリHTML" : "Current App HTML";
    const currentDescLabel = currentLang === "ja" ? "現在のdescription" : "Current Description";
    const noteLabel = currentLang === "ja"
      ? "※ 改善指示に従ってHTMLを改善すると同時に、descriptionも改善内容を反映して更新してください。"
      : "※ Improve the HTML according to the improvement instructions, and also update the description to reflect the improvements.";

    p += `\n【${improvementLabel}】\n${extra || noneLabel}\n`;
    p += `\n【${currentHtmlLabel}】\n\`\`\`html\n${currentHtml || noneLabel}\n\`\`\`\n`;
    p += `\n【${currentDescLabel}】\n${currentDescription || noneLabel}\n`;
    p += `\n${noteLabel}\n`;
  } else if (extra) {
    const visualizeLabel = currentLang === "ja" ? "アプリ化したいもの" : "What to create an app for";
    const noteLabel = currentLang === "ja"
      ? "※ 上記の「アプリ化したいもの」を特に重点的に表現してください。"
      : "※ Please focus especially on expressing the above 'What to create an app for'.";

    p += `\n【${visualizeLabel}】\n${extra}\n`;
    p += `\n${noteLabel}\n`;
  }

  return p.trim();
}

async function ensureKeyOrOpenOptions() {
  const got = await storageGet([SETTINGS_KEY]);
  const s = got[SETTINGS_KEY] || {};
  if (!s.apiKey) {
    setStatus(t("pane.apiKeyNotSet"));
    await chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
    return false;
  }
  return true;
}

function openPrivacyPolicy() {
  const lang = currentLang || "ja";
  chrome.runtime.sendMessage({ type: "OPEN_PRIVACY", lang }).catch(() => {
    const file = lang === "ja" ? "privacy.html" : "privacy-en.html";
    const url = chrome.runtime.getURL(file);
    window.open(url, "_blank", "noopener");
  });
}

async function ensurePrivacyConsent() {
  const got = await storageGet([SETTINGS_KEY]);
  const s = got[SETTINGS_KEY] || {};
  if (s.privacyConsentGiven) return true;

  return await new Promise((resolve) => {
    if (document.getElementById("vm-privacy-modal")) {
      resolve(false);
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "vm-privacy-modal";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483648; /* above side panel */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      background: #fff;
      max-width: 520px;
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.18);
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #222;
      line-height: 1.6;
    `;

    card.innerHTML = `
      <h2 style="margin: 0 0 12px 0; font-size: 18px;">${t("pane.privacyTitle")}</h2>
      <p style="margin: 0 0 10px 0;">${t("pane.privacyBody")}</p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
        <button id="vm-privacy-accept" style="
          padding:10px 14px; background:#0060CE; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;
        ">${t("pane.privacyAccept")}</button>
        <button id="vm-privacy-policy" style="
          padding:10px 14px; background:#ffffff; color:#0060CE; border:1px solid #c8daf5; border-radius:8px; cursor:pointer; font-weight:600;
        ">${t("pane.privacyPolicy")}</button>
        <button id="vm-privacy-decline" style="
          padding:10px 14px; background:#f5f5f5; color:#444; border:1px solid #ddd; border-radius:8px; cursor:pointer;
        ">${t("pane.privacyDecline")}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
    };

    card.querySelector("#vm-privacy-accept")?.addEventListener("click", async () => {
      const updated = {
        ...s,
        privacyConsentGiven: true,
        privacyConsentTs: Date.now()
      };
      await storageSet({ [SETTINGS_KEY]: updated });
      cleanup();
      resolve(true);
    });

    card.querySelector("#vm-privacy-decline")?.addEventListener("click", () => {
      cleanup();
      resolve(false);
    });

    card.querySelector("#vm-privacy-policy")?.addEventListener("click", (e) => {
      e.preventDefault();
      openPrivacyPolicy();
    });
  });
}

async function loadStore() {
  const key = taskStorageKey();
  const got = await storageGet([key]);
  return (
    got[key] || {
      activeId: null,
      versions: [],
      uiCollapsed: true
    }
  );
}

async function saveStore(store) {
  const key = taskStorageKey();
  await storageSet({ [key]: store });
}

function refreshVersionSelect(store) {
  const sel = document.getElementById("vm-versions");
  if (!sel) return;

  sel.innerHTML = "";
  for (const v of store.versions) {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.title;
    if (store.activeId === v.id) opt.selected = true;
    sel.appendChild(opt);
  }

  const hasHistory = store.versions.length > 0;
  setPrimaryButtonLabel(hasHistory);
  setExtraPromptLabel(hasHistory);
}

async function applyVersion(store, id) {
  const v = store.versions.find((x) => x.id === id);
  if (!v) {
    setStatus(t("pane.versionNotFound"));
    return;
  }
  store.activeId = id;
  await saveStore(store);

  refreshVersionSelect(store);
  await renderHtmlToIframe(v.html);
  renderDescription(v.description);
}

function renderDescription(description) {
  const el = document.getElementById("vm-description");
  const details = document.getElementById("vm-description-details");
  if (!el || !details) return;

  if (description && description.trim()) {
    const htmlContent = simpleMarkdownToHtml(description);
    el.innerHTML = sanitizeHtml(htmlContent);
    details.style.display = "block";
  } else {
    el.innerHTML = t("pane.noDescription");
    details.style.display = "none";
  }
}


// ========== サイドペイン ==========

const PANE_WIDTH_KEY = "vm_pane_width";
const PANE_MODE_KEY = "vm_pane_mode";
const IFRAME_HEIGHT_KEY = "vm_iframe_height";
const DEFAULT_PANE_WIDTH = 480;
const MIN_PANE_WIDTH = 300;
const MAX_PANE_WIDTH_BASE = 1200;
function getMaxPaneWidth() {
  // Allow wider panes on large viewports (up to 95% of viewport), but never below the legacy cap
  const viewport = Math.max(window.innerWidth || 0, DEFAULT_PANE_WIDTH);
  return Math.max(MAX_PANE_WIDTH_BASE, Math.floor(viewport * 0.95));
}
const DEFAULT_IFRAME_HEIGHT = 400;
const MIN_IFRAME_HEIGHT = 200;
const MAX_IFRAME_HEIGHT = 1000;

// 表示モード: "float" = Webページの上にフロート, "resize" = Webページ幅を縮小
const PANE_MODE_FLOAT = "float";
const PANE_MODE_RESIZE = "resize";
let currentPaneMode = PANE_MODE_FLOAT;

function buildSidePane() {
  const pane = document.createElement("div");
  pane.id = SIDE_PANE_ID;
  pane.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${DEFAULT_PANE_WIDTH}px;
    height: 100vh;
    background: #fafafa;
    border-left: 1px solid #e0e0e0;
    box-shadow: -8px 0 24px rgba(0,0,0,0.08);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  `;

  // アイコンのURLを取得
  const iconUrl = chrome.runtime.getURL("img/icon-48.png");

  pane.innerHTML = `
    <div id="vm-resize-handle" style="
      position: absolute;
      left: 0;
      top: 0;
      width: 6px;
      height: 100%;
      cursor: ew-resize;
      background: transparent;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    " title="${t('pane.resizeHandle')}">
      <div style="
        width: 3px;
        height: 48px;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
        border-radius: 2px;
        background: #d0d0d0;
        transition: all 0.2s ease;
      ">
        <div style="width: 2px; height: 2px; background: #fafafa; border-radius: 50%;"></div>
        <div style="width: 2px; height: 2px; background: #fafafa; border-radius: 50%;"></div>
        <div style="width: 2px; height: 2px; background: #fafafa; border-radius: 50%;"></div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:#ffffff; border-bottom:1px solid #e8e8e8;">
      <div style="display:flex; align-items:center; gap:10px; font-weight:600; font-size:17px; color:#1a1a1a;">
        <img src="${iconUrl}" alt="PlayPage" style="width:28px; height:28px;">
        <span>${t('pane.title')}</span>
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        <button id="vm-mode-toggle" style="
          padding:6px 12px !important;
          cursor:pointer !important;
          border:1px solid #e0e0e0 !important;
          background:#ffffff !important;
          border-radius:6px !important;
          font-size:16px !important;
          line-height:1.2 !important;
          vertical-align:middle !important;
          display:inline-block !important;
          text-align:center !important;
          box-sizing:border-box !important;
          min-width:auto !important;
          width:auto !important;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        " title="${t('pane.modeFloatTooltip')}">📌</button>
        <button id="vm-fullscreen-toggle" style="
          padding:6px 12px !important;
          cursor:pointer !important;
          border:1px solid #e0e0e0 !important;
          background:#ffffff !important;
          border-radius:6px !important;
          font-size:16px !important;
          line-height:1.2 !important;
          vertical-align:middle !important;
          display:inline-block !important;
          text-align:center !important;
          box-sizing:border-box !important;
          min-width:auto !important;
          width:auto !important;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        " title="全画面化">⛶</button>
        <button id="vm-collapse" style="
          padding:6px 14px !important;
          cursor:pointer !important;
          border:1px solid #e0e0e0 !important;
          background:#ffffff !important;
          border-radius:6px !important;
          font-size:13px !important;
          font-weight:500 !important;
          color:#666 !important;
          line-height:1.4 !important;
          vertical-align:middle !important;
          display:inline-block !important;
          text-align:center !important;
          box-sizing:border-box !important;
          min-width:auto !important;
          width:auto !important;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        ">${t('pane.close')}</button>
      </div>
    </div>

    <div id="vm-body" style="flex:1; overflow-y:auto; padding:20px;">
      <!-- 1) ボタン行 -->
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:20px;">
        <button id="vm-make" style="
          padding:10px 20px !important;
          background:#0060CE !important;
          color:#fff !important;
          border:none !important;
          border-radius:8px !important;
          cursor:pointer !important;
          font-weight:600 !important;
          font-size:14px !important;
          line-height:1.4 !important;
          vertical-align:middle !important;
          display:inline-block !important;
          text-align:center !important;
          box-sizing:border-box !important;
          min-width:auto !important;
          width:auto !important;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 96, 206, 0.3);
        ">${t('pane.generate')}</button>
        <button id="vm-open-options" style="
          padding:10px 18px !important;
          background:#ffffff !important;
          color:#666 !important;
          border:1px solid #e0e0e0 !important;
          border-radius:8px !important;
          cursor:pointer !important;
          font-weight:500 !important;
          font-size:14px !important;
          line-height:1.4 !important;
          vertical-align:middle !important;
          display:inline-block !important;
          text-align:center !important;
          box-sizing:border-box !important;
          min-width:auto !important;
          width:auto !important;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        ">${t('pane.options')}</button>
      </div>

      <!-- バージョン選択 -->
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:13px; margin-bottom:8px; font-weight:600; color:#333;">${t('pane.versionSelect')}</label>
        <select id="vm-versions" style="
          width:100% !important;
          padding:10px 12px !important;
          border:1px solid #e0e0e0 !important;
          border-radius:8px !important;
          background:#ffffff !important;
          font-size:14px !important;
          cursor:pointer !important;
          box-sizing:border-box !important;
          display:block !important;
          line-height:1.5 !important;
          height:auto !important;
          min-height:44px !important;
          min-width:0 !important;
          max-width:none !important;
          -webkit-appearance:menulist !important;
          -moz-appearance:menulist !important;
          appearance:menulist !important;
          background-image:none !important;
          padding-right:30px !important;
          vertical-align:middle !important;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        "></select>
      </div>

      <!-- ステータス -->
      <div id="vm-status" style="
        display:none;
        font-size:13px;
        color:#1a1a1a;
        margin-bottom:20px;
        padding:12px 16px;
        background:rgba(0, 96, 206, 0.08);
        border-radius:8px;
        border:1px solid rgba(0, 96, 206, 0.15);
        line-height:1.6;
        font-weight:500;
      "></div>

      <!-- 2) 自由プロンプト -->
      <div style="margin-bottom:20px;">
        <label id="vm-extra-label" style="display:block; font-size:13px; margin-bottom:8px; font-weight:600; color:#333;">${t('pane.freePromptInitial')}</label>
        <textarea id="vm-extra" rows="3" style="
          width:100%;
          padding:12px;
          border:1px solid #e0e0e0;
          border-radius:8px;
          resize:vertical;
          box-sizing:border-box;
          font-size:14px;
          font-family:inherit;
          transition: all 0.2s ease;
          background:#ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        "
          placeholder="${t('pane.freePromptInitialPlaceholder')}"></textarea>
      </div>

      <!-- 3) アプリ本体 -->
      <div style="margin-bottom:20px;">
        <div id="vm-iframe-container" style="
          position:relative;
          height:${DEFAULT_IFRAME_HEIGHT}px;
          border:1px solid #e0e0e0;
          border-radius:10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          background:#ffffff;
          overflow:hidden;
        ">
          <iframe id="vm-iframe"
            style="
              width:100%;
              height:100%;
              border:none;
              border-radius:10px;
            "
            sandbox="allow-scripts allow-same-origin allow-forms"
          ></iframe>
          <div id="vm-iframe-resize-handle" style="
            position:absolute;
            bottom:0;
            left:0;
            right:0;
            height:6px;
            cursor:ns-resize;
            background:transparent;
            transition:background 0.2s ease;
          " title="${t('pane.resizeHandle')}"></div>
        </div>
      </div>

      <!-- 4) アプリの説明 -->
      <div>
        <details id="vm-description-details">
          <summary style="
            cursor:pointer;
            font-weight:600;
            padding:12px 16px;
            background:#ffffff;
            border-radius:8px;
            transition: all 0.2s ease;
            color:#333;
            font-size:14px;
          ">
            ${t('pane.description')}
          </summary>
          <div id="vm-description" style="
            padding:16px;
            margin-top:8px;
            border-radius:8px;
            background:#ffffff;
            font-size:14px;
            line-height:1.7;
            color:#444;
          ">
            ${t('pane.noDescription')}
          </div>
        </details>
      </div>
    </div>
  `;
  return pane;
}

// ========== ペイン操作 ==========

async function setCollapsed(store, collapsed) {
  store.uiCollapsed = collapsed;
  await saveStore(store);

  const pane = document.getElementById(SIDE_PANE_ID);
  if (pane) pane.style.display = collapsed ? "none" : "flex";
}

async function ensureExpanded(store) {
  if (!sidePaneExists()) {
    const pane = buildSidePane();
    document.body.appendChild(pane);

    // 保存されたペイン幅とモードを復元
    const got = await storageGet([PANE_WIDTH_KEY, PANE_MODE_KEY, IFRAME_HEIGHT_KEY]);
    const savedWidth = got[PANE_WIDTH_KEY];
    const savedMode = got[PANE_MODE_KEY] || PANE_MODE_FLOAT;
    const savedIframeHeight = got[IFRAME_HEIGHT_KEY];

    const maxWidth = getMaxPaneWidth();
    if (savedWidth && savedWidth >= MIN_PANE_WIDTH && savedWidth <= maxWidth) {
      pane.style.width = `${savedWidth}px`;
    } else if (savedWidth && savedWidth > maxWidth) {
      pane.style.width = `${maxWidth}px`;
    }

    if (savedIframeHeight && savedIframeHeight >= MIN_IFRAME_HEIGHT && savedIframeHeight <= MAX_IFRAME_HEIGHT) {
      const iframeContainer = document.getElementById("vm-iframe-container");
      if (iframeContainer) {
        iframeContainer.style.height = `${savedIframeHeight}px`;
      }
    }

    wirePanelHandlers();
    updateButtonStates(isGenerating);

    // モードを適用
    applyPaneMode(savedMode);
  } else {
    // すでに存在する場合もモードを再適用（bodyのmargin設定のため）
    applyPaneMode(currentPaneMode);
  }
  await setCollapsed(store, false);
}

async function ensureCollapsed(store) {
  if (sidePaneExists()) {
    const pane = document.getElementById(SIDE_PANE_ID);
    if (pane) pane.style.display = "none";
  }
  // bodyのmarginをクリア
  clearBodyMargin();
  await setCollapsed(store, true);
}

async function generateOrRegenerate() {
  if (isGenerating) {
    setStatus(t("pane.alreadyGenerating"));
    return;
  }

  // AtCoderの場合、コンテスト開催中は生成を禁止
  if (isAtCoderTaskPage()) {
    const contestStatus = checkContestStatus();
    if (contestStatus.status !== "ok") {
      alert(contestStatus.message);
      return;
    }
  }

  // Get one-time consent before sending page content off-device
  const consentOk = await ensurePrivacyConsent();
  if (!consentOk) {
    setStatus(t("pane.privacyRequired"));
    return;
  }

  if (!(await ensureKeyOrOpenOptions())) return;

  const store = await loadStore();
  await ensureExpanded(store);

  // 設定からカスタムプロンプトを取得
  const got = await storageGet([SETTINGS_KEY]);
  const settings = got[SETTINGS_KEY] || {};

  // サイトと言語に応じたプロンプトを使用
  let promptBase;
  const currentUrl = location.href;
  const promptKey = currentLang === "ja" ? "promptJa" : "promptEn";
  const genericPromptKey = currentLang === "ja" ? "promptBaseGenericJa" : "promptBaseGenericEn";

  // 特定のサイト用プロンプトを検索
  let matchedSitePrompt = null;
  if (settings.sitePrompts && Array.isArray(settings.sitePrompts)) {
    for (const site of settings.sitePrompts) {
      if (site.url && currentUrl.startsWith(site.url)) {
        matchedSitePrompt = site;
        break;
      }
    }
  }

  if (matchedSitePrompt && matchedSitePrompt[promptKey]) {
    // 特定のサイト用プロンプトを使用
    promptBase = matchedSitePrompt[promptKey];
  } else {
    // 一般サイト用プロンプトを使用（後方互換性を維持）
    promptBase = settings[genericPromptKey] || settings.promptBaseGeneric || getDefaultPromptForLang(currentLang, "generic");
  }

  const hasHistory = store.versions.length > 0;
  const isRegenerate = hasHistory && !!store.activeId;

  const extra = (document.getElementById("vm-extra")?.value || "").trim();

  let currentHtml = "";
  let currentDescription = "";
  if (isRegenerate) {
    const cur = store.versions.find((x) => x.id === store.activeId);
    currentHtml = cur?.html || "";
    currentDescription = cur?.description || "";
  }

  const { html: pageHtml, trimmed, isPdf, pdf } = await collectPageHtmlForPrompt();
  const promptText = buildPrompt(pageHtml, {
    isRegenerate,
    extra,
    currentHtml,
    currentDescription,
    trimmed,
    promptBase,
    isPdf
  });

  // 生成開始
  isGenerating = true;
  updateButtonStates(true);
  setStatus(isRegenerate ? t("pane.regenerating") : t("pane.generating"));

  const startTime = performance.now();

  try {
    const res = await chrome.runtime.sendMessage({
      type: "GENERATE_VISUALIZER",
      promptText,
      pdf: pdf || null
    });

    const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);

    if (!res?.ok) {
      setStatus(t("pane.generateFailed", { time: elapsedSec, error: res?.error || "unknown error" }));
      return;
    }

    const out = res.data;
    const html = String(out.html || "");
    const titleFromModel = String(out.title || "").trim();
    const description = String(out.description || "");

    // コスト情報を保存
    const usage = res.usage || {};
    const costRecord = await addCostRecord(usage, res.model, elapsedSec);

    const versionNo = (store.versions?.length || 0) + 1;
    const title = titleFromModel ? `${nowTitle(versionNo)} (${titleFromModel})` : nowTitle(versionNo);
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    store.versions.unshift({
      id,
      title,
      createdAt: new Date().toISOString(),
      model: res.model,
      promptExtra: extra,
      html,
      description,
      usage: costRecord
    });

    store.activeId = id;
    await saveStore(store);

    refreshVersionSelect(store);
    await renderHtmlToIframe(html);
    renderDescription(description);

    // コスト情報を含むステータス表示
    const costStr = `$${costRecord.totalCost.toFixed(6)}`;
    const tokensStr = t("pane.tokensFormat", {
      input: costRecord.inputTokens.toLocaleString(),
      output: costRecord.outputTokens.toLocaleString()
    });
    setStatus(t("pane.generateComplete", { time: elapsedSec, title: title }) + `\n${t("pane.cost")}: ${costStr} (${tokensStr})`);
    setPrimaryButtonLabel(true);
    setExtraPromptLabel(true);
  } finally {
    // 生成終了（成功・失敗に関わらず）
    isGenerating = false;
    updateButtonStates(false);
  }
}

function wirePanelHandlers() {
  // ホバー効果を追加
  const addButtonHoverEffects = () => {
    // 生成ボタン
    const makeBtn = document.getElementById("vm-make");
    if (makeBtn) {
      makeBtn.addEventListener("mouseenter", () => {
        if (!makeBtn.disabled) {
          makeBtn.style.transform = "translateY(-1px)";
          makeBtn.style.boxShadow = "0 4px 12px rgba(0, 96, 206, 0.4)";
        }
      });
      makeBtn.addEventListener("mouseleave", () => {
        makeBtn.style.transform = "";
        makeBtn.style.boxShadow = "0 2px 8px rgba(0, 96, 206, 0.3)";
      });
    }

    // オプションボタン
    const optionsBtn = document.getElementById("vm-open-options");
    if (optionsBtn) {
      optionsBtn.addEventListener("mouseenter", () => {
        optionsBtn.style.background = "#f8f9fa";
        optionsBtn.style.borderColor = "#0060CE";
        optionsBtn.style.color = "#0060CE";
      });
      optionsBtn.addEventListener("mouseleave", () => {
        optionsBtn.style.background = "#ffffff";
        optionsBtn.style.borderColor = "#e0e0e0";
        optionsBtn.style.color = "#666";
      });
    }

    // 閉じるボタン
    const collapseBtn = document.getElementById("vm-collapse");
    if (collapseBtn) {
      collapseBtn.addEventListener("mouseenter", () => {
        if (!collapseBtn.disabled) {
          collapseBtn.style.background = "#f8f9fa";
          collapseBtn.style.borderColor = "#bbb";
        }
      });
      collapseBtn.addEventListener("mouseleave", () => {
        collapseBtn.style.background = "#ffffff";
        collapseBtn.style.borderColor = "#e0e0e0";
      });
    }

    // テキストエリアのフォーカス効果
    const textarea = document.getElementById("vm-extra");
    if (textarea) {
      textarea.addEventListener("focus", () => {
        textarea.style.borderColor = "#0060CE";
        textarea.style.boxShadow = "0 0 0 3px rgba(0, 96, 206, 0.1)";
      });
      textarea.addEventListener("blur", () => {
        textarea.style.borderColor = "#e0e0e0";
        textarea.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
      });
    }

    // セレクトのフォーカス効果
    const select = document.getElementById("vm-versions");
    if (select) {
      select.addEventListener("focus", () => {
        select.style.borderColor = "#0060CE";
        select.style.boxShadow = "0 0 0 3px rgba(0, 96, 206, 0.1)";
      });
      select.addEventListener("blur", () => {
        select.style.borderColor = "#e0e0e0";
        select.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
      });
    }

    // Detailsのsummaryにホバー効果
    const details = document.getElementById("vm-description-details");
    if (details) {
      const summary = details.querySelector("summary");
      if (summary) {
        summary.addEventListener("mouseenter", () => {
          summary.style.background = "#f8f9fa";
          summary.style.borderColor = "#0060CE";
        });
        summary.addEventListener("mouseleave", () => {
          summary.style.background = "#ffffff";
          summary.style.borderColor = "#e0e0e0";
        });
      }
    }
  };

  addButtonHoverEffects();

  document.getElementById("vm-open-options")?.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
  });

  // 生成/再生成を単一ボタンに統合
  document.getElementById("vm-make")?.addEventListener("click", () => {
    generateOrRegenerate().catch((e) => setStatus(String(e)));
  });

  // 折りたたみ/閉じる
  document.getElementById("vm-collapse")?.addEventListener("click", async () => {
    if (isGenerating) {
      alert(t("pane.cannotCloseWhileGeneratingAlert"));
      return;
    }
    const store = await loadStore();
    await ensureCollapsed(store);
  });

  // プルダウン選択後、即差し替え
  document.getElementById("vm-versions")?.addEventListener("change", async (ev) => {
    const id = ev.target?.value;
    if (!id) return;
    const store = await loadStore();
    await applyVersion(store, id);
  });

  // リサイズハンドル
  wireResizeHandler();

  // iframeリサイズハンドル
  wireIframeResizeHandler();

  // モード切り替えボタン
  wireModeToggleHandler();

  // 全画面化ボタン
  wireFullscreenToggleHandler();
}

// ========== 表示モード関連 ==========

function updateModeButtonLabel() {
  const btn = document.getElementById("vm-mode-toggle");
  if (!btn) return;

  // ボタンのテキストは常に📌
  btn.textContent = "📌";

  if (currentPaneMode === PANE_MODE_FLOAT) {
    // floatモード: 押されていない状態
    btn.style.background = "#ffffff";
    btn.style.color = "#000";
    btn.style.border = "1px solid #e0e0e0";
    btn.title = t("pane.modeFloatTooltip");
  } else {
    // resizeモード: 押されている状態
    btn.style.background = "#0060CE";
    btn.style.color = "#fff";
    btn.style.border = "none";
    btn.style.boxShadow = "0 2px 6px rgba(0, 96, 206, 0.3)";
    btn.title = t("pane.modeResizeTooltip");
  }
}

function applyPaneMode(mode) {
  const pane = document.getElementById(SIDE_PANE_ID);
  if (!pane) return;

  currentPaneMode = mode;
  const width = pane.offsetWidth;

  if (mode === PANE_MODE_RESIZE) {
    // リサイズモード: bodyにmargin-rightを設定
    document.body.style.marginRight = `${width}px`;
    document.body.style.transition = "margin-right 0.2s ease";
  } else {
    // フロートモード: margin-rightをリセット
    document.body.style.marginRight = "";
    document.body.style.transition = "";
  }

  updateModeButtonLabel();
}

async function togglePaneMode() {
  const newMode = currentPaneMode === PANE_MODE_FLOAT ? PANE_MODE_RESIZE : PANE_MODE_FLOAT;
  applyPaneMode(newMode);
  await storageSet({ [PANE_MODE_KEY]: newMode });
}

function wireModeToggleHandler() {
  const btn = document.getElementById("vm-mode-toggle");
  if (!btn) return;

  // ホバー効果
  btn.addEventListener("mouseenter", () => {
    if (currentPaneMode === PANE_MODE_FLOAT) {
      btn.style.background = "#f8f9fa";
      btn.style.borderColor = "#0060CE";
    } else {
      btn.style.transform = "translateY(-1px)";
      btn.style.boxShadow = "0 4px 10px rgba(0, 96, 206, 0.4)";
    }
  });

  btn.addEventListener("mouseleave", () => {
    if (currentPaneMode === PANE_MODE_FLOAT) {
      btn.style.background = "#ffffff";
      btn.style.borderColor = "#e0e0e0";
    } else {
      btn.style.transform = "";
      btn.style.boxShadow = "0 2px 6px rgba(0, 96, 206, 0.3)";
    }
  });

  btn.addEventListener("click", async () => {
    await togglePaneMode();
  });
}

// ========== 全画面化関連 ==========

async function toggleFullscreen() {
  const pane = document.getElementById(SIDE_PANE_ID);
  const body = document.getElementById("vm-body");
  const header = pane?.querySelector("div[style*='padding:16px 20px']");
  const iframeContainer = document.getElementById("vm-iframe-container");
  const fullscreenBtn = document.getElementById("vm-fullscreen-toggle");

  if (!pane || !body || !iframeContainer || !fullscreenBtn) return;

  isFullscreen = !isFullscreen;

  if (isFullscreen) {
    // 全画面化
    pane.style.width = "100vw";
    pane.style.right = "0";
    pane.style.left = "0";

    // bodyの中身を非表示（iframeコンテナの親要素以外）
    const iframeParent = iframeContainer.parentElement;
    const children = Array.from(body.children);
    children.forEach(child => {
      if (child !== iframeParent) {
        child.style.display = "none";
      }
    });

    // iframeコンテナの親要素のスタイル調整
    if (iframeParent) {
      iframeParent.style.marginBottom = "0";
      iframeParent.style.height = "100%";
    }

    // iframeコンテナを拡大
    iframeContainer.style.height = "calc(100vh - 65px)";

    // リサイズハンドルを非表示
    const resizeHandle = document.getElementById("vm-iframe-resize-handle");
    if (resizeHandle) {
      resizeHandle.style.display = "none";
    }

    // ボタンのアイコンを変更（YouTube風の全画面解除アイコン）
    fullscreenBtn.innerHTML = `<span style="display:inline-block; position:relative; width:16px; height:16px; vertical-align:middle;">
      <span style="position:absolute; top:1px; left:1px; width:3px; height:3px; border-right:1px solid currentColor; border-bottom:1px solid currentColor;"></span>
      <span style="position:absolute; top:1px; right:1px; width:3px; height:3px; border-left:1px solid currentColor; border-bottom:1px solid currentColor;"></span>
      <span style="position:absolute; bottom:1px; left:1px; width:3px; height:3px; border-right:1px solid currentColor; border-top:1px solid currentColor;"></span>
      <span style="position:absolute; bottom:1px; right:1px; width:3px; height:3px; border-left:1px solid currentColor; border-top:1px solid currentColor;"></span>
    </span>`;
    fullscreenBtn.title = "元のサイズに戻す";

    // bodyのmarginをリセット
    if (currentPaneMode === PANE_MODE_RESIZE) {
      document.body.style.marginRight = "0";
    }
  } else {
    // 元のサイズに戻す
    const got = await storageGet([PANE_WIDTH_KEY, IFRAME_HEIGHT_KEY]);
    const savedWidth = got[PANE_WIDTH_KEY] || DEFAULT_PANE_WIDTH;
    const savedHeight = got[IFRAME_HEIGHT_KEY] || DEFAULT_IFRAME_HEIGHT;

    pane.style.width = `${savedWidth}px`;
    pane.style.left = "auto";

    // bodyの中身を表示
    const children = Array.from(body.children);
    children.forEach(child => {
      child.style.display = "";
    });

    // iframeコンテナの親要素のスタイルをリセット
    const iframeParent = iframeContainer.parentElement;
    if (iframeParent) {
      iframeParent.style.marginBottom = "";
      iframeParent.style.height = "";
    }

    // iframeコンテナを元のサイズに
    iframeContainer.style.height = `${savedHeight}px`;

    // リサイズハンドルを再表示
    const resizeHandle = document.getElementById("vm-iframe-resize-handle");
    if (resizeHandle) {
      resizeHandle.style.display = "";
    }

    // ボタンのアイコンを変更
    fullscreenBtn.innerHTML = `<span style="display:inline-block; vertical-align:middle;">⛶</span>`;
    fullscreenBtn.title = "全画面化";
    fullscreenBtn.style.fontSize = "16px";

    // bodyのmarginを復元
    if (currentPaneMode === PANE_MODE_RESIZE) {
      document.body.style.marginRight = `${savedWidth}px`;
    }
  }
}

function wireFullscreenToggleHandler() {
  const btn = document.getElementById("vm-fullscreen-toggle");
  if (!btn) return;

  // ホバー効果
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#f8f9fa";
    btn.style.borderColor = "#0060CE";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#ffffff";
    btn.style.borderColor = "#e0e0e0";
  });

  btn.addEventListener("click", async () => {
    await toggleFullscreen();
  });
}

function updateBodyMarginForResize(width) {
  if (currentPaneMode === PANE_MODE_RESIZE) {
    document.body.style.marginRight = `${width}px`;
  }
}

function clearBodyMargin() {
  document.body.style.marginRight = "";
  document.body.style.transition = "";
}

function wireResizeHandler() {
  const handle = document.getElementById("vm-resize-handle");
  const pane = document.getElementById(SIDE_PANE_ID);
  if (!handle || !pane) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let activePointerId = null;

  // ホバーエフェクト
  handle.addEventListener("mouseenter", () => {
    if (!isResizing) {
      handle.style.background = "rgba(0, 96, 206, 0.08)";
      const gripBar = handle.querySelector("div");
      if (gripBar) {
        gripBar.style.background = "#0060CE";
        gripBar.style.height = "56px";
        gripBar.style.boxShadow = "0 1px 4px rgba(0, 96, 206, 0.2)";
      }
    }
  });

  handle.addEventListener("mouseleave", () => {
    if (!isResizing) {
      handle.style.background = "transparent";
      const gripBar = handle.querySelector("div");
      if (gripBar) {
        gripBar.style.background = "#d0d0d0";
        gripBar.style.height = "48px";
        gripBar.style.boxShadow = "";
      }
    }
  });

  const finishResize = async () => {
    if (!isResizing) return;

    isResizing = false;
    if (activePointerId !== null) {
      try {
        handle.releasePointerCapture(activePointerId);
      } catch {}
      activePointerId = null;
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    // iframeのポインターイベントを復元
    const iframe = document.getElementById("vm-iframe");
    if (iframe) iframe.style.pointerEvents = "";

    // ハンドルの見た目を通常に戻す
    handle.style.background = "transparent";
    const gripBar = handle.querySelector("div");
    if (gripBar) {
      gripBar.style.background = "#d0d0d0";
      gripBar.style.height = "48px";
      gripBar.style.boxShadow = "";
    }

    // 幅を保存
    const width = pane.offsetWidth;
    await storageSet({ [PANE_WIDTH_KEY]: width });
  };

  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return; // 左クリックのみ
    isResizing = true;
    activePointerId = e.pointerId;
    startX = e.clientX;
    startWidth = pane.offsetWidth;
    try {
      handle.setPointerCapture(activePointerId);
    } catch {}
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    // iframeのポインターイベントを無効化（ドラッグ中にiframeがマウスを奪うのを防ぐ）
    const iframe = document.getElementById("vm-iframe");
    if (iframe) iframe.style.pointerEvents = "none";

    // ドラッグ中の見た目
    handle.style.background = "rgba(0, 96, 206, 0.15)";
    const gripBar = handle.querySelector("div");
    if (gripBar) {
      gripBar.style.background = "#0060CE";
      gripBar.style.height = "64px";
      gripBar.style.boxShadow = "0 2px 8px rgba(0, 96, 206, 0.3)";
    }

    e.preventDefault();
  });

  handle.addEventListener("pointermove", (e) => {
    if (!isResizing || e.pointerId !== activePointerId) return;
    const deltaX = startX - e.clientX;
    let newWidth = startWidth + deltaX;

    // 幅の制限（画面サイズに応じて動的上限）
    const maxWidth = getMaxPaneWidth();
    newWidth = Math.max(MIN_PANE_WIDTH, Math.min(maxWidth, newWidth));

    pane.style.width = `${newWidth}px`;

    // リサイズモードの場合、bodyのmarginも更新
    updateBodyMarginForResize(newWidth);

    // デフォルト動作を防ぐ（テキスト選択など）
    e.preventDefault();
  });

  const endResize = async (e) => {
    if (!isResizing || (e && e.pointerId !== activePointerId)) return;
    await finishResize();
  };

  handle.addEventListener("pointerup", endResize);
  handle.addEventListener("pointercancel", endResize);
  document.addEventListener("pointerup", endResize);
  // ウィンドウからフォーカスが外れた場合の対策
  window.addEventListener("blur", async () => {
    await finishResize();
  });
}

// ========== iframe リサイズハンドル ==========

function wireIframeResizeHandler() {
  const handle = document.getElementById("vm-iframe-resize-handle");
  const container = document.getElementById("vm-iframe-container");
  const iframe = document.getElementById("vm-iframe");
  if (!handle || !container) return;

  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  const finishResize = async () => {
    if (!isResizing) return;

    isResizing = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    // iframeのポインターイベントを復元
    if (iframe) iframe.style.pointerEvents = "";

    // ハンドルの見た目を通常に戻す
    handle.style.background = "transparent";

    // 高さを保存
    const height = container.offsetHeight;
    await storageSet({ [IFRAME_HEIGHT_KEY]: height });
  };

  handle.addEventListener("mouseenter", () => {
    if (!isResizing) {
      handle.style.background = "rgba(0, 96, 206, 0.2)";
      handle.style.height = "8px";
      handle.style.bottom = "-1px";
    }
  });

  handle.addEventListener("mouseleave", () => {
    if (!isResizing) {
      handle.style.background = "transparent";
      handle.style.height = "6px";
      handle.style.bottom = "0";
    }
  });

  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = container.offsetHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    // リサイズ中はiframeがマウスイベントを奪わないようにする
    if (iframe) iframe.style.pointerEvents = "none";

    handle.style.background = "rgba(0, 96, 206, 0.4)";

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    if (e.buttons !== 1) {
      finishResize();
      return;
    }

    const deltaY = e.clientY - startY;
    let newHeight = startHeight + deltaY;

    // 高さの制限
    newHeight = Math.max(MIN_IFRAME_HEIGHT, Math.min(MAX_IFRAME_HEIGHT, newHeight));

    container.style.height = `${newHeight}px`;

    e.preventDefault();
  });

  document.addEventListener("mouseup", async () => {
    await finishResize();
  });

  window.addEventListener("mouseup", async () => {
    await finishResize();
  });

  window.addEventListener("blur", async () => {
    await finishResize();
  });
}

// ========== ペイントグル ==========

async function togglePane() {
  const store = await loadStore();
  const pane = document.getElementById(SIDE_PANE_ID);

  if (pane && pane.style.display !== "none") {
    // ペインが開いている場合は閉じる
    if (isGenerating) {
      alert(t("pane.cannotCloseWhileGeneratingAlert"));
      return;
    }
    await ensureCollapsed(store);
  } else {
    // ペインが閉じている場合は開く
    // AtCoderの場合、コンテスト中チェック
    if (isAtCoderTaskPage()) {
      const contestStatus = checkContestStatus();
      if (contestStatus.status !== "ok") {
        alert(contestStatus.message);
        return;
      }
    }
    await ensureExpanded(store);

    if (store.versions.length) {
      refreshVersionSelect(store);
      const id = store.activeId || store.versions[0].id;
      await applyVersion(store, id);
    } else {
      refreshVersionSelect(store);
      setStatus(t("pane.notGenerated"));
      setPrimaryButtonLabel(false);
    }
  }
}

// ========== メッセージリスナー ==========

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "TOGGLE_PANE") {
    togglePane().catch((e) => console.warn("[PlayPage] toggle error:", e));
    sendResponse({ ok: true });
  }
  return true;
});

// ========== メイン初期化 ==========

async function init() {
  if (isInitialized) return;
  isInitialized = true;

  // Load current language setting
  if (window.I18N) {
    currentLang = await window.I18N.getCurrentLanguage();
  }
}

init().catch((e) => console.warn("[PlayPage] init error:", e));

} // end of __VM_CONTENT_LOADED__ guard
