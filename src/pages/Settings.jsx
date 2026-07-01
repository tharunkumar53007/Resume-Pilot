import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, User, Trash2, Key, Info, CheckCircle2 } from 'lucide-react';
import { storage } from '../services/storage';

export default function Settings({ onClearAll }) {
  const [apiKey, setApiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [geminiModel, setGeminiModel] = useState('gemini-3.5-flash');
  const [showKey, setShowKey] = useState(false);
  const [profile, setProfile] = useState({ name: '', title: '', experienceLevel: 'Mid-Level', resumeText: '', resumeFileName: '' });
  const [saveSuccess, setSaveSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const key = await storage.getApiKey();
    setApiKey(key);
    
    // Pre-fill user's Gemini key if none is stored
    let gemKey = await storage.getGeminiApiKey();
    if (!gemKey) {
      gemKey = "";
      await storage.setGeminiApiKey(gemKey);
    }
    setGeminiKey(gemKey);
    
    const provider = await storage.getAiProvider();
    setAiProvider(provider);

    const model = await storage.get('gemini_model') || 'gemini-3.5-flash';
    setGeminiModel(model);
    
    const prof = await storage.getUserProfile();
    setProfile(prof);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveSuccess('');
    
    await storage.setApiKey(apiKey);
    await storage.setGeminiApiKey(geminiKey);
    await storage.setAiProvider(aiProvider);
    await storage.set('gemini_model', geminiModel);
    await storage.setUserProfile(profile);
    
    setSaveSuccess('Configuration updated successfully!');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleClearData = async () => {
    await storage.clear();
    setApiKey('');
    setGeminiKey('');
    setAiProvider('gemini');
    setGeminiModel('gemini-3.5-flash');
    setProfile({ name: '', title: '', experienceLevel: 'Mid-Level', resumeText: '', resumeFileName: '' });
    setDeleteConfirm(false);
    setSaveSuccess('All extension records cleared.');
    setTimeout(() => setSaveSuccess(''), 3000);
    if (onClearAll) onClearAll();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
          Extension <span className="text-gradient">Settings</span>
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Manage your OpenAI and Google Gemini API configurations, profile properties, and saved histories.</p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* API Provider & Key Panel */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
            <Key className="w-5 h-5 text-brand-primary" />
            <h3 className="font-semibold text-white text-sm">AI Engine Integration</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-brand-primary/5 border border-brand-primary/15 rounded-xl p-3">
              <Info className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div className="text-[10px] md:text-xs text-gray-300 leading-relaxed">
                We store your API credentials entirely in the browser's local sandbox storage (`chrome.storage.local`). The key is never uploaded to any external analytics or tracking systems.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">AI Service Provider</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full glass-input px-3 py-2 text-xs bg-dark-bg focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="gemini">Google Gemini (GA Endpoint)</option>
                  <option value="openai">OpenAI (GPT-4o-mini)</option>
                </select>
              </div>

              <div>
                {aiProvider === 'gemini' ? (
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Google Gemini API Key</label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="Paste your Gemini key here..."
                        className="w-full glass-input pl-3 pr-10 py-2 text-xs font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-2 text-gray-400 hover:text-white"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">OpenAI API Key</label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-proj-..."
                        className="w-full glass-input pl-3 pr-10 py-2 text-xs font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-2 text-gray-400 hover:text-white"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {aiProvider === 'gemini' && (
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Gemini AI Model Selection</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full glass-input px-3 py-2 text-xs bg-dark-bg focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (GA 2026 - Highest Agentic Speed & Coding Performance)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (GA - Standard High-Speed Flash)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (GA - Frontier Complex Analysis)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Profile Properties */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-2">
            <User className="w-5 h-5 text-brand-accent" />
            <h3 className="font-semibold text-white text-sm">Professional Profile</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full glass-input px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Target Job Title</label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                placeholder="e.g. Senior React Developer"
                className="w-full glass-input px-3 py-2 text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Experience Level</label>
              <select
                value={profile.experienceLevel}
                onChange={(e) => setProfile({ ...profile, experienceLevel: e.target.value })}
                className="w-full glass-input px-3 py-2 text-xs bg-dark-bg focus:ring-1 focus:ring-brand-primary"
              >
                <option value="Junior">Entry / Junior Level (0-2 years)</option>
                <option value="Mid-Level">Mid-Level Professional (2-5 years)</option>
                <option value="Senior">Senior / Tech Lead (5+ years)</option>
                <option value="Executive">Executive / Managerial (10+ years)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Panel Footer */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-purple-pink text-white font-semibold rounded-xl text-xs hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Save Configuration
          </button>

          {deleteConfirm ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-all"
              >
                Yes, Wipe Everything
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Local Data
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
