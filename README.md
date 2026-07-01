# ResumePilot Chrome Extension 🚀

[![React](https://img.shields.io/badge/React-19.2.6-blue.svg?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0.12-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.0-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4.svg?logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)

ResumePilot is a production-ready, client-side secure Chrome Extension built using **React**, **Vite**, **Tailwind CSS**, and **Manifest V3**. When visiting any job posting page on **LinkedIn**, **Naukri**, **Indeed**, **Foundit**, or **Wellfound**, the extension automatically extracts the job description and uses AI (OpenAI & Google Gemini supported) to perform detailed ATS scoring, side-by-side keyword optimization, personalized cover letter generation, and custom interview guides.

---

## ✨ Key Features

1. **Local & Secure Text Extraction**:
   - Resumes uploaded in **PDF** or **DOCX** are parsed entirely client-side using `pdfjs-dist` and `mammoth`.
   - Your resumes are never sent to external servers; only raw text is shared securely with your chosen AI provider.
2. **Auto-Scrape Active Job Posting**:
   - The extension content script scrapes job title, company name, location, and the full job description.
   - Built-in selectors specifically target **LinkedIn**, **Indeed**, **Naukri**, **Foundit**, and **Wellfound** with a generic fallback scraper for other job portals.
3. **Multi-Model AI Support**:
   - Seamlessly switch between **OpenAI (ChatGPT)** and **Google Gemini** models to analyze your resume.
4. **Structured ATS Match**:
   - Renders matching percentage gauges, matched vs. missing keyword analytics, and specific resume recommendations based on the job description.
5. **Interactive Side-by-Side Optimizer**:
   - Displays original sections next to AI-optimized professional summaries, industry skill tag arrays, metric-oriented bullet achievements, and project summaries.
6. **Cover Letter Builder**:
   - Generates beautifully structured letters with custom copy utilities and native document exporters for standard PDF (`jspdf`) and Word DOCX (`docx`) files.
7. **21-Question Simulated Prep Guide**:
   - Generates exact interview guides covering HR, Technical, and Behavioral questions with suggested model responses utilizing the STAR methodology.
8. **Secure API Key Sync**:
   - Syncs your OpenAI or Gemini API Keys securely to `chrome.storage.local`.

---

## 🛠️ Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4, PostCSS
- **PDF Parsing & Exporting**: pdfjs-dist, jspdf
- **DOCX Parsing & Exporting**: mammoth, docx
- **Icons**: lucide-react

---

## 📂 Folder Architecture

```
resumepilot/
│
├── public/                 # Static public assets (e.g. extension icon.png)
│
├── src/
│   ├── popup/              # Popup interface entry points (500px by 600px UI)
│   ├── options/            # Fullscreen Option interface entry points (sidebar dashboard)
│   ├── pages/              # Navigation sub-views (Dashboard, Analyze, Optimize, CoverLetter, Prep, Settings)
│   ├── services/           # Storage handlers, PDF/DOCX local parsers, OpenAI/Gemini fetch APIs
│   ├── utils/              # PDF and DOCX client exporters using jsPDF and DOCX.js
│   ├── content/            # Content scripts for web scraping
│   ├── background/         # Service workers for background tasks
│   └── index.css           # Global custom stylesheet, scrollbars, and animations
│
├── manifest.json           # Manifest V3 Configuration
├── tailwind.config.js      # Tailwind v4 configuration properties
├── postcss.config.js       # PostCSS plugins
└── vite.config.js          # Vite build rollup script with custom extension compilation plugin
```

---

## 🚀 Setup & Installation Instructions

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

### 3. Setup Your AI API Key
1. Click on the **ResumePilot** extension icon to open the popup.
2. Click **Fullscreen** or navigate directly to the **Settings** tab.
3. Select your preferred AI Provider (OpenAI or Gemini).
4. Paste your corresponding API Key.
5. Enter your profile details and click **Save Configuration**.
6. You are ready to start scanning jobs and boosting your career placement success!
