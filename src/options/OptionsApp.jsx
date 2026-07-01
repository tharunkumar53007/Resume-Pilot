import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileScan, PenTool, Mail, HelpCircle, Settings as SettingsIcon, Briefcase, FileCheck, CheckCircle2 } from 'lucide-react';
import { storage } from '../services/storage';

// Pages
import Dashboard from '../pages/Dashboard';
import Analyze from '../pages/Analyze';
import Optimize from '../pages/Optimize';
import CoverLetter from '../pages/CoverLetter';
import InterviewPrep from '../pages/InterviewPrep';
import Settings from '../pages/Settings';

export default function OptionsApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeAnalysis]);

  const loadData = async () => {
    // Load most recent history entry as active analysis by default
    const history = await storage.getHistory();
    if (history.length > 0 && !activeAnalysis) {
      setActiveAnalysis(history[0]);
    }
    const prof = await storage.getUserProfile();
    setProfile(prof);
  };

  const handleSelectHistory = (item) => {
    setActiveAnalysis(item);
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            activeAnalysis={activeAnalysis}
            onSelectHistory={handleSelectHistory}
            isFullscreen={true}
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

  return (
    <div className="flex min-h-screen bg-[#07050E] text-dark-text overflow-hidden font-sans">
      
      {/* Sidebar Panel Left */}
      <aside className="w-64 bg-[#0D091B] border-r border-white/5 flex flex-col justify-between shrink-0">
        <div className="p-6 space-y-8">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-purple-pink flex items-center justify-center font-extrabold text-white text-base shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              AI
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">ResumeAI</h2>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">Extension Suite</span>
            </div>
          </div>

          {/* User Profile Summary Card */}
          {profile && (profile.name || profile.title) && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Profile</div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{profile.name || 'Set Name'}</p>
                <p className="text-[9px] text-gray-400 truncate">{profile.title || 'Set Title'}</p>
              </div>
              {profile.resumeFileName && (
                <div className="flex items-center gap-1 text-[9px] text-brand-accent">
                  <FileCheck className="w-3 h-3 shrink-0" />
                  <span className="truncate">{profile.resumeFileName}</span>
                </div>
              )}
            </div>
          )}

          {/* Side Bar Navigation */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Match Dashboard' },
              { id: 'analyze', icon: FileScan, label: 'Analyze Resume' },
              { id: 'optimize', icon: PenTool, label: 'Resume Optimizer' },
              { id: 'coverletter', icon: Mail, label: 'Cover Letter' },
              { id: 'interview', icon: HelpCircle, label: 'Interview Guide' },
              { id: 'settings', icon: SettingsIcon, label: 'Settings' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-purple-pink text-white shadow-[0_4px_12px_rgba(139,92,246,0.15)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-white/5 text-center">
          <div className="text-[10px] text-gray-500 font-semibold">ResumeAI Extension Suite</div>
          <div className="text-[8px] text-gray-600 mt-0.5">Manifest V3 Production Build</div>
        </div>
      </aside>

      {/* Main Wide Panel Right */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        
        {/* Job context warning banner if active */}
        {activeAnalysis && activeTab !== 'dashboard' && activeTab !== 'analyze' && activeTab !== 'settings' && (
          <div className="mb-6 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary">
                <Briefcase className="w-4 h-4 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Analysis Context</div>
                <p className="text-xs font-bold text-white truncate">{activeAnalysis.jobTitle} at {activeAnalysis.companyName}</p>
              </div>
            </div>
            <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
              Score: {activeAnalysis.atsScore}%
            </span>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>

    </div>
  );
}
