// i18n (Internationalization) module for PlayPage

{
const I18N_LANG_KEY = "vm_language";
const DEFAULT_LANG = "ja";

// Message definitions
const messages = {
  ja: {
    // Options page
    "options.title": "PlayPage - Options",
    "options.information": "情報",
    "options.basicSettings": "基本設定",
    "options.provider": "プロバイダー",
    "options.providerGeminiApi": "Gemini API (api.google.dev)",
    "options.providerVertexExpress": "Vertex AI Express Mode (90日間無料)",
    "options.providerVertexStandard": "Vertex AI Standard (OAuth認証)",
    "options.providerHint": "プロバイダーの選択: Gemini APIは従来の方式、Vertex AI Express Modeは90日間無料トライアル付き、Vertex AI StandardはOAuth認証の本格版です。",
    "options.apiKey": "Gemini API Key",
    "options.apiKeyHint": "APIキーは本拡張機能の <code>chrome.storage.local</code> に保存されます。",
    "options.apiKeyHintLink": "APIキーの発行方法",
    "options.model": "Gemini Model",
    "options.modelHint": "例: <code>gemini-3.1-pro-preview</code> <code>gemini-3.1-flash-preview</code> <code>gemini-3.1-flash-lite-preview</code> など。推奨：<code>gemini-3.1-pro-preview</code>",
    "options.vertexApiKey": "Google Cloud API Key",
    "options.vertexApiKeyHint": "Google Cloud APIキーは本拡張機能の <code>chrome.storage.local</code> に保存されます。",
    "options.vertexApiKeyHintLink": "APIキーの発行方法",
    "options.vertexModel": "Vertex AI Model",
    "options.vertexModelHint": "例: <code>gemini-3.1-pro-preview</code> <code>gemini-3.1-flash-preview</code> <code>gemini-3.1-flash-lite-preview</code> など。推奨：<code>gemini-3.1-pro-preview</code>",
    "options.vertexProjectId": "Google Cloud Project ID",
    "options.vertexProjectIdHint": "Google Cloud ProjectのID（例: my-project-123456）を入力してください。プロジェクト<strong>名</strong>ではなく、プロジェクト<strong>ID</strong>です。<a href=\"https://console.cloud.google.com/\" target=\"_blank\" rel=\"noopener\">Google Cloud Console</a>の上部、プロジェクト選択ドロップダウンで確認できます。",
    "options.vertexLocation": "Location (Region)",
    "options.vertexLocationHint": "例: <code>us-central1</code>, <code>asia-northeast1</code>, <code>europe-west1</code>など。",
    "options.vertexOAuthClientId": "OAuth 2.0 Client ID",
    "options.vertexOAuthClientIdHint": "Google Cloud ConsoleでOAuth 2.0 Client IDを作成してください。アプリケーションタイプは「<strong>ウェブ アプリケーション</strong>」を選択し、承認済みのリダイレクトURIに <code>https://&lt;拡張機能ID&gt;.chromiumapp.org/</code> を追加してください。付与スコープは <code>cloud-platform.read-only</code>（Vertex AI 呼び出しに必要な最小権限）です。<br><a href=\"https://console.cloud.google.com/apis/credentials\" target=\"_blank\" rel=\"noopener\">認証情報ページ</a>",
    "options.vertexStandardModel": "Vertex AI Model",
    "options.vertexStandardModelHint": "例: <code>gemini-2.5-pro</code> <code>gemini-2.5-flash</code>など。推奨：<code>gemini-2.5-pro</code>",
    "options.authStatus": "認証状態",
    "options.authStatusNotAuthenticated": "未認証",
    "options.authStatusAuthenticated": "認証済み",
    "options.authenticate": "Googleアカウントで認証",
    "options.revokeAuth": "認証を解除",
    "options.authSuccess": "認証に成功しました",
    "options.authFailed": "認証に失敗しました: {error}",
    "options.authRevoked": "認証を解除しました",
    "options.redirectUriLabel": "承認済みのリダイレクトURIに追加してください（OAuth Client ID作成時に必要）：",
    "options.copyToClipboard": "コピー",
    "options.copiedToClipboard": "コピーしました",
    "options.save": "保存",
    "options.test": "接続テスト",
    "options.saved": "保存しました",
    "options.testing": "テスト中...",
    "options.apiKeyNotSet": "API Key が未設定です",
    "options.testOk": "OK: Gemini に接続できました",
    "options.testNg": "NG: {error}",
    "options.language": "言語 / Language",
    "options.languageHint": "拡張機能のUIとプロンプトの言語を選択します。",

    // Prompt settings
    "options.promptSettings": "プロンプト設定",
    "options.promptGeneric": "一般サイト用プロンプト",
    "options.promptGenericHint": "特定のサイト用プロンプトにマッチしないサイトで使用されるデフォルトのプロンプトです。",
    "options.promptSiteSpecific": "特定のサイト用プロンプト",
    "options.promptSiteSpecificHint": "URLがマッチするサイトでは、一般サイト用ではなくこちらのプロンプトが使用されます。",
    "options.addSitePrompt": "+ サイトを追加",
    "options.siteUrl": "サイトURL",
    "options.siteUrlPlaceholder": "例: https://example.com/",
    "options.sitePrompt": "プロンプト",
    "options.removeSite": "削除",
    "options.resetDefault": "デフォルトに戻す",
    "options.promptResetGeneric": "一般サイト用プロンプトをデフォルトに戻しました（保存するには「保存」を押してください）",
    "options.sitePromptReset": "このサイトのプロンプトをデフォルトに戻しました（保存するには「保存」を押してください）",

    // Privacy
    "options.privacyTitle": "プライバシーとデータ送信",
    "options.privacyHint": "生成ボタンを押すと閲覧中ページのHTMLをGemini/Vertex AIへ送信します。最初の一度だけ同意を取得し、ここで状態を確認・リセットできます。",
    "options.privacyStatusLabel": "データ送信の同意",
    "options.privacyStatusConsented": "同意済み",
    "options.privacyStatusNotConsented": "未同意",
    "options.privacyShowPolicy": "プライバシーポリシーを表示",
    "options.privacyReset": "同意をリセット",
    "options.privacyResetDone": "同意をリセットしました",

    // Data management
    "options.dataManagement": "データのインポート・エクスポート",
    "options.allData": "全データ",
    "options.allDataHint": "設定とアプリ履歴データをバックアップ・復元できます。",
    "options.exportAll": "全データをエクスポート",
    "options.importAll": "全データをインポート",
    "options.historyOnly": "履歴データのみ",
    "options.historyOnlyHint": "アプリの履歴データのみを全て削除します。API Key、使用モデル、プロンプト設定は保持されます。",
    "options.exportClearHistory": "履歴をエクスポート＆全削除",
    "options.exporting": "エクスポート中...",
    "options.exportComplete": "エクスポート完了しました",
    "options.exportFailed": "エクスポート失敗: {error}",
    "options.importing": "インポート中...",
    "options.importComplete": "インポート完了しました",
    "options.importFailed": "インポート失敗: {error}",
    "options.importCancelled": "インポートをキャンセルしました",
    "options.invalidDataFormat": "無効なデータ形式です",
    "options.importConfirm": "インポートすると、既存のデータが上書きされます。\n履歴データは統合されますが、同じIDのデータは上書きされます。\n\n続行しますか？",
    "options.exportHistoryConfirm": "履歴データをエクスポートした後、すべての履歴を削除します。\n（API Key やプロンプト設定は保持されます）\n\n続行しますか？",
    "options.cancelled": "キャンセルしました",
    "options.exportingHistory": "履歴データをエクスポート中...",
    "options.noHistoryToDelete": "削除する履歴データがありません",
    "options.exportCompleteDeleting": "エクスポート完了。履歴を削除中...",
    "options.historyDeleteComplete": "完了: {count}件の履歴データをエクスポート＆削除しました",
    "options.error": "エラー: {error}",
    "options.monthlyCostTitle": "拡張の利用料金（月ごと）",
    "options.monthlyCostHint": "利用料金の概算を月ごとに表示します。",
    "options.noCostHistory": "コスト履歴がありません",
    "options.costEstimateNote": "※ 料金は概算です。正確な料金はGoogle Cloudコンソールでご確認ください。",
    "options.requestCount": "リクエスト回数",
    "options.totalTokens": "合計トークン数",
    "options.avgCostPerRequest": "平均コスト/回",

    // Content script (side pane)
    "pane.title": "PlayPage",
    "pane.modeFloat": "📌 フロート",
    "pane.modeResize": "↔️ リサイズ",
    "pane.modeFloatTooltip": "クリックでリサイズモードに切り替え（Webページ幅が変化）",
    "pane.modeResizeTooltip": "クリックでフロートモードに切り替え（Webページ上に重なる）",
    "pane.close": "閉じる",
    "pane.generate": "生成",
    "pane.regenerate": "再生成",
    "pane.options": "Options",
    "pane.versionSelect": "バージョン選択:",
    "pane.freePromptInitial": "アプリ化したいもの（任意）",
    "pane.freePromptRegenerate": "改善用プロンプト（任意）",
    "pane.freePromptInitialPlaceholder": "例: アルゴリズムの動き / グラフ構造 / データの変化 など",
    "pane.freePromptRegeneratePlaceholder": "例: もっとインタラクティブに / グラフを追加 など",
    "pane.description": "アプリの説明",
    "pane.noDescription": "説明がありません。",
    "pane.resizeHandle": "ドラッグしてリサイズ",
    "pane.apiKeyNotSet": "API Key が未設定です。Options を開いて設定してください。",
    "pane.generating": "生成中... (1〜3分ほどお待ちください)",
    "pane.regenerating": "再生成中... (1〜3分ほどお待ちください)",
    "pane.alreadyGenerating": "既に生成処理が実行中です",
    "pane.generateComplete": "生成完了 ({time}秒): {title}",
    "pane.generateFailed": "失敗 ({time}秒): {error}",
    "pane.versionNotFound": "指定バージョンが見つかりません",
    "pane.notGenerated": "未生成です。「生成」を押してください。",
    "pane.cannotCloseWhileGenerating": "生成中は折りたたみできません",
    "pane.cannotCloseWhileGeneratingAlert": "生成中は閉じることができません",
    "pane.privacyTitle": "データ送信の同意",
    "pane.privacyBody": "本拡張はアプリ生成のため、閲覧中ページのHTML全体をGemini/Vertex AIへ送信します。個人情報が含まれる場合があります。送信に同意してください。",
    "pane.privacyAccept": "同意して続行",
    "pane.privacyDecline": "キャンセル",
    "pane.privacyPolicy": "プライバシーポリシーを表示",
    "pane.privacyRequired": "生成するにはデータ送信への同意が必要です。",
    "pane.cost": "コスト",
    "pane.tokensFormat": "入力: {input} / 出力: {output} tokens",
    "pane.useSelection": "選択部分のHTMLのみを使用",
    "pane.deleteVersion": "このバージョンを削除",
    "pane.deleteVersionConfirm": "バージョン「{version}」を削除しますか？\nこの操作は取り消せません。",
    "pane.noVersionToDelete": "削除できるバージョンがありません",

    // Contest status (AtCoder)
    "contest.timeError": "コンテスト時刻の取得に失敗しました。安全のため利用を制限します。",
    "contest.duringContest": "AtCoderの開催中のコンテストでの本拡張機能の利用はルール違反となる可能性があります。詳細はこちらを参照してください：https://info.atcoder.jp/entry/llm-rules-ja"
  },

  en: {
    // Options page
    "options.title": "PlayPage - Options",
    "options.information": "Information",
    "options.basicSettings": "Basic Settings",
    "options.provider": "Provider",
    "options.providerGeminiApi": "Gemini API (api.google.dev)",
    "options.providerVertexExpress": "Vertex AI Express Mode (90-day free trial)",
    "options.providerVertexStandard": "Vertex AI Standard (OAuth)",
    "options.providerHint": "Provider selection: Gemini API is the traditional method, Vertex AI Express Mode has a 90-day free trial, Vertex AI Standard uses OAuth authentication.",
    "options.apiKey": "Gemini API Key",
    "options.apiKeyHint": "The API key is stored in <code>chrome.storage.local</code> of this extension.",
    "options.apiKeyHintLink": "How to get an API key",
    "options.model": "Gemini Model",
    "options.modelHint": "Examples: <code>gemini-3.1-pro-preview</code>, <code>gemini-3.1-flash-preview</code>, <code>gemini-3.1-flash-lite-preview</code>, etc. Recommended: <code>gemini-3.1-pro-preview</code>",
    "options.vertexApiKey": "Google Cloud API Key",
    "options.vertexApiKeyHint": "The Google Cloud API key is stored in <code>chrome.storage.local</code> of this extension.",
    "options.vertexApiKeyHintLink": "How to get an API key",
    "options.vertexModel": "Vertex AI Model",
    "options.vertexModelHint": "Examples: <code>gemini-3.1-pro-preview</code>, <code>gemini-3.1-flash-preview</code>, <code>gemini-3.1-flash-lite-preview</code>, etc. Recommended: <code>gemini-3.1-pro-preview</code>",
    "options.vertexProjectId": "Google Cloud Project ID",
    "options.vertexProjectIdHint": "Enter your Google Cloud Project ID (e.g., my-project-123456). This is the project <strong>ID</strong>, not the project <strong>name</strong>. You can find it in the project selector dropdown at the top of <a href=\"https://console.cloud.google.com/\" target=\"_blank\" rel=\"noopener\">Google Cloud Console</a>.",
    "options.vertexLocation": "Location (Region)",
    "options.vertexLocationHint": "Examples: <code>us-central1</code>, <code>asia-northeast1</code>, <code>europe-west1</code>, etc.",
    "options.vertexOAuthClientId": "OAuth 2.0 Client ID",
    "options.vertexOAuthClientIdHint": "Create an OAuth 2.0 Client ID in Google Cloud Console. Select \"<strong>Web application</strong>\" and add <code>https://&lt;extension-id&gt;.chromiumapp.org/</code> as an authorized redirect URI. The requested scope is <code>cloud-platform.read-only</code>, the minimum needed for Vertex AI inference.<br><a href=\"https://console.cloud.google.com/apis/credentials\" target=\"_blank\" rel=\"noopener\">Credentials page</a>",
    "options.vertexStandardModel": "Vertex AI Model",
    "options.vertexStandardModelHint": "Examples: <code>gemini-2.5-pro</code>, <code>gemini-2.5-flash</code>, etc. Recommended: <code>gemini-2.5-pro</code>",
    "options.authStatus": "Authentication Status",
    "options.authStatusNotAuthenticated": "Not Authenticated",
    "options.authStatusAuthenticated": "Authenticated",
    "options.authenticate": "Authenticate with Google",
    "options.revokeAuth": "Revoke Authentication",
    "options.authSuccess": "Authentication successful",
    "options.authFailed": "Authentication failed: {error}",
    "options.authRevoked": "Authentication revoked",
    "options.redirectUriLabel": "Authorized redirect URI (required for OAuth Client ID)",
    "options.copyToClipboard": "Copy",
    "options.copiedToClipboard": "Copied",
    "options.save": "Save",
    "options.test": "Test Connection",
    "options.saved": "Saved",
    "options.testing": "Testing...",
    "options.apiKeyNotSet": "API Key is not set",
    "options.testOk": "OK: Successfully connected to Gemini",
    "options.testNg": "NG: {error}",
    "options.language": "Language / 言語",
    "options.languageHint": "Select the language for the extension UI and prompts.",

    // Prompt settings
    "options.promptSettings": "Prompt Settings",
    "options.promptGeneric": "Generic Site Prompt",
    "options.promptGenericHint": "This is the default prompt used for sites that don't match any site-specific prompts.",
    "options.promptSiteSpecific": "Site-Specific Prompts",
    "options.promptSiteSpecificHint": "For sites matching these URLs, the site-specific prompt will be used instead of the generic one.",
    "options.addSitePrompt": "+ Add Site",
    "options.siteUrl": "Site URL",
    "options.siteUrlPlaceholder": "e.g., https://example.com/",
    "options.sitePrompt": "Prompt",
    "options.removeSite": "Remove",
    "options.resetDefault": "Reset to Default",
    "options.promptResetGeneric": "Generic prompt has been reset to default (click 'Save' to apply)",
    "options.sitePromptReset": "Site prompt has been reset to default (click 'Save' to apply)",

    // Privacy
    "options.privacyTitle": "Privacy & Data Sending",
    "options.privacyHint": "Clicking Generate sends the current page HTML to Gemini/Vertex AI. Consent is asked once; review or reset it here.",
    "options.privacyStatusLabel": "Data send consent",
    "options.privacyStatusConsented": "Consented",
    "options.privacyStatusNotConsented": "Not consented",
    "options.privacyShowPolicy": "View privacy policy",
    "options.privacyReset": "Reset consent",
    "options.privacyResetDone": "Consent has been reset",

    // Data management
    "options.dataManagement": "Import / Export Data",
    "options.allData": "All Data",
    "options.allDataHint": "Backup and restore settings and App history data.",
    "options.exportAll": "Export All Data",
    "options.importAll": "Import All Data",
    "options.historyOnly": "History Data Only",
    "options.historyOnlyHint": "Delete all App history data. API Key, model, and prompt settings will be preserved.",
    "options.exportClearHistory": "Export & Delete All History",
    "options.exporting": "Exporting...",
    "options.exportComplete": "Export completed",
    "options.exportFailed": "Export failed: {error}",
    "options.importing": "Importing...",
    "options.importComplete": "Import completed",
    "options.importFailed": "Import failed: {error}",
    "options.importCancelled": "Import cancelled",
    "options.invalidDataFormat": "Invalid data format",
    "options.importConfirm": "Importing will overwrite existing data.\nHistory data will be merged, but entries with the same ID will be overwritten.\n\nContinue?",
    "options.exportHistoryConfirm": "After exporting history data, all history will be deleted.\n(API Key and prompt settings will be preserved)\n\nContinue?",
    "options.cancelled": "Cancelled",
    "options.exportingHistory": "Exporting history data...",
    "options.noHistoryToDelete": "No history data to delete",
    "options.exportCompleteDeleting": "Export complete. Deleting history...",
    "options.historyDeleteComplete": "Complete: Exported and deleted {count} history entries",
    "options.error": "Error: {error}",
    "options.monthlyCostTitle": "Usage Cost (Monthly)",
    "options.monthlyCostHint": "Displays estimated usage costs by month.",
    "options.noCostHistory": "No cost history available",
    "options.costEstimateNote": "* Cost estimates are approximate. Please check the Google Cloud Console for accurate pricing.",
    "options.requestCount": "Requests",
    "options.totalTokens": "Total Tokens",
    "options.avgCostPerRequest": "Avg. Cost/Request",

    // Content script (side pane)
    "pane.title": "PlayPage",
    "pane.modeFloat": "📌 Float",
    "pane.modeResize": "↔️ Resize",
    "pane.modeFloatTooltip": "Click to switch to resize mode (web page width changes)",
    "pane.modeResizeTooltip": "Click to switch to float mode (overlays on web page)",
    "pane.close": "Close",
    "pane.generate": "Generate",
    "pane.regenerate": "Regenerate",
    "pane.options": "Options",
    "pane.versionSelect": "Version:",
    "pane.freePromptInitial": "What to create an app for (optional)",
    "pane.freePromptRegenerate": "Improvement prompt (optional)",
    "pane.freePromptInitialPlaceholder": "e.g., Algorithm flow / Graph structure / Data changes",
    "pane.freePromptRegeneratePlaceholder": "e.g., Make it more interactive / Add graphs",
    "pane.description": "App Description",
    "pane.noDescription": "No description available.",
    "pane.resizeHandle": "Drag to resize",
    "pane.apiKeyNotSet": "API Key is not set. Please open Options to configure it.",
    "pane.generating": "Generating... (please wait 1-3 minutes)",
    "pane.regenerating": "Regenerating... (please wait 1-3 minutes)",
    "pane.alreadyGenerating": "Generation is already in progress",
    "pane.generateComplete": "Generation complete ({time}s): {title}",
    "pane.generateFailed": "Failed ({time}s): {error}",
    "pane.versionNotFound": "Specified version not found",
    "pane.notGenerated": "Not generated yet. Click 'Generate' to start.",
    "pane.cannotCloseWhileGenerating": "Cannot collapse while generating",
    "pane.cannotCloseWhileGeneratingAlert": "Cannot close while generating",
    "pane.privacyTitle": "Consent for data sending",
    "pane.privacyBody": "To generate an app, this extension sends the full HTML of the page you are viewing to Gemini/Vertex AI. It may contain personal data. Please consent to sending.",
    "pane.privacyAccept": "Agree and continue",
    "pane.privacyDecline": "Cancel",
    "pane.privacyPolicy": "View privacy policy",
    "pane.privacyRequired": "Consent is required before sending data.",
    "pane.cost": "Cost",
    "pane.tokensFormat": "Input: {input} / Output: {output} tokens",
    "pane.useSelection": "Use selected HTML only",
    "pane.deleteVersion": "Delete this version",
    "pane.deleteVersionConfirm": "Delete version \"{version}\"?\nThis action cannot be undone.",
    "pane.noVersionToDelete": "No version to delete",

    // Contest status (AtCoder)
    "contest.timeError": "Failed to get contest time. Usage is restricted for safety.",
    "contest.duringContest": "Using this extension during an ongoing AtCoder contest may violate the rules. Please refer to: https://info.atcoder.jp/entry/llm-rules-ja"
  }
};

// Default prompts for each language
const defaultPrompts = {
  ja: {
    atcoder: String.raw`プログラミングの課題の問題文と仕様、サンプル入出力が与えられるので、動作理解のために役立つ、問題文の内容を忠実に表現したアプリをJavaScriptで作成してください。

入力用のインターフェースを作っても良いが、必ず標準入力を自由に入力できるようにして、サンプルケースはボタンを押すだけで簡単に適用できるようにすること。
また、動作理解に役立つサンプルケースやコーナーケース、オーバーフローとなるケース等をいくつか独自に考えて追加してもよい。

与えた入力に対して、全探索やシミュレーションで、確実に答えを計算し、その出力や過程も表示するようにしてください。

アプリ部分についての表現は自由とするが、以下の点には気をつけること

- mod 998244353 などで「有理数」の出力を求められた場合
  - 本来の出力（整数）と、有理数での出力（分数表記 1/3 など）を両方表示すること

【重要な制約】
- 外部CDN（https://cdn.jsdelivr.net/, https://unpkg.com/ など）からのスクリプトやライブラリの読み込みは禁止です
- <script src="https://..."></script> のような外部スクリプトタグは使用できません
- すべてのコードをHTMLファイル内にインラインで記述してください

【利用可能なライブラリ】
以下のライブラリはすでに読み込まれており、グローバル変数として利用可能です：
- Chart.js: グラフ描画用 (window.Chart)
- KaTeX: 数式レンダリング用 (window.katex)
  - 数式は $ $ または $$ $$ で囲むと自動レンダリングされます

グラフを描画する場合はChart.jsを使ってください。数式を表示する場合は $ $ または $$ $$ で囲んでください。

アプリの説明（descriptionフィールド）は必ず日本語で記述してください。`,

    generic: String.raw`Webページの内容が与えられるので、その内容を理解するためのインタラクティブなアプリをJavaScriptで作成してください。

以下の点に注意してください：
- ページの主要な情報を視覚的にわかりやすく表示すること
- ユーザーが操作できるインタラクティブな要素を含めること
- 必要に応じて入力フォームや操作パネルを設けること
- シンプルで使いやすいUIを心がけること

【重要な制約】
- 外部CDN（https://cdn.jsdelivr.net/, https://unpkg.com/ など）からのスクリプトやライブラリの読み込みは禁止です
- <script src="https://..."></script> のような外部スクリプトタグは使用できません
- すべてのコードをHTMLファイル内にインラインで記述してください

【利用可能なライブラリ】
以下のライブラリはすでに読み込まれており、グローバル変数として利用可能です：
- Chart.js: グラフ描画用 (window.Chart)
- KaTeX: 数式レンダリング用 (window.katex)
  - 数式は $ $ または $$ $$ で囲むと自動レンダリングされます
  - 例: $E = mc^2$ または $$\int_{0}^{\infty} e^{-x} dx = 1$$

グラフを描画する場合はChart.jsを使ってください。数式を表示する場合は $ $ または $$ $$ で囲んでください（自動的にレンダリングされます）。

アプリの説明（descriptionフィールド）は必ず日本語で記述してください。`
  },

  en: {
    atcoder: String.raw`Given the problem statement, specifications, and sample inputs/outputs of a programming problem, create a JavaScript app that faithfully represents the problem content and helps understand its behavior.

You may create an input interface, but make sure to allow free input of standard input, and make it easy to apply sample cases with just a button click.
You may also add some custom sample cases, corner cases, and overflow cases that help understand the behavior.

For the given input, calculate the answer reliably using brute force or simulation, and display both the output and the process.

The visual representation is up to you, but pay attention to the following:

- When the output requires "rational numbers" with mod 998244353 etc.
  - Display both the original output (integer) and the rational number output (fraction notation like 1/3)

【IMPORTANT CONSTRAINTS】
- Loading scripts or libraries from external CDNs (https://cdn.jsdelivr.net/, https://unpkg.com/, etc.) is PROHIBITED
- External script tags like <script src="https://..."></script> are NOT allowed
- All code must be written inline within the HTML file

【AVAILABLE LIBRARIES】
The following libraries are already loaded and available as global variables:
- Chart.js: For drawing graphs (window.Chart)
- KaTeX: For rendering mathematical expressions (window.katex)
  - Math expressions enclosed in $ $ or $$ $$ will be automatically rendered

If you need to draw graphs, use Chart.js. If you need to display mathematical expressions, enclose them in $ $ or $$ $$.

The app description (description field) must be written in English.`,

    generic: String.raw`Given the content of a web page, create an interactive JavaScript app to help understand the content.

Please note the following:
- Display the main information of the page in a visually clear manner
- Include interactive elements that users can manipulate
- Add input forms or control panels as needed
- Keep the UI simple and easy to use

【IMPORTANT CONSTRAINTS】
- Loading scripts or libraries from external CDNs (https://cdn.jsdelivr.net/, https://unpkg.com/, etc.) is PROHIBITED
- External script tags like <script src="https://..."></script> are NOT allowed
- All code must be written inline within the HTML file

【AVAILABLE LIBRARIES】
The following libraries are already loaded and available as global variables:
- Chart.js: For drawing graphs (window.Chart)
- KaTeX: For rendering mathematical expressions (window.katex)
  - Math expressions enclosed in $ $ or $$ $$ will be automatically rendered
  - Example: $E = mc^2$ or $$\int_{0}^{\infty} e^{-x} dx = 1$$

If you need to draw graphs, use Chart.js. If you need to display mathematical expressions, enclose them in $ $ or $$ $$ (they will be automatically rendered).

The app description (description field) must be written in English.`
  }
};

// Get current language
async function getCurrentLanguage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([I18N_LANG_KEY], (result) => {
      resolve(result[I18N_LANG_KEY] || DEFAULT_LANG);
    });
  });
}

// Set current language
async function setCurrentLanguage(lang) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [I18N_LANG_KEY]: lang }, resolve);
  });
}

// Get message by key
function getMessage(lang, key, params = {}) {
  const langMessages = messages[lang] || messages[DEFAULT_LANG];
  let message = langMessages[key] || messages[DEFAULT_LANG][key] || key;

  // Replace placeholders like {error}, {time}, etc.
  for (const [param, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
  }

  return message;
}

// Get default prompt by language and type
function getDefaultPrompt(lang, type) {
  const langPrompts = defaultPrompts[lang] || defaultPrompts[DEFAULT_LANG];
  return langPrompts[type] || defaultPrompts[DEFAULT_LANG][type];
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.I18N = {
    getCurrentLanguage,
    setCurrentLanguage,
    getMessage,
    getDefaultPrompt,
    DEFAULT_LANG,
    I18N_LANG_KEY
  };
}

}
