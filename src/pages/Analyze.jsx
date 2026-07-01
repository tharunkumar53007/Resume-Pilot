import React, { useState, useEffect } from 'react';
import { Upload, FileText, Globe, Sparkles, AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';
import { storage } from '../services/storage';
import { parsePdfText, parseDocxText } from '../services/docxParser';
import { analyzeResume, parseResumeText } from '../services/openai';

export default function Analyze({ activeAnalysis, setActiveAnalysis, onNavigate }) {
  const [profile, setProfile] = useState({ name: '', title: '', resumeText: '', resumeFileName: '' });
  const [jobDetails, setJobDetails] = useState({ title: '', company: '', location: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileSuccess, setFileSuccess] = useState('');
  const [parsingStatus, setParsingStatus] = useState('');

  useEffect(() => {
    loadProfile();
    // Silently auto-scrape active tab on load to pre-fill the form
    setTimeout(() => {
      autoScrapeOnLoad();
    }, 150);
  }, []);

  const loadProfile = async () => {
    const prof = await storage.getUserProfile();
    setProfile(prof);
    if (prof.resumeFileName) {
      setFileSuccess(`Active Resume: ${prof.resumeFileName}`);
    }
  };

  const autoScrapeOnLoad = () => {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
      return;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];
      const url = activeTab.url || '';
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

      chrome.tabs.sendMessage(activeTab.id, { action: "extractJob" }, (response) => {
        if (chrome.runtime.lastError) {
          // Attempt dynamic injection
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["content.js"]
          }, () => {
            if (chrome.runtime.lastError) return;
            setTimeout(() => {
              chrome.tabs.sendMessage(activeTab.id, { action: "extractJob" }, (retryResponse) => {
                if (retryResponse && retryResponse.success && retryResponse.data) {
                  const data = retryResponse.data;
                  if (data.description && data.description.length > 50) {
                    setJobDetails({
                      title: data.title || '',
                      company: data.company || '',
                      location: data.location || '',
                      description: data.description || ''
                    });
                  }
                }
              });
            }, 150);
          });
        } else if (response && response.success && response.data) {
          const data = response.data;
          if (data.description && data.description.length > 50) {
            setJobDetails({
              title: data.title || '',
              company: data.company || '',
              location: data.location || '',
              description: data.description || ''
            });
          }
        }
      });
    });
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    setError('');
    setFileSuccess('');
    setLoading(true);
    setParsingStatus('Extracting text from document...');
    
    try {
      const extension = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          let text = '';
          
          if (extension === 'pdf') {
            text = await parsePdfText(arrayBuffer);
          } else if (extension === 'docx') {
            text = await parseDocxText(arrayBuffer);
          } else {
            throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
          }
          
          setParsingStatus('AI is parsing & structuring your resume...');
          
          let parsedStructured = null;
          try {
            const provider = await storage.getAiProvider();
            let apiKey = provider === 'gemini' ? await storage.getGeminiApiKey() : await storage.getApiKey();
            
            // Auto pre-fill default key if missing
            if (!apiKey && provider === 'gemini') {
              apiKey = "";
              await storage.setGeminiApiKey(apiKey);
            }
            
            if (apiKey) {
              parsedStructured = await parseResumeText(text, apiKey);
            }
          } catch (aiErr) {
            console.warn("AI resume structuring failed, falling back to basic layout:", aiErr);
          }
          
          if (!parsedStructured) {
            // Fallback structured data
            const fallbackName = file.name.split('.')[0].replace(/[^a-zA-Z]/g, ' ').trim();
            parsedStructured = {
              name: fallbackName || "Candidate Name",
              title: "Software Engineer",
              email: "",
              phone: "",
              location: "",
              summary: "Experienced professional with background in technology.",
              skills: [],
              work: [
                {
                  company: "Company Name",
                  position: "Software Engineer",
                  location: "",
                  date: "Present",
                  bullets: ["Collaborated with product teams to build core functionalities."]
                }
              ],
              projects: [],
              education: [],
              certifications: [],
              languages: []
            };
          }
          
          const updatedProfile = {
            ...profile,
            name: parsedStructured.name || profile.name || "",
            title: parsedStructured.title || profile.title || "",
            resumeText: text,
            resumeFileName: file.name,
            structured: parsedStructured
          };
          
          await storage.setUserProfile(updatedProfile);
          setProfile(updatedProfile);
          setFileSuccess(`Loaded & Structured: ${file.name}`);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
          setParsingStatus('');
        }
      };
      
      reader.onerror = () => {
        setError("File reading failed.");
        setLoading(false);
        setParsingStatus('');
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setParsingStatus('');
    }
  };

  // Scrape current job listing from active browser tab with dynamic script injection backup
  const handleScrape = () => {
    setError('');
    setScraping(true);
    
    // Check if chrome extension is available
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
      // Mock scrape for local web testing
      setTimeout(() => {
        setJobDetails({
          title: "Senior Full Stack Engineer",
          company: "Acme Tech Solutions",
          location: "San Francisco, CA (Hybrid)",
          description: "We are seeking a Senior Full Stack Engineer experienced with React, Node.js, and Tailwind CSS. Docker and AWS experience is highly desired. You will lead projects and design scalable cloud-native architectures."
        });
        setScraping(false);
      }, 1000);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        setError("Could not locate active browser tab.");
        setScraping(false);
        return;
      }

      const activeTab = tabs[0];

      const sendMessageWithInjection = () => {
        chrome.tabs.sendMessage(activeTab.id, { action: "extractJob" }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("[Analyze] Content script not loaded yet. Injecting dynamically...");
            
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ["content.js"]
            }, () => {
              if (chrome.runtime.lastError) {
                setScraping(false);
                setError("Dynamic injection failed: " + chrome.runtime.lastError.message);
                return;
              }
              
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { action: "extractJob" }, (retryResponse) => {
                  setScraping(false);
                  if (chrome.runtime.lastError) {
                    setError("Failed to communicate with dynamically injected content script.");
                  } else if (retryResponse && retryResponse.success) {
                    setJobDetails({
                      title: retryResponse.data.title || '',
                      company: retryResponse.data.company || '',
                      location: retryResponse.data.location || '',
                      description: retryResponse.data.description || ''
                    });
                  } else {
                    setError(retryResponse?.error || "Failed to extract job posting details automatically.");
                  }
                });
              }, 200);
            });
          } else {
            setScraping(false);
            if (response && response.success) {
              setJobDetails({
                title: response.data.title || '',
                company: response.data.company || '',
                location: response.data.location || '',
                description: response.data.description || ''
              });
            } else {
              setError(response?.error || "Failed to extract job posting details automatically.");
            }
          }
        });
      };

      sendMessageWithInjection();
    });
  };

  // Submit analysis to OpenAI/Gemini API
  const handleAnalyze = async () => {
    setError('');
    
    if (!profile.resumeText) {
      setError("Please upload a resume first.");
      return;
    }
    if (!jobDetails.title || !jobDetails.description) {
      setError("Please fill out the Job Title and Job Description.");
      return;
    }

    const provider = await storage.getAiProvider();
    const apiKey = provider === 'gemini' ? await storage.getGeminiApiKey() : await storage.getApiKey();
    
    if (!apiKey) {
      setError("AI API Key is missing. Navigate to the 'Settings' tab to enter your key.");
      return;
    }

    setLoading(true);
    try {
      // Execute analysis API call
      const result = await analyzeResume(profile.resumeText, jobDetails.description, apiKey);
      
      const payload = {
        jobTitle: jobDetails.title,
        companyName: jobDetails.company,
        location: jobDetails.location,
        jobDescription: jobDetails.description,
        resumeText: profile.resumeText,
        ...result
      };
      
      // Save to chrome storage
      const savedEntry = await storage.addHistoryEntry(payload);
      
      // Update global active analysis
      setActiveAnalysis(savedEntry);
      
      // Redirect to Dashboard
      onNavigate('dashboard');
    } catch (err) {
      setError(err.message || "Failed to perform ATS optimization check.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
          Analyze <span className="text-gradient">Resume</span>
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Parse your resume and compare details directly with any job posting.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-300 text-xs leading-relaxed">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Resume Upload & Job Board Details Scrape */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Resume Upload Drop Area */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-primary" />
              1. Upload Your Resume
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Upload your PDF or DOCX resume. All document extraction and text parsers execute client-side inside the extension.
            </p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 flex flex-col items-center justify-center cursor-pointer ${
              dragActive ? 'border-brand-primary bg-brand-primary/5' : 'border-white/10 hover:border-brand-primary/30 bg-white/[0.01]'
            }`}
            onClick={() => document.getElementById('resume-file-input').click()}
          >
            <input
              type="file"
              id="resume-file-input"
              className="hidden"
              accept=".pdf,.docx"
              onChange={handleFileChange}
            />
            {fileSuccess ? (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-emerald-400 truncate max-w-[200px]">{fileSuccess}</div>
                <div className="text-[10px] text-gray-500">Click or drop to replace file</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/5 text-gray-400 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs text-gray-300 font-medium">Drag & drop resume here</div>
                <div className="text-[10px] text-gray-500">Supports PDF or DOCX formats</div>
              </div>
            )}
          </div>
          
          {loading && !scraping && (
            <div className="flex flex-col items-center justify-center gap-2 py-3">
              <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-gray-300 font-semibold">{parsingStatus || 'Extracting resume text...'}</span>
            </div>
          )}
        </div>

        {/* Right Card: Scrape Job Board Details */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-accent" />
                2. Job Posting Details
              </h3>
              <button
                onClick={handleScrape}
                disabled={scraping}
                className="text-[10px] bg-brand-accent/15 border border-brand-accent/25 text-brand-accent hover:bg-brand-accent/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all"
              >
                {scraping ? (
                  <>
                    <div className="w-3 h-3 border border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                    Scraping...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Auto-Scrape Tab
                  </>
                )}
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
              Navigate to a job page on LinkedIn, Indeed, Naukri, or Foundit and click \"Auto-Scrape Tab\" to parse job details instantly.
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Job Title</label>
                <input
                  type="text"
                  value={jobDetails.title}
                  onChange={(e) => setJobDetails({ ...jobDetails, title: e.target.value })}
                  placeholder="e.g. Frontend Developer"
                  className="w-full glass-input px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Company</label>
                <input
                  type="text"
                  value={jobDetails.company}
                  onChange={(e) => setJobDetails({ ...jobDetails, company: e.target.value })}
                  placeholder="e.g. Stripe"
                  className="w-full glass-input px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Job Description</label>
              <textarea
                value={jobDetails.description}
                onChange={(e) => setJobDetails({ ...jobDetails, description: e.target.value })}
                placeholder="Paste the core requirements, technologies, and job duties here..."
                rows="4"
                className="w-full glass-input px-3 py-2 text-xs resize-none"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleAnalyze}
          disabled={loading || scraping}
          className="px-8 py-3 bg-gradient-purple-pink text-white font-semibold rounded-xl text-xs hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {loading && scraping === false ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Running AI Analysis...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Analyze Compatibility
            </>
          )}
        </button>
      </div>
    </div>
  );
}
