import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileScan, PenTool, Mail, HelpCircle, Settings as SettingsIcon, Maximize2, AlertCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { analyzeResume } from '../services/openai';

// Pages
import Dashboard from '../pages/Dashboard';
import Analyze from '../pages/Analyze';
import Optimize from '../pages/Optimize';
import CoverLetter from '../pages/CoverLetter';
import InterviewPrep from '../pages/InterviewPrep';
import Settings from '../pages/Settings';

export default function PopupApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoStatus, setAutoStatus] = useState('');
  const [autoError, setAutoError] = useState('');

  useEffect(() => {
    runAutoScan();
  }, []);

  // Helper to ensure content script is injected and message is sent
  const ensureContentScriptAndMessage = (tabId, message, callback) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.log("[ResumeAI] Content script not loaded yet. Injecting dynamically...");
        
        // Dynamically inject the compiled content script
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content.js"]
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Dynamic injection failed:", chrome.runtime.lastError);
            callback({ success: false, error: "Dynamic injection failed: " + chrome.runtime.lastError.message });
            return;
          }
          
          // Wait briefly for content script initialization and retry
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
              if (chrome.runtime.lastError) {
                callback({ success: false, error: "Failed to communicate with dynamically injected content script." });
              } else {
                callback(retryResponse);
              }
            });
          }, 200);
        });
      } else {
        callback(response);
      }
    });
  };

  const runAutoScan = async () => {
    setAutoError('');
    
    // 1. Fetch user profile first
    const profile = await storage.getUserProfile();
    
    // If no resume is uploaded, redirect to Analyze tab to onboard user
    if (!profile.resumeText) {
      setActiveTab('analyze');
      setAutoError("Welcome! Please upload your PDF/DOCX resume first to enable auto-matching.");
      loadActiveAnalysis();
      return;
    }

    // 2. Try to scrape the active tab
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
      // Mock scrape for browser local dev testing
      loadActiveAnalysis();
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || tabs.length === 0) {
        loadActiveAnalysis();
        return;
      }

      const activeTab = tabs[0];
      const url = activeTab.url || '';
      
      // Ignore system pages
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        loadActiveAnalysis();
        return;
      }

      ensureContentScriptAndMessage(activeTab.id, { action: "extractJob" }, async (response) => {
        if (!response || !response.success || !response.data) {
          console.log("[ResumeAI] Failed to scrape job posting or dynamic injection error.");
          loadActiveAnalysis();
          return;
        }

        const scraped = response.data;
        if (!scraped.title || scraped.title === 'Unknown Title' || !scraped.description || scraped.description.length < 100) {
          loadActiveAnalysis();
          return;
        }

        // 3. We successfully scraped a new job! Check history to see if it's already analyzed
        const history = await storage.getHistory();
        const match = history.find(item => 
          item.jobTitle.toLowerCase() === scraped.title.toLowerCase() && 
          item.companyName.toLowerCase() === scraped.company.toLowerCase()
        );

        if (match) {
          // Already analyzed, load it immediately!
          setActiveAnalysis(match);
          return;
        }

        // 4. Not analyzed yet! Run auto-analysis
        const provider = await storage.getAiProvider();
        const apiKey = provider === 'gemini' ? await storage.getGeminiApiKey() : await storage.getApiKey();

        if (!apiKey) {
          // Missing key, direct to settings and show error
          setActiveTab('settings');
          setAutoError('API Key is missing. Please select your AI Engine and save your key.');
          loadActiveAnalysis();
          return;
        }

        setAutoLoading(true);
        setAutoStatus(`Auto-Analyzing ${scraped.title}...`);
        
        try {
          const result = await analyzeResume(profile.resumeText, scraped.description, apiKey);
          const payload = {
            jobTitle: scraped.title,
            companyName: scraped.company,
            location: scraped.location,
            jobDescription: scraped.description,
            resumeText: profile.resumeText,
            ...result
          };
          
          const savedEntry = await storage.addHistoryEntry(payload);
          setActiveAnalysis(savedEntry);
          setActiveTab('dashboard');
        } catch (err) {
          console.error("Auto-analysis failed:", err);
          setAutoError(`Auto-analysis failed: ${err.message}`);
          loadActiveAnalysis();
        } finally {
          setAutoLoading(false);
        }
      });
    });
  };

  const loadActiveAnalysis = async () => {
    // Load most recent history entry as active analysis by default
    const history = await storage.getHistory();
    if (history.length > 0) {
      setActiveAnalysis(history[0]);
    }
  };

  const handleSelectHistory = (item) => {
    setActiveAnalysis(item);
    setActiveTab('dashboard');
  };

  const handleOpenFullscreen = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            activeAnalysis={activeAnalysis}
            onSelectHistory={handleSelectHistory}
            isFullscreen={false}
          />
        );
      case 'analyze':
        return (
          <Analyze
            activeAnalysis={activeAnalysis}
            setActiveAnalysis={setActiveAnalysis}
            onNavigate={setActiveTab}
          />
        );
      case 'optimize':
        return (
          <Optimize
            activeAnalysis={activeAnalysis}
            setActiveAnalysis={setActiveAnalysis}
          />
        );
      case 'coverletter':
        return (
          <CoverLetter
            activeAnalysis={activeAnalysis}
            setActiveAnalysis={setActiveAnalysis}
          />
        );
      case 'interview':
        return (
          <InterviewPrep
            activeAnalysis={activeAnalysis}
            setActiveAnalysis={setActiveAnalysis}
          />
        );
      case 'settings':
        return (
          <Settings
            onClearAll={() => {
              setActiveAnalysis(null);
              setActiveTab('settings');
            }}
          />
        );
      default:
        return null;
    }
  };

  if (autoLoading) {
    return (
      <div className="flex flex-col h-full bg-dark-bg text-dark-text overflow-hidden font-sans border border-white/[0.04] items-center justify-center p-8 text-center space-y-6">
        <div className="relative">
          {/* Outer glowing pulsing circle */}
          <div className="w-20 h-20 rounded-full bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center animate-pulse">
            <div className="w-14 h-14 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          {/* Core icon */}
          <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-xs">
            AI
          </div>
        </div>
        <div className="space-y-2 max-w-xs">
          <h2 className="text-sm font-bold text-white truncate">{autoStatus}</h2>
          <p className="text-[10px] text-gray-400">Extracting job details, performing key terminology matching, and assessing ATS scoring metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text overflow-hidden font-sans border border-white/[0.04]">
      {/* Top Banner Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          {/* Logo container */}
          <div className="w-7 h-7 rounded-lg bg-gradient-purple-pink flex items-center justify-center font-bold text-sm text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            AI
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1 font-sans">
              ResumeAI <span className="text-[10px] text-brand-accent font-semibold px-1 py-0.2 bg-brand-accent/10 border border-brand-accent/20 rounded">v1.0</span>
            </h1>
          </div>
        </div>
        <button
          onClick={handleOpenFullscreen}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all flex items-center gap-1 text-[10px] font-semibold"
          title="Open Fullscreen Dashboard"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Fullscreen
        </button>
      </header>

      {/* Dynamic Error/Onboarding Banner */}
      {autoError && (
        <div className="mx-4 mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-300 text-[10px] leading-relaxed shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{autoError}</span>
        </div>
      )}

      {/* Main Panel Area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
        {renderContent()}
      </main>

      {/* Bottom Nav Bar Navigation */}
      <nav className="flex items-center justify-around bg-[#0E0B1A]/95 border-t border-white/[0.06] py-2 shrink-0">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'analyze', icon: FileScan, label: 'Analyze' },
          { id: 'optimize', icon: PenTool, label: 'Optimize' },
          { id: 'coverletter', icon: Mail, label: 'Letter' },
          { id: 'interview', icon: HelpCircle, label: 'Prep' },
          { id: 'settings', icon: SettingsIcon, label: 'Settings' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 text-gray-500 hover:text-white transition-all duration-200 group relative"
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-gradient-purple-pink rounded-full"></span>
              )}
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-brand-primary' : 'group-hover:text-gray-300'}`} />
              <span className={`text-[9px] mt-1 font-semibold ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
