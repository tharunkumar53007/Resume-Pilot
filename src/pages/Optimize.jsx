import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, FileCheck, ArrowRight, ShieldAlert, Cpu, Download, FileDown, Edit3, Save, X, Plus, Trash2, User } from 'lucide-react';
import { generateResume } from '../services/openai';
import { storage } from '../services/storage';
import { exportResumeToPDF, exportResumeToDocx, getSafeFileName } from '../utils/export';

export default function Optimize({ activeAnalysis, setActiveAnalysis }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Structured Original Resume State
  const [currentResume, setCurrentResume] = useState(null);

  // Sandbox editing states for AI Optimized Resume
  const [isEditing, setIsEditing] = useState(false);
  const [tempSummary, setTempSummary] = useState('');
  const [tempSkills, setTempSkills] = useState('');
  const [tempWork, setTempWork] = useState([]);
  const [tempProjects, setTempProjects] = useState([]);

  useEffect(() => {
    loadOriginalProfile();
  }, [activeAnalysis]);

  const loadOriginalProfile = async () => {
    const profile = await storage.getUserProfile();
    if (profile && profile.structured) {
      setCurrentResume(profile.structured);
    } else if (activeAnalysis && activeAnalysis.resumeText) {
      // Create parsed structured format from raw resume text as fallback
      const fallbackName = profile.name || "Candidate Name";
      const fallbackTitle = profile.title || activeAnalysis.jobTitle || "Software Engineer";
      
      const fallback = {
        name: fallbackName,
        title: fallbackTitle,
        email: "",
        phone: "",
        location: activeAnalysis.location || "",
        summary: "Experienced professional with history of delivering high-quality web applications.",
        skills: activeAnalysis.matchedKeywords || [],
        work: [
          {
            company: activeAnalysis.companyName || "Previous Company",
            position: fallbackTitle,
            location: "",
            date: "Present",
            bullets: ["Collaborated with team members to ship high-impact features."]
          }
        ],
        projects: [],
        education: [],
        certifications: [],
        languages: []
      };
      setCurrentResume(fallback);
      
      // Save it into user profile so we have it structured
      await storage.setUserProfile({
        ...profile,
        structured: fallback
      });
    }
  };

  const handleGenerateOptimization = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = await storage.getAiProvider();
      let apiKey = provider === 'gemini' ? await storage.getGeminiApiKey() : await storage.getApiKey();
      
      // Auto-prefill Gemini key if none is stored
      if (!apiKey && provider === 'gemini') {
        apiKey = "";
        await storage.setGeminiApiKey(apiKey);
      }

      if (!apiKey) {
        throw new Error("AI API Key is missing. Navigate to Settings to enter your key.");
      }

      if (!activeAnalysis || !activeAnalysis.resumeText || !activeAnalysis.jobDescription) {
        throw new Error("No active analysis found. Please analyze a resume and job first.");
      }

      // Read current structured resume state (to optimize actual previous experiences!)
      const resumeToOptimize = currentResume || {
        name: activeAnalysis.resumeText.split('\n')[0] || "Candidate Name",
        title: activeAnalysis.jobTitle || "Software Engineer",
        resumeText: activeAnalysis.resumeText
      };

      // Execute resume optimization AI call passing structured resume JSON
      const optResult = await generateResume(resumeToOptimize, activeAnalysis.jobDescription, apiKey);
      
      // Update the active analysis with optimized properties
      const updatedAnalysis = {
        ...activeAnalysis,
        optimized: optResult
      };

      // Update in history list in storage
      const history = await storage.getHistory();
      const updatedHistory = history.map(item => item.id === activeAnalysis.id ? updatedAnalysis : item);
      await storage.set('analysis_history', updatedHistory);

      setActiveAnalysis(updatedAnalysis);
      setSaveSuccess('Optimized resume sections generated successfully!');
      setTimeout(() => setSaveSuccess(''), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save edits on the Original/Current Resume side (Left Card)
  const handleSaveOriginalResume = async () => {
    if (!currentResume) return;
    try {
      const profile = await storage.getUserProfile();
      const updatedProfile = {
        ...profile,
        name: currentResume.name || "",
        title: currentResume.title || "",
        structured: currentResume
      };
      
      await storage.setUserProfile(updatedProfile);
      
      // If activeAnalysis is present, update the resumeText with freshly saved content
      if (activeAnalysis) {
        const updatedAnalysis = {
          ...activeAnalysis,
          resumeText: `${currentResume.name}\n${currentResume.title}\n\n${currentResume.summary}\n\nWork History:\n${JSON.stringify(currentResume.work)}\n\nSkills:\n${currentResume.skills.join(', ')}`
        };
        setActiveAnalysis(updatedAnalysis);
      }

      setSaveSuccess('Original Resume details saved successfully!');
      setTimeout(() => setSaveSuccess(''), 2500);
    } catch (err) {
      setError(`Failed to save original resume details: ${err.message}`);
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Sandbox handlers for Optimized Output (Right Card)
  const handleStartEdit = () => {
    if (!optData) return;
    setTempSummary(optData.professionalSummary || '');
    setTempSkills(optData.skills ? optData.skills.join(', ') : '');
    setTempWork(optData.work ? JSON.parse(JSON.stringify(optData.work)) : []);
    setTempProjects(optData.projects ? JSON.parse(JSON.stringify(optData.projects)) : []);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!activeAnalysis) return;
    
    // Parse skills back into array
    const parsedSkills = tempSkills.split(',').map(s => s.trim()).filter(Boolean);

    const updatedOpt = {
      ...optData,
      professionalSummary: tempSummary,
      skills: parsedSkills,
      work: tempWork,
      projects: tempProjects
    };

    const updatedAnalysis = {
      ...activeAnalysis,
      optimized: updatedOpt
    };

    // Update in history list in storage
    const history = await storage.getHistory();
    const updatedHistory = history.map(item => item.id === activeAnalysis.id ? updatedAnalysis : item);
    await storage.set('analysis_history', updatedHistory);

    setActiveAnalysis(updatedAnalysis);
    setIsEditing(false);
    
    setSaveSuccess('AI optimization updates saved successfully!');
    setTimeout(() => setSaveSuccess(''), 2500);
  };

  // Premium Exports with Alphanumeric Filenames
  const handleExportPDFResume = async () => {
    if (!optData || !currentResume) return;
    const profile = await storage.getUserProfile();
    const userName = currentResume.name || profile.name || "My";
    const companyName = activeAnalysis.companyName || "Match";
    const filename = getSafeFileName(userName, companyName, "Resume", "pdf");
    
    exportResumeToPDF(currentResume, optData, filename);
  };

  const handleExportDocxResume = async () => {
    if (!optData || !currentResume) return;
    const profile = await storage.getUserProfile();
    const userName = currentResume.name || profile.name || "My";
    const companyName = activeAnalysis.companyName || "Match";
    const filename = getSafeFileName(userName, companyName, "Resume", "docx");
    
    await exportResumeToDocx(currentResume, optData, filename);
  };

  const handleExportJsonResume = async () => {
    if (!currentResume) return;
    const profile = await storage.getUserProfile();
    const userName = currentResume.name || profile.name || "My";
    const companyName = activeAnalysis.companyName || "Match";
    const filename = getSafeFileName(userName, companyName, "Structured_Resume", "json");
    
    const exportData = {
      original: currentResume,
      optimized: optData
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const optData = activeAnalysis?.optimized;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
          Resume <span className="text-gradient">Optimizer Editor</span>
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Edit your previous resume details directly, let the AI optimize them side-by-side, and verify every single change.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-400" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {!activeAnalysis ? (
        <div className="glass-panel p-8 rounded-2xl text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-brand-primary/10 rounded-full text-brand-primary">
            <Cpu className="w-10 h-10" />
          </div>
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-white">No Resume Loaded</h2>
            <p className="text-gray-400 text-xs mt-1">
              Please upload your resume and run compatibility analysis in the "Analyze Resume" tab to populate structured documents.
            </p>
          </div>
        </div>
      ) : !optData ? (
        /* Optimization Generator Invitation Card */
        <div className="glass-panel p-8 rounded-2xl text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-2 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Structure and Optimize Resume for Job</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              We parsed your resume successfully! Click below to let the AI rewrite your professional summary, core skills, and actual work achievements to align precisely with <span className="text-white font-medium">"{activeAnalysis.jobTitle}"</span>.
            </p>
          </div>

          <button
            onClick={handleGenerateOptimization}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-purple-pink text-white font-semibold rounded-xl text-xs hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50 transition-all flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Optimizing Actual Experiences...
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5" />
                Generate Tailored AI Edits
              </>
            )}
          </button>
        </div>
      ) : (
        /* Side-by-Side Optimizer Dashboard */
        <div className="space-y-4">
          
          {/* Sub Tab Panel & Export Button */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
            <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl max-w-lg overflow-x-auto shrink-0">
              {[
                { id: 'summary', name: 'Summary' },
                { id: 'skills', name: 'ATS Skills' },
                { id: 'work', name: 'Work History' },
                { id: 'projects', name: 'Projects' },
                { id: 'info', name: 'Contact & Education' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsEditing(false); // Reset sandbox edits on tab switch
                  }}
                  className={`flex-1 text-center px-2.5 py-2 text-[10px] md:text-xs font-semibold rounded-lg transition-all ${
                    activeTab === tab.id ? 'bg-gradient-purple-pink text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPDFResume}
                className="px-3 py-2 bg-gradient-purple-pink text-white rounded-xl text-[10px] font-bold hover:shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all flex items-center gap-1.5"
                title="Download premium styled Slate & Indigo PDF Resume"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export PDF Resume
              </button>

              <button
                onClick={handleExportDocxResume}
                className="px-3 py-2 bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 border border-[#06B6D4]/25 text-[#06B6D4] hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5"
                title="Download beautiful corporate MS Word resume"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export Word Resume
              </button>

              <button
                onClick={handleExportJsonResume}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5"
                title="Download JSON schema containing both original and AI optimized profiles"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON Resume
              </button>
            </div>
          </div>

          {/* Side by Side Comparative Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Card: Original / Current Editable Resume */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between border-white/5 relative bg-white/[0.01]">
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={handleSaveOriginalResume}
                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1.5 text-[10px] font-bold"
                  title="Save original resume edits back to storage"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Original
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">My Current Resume (Editable)</span>
                </div>

                <div className="min-h-[250px] max-h-[450px] overflow-y-auto pr-1 space-y-4 text-xs text-gray-300">
                  {currentResume ? (
                    <>
                      {activeTab === 'summary' && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Resume Summary</label>
                          <textarea
                            value={currentResume.summary || ''}
                            onChange={e => setCurrentResume({ ...currentResume, summary: e.target.value })}
                            className="w-full h-40 glass-input p-3 text-xs leading-relaxed resize-none bg-dark-bg focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>
                      )}

                      {activeTab === 'skills' && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Skills / Keywords (Comma-separated)</label>
                          <textarea
                            value={currentResume.skills ? currentResume.skills.join(', ') : ''}
                            onChange={e => {
                              const list = e.target.value.split(',').map(s => s.trim());
                              setCurrentResume({ ...currentResume, skills: list });
                            }}
                            className="w-full h-40 glass-input p-3 text-xs leading-relaxed resize-none bg-dark-bg focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>
                      )}

                      {activeTab === 'work' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Previous Work Experiences</span>
                            <button
                              onClick={() => {
                                const newJob = { company: "New Company", position: "Software Engineer", location: "", date: "Present", bullets: ["Responsible for..."] };
                                setCurrentResume({ ...currentResume, work: [...(currentResume.work || []), newJob] });
                              }}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-gray-300 flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3 h-3" /> Add Job
                            </button>
                          </div>
                          
                          {currentResume.work && currentResume.work.map((job, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2 relative">
                              <button
                                onClick={() => {
                                  const updatedWork = currentResume.work.filter((_, i) => i !== idx);
                                  setCurrentResume({ ...currentResume, work: updatedWork });
                                }}
                                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                                title="Remove Job"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[8px] text-gray-500 font-bold uppercase block">Company</label>
                                  <input
                                    type="text"
                                    value={job.company || ''}
                                    onChange={e => {
                                      const updatedWork = [...currentResume.work];
                                      updatedWork[idx].company = e.target.value;
                                      setCurrentResume({ ...currentResume, work: updatedWork });
                                    }}
                                    className="w-full glass-input px-2 py-1 text-xs font-sans"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] text-gray-500 font-bold uppercase block">Position</label>
                                  <input
                                    type="text"
                                    value={job.position || ''}
                                    onChange={e => {
                                      const updatedWork = [...currentResume.work];
                                      updatedWork[idx].position = e.target.value;
                                      setCurrentResume({ ...currentResume, work: updatedWork });
                                    }}
                                    className="w-full glass-input px-2 py-1 text-xs font-sans"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] text-gray-500 font-bold uppercase block">Dates Worked</label>
                                  <input
                                    type="text"
                                    value={job.date || ''}
                                    onChange={e => {
                                      const updatedWork = [...currentResume.work];
                                      updatedWork[idx].date = e.target.value;
                                      setCurrentResume({ ...currentResume, work: updatedWork });
                                    }}
                                    className="w-full glass-input px-2 py-1 text-xs font-sans"
                                    placeholder="e.g. 2021 - Present"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] text-gray-500 font-bold uppercase block">Location</label>
                                  <input
                                    type="text"
                                    value={job.location || ''}
                                    onChange={e => {
                                      const updatedWork = [...currentResume.work];
                                      updatedWork[idx].location = e.target.value;
                                      setCurrentResume({ ...currentResume, work: updatedWork });
                                    }}
                                    className="w-full glass-input px-2 py-1 text-xs font-sans"
                                    placeholder="e.g. Remote"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Job Bullets (One per line)</label>
                                <textarea
                                  value={job.bullets ? job.bullets.join('\n') : ''}
                                  onChange={e => {
                                    const updatedWork = [...currentResume.work];
                                    updatedWork[idx].bullets = e.target.value.split('\n');
                                    setCurrentResume({ ...currentResume, work: updatedWork });
                                  }}
                                  className="w-full h-24 glass-input p-2 text-xs font-sans resize-none leading-relaxed"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'projects' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Featured Projects</span>
                            <button
                              onClick={() => {
                                const newProj = { title: "New Project", description: "Project description details..." };
                                setCurrentResume({ ...currentResume, projects: [...(currentResume.projects || []), newProj] });
                              }}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-gray-300 flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3 h-3" /> Add Project
                            </button>
                          </div>

                          {currentResume.projects && currentResume.projects.map((proj, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2 relative">
                              <button
                                onClick={() => {
                                  const updatedProjs = currentResume.projects.filter((_, i) => i !== idx);
                                  setCurrentResume({ ...currentResume, projects: updatedProjs });
                                }}
                                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                                title="Remove Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Project Title</label>
                                <input
                                  type="text"
                                  value={proj.title || ''}
                                  onChange={e => {
                                    const updatedProjs = [...currentResume.projects];
                                    updatedProjs[idx].title = e.target.value;
                                    setCurrentResume({ ...currentResume, projects: updatedProjs });
                                  }}
                                  className="w-full glass-input px-2 py-1 text-xs font-sans font-semibold text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Project Description</label>
                                <textarea
                                  value={proj.description || ''}
                                  onChange={e => {
                                    const updatedProjs = [...currentResume.projects];
                                    updatedProjs[idx].description = e.target.value;
                                    setCurrentResume({ ...currentResume, projects: updatedProjs });
                                  }}
                                  className="w-full h-20 glass-input p-2 text-xs font-sans resize-none leading-relaxed"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'info' && (
                        <div className="space-y-4">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Personal & Education Details</span>
                          
                          <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-3">
                            <h4 className="text-[10px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-brand-primary" /> Basic Information
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Full Name</label>
                                <input
                                  type="text"
                                  value={currentResume.name || ''}
                                  onChange={e => setCurrentResume({ ...currentResume, name: e.target.value })}
                                  className="w-full glass-input px-2 py-1 text-xs font-sans"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Professional Headline</label>
                                <input
                                  type="text"
                                  value={currentResume.title || ''}
                                  onChange={e => setCurrentResume({ ...currentResume, title: e.target.value })}
                                  className="w-full glass-input px-2 py-1 text-xs font-sans"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Email Address</label>
                                <input
                                  type="email"
                                  value={currentResume.email || ''}
                                  onChange={e => setCurrentResume({ ...currentResume, email: e.target.value })}
                                  className="w-full glass-input px-2 py-1 text-xs font-sans"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Phone Number</label>
                                <input
                                  type="text"
                                  value={currentResume.phone || ''}
                                  onChange={e => setCurrentResume({ ...currentResume, phone: e.target.value })}
                                  className="w-full glass-input px-2 py-1 text-xs font-sans"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Location (City, State / Remote)</label>
                                <input
                                  type="text"
                                  value={currentResume.location || ''}
                                  onChange={e => setCurrentResume({ ...currentResume, location: e.target.value })}
                                  className="w-full glass-input px-2 py-1 text-xs font-sans"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[8px] text-gray-500 font-bold uppercase block">Professional Profiles (URLs - One per line)</label>
                              <textarea
                                value={currentResume.links ? currentResume.links.join('\n') : ''}
                                onChange={e => {
                                  const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
                                  setCurrentResume({ ...currentResume, links: lines });
                                }}
                                className="w-full h-16 glass-input p-2 text-xs font-sans resize-none leading-relaxed"
                                placeholder="e.g. linkedin.com/in/user"
                              />
                            </div>
                          </div>

                          <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Education Settings</span>
                              <button
                                onClick={() => {
                                  const newEdu = { institution: "University Name", studyType: "Degree Name", date: "Year" };
                                  setCurrentResume({ ...currentResume, education: [...(currentResume.education || []), newEdu] });
                                }}
                                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[8px] font-bold text-gray-300 flex items-center gap-1 transition-all"
                              >
                                <Plus className="w-2.5 h-2.5" /> Add
                              </button>
                            </div>

                            {currentResume.education && currentResume.education.map((edu, idx) => (
                              <div key={idx} className="bg-white/5 border border-white/5 p-2 rounded-xl relative grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedEdu = currentResume.education.filter((_, i) => i !== idx);
                                    setCurrentResume({ ...currentResume, education: updatedEdu });
                                  }}
                                  className="absolute top-1 right-1 p-0.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all animate-fade-in"
                                  title="Remove Education"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                
                                <div className="col-span-1">
                                  <label className="text-[7px] text-gray-500 font-bold uppercase block">Degree / Major</label>
                                  <input
                                    type="text"
                                    value={edu.studyType || ''}
                                    onChange={e => {
                                      const updatedEdu = [...currentResume.education];
                                      updatedEdu[idx].studyType = e.target.value;
                                      setCurrentResume({ ...currentResume, education: updatedEdu });
                                    }}
                                    className="w-full glass-input px-1.5 py-0.5 text-[10px] font-sans"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <label className="text-[7px] text-gray-500 font-bold uppercase block">Institution</label>
                                  <input
                                    type="text"
                                    value={edu.institution || ''}
                                    onChange={e => {
                                      const updatedEdu = [...currentResume.education];
                                      updatedEdu[idx].institution = e.target.value;
                                      setCurrentResume({ ...currentResume, education: updatedEdu });
                                    }}
                                    className="w-full glass-input px-1.5 py-0.5 text-[10px] font-sans"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <label className="text-[7px] text-gray-500 font-bold uppercase block">Grad Date / Year</label>
                                  <input
                                    type="text"
                                    value={edu.date || ''}
                                    onChange={e => {
                                      const updatedEdu = [...currentResume.education];
                                      updatedEdu[idx].date = e.target.value;
                                      setCurrentResume({ ...currentResume, education: updatedEdu });
                                    }}
                                    className="w-full glass-input px-1.5 py-0.5 text-[10px] font-sans"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-white/5 border border-white/5 p-3 rounded-xl grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[8px] text-gray-500 font-bold uppercase block">Certifications & Honors (Comma-separated)</label>
                              <textarea
                                value={currentResume.certifications ? currentResume.certifications.join(', ') : ''}
                                onChange={e => {
                                  const list = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                                  setCurrentResume({ ...currentResume, certifications: list });
                                }}
                                className="w-full h-16 glass-input p-2 text-xs font-sans resize-none leading-relaxed"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-500 font-bold uppercase block">Languages (Comma-separated)</label>
                              <textarea
                                value={currentResume.languages ? currentResume.languages.join(', ') : ''}
                                onChange={e => {
                                  const list = e.target.value.split(',').map(l => l.trim()).filter(Boolean);
                                  setCurrentResume({ ...currentResume, languages: list });
                                }}
                                className="w-full h-16 glass-input p-2 text-xs font-sans resize-none leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-gray-500 text-xs">Loading structured profile...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Card: Optimized AI Resume Sandbox Editor */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between border-brand-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.06)] relative bg-white/[0.01]">
              
              {/* Copy & Edit Action Buttons */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1 text-[10px] font-bold"
                      title="Save Sandbox Edits"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save AI Updates
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                      title="Cancel Edit"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartEdit}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-brand-primary/10 border border-white/5 text-gray-400 hover:text-white transition-all flex items-center gap-1 text-[10px] font-semibold"
                      title="Edit sandbox optimized resume content"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Sandbox Edit
                    </button>
                    <button
                      onClick={() => {
                        let content = '';
                        if (activeTab === 'summary') content = optData.professionalSummary;
                        else if (activeTab === 'skills') content = optData.skills.join(', ');
                        else if (activeTab === 'work') content = JSON.stringify(optData.work, null, 2);
                        else if (activeTab === 'projects') content = JSON.stringify(optData.projects, null, 2);
                        handleCopy(content, activeTab);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-brand-primary/10 border border-white/5 text-gray-400 hover:text-white transition-all"
                      title="Copy Optimized Section Content"
                    >
                      {copiedText === activeTab ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Optimized AI Output</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                </div>
                
                <div className="min-h-[250px] max-h-[450px] overflow-y-auto pr-1 text-xs text-gray-300">
                  {isEditing ? (
                    /* Active Sandbox Inline Editor Inputs */
                    <div className="space-y-4 animate-fade-in-up">
                      {activeTab === 'summary' && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tailored Summary Sandbox</label>
                          <textarea
                            value={tempSummary}
                            onChange={e => setTempSummary(e.target.value)}
                            className="w-full h-40 glass-input p-3 text-xs leading-relaxed resize-none"
                          />
                        </div>
                      )}
                      
                      {activeTab === 'skills' && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tailored ATS Skills Sandbox</label>
                          <textarea
                            value={tempSkills}
                            onChange={e => setTempSkills(e.target.value)}
                            className="w-full h-40 glass-input p-3 text-xs leading-relaxed resize-none"
                          />
                        </div>
                      )}

                      {activeTab === 'work' && (
                        <div className="space-y-4">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tailor Bullets under Actual Jobs</span>
                          
                          {tempWork.map((job, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2">
                              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                                <span className="font-bold text-white text-xs">{job.company || "Job Company"}</span>
                                <span className="text-gray-400 font-medium text-[10px]">{job.date || "Job Dates"}</span>
                              </div>
                              
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Position Title</label>
                                <input
                                  type="text"
                                  value={job.position || ''}
                                  onChange={e => {
                                    const updated = [...tempWork];
                                    updated[idx].position = e.target.value;
                                    setTempWork(updated);
                                  }}
                                  className="w-full glass-input px-2 py-1 text-xs font-sans text-brand-primary font-bold"
                                />
                              </div>

                              <div>
                                <label className="text-[8px] text-gray-500 font-bold uppercase block">Optimized Bullets (One per line)</label>
                                <textarea
                                  value={job.bullets ? job.bullets.join('\n') : ''}
                                  onChange={e => {
                                    const updated = [...tempWork];
                                    updated[idx].bullets = e.target.value.split('\n');
                                    setTempWork(updated);
                                  }}
                                  className="w-full h-28 glass-input p-2 text-xs font-sans resize-none leading-relaxed"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'projects' && (
                        <div className="space-y-4">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tailored Project Sandbox</span>
                          
                          {tempProjects.map((proj, idx) => (
                            <div key={idx} className="space-y-2 bg-white/5 border border-white/5 p-3 rounded-xl">
                              <input
                                type="text"
                                value={proj.title || ''}
                                onChange={e => {
                                  const updated = [...tempProjects];
                                  updated[idx].title = e.target.value;
                                  setTempProjects(updated);
                                }}
                                className="w-full glass-input px-2 py-1 text-xs font-bold text-white"
                                placeholder="Project Title"
                              />
                              <textarea
                                value={proj.description || ''}
                                onChange={e => {
                                  const updated = [...tempProjects];
                                  updated[idx].description = e.target.value;
                                  setTempProjects(updated);
                                }}
                                className="w-full h-20 glass-input p-2 text-xs resize-none leading-relaxed"
                                placeholder="Project Description"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'info' && (
                        <div className="bg-brand-primary/5 border border-brand-primary/10 p-4 rounded-xl space-y-2 text-center text-[11px] text-gray-400">
                          Personal info and education fields are parsed directly from your Original Resume profile. 
                          Please use the fields in the Left Card to update them, and they will automatically merge during export!
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Static Display Outputs */
                    <div className="space-y-4">
                      {activeTab === 'summary' && (
                        <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {optData.professionalSummary}
                        </p>
                      )}

                      {activeTab === 'skills' && (
                        <div className="flex flex-wrap gap-1.5">
                          {optData.skills && optData.skills.map((skill, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {activeTab === 'work' && (
                        <div className="space-y-4">
                          {optData.work && optData.work.length > 0 ? (
                            optData.work.map((job, i) => (
                              <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-white text-xs">{job.position}</span>
                                  <span className="text-[10px] text-gray-400 font-medium">{job.date}</span>
                                </div>
                                <div className="text-brand-accent font-bold text-[10px]">{job.company} {job.location ? `| ${job.location}` : ''}</div>
                                <ul className="space-y-1.5 pl-1.5 mt-1">
                                  {job.bullets && job.bullets.map((bullet, k) => (
                                    <li key={k} className="text-gray-300 text-xs flex items-start gap-1.5 leading-relaxed">
                                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                      <span>{bullet}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-500 py-4">No optimized experience matches. Click sandbox edit to add manually!</div>
                          )}
                        </div>
                      )}

                      {activeTab === 'projects' && (
                        <div className="space-y-4">
                          {optData.projects && optData.projects.length > 0 ? (
                            optData.projects.map((project, i) => (
                              <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-1">
                                <h4 className="text-xs font-extrabold text-white flex items-center gap-1">
                                  <FileCheck className="w-3.5 h-3.5 text-brand-accent" />
                                  {project.title}
                                </h4>
                                <p className="text-gray-300 text-[11px] leading-relaxed">
                                  {project.description}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-500 py-4">No optimized projects. Click sandbox edit to add manually!</div>
                          )}
                        </div>
                      )}

                      {activeTab === 'info' && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Original Profile Elements (For Export Merging)</h4>
                          
                          {currentResume ? (
                            <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-2 text-[11px]">
                              <div><span className="text-gray-500 font-medium">Name:</span> <span className="text-white font-bold">{currentResume.name}</span></div>
                              <div><span className="text-gray-500 font-medium">Headline:</span> <span className="text-gray-300">{currentResume.title}</span></div>
                              <div><span className="text-gray-500 font-medium">Email:</span> <span className="text-gray-300 font-mono">{currentResume.email || "(Not set)"}</span></div>
                              <div><span className="text-gray-500 font-medium">Phone:</span> <span className="text-gray-300 font-mono">{currentResume.phone || "(Not set)"}</span></div>
                              <div><span className="text-gray-500 font-medium">Location:</span> <span className="text-gray-300">{currentResume.location || "(Not set)"}</span></div>
                              
                              {currentResume.education && currentResume.education.length > 0 && (
                                <div className="pt-2 border-t border-white/5 mt-2 space-y-1">
                                  <span className="text-gray-500 font-medium uppercase text-[9px] tracking-wider block">Education</span>
                                  {currentResume.education.map((edu, k) => (
                                    <div key={k} className="text-gray-300 text-[10px]">
                                      • <span className="text-white font-bold">{edu.studyType}</span> at <span className="font-semibold">{edu.institution}</span> ({edu.date})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 py-2">Profile loading...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
