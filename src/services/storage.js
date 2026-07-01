// Chrome Local Storage Wrapper with standard localStorage fallback for dev testing

const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export const storage = {
  // Get item
  get: async (key) => {
    if (isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key]);
        });
      });
    } else {
      const val = localStorage.getItem(key);
      try {
        return val ? JSON.parse(val) : null;
      } catch {
        return val;
      }
    }
  },

  // Set item
  set: async (key, value) => {
    if (isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Remove item
  remove: async (key) => {
    if (isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([key], () => {
          resolve();
        });
      });
    } else {
      localStorage.removeItem(key);
    }
  },

  // Clear all
  clear: async () => {
    if (isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          resolve();
        });
      });
    } else {
      localStorage.clear();
    }
  },

  // Helper properties
  getApiKey: async () => {
    return await storage.get('openai_api_key') || '';
  },

  setApiKey: async (key) => {
    await storage.set('openai_api_key', key);
  },

  getGeminiApiKey: async () => {
    return await storage.get('gemini_api_key') || '';
  },

  setGeminiApiKey: async (key) => {
    await storage.set('gemini_api_key', key);
  },

  getAiProvider: async () => {
    return await storage.get('ai_provider') || 'gemini';
  },

  setAiProvider: async (provider) => {
    await storage.set('ai_provider', provider);
  },

  getUserProfile: async () => {
    return await storage.get('user_profile') || {
      name: '',
      title: '',
      experienceLevel: 'Mid-Level',
      resumeText: '',
      resumeFileName: ''
    };
  },

  setUserProfile: async (profile) => {
    await storage.set('user_profile', profile);
  },

  getHistory: async () => {
    return await storage.get('analysis_history') || [];
  },

  addHistoryEntry: async (entry) => {
    const history = await storage.getHistory();
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry
    };
    // Keep last 10 records
    const updated = [newEntry, ...history].slice(0, 10);
    await storage.set('analysis_history', updated);
    return newEntry;
  },

  deleteHistoryEntry: async (id) => {
    const history = await storage.getHistory();
    const updated = history.filter(item => item.id !== id);
    await storage.set('analysis_history', updated);
  }
};
