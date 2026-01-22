# PlayPage

A Chrome extension that uses AI (Gemini) to analyze the content of web pages you're browsing and **instantly generate and embed interactive apps** to aid understanding.

Available for **any website**, with the ability to set customized prompts for specific sites to achieve more appropriate visualizations.

---

## 🚀 Features

### 1. Unconstrained "Free Visualization"
Unlike existing tools limited to specific formats like "mind maps" or "graphs," the AI generates **optimal algorithms and entire interactive UI code** from scratch based on the context at hand, and embeds it directly into the page.

### 2. From "Viewing" to "Experimenting"
Generated not as mere illustrations, but as working applications. You can immediately experiment by changing parameters and simulating results on the spot.

### 3. Smooth UX Through Browser Integration
No need to copy and paste into chat tools. Execute with one button, and everything from history management to prompt customization and version switching is completed within the extension.

---

## 🛠 Feature List

- **Instant Generation & Embedding**: Fast app construction using Gemini 3 Pro / Flash
- **Multiple Provider Support**: Choose from Gemini API, Vertex AI Express Mode, or Vertex AI Standard (OAuth)
- **Layout Controls**: Drag to resize the side pane width and iframe height, switch between floating and page-shrinking modes, and toggle fullscreen for the visualizer area
- **PDF / Math Aware**: Detects PDF pages, attaches the PDF binary to the AI request, and auto-injects MathJax to render LaTeX/MathML
- **Interactive Improvement**: Enhance apps with additional instructions like "add animations" or "make it more interactive"
- **Version Control**: Instantly switch between previously generated apps via dropdown
- **Cost Management**: Automatically calculate and display token usage and estimated costs per generation, with monthly cumulative totals (estimates only)
- **Site-Specific Customization**: Set dedicated prompts per URL (examples for AtCoder etc. provided by default)
- **Multi-language Support**: UI and prompts available in Japanese and English
- **Data & Privacy Management**: Edit prompts, back up/restore settings and history, export & wipe only history, and manage data-send consent after the first run

---

## 📝 Usage

### 1. Setup
1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome and enable "**Developer mode**" in the top right.
3. Click "**Load unpacked**" and select the downloaded folder (the folder containing `manifest.json`).

### 2. Initial Configuration

This extension supports **3 different providers** to choose from:

#### Option A: Gemini API (Traditional Method)
1. Right-click the extension icon > select "Options".
2. Select "**Gemini API**" as the provider.
3. Obtain and enter your [Gemini API Key](https://ai.google.dev/gemini-api/docs/api-key).
4. Click "Save" and run a "Test Connection" to verify it works.

#### Option B: Vertex AI Express Mode (90-Day Free Trial)
1. Right-click the extension icon > select "Options".
2. Select "**Vertex AI Express Mode**" as the provider.
3. Obtain a Google Cloud API Key:
   - Access [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project (or select an existing one)
   - Enable the Vertex AI API
   - Create an "API Key" on the [Credentials page](https://console.cloud.google.com/apis/credentials)
4. Enter the API key and set the model name (recommended: `gemini-3-pro-preview`).
5. Click "Save" and run a "Test Connection" to verify it works.

**Features**: Offers a 90-day free trial and is as simple to use as Gemini API with just an API key.

#### Option C: Vertex AI Standard (OAuth Authentication - Production Grade)
The most robust method using OAuth 2.0 authentication.

**Prerequisites**:
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - After creating the project, note down the **Project ID** (e.g., `my-project-123456`)
   - You can find the Project ID in the project selector dropdown (displayed below the project name)
2. Enable the Vertex AI API
   - Search for "Vertex AI API" in the [API Library](https://console.cloud.google.com/apis/library) and enable it
3. Create an OAuth 2.0 Client ID:
   - Open the [Credentials page](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted to configure consent screen, select "External" for User Type and fill in the minimum required information
   - Application type: **"Web application"**
   - Name: Any name (e.g., "PlayPage OAuth Client")
   - Under "Authorized redirect URIs", add:
     - Open PlayPage Options and select "Vertex AI Standard" - the **Authorized redirect URI** will be displayed on the page
     - Copy that URI and paste it here (format: `https://<extension-id>.chromiumapp.org/`)
   - Copy the generated Client ID (format: `xxxxx.apps.googleusercontent.com`)

**Configuration Steps**:
1. Right-click the extension icon > select "Options".
2. Select "**Vertex AI Standard (OAuth)**" as the provider.
3. Enter the following information:
   - **Google Cloud Project ID**: Your project ID (e.g., `my-project-123456`)
     - ⚠️ Enter the project **ID**, not the project **name**
     - You can find it in the project selector dropdown at the top of Google Cloud Console
   - **Location (Region)**: `us-central1` (recommended) or other regions
   - **OAuth 2.0 Client ID**: The Client ID created above (format: `xxxxx.apps.googleusercontent.com`)
   - **Model**: `gemini-2.5-pro` (recommended) or `gemini-2.5-flash`
4. Click "Save".
5. Click the **"Authenticate with Google"** button and authorize with your Google account.
6. After authentication is complete, run a "Test Connection" to verify it works.

**Important Notes**:
- Access tokens expire after approximately 1 hour. When expired, click "Authenticate with Google" again.
- Vertex AI Standard is subject to Google Cloud billing. Check the [pricing page](https://cloud.google.com/vertex-ai/pricing).

### 3. Generate, Improve, and Use Apps
1. Navigate to any web page.
2. Click the extension icon to open the side panel.
3. On first use, a consent dialog appears because the page HTML is sent to the API. Review and accept to proceed.
4. Click the "Generate" button. The app will be generated and embedded in about 1-3 minutes, ready to interact with.
5. (Optional) Enter an "improvement prompt" to regenerate based on the current app HTML and description.

#### Side Panel Tips
- 📌 toggles floating vs. shrinking the page width
- ⛶ makes only the visualizer area fullscreen / exits fullscreen
- Drag the left handle to resize pane width; drag the bottom handle to resize iframe height
- The dropdown lets you switch per-page history entries (timestamped titles) instantly

### 4. Customize Prompts (Optional)
The following settings are available on the "Options" page:
- **General Site Prompt**: Default prompt used for all sites
- **Site-Specific Prompts**: Customized prompts for specific URLs (e.g., https://atcoder.jp/)
- **Language Settings**: UI and prompt language (Japanese/English)
- **AI Model**: Select which Gemini model to use

### 5. Back Up / Restore Data & Clear History
- **Export/Import all data**: Back up settings + generated history as JSON and restore anytime
- **Export & delete history only**: Safely dump the history then wipe it; API keys and model settings remain
- **Reset consent**: Check or reset the data-send consent status from the Options → Privacy section

### 6. Cost Management
This extension automatically estimates Gemini API usage costs and displays monthly cumulative totals.

#### Features
- **Per-Generation Cost Display**: Shows token usage and estimated cost (USD) for each app generation
- **Monthly Totals**: The "Monthly Usage Cost" section in the side pane displays cumulative costs for up to the last 6 months
- **History Tracking**: Automatically saves the date, model, token count, and cost for each generation

#### About Cost Calculation
- Costs are calculated based on the [Gemini API official documentation](https://ai.google.dev/gemini-api/docs/pricing) and [Vertex AI Pricing page](https://cloud.google.com/vertex-ai/generative-ai/pricing).
- Different rates (per-token pricing for input and output) are applied for each model.
- **Important**: These costs are **estimates only**. Please check the Google Cloud Console for accurate pricing.

---

## ⚠️ Important Notes

### Usage Restrictions and Rules
- **Use on Competitive Programming Sites**:
  Using this extension during active contests on competitive programming sites like AtCoder may violate their rules. While this extension restricts usage during AtCoder contest hours, you must comply with each site's LLM usage rules (e.g., [AtCoder's LLM Usage Rules](https://info.atcoder.jp/entry/llm-rules-ja)) and apply the same caution to other competitive programming platforms.
- **Supported Sites**:
  Available on any web page accessible via HTTP/HTTPS. Setting dedicated prompts for specific sites enables more appropriate visualization.

### API & Costs
- **API Key & Authentication Management**:
  - **Gemini API**: Obtain and manage your own API key.
  - **Vertex AI Express Mode**: Obtain a Google Cloud API key (includes 90-day free trial)
  - **Vertex AI Standard**: Uses OAuth authentication (requires a Google Cloud account)
- **Costs**:
  - Gemini API pricing: [Gemini API Pricing](https://ai.google.dev/pricing)
  - Vertex AI pricing: [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
  - API usage fees are the user's responsibility.
- **Data Transmission**: The HTML content of the page you're viewing is sent to the API (Gemini API / Vertex AI). Please review Google's terms regarding data handling when using the free tier.
- **Input Size**: PDFs up to 10MB are attached. Very large HTML pages are partially trimmed, with a note included in the prompt.

### Security
- Generated code is executed within a sandboxed `iframe`. Additionally, CSP partially restricts communication to external networks so only a minimal set of requests is allowed.
- As this is AI-generated content, we cannot guarantee the safety of generated applications. Please discontinue use if you notice any suspicious behavior.

---

## 📄 License
See [LICENSE](./LICENSE) for details.
