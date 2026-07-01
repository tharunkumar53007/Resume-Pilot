import React, { useState } from 'react';
import { Sparkles, HelpCircle, ChevronDown, ChevronUp, ShieldAlert, BookOpen, Layers } from 'lucide-react';
import { generateInterviewQuestions } from '../services/openai';
import { storage } from '../services/storage';

export default function InterviewPrep({ activeAnalysis, setActiveAnalysis }) {
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [error, setError] = useState('');

  const handleGenerateQuestions = async () => {
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

      // Execute interview questions AI call
      const prepResult = await generateInterviewQuestions(activeAnalysis.resumeText, activeAnalysis.jobDescription, apiKey);
      
      const updatedAnalysis = {
        ...activeAnalysis,
        interviewPrep: prepResult.questions
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

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const getFilteredQuestions = () => {
    const list = activeAnalysis?.interviewPrep || [];
    if (activeCategory === 'All') return list;
    return list.filter(q => q.category.toLowerCase() === activeCategory.toLowerCase());
  };

  const questions = getFilteredQuestions();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
          Interview <span className="text-gradient">Preparation</span>
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">Simulate actual hiring reviews. Review 20+ custom interview questions with expert suggested answers.</p>
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
            <BookOpen className="w-10 h-10" />
          </div>
          <div className="max-w-md">
            <h2 className="text-lg font-bold text-white">Analysis Required</h2>
            <p className="text-gray-400 text-xs mt-1">
              Please analyze a job description and upload your resume in the "Analyze Resume" tab to generate simulated hiring interviews.
            </p>
          </div>
        </div>
      ) : !activeAnalysis.interviewPrep ? (
        /* Prompt to Generate */
        <div className="glass-panel p-8 rounded-2xl text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-2 animate-pulse">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Generate Interview Preparation Guide</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              Generate exactly 20+ HR, technical, and behavioral interview questions designed by matching <span className="text-white font-medium">"{activeAnalysis.jobTitle}"</span> requirements with your background.
            </p>
          </div>

          <button
            onClick={handleGenerateQuestions}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-purple-pink text-white font-semibold rounded-xl text-xs hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50 transition-all flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Interview Guide...
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5" />
                Generate Interview Prep
              </>
            )}
          </button>
        </div>
      ) : (
        /* Interactive Q&A Accordion */
        <div className="space-y-4">
          
          {/* Sub Categories Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl max-w-sm">
            {['All', 'HR', 'Technical', 'Behavioral'].map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setExpandedIndex(null);
                }}
                className={`flex-1 text-center py-2 text-[10px] md:text-xs font-semibold rounded-lg transition-all ${
                  activeCategory === cat ? 'bg-gradient-purple-pink text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Accordion List */}
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isExpanded = expandedIndex === idx;
              
              // Colors based on category
              const catBg = 
                q.category.toUpperCase() === 'TECHNICAL' ? 'bg-brand-accent/10 border-brand-accent/25 text-brand-accent' :
                q.category.toUpperCase() === 'BEHAVIORAL' ? 'bg-brand-secondary/10 border-brand-secondary/25 text-brand-secondary' :
                'bg-brand-primary/10 border-brand-primary/25 text-brand-primary';

              return (
                <div
                  key={idx}
                  className={`glass-panel rounded-xl overflow-hidden border transition-all duration-200 ${
                    isExpanded ? 'border-brand-primary/45 shadow-[0_0_15px_rgba(139,92,246,0.08)] bg-white/[0.02]' : 'hover:border-white/10'
                  }`}
                >
                  {/* Collapsed Header Bar */}
                  <div
                    onClick={() => toggleExpand(idx)}
                    className="flex items-start justify-between gap-3 p-4 cursor-pointer select-none group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <HelpCircle className="w-5 h-5 text-gray-500 mt-0.5 group-hover:text-brand-primary transition-colors shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${catBg}`}>
                            {q.category}
                          </span>
                        </div>
                        <h4 className="text-xs md:text-sm font-semibold text-gray-100 group-hover:text-white transition-colors leading-relaxed">
                          {q.question}
                        </h4>
                      </div>
                    </div>
                    <div className="text-gray-500 mt-1 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Body Panel */}
                  {isExpanded && (
                    <div className="px-11 pb-5 pt-1 border-t border-white/5 animate-fade-in-up bg-white/[0.01]">
                      <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block mb-2">Simulated Suggested Answer</div>
                      <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                        {q.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
