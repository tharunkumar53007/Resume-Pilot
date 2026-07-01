import React, { useState } from 'react';
import { Sparkles, Copy, Check, FileDown, ShieldAlert, Newspaper } from 'lucide-react';
import { generateCoverLetter } from '../services/openai';
import { storage } from '../services/storage';
import { exportToPDF, exportToDocx, getSafeFileName } from '../utils/export';

export default function CoverLetter({ activeAnalysis, setActiveAnalysis }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateLetter = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = await storage.getAiProvider();
      const apiKey = provider === 'gemini' ? await storage.getGeminiApiKey() : await storage.getApiKey();
      
      if (!apiKey) {
        throw new Error("AI API Key is missing. Navigate to Settings to enter your key.");
      }

      if (!activeAnalysis || !activeAnalysis.resumeText || !activeAnalysis.jobDescription) {
        throw new Error("No active analysis found. Parse your resume in 'Analyze Resume' first.");
      }

      const letterResult = await generateCoverLetter(activeAnalysis.resumeText, activeAnalysis.jobDescription, apiKey);
      
      const updatedAnalysis = {
        ...activeAnalysis,
        coverLetter: letterResult.coverLetter
      };

      // Save updated active analysis into history
      const history = await storage.getHistory();
      const updatedHistory = history.map(item => item.id === activeAnalysis.id ? updatedAnalysis : item);
      await storage.set('analysis_history', updatedHistory);

      setActiveAnalysis(updatedAnalysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!activeAnalysis?.coverLetter) return;
    navigator.clipboard.writeText(activeAnalysis.coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePdfExport = async () => {
    if (!activeAnalysis?.coverLetter) return;
    const profile = await storage.getUserProfile();
    const userName = profile.name || "My";
    const companyName = activeAnalysis.companyName || "Match";
    const filename = getSafeFileName(userName, companyName, "Cover_Letter", "pdf");
    const title = `Cover Letter - ${activeAnalysis.jobTitle}`;
    exportToPDF(title, activeAnalysis.coverLetter, filename);
  };

  const handleDocxExport = async () => {
    if (!activeAnalysis?.coverLetter) return;
    const profile = await storage.getUserProfile();
    const userName = profile.name || "My";
    const companyName = activeAnalysis.companyName || "Match";
    const filename = getSafeFileName(userName, companyName, "Cover_Letter", "docx");
    const title = `Cover Letter - ${activeAnalysis.jobTitle} at ${activeAnalysis.companyName}`;
    await exportToDocx(title, activeAnalysis.coverLetter, filename);
  };

  const letterText = activeAnalysis?.coverLetter;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
          Cover <span className="text-gradient">Letter</span>
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Generate tailored cover letters based on your professional experience and the target job description.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {!activeAnalysis ? (
        <div className="glass-panel p-8 rounded-2xl text-center flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-brand-primary/10 rounded-full text-brand-primary">
            <Newspaper className="w-10 h-10" />
          </div>
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-white">Resume Required</h2>
            <p className="text-gray-400 text-xs mt-1">
              Please analyze a job description and upload your resume in the "Analyze Resume" tab to auto-generate personalized, highly-converting cover letters.
            </p>
          </div>
        </div>
      ) : !letterText ? (
        /* Prompt to Generate */
        <div className="glass-panel p-8 rounded-2xl text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-2 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Generate Tailored Cover Letter</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              Create a persuasive, structured cover letter specifically tailored for <span className="text-white font-semibold">{activeAnalysis.jobTitle}</span> at <span className="text-white font-semibold">{activeAnalysis.companyName}</span>.
            </p>
          </div>

          <button
            onClick={handleGenerateLetter}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-purple-pink text-white font-semibold rounded-xl text-xs hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50 transition-all flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Drafting Cover Letter...
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5" />
                Generate Cover Letter
              </>
            )}
          </button>
        </div>
      ) : (
        /* Cover Letter View & Controls */
        <div className="space-y-4">
          
          {/* Action Header Panel */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl">
            <div className="text-xs font-semibold text-gray-300">
              For: {activeAnalysis.jobTitle} at {activeAnalysis.companyName}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Text
              </button>
              <button
                onClick={handlePdfExport}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileDown className="w-3.5 h-3.5 text-brand-secondary" />
                Export PDF
              </button>
              <button
                onClick={handleDocxExport}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <FileDown className="w-3.5 h-3.5 text-brand-accent" />
                Export Word
              </button>
            </div>
          </div>

          {/* Styled Letter Sheet */}
          <div className="glass-panel p-8 rounded-2xl border-white/5 max-w-4xl mx-auto shadow-2xl relative">
            <div className="font-serif text-gray-200 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-[380px] overflow-y-auto pr-1">
              {letterText}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
