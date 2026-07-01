# ResumeAI Chrome Extension 🚀

ResumeAI is a production-ready, client-side secure Chrome Extension built using **React**, **Vite**, **Tailwind CSS**, and **Manifest V3**. When visiting any job posting page on **LinkedIn**, **Naukri**, **Indeed**, **Foundit**, or **Wellfound**, the extension automatically extracts the job description and uses AI to perform detailed ATS scoring, side-by-side keyword optimization, personalized cover letter generation, and custom interview guides.

---

## Key Features

1. **Local & Secure Text Extraction**:
   - Resumes uploaded in **PDF** or **DOCX** are parsed entirely client-side using `pdfjs-dist` and `mammoth`.
   - Your resumes are never sent to external servers; only raw text is shared securely with the OpenAI completions pipeline.
2. **Auto-Scrape Active Job Posting**:
   - The extension content script scrapes job title, company name, location, and the full job description.
   - Built-in selectors specifically target **LinkedIn**, **Indeed**, **Naukri**, **Foundit**, and **Wellfound** with a generic fallback scraper for other job portals.
3. **Structured ATS Match**:
   - Renders matching percentage gauges, matched vs. missing keyword analytics, and specific resume recommendations.
4. **Interactive Side-by-Side Optimizer**:
   - Displays original sections next to AI-optimized professional summaries, industry skill tag arrays, metric-oriented bullet achievements, and project summaries.
5. **Cover Letter Builder**:
   - Generates beautifully structured letters with custom copy utilities and native document exporters for standard PDF and Word DOCX files.
6. **21-Question Simulated Prep Guide**:
   - Generates exact interview guides covering 7 HR, 7 Technical, and 7 Behavioral questions with suggested model responses utilizing the STAR methodology.
7. **Secure API Key Sync**:
   - Syncs your OpenAI API Key securely to `chrome.storage.local`.

---

## Folder Architecture

```
resume-ai-extension/
│
├── public/                 # Static public assets (e.g. extension icon.png)
│
├── src/
│   ├── popup/              # Popup interface entry points (500px by 600px UI)
│   ├── options/            # Fullscreen Option interface entry points (sidebar dashboard)
│   ├── pages/              # Navigation sub-views (Dashboard, Analyze, Optimize, CoverLetter, Prep, Settings)
│   ├── services/           # Storage handlers, PDF/DOCX local parsers, OpenAI fetch APIs
│   ├── utils/              # PDF and DOCX client exporters using jsPDF and DOCX.js
│   └── index.css           # Global custom stylesheet, scrollbars, and animations
│
├── manifest.json           # Manifest V3 Configuration
├── tailwind.config.js      # Tailwind v4 configuration properties
├── postcss.config.js       # PostCSS plugins
├── vite.config.js          # Vite build rollup script with custom extension compilation plugin
└── README.md
```

---

## Setup & Installation Instructions

### 1. Build from Source Code
Ensure that Node.js (version 18+) is installed on your local system, then run:

```bash
# 1. Install all dependencies
npm install

# 2. Compile for Chrome Extension
npm run build
```

This outputs a production-ready folder in the `/dist` directory.

### 2. Load the Extension into Google Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` by typing it into the address bar.
3. Turn on the **Developer mode** switch in the top-right corner.
4. Click on the **Load unpacked** button in the top-left corner.
5. Select the `/dist` directory in your workspace folder.
6. The extension is now successfully installed! Pin the extension for quick access.

### 3. Setup Your OpenAI Key
1. Click on the **ResumeAI** extension icon to open the popup.
2. Click **Fullscreen** or navigate directly to the **Settings** tab.
3. Paste your OpenAI API Key (`sk-proj-...`).
4. Enter your profile details and click **Save Configuration**.
5. You are ready to start scanning jobs and boosting your career placement success!
