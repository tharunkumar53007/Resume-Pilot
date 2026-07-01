// Content script to scrape job postings
console.log("[ResumeAI Extension] Content script loaded.");

// Helper function to extract text from a selector
function getText(selector) {
  const element = document.querySelector(selector);
  return element ? element.innerText.trim() : '';
}

// Scrapers for different portals
const scrapers = {
  linkedin: () => {
    return {
      title: getText('.job-details-jobs-unified-top-card__job-title') || 
             getText('.jobs-unified-top-card__job-title') || 
             getText('h1.t-24') || 
             getText('.jobs-details-top-card__job-title') ||
             getText('h1'),
      company: getText('.job-details-jobs-unified-top-card__company-name a') || 
               getText('.jobs-unified-top-card__company-name') || 
               getText('a.jobs-details-top-card__company-url') ||
               getText('.company-name-link') ||
               getText('.job-details-jobs-unified-top-card__company-name'),
      location: getText('.job-details-jobs-unified-top-card__bullet') || 
                getText('.jobs-unified-top-card__bullet') || 
                getText('.jobs-details-top-card__bullet') ||
                'Remote / Hybrid',
      description: getText('#job-details') || 
                   getText('.jobs-description__content') || 
                   getText('.jobs-box__html-content') ||
                   getText('.jobs-description'),
      skills: scrapers.extractSkills(
        getText('#job-details') || 
        getText('.jobs-description__content') || 
        getText('.jobs-box__html-content')
      )
    };
  },
  
  naukri: () => {
    return {
      title: getText('.jd-header-title') || getText('h1') || getText('.job-desc-title'),
      company: getText('.jd-header-comp-name a') || getText('.pad-rt-8') || getText('a.comp-name'),
      location: getText('.location span') || getText('.location') || 'India',
      description: getText('.job-desc') || getText('section.job-desc') || getText('.job-description'),
      skills: scrapers.extractSkills(
        getText('.job-desc') || 
        getText('section.job-desc') || 
        getText('.key-skills')
      )
    };
  },

  indeed: () => {
    return {
      title: getText('.jobsearch-JobInfoHeader-title') || getText('h1'),
      company: getText('[data-company-name="true"]') || 
               getText('.jobsearch-CompanyInfoWithoutHeaderImage') || 
               getText('div.jobsearch-InlineCompanyRating'),
      location: getText('#jobLocationSection') || getText('.jobsearch-JobInfoHeader-subtitle') || 'United States',
      description: getText('#jobDescriptionText') || getText('.job-description'),
      skills: scrapers.extractSkills(getText('#jobDescriptionText'))
    };
  },

  foundit: () => {
    return {
      title: getText('.jd-heading') || getText('.job-title') || getText('h1'),
      company: getText('.company-name') || getText('a.company-name'),
      location: getText('.location') || 'India',
      description: getText('.job-detail-Wrapper') || getText('.job-description') || getText('#job-description'),
      skills: scrapers.extractSkills(getText('.job-detail-Wrapper') || getText('.job-description'))
    };
  },

  wellfound: () => {
    return {
      title: getText('h1.job-title') || getText('h1'),
      company: getText('.company-name') || getText('.jobs-style__company-name'),
      location: getText('.location') || getText('.job-location') || 'Remote',
      description: getText('.job-description') || getText('.description'),
      skills: scrapers.extractSkills(getText('.job-description') || getText('.description'))
    };
  },

  // Fallback generic scraper
  generic: () => {
    return {
      title: getText('h1') || document.title,
      company: getText('[class*="company"]') || getText('[class*="employer"]') || '',
      location: getText('[class*="location"]') || 'Remote',
      description: getText('[class*="description"]') || getText('article') || document.body.innerText.substring(0, 1000),
      skills: scrapers.extractSkills(document.body.innerText)
    };
  },

  // Helper to pull skills from description text using keywords
  extractSkills: (text) => {
    if (!text) return [];
    // List of common tech skills to extract if found in DOM text
    const commonSkills = [
      'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'Javascript', 'TypeScript',
      'HTML', 'CSS', 'Tailwind', 'Sass', 'SQL', 'MongoDB', 'PostgreSQL', 'Express',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'GitHub', 'GraphQL',
      'Redux', 'Next.js', 'C++', 'C#', 'PHP', 'Ruby', 'Rails', 'Django', 'Flask',
      'Figma', 'Agile', 'Scrum', 'DevOps', 'CI/CD', 'Machine Learning', 'AI', 'NLP',
      'Data Analysis', 'Product Management', 'Excel', 'Swift', 'Kotlin', 'Flutter'
    ];
    
    const textLower = text.toLowerCase();
    return commonSkills.filter(skill => {
      // Create regex matching boundary word or exact skill
      const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(textLower);
    });
  }
};

// Main execution function
function getJobDetails() {
  const url = window.location.href.toLowerCase();
  let details = {};
  
  if (url.includes('linkedin.com')) {
    details = scrapers.linkedin();
  } else if (url.includes('naukri.com')) {
    details = scrapers.naukri();
  } else if (url.includes('indeed.com')) {
    details = scrapers.indeed();
  } else if (url.includes('foundit.in') || url.includes('foundit.com')) {
    details = scrapers.foundit();
  } else if (url.includes('wellfound.com') || url.includes('angel.co')) {
    details = scrapers.wellfound();
  } else {
    details = scrapers.generic();
  }
  
  // Clean values
  details.title = details.title ? details.title.replace(/\n/g, ' ').trim() : 'Unknown Title';
  details.company = details.company ? details.company.replace(/\n/g, ' ').trim() : 'Unknown Company';
  details.location = details.location ? details.location.replace(/\n/g, ' ').trim() : 'Remote / Location Unspecified';
  details.description = details.description ? details.description.trim() : 'Could not retrieve job description.';
  
  return details;
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractJob") {
    try {
      const data = getJobDetails();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep message channel open for asynchronous response
});
