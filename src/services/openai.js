// Service for communicating with OpenAI and Google Gemini APIs
import { storage } from './storage';

/**
 * Common fetch helper to call OpenAI API
 */
async function callOpenAI(systemPrompt, userPrompt, apiKey) {
  if (!apiKey) {
    throw new Error("OpenAI API Key is missing. Please set it in the Settings tab.");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt + " You must return your response as a valid, stringified JSON object. Ensure no markdown formatting surrounds the JSON payload."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content;
    
    if (!rawContent) {
      throw new Error("Received empty response from OpenAI.");
    }

    return JSON.parse(rawContent.trim());
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Common fetch helper to call Google Gemini API
 */
async function callGemini(systemPrompt, userPrompt, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set it in the Settings tab.");
  }

  const model = await storage.get('gemini_model') || 'gemini-3.5-flash';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nUser Input / Documents:\n${userPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawContent) {
      throw new Error("Received empty response from Gemini.");
    }

    return JSON.parse(rawContent.trim());
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

/**
 * Common router calling the configured AI provider
 */
async function callAI(systemPrompt, userPrompt, passedKey) {
  const provider = await storage.getAiProvider();
  if (provider === 'gemini') {
    const geminiKey = await storage.getGeminiApiKey() || passedKey;
    return await callGemini(systemPrompt, userPrompt, geminiKey);
  } else {
    const openaiKey = await storage.getApiKey() || passedKey;
    return await callOpenAI(systemPrompt, userPrompt, openaiKey);
  }
}

/**
 * ATS Resume Analysis compared against the Job Description
 */
export async function analyzeResume(resumeText, jobDescription, apiKey) {
  const systemPrompt = `You are an expert recruiter and applicant tracking system (ATS) analyzer. 
Compare the provided Resume and Job Description.
Evaluate how well the resume matches the job requirements.
Return a JSON object matching this schema:
{
  "atsScore": number (0 to 100 representing the match percentage),
  "summary": "a detailed 3-4 sentence paragraph summarizing the alignment, highlighting key strengths and major gaps.",
  "matchedKeywords": ["list", "of", "skills/keywords", "found", "in", "both"],
  "missingKeywords": ["list", "of", "skills/keywords", "requested", "by", "job", "but", "missing", "in", "resume"],
  "recommendations": ["3-5 actionable and specific bullet points detailing how the user can improve their resume for this job"]
}`;

  const userPrompt = `
RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""
`;

  return await callAI(systemPrompt, userPrompt, apiKey);
}

/**
 * AI-powered resume parser that structures raw text into a standard, complete JSON schema.
 */
export async function parseResumeText(resumeText, apiKey) {
  const systemPrompt = `You are an expert resume parsing AI.
Analyze the provided raw resume text and structure it into a standard JSON resume schema.
Do not lose any information. Ensure dates, company names, locations, education, certifications, and languages are extracted accurately.
If some fields are missing, set them to empty strings or empty arrays.
Return a JSON object matching this schema:
{
  "name": "Candidate's full name",
  "title": "Current professional title/headline",
  "email": "Email address",
  "phone": "Phone number",
  "location": "Location (city, state/country or Remote)",
  "summary": "Professional summary paragraph",
  "skills": ["Skill 1", "Skill 2", ...],
  "work": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "location": "Location (city, state/country or Remote)",
      "date": "Date Range (e.g. Jan 2021 - Present)",
      "bullets": [
        "Achievement bullet 1",
        "Achievement bullet 2"
      ]
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "Project description/details"
    }
  ],
  "education": [
    {
      "institution": "University/School Name",
      "studyType": "Degree/Major (e.g. BS in Computer Science)",
      "date": "Graduation Date or Date Range"
    }
  ],
  "certifications": ["Certification 1", "Certification 2", ...],
  "languages": ["Language 1", "Language 2", ...]
}`;

  const userPrompt = `RAW RESUME TEXT:\n"""\n${resumeText}\n"""`;
  return await callAI(systemPrompt, userPrompt, apiKey);
}

/**
 * Resume Optimizer - Generates optimized professional summaries, skills lists, project summaries, and experience bullets using the structured resume.
 */
export async function generateResume(structuredResume, jobDescription, apiKey) {
  const systemPrompt = `You are a professional resume writer and career coach.
Analyze the user's structured Resume details and the target Job Description, then generate highly optimized sections designed to score a high ATS match.
You MUST retain their exact previous companies, date ranges, and locations, but you should optimize their job positions (slightly for alignment), rewrite all their experience bullet points (Action Verb + Task + Impact with metrics/numbers where appropriate), and optimize project descriptions and skills to perfectly target the job description.
Return a JSON object matching this schema:
{
  "professionalSummary": "An outstanding, modern, professional summary tailored to this job (3-4 sentences, metric-oriented if possible).",
  "skills": ["List of 15-20 highly relevant skill keywords optimized for this job, formatted cleanly."],
  "work": [
    {
      "company": "Company Name (exactly as passed in)",
      "position": "Job Title (optimized for target job match)",
      "location": "Location (exactly as passed in)",
      "date": "Date Range (exactly as passed in)",
      "bullets": [
        "Optimized bullet point 1 (Action Verb + Task + Impact with metrics/numbers targeting job description)",
        "Optimized bullet point 2",
        "Optimized bullet point 3"
      ]
    }
  ],
  "projects": [
    {
      "title": "Project Title (exactly as passed in)",
      "description": "Optimized description of the project utilizing action verbs and showcasing alignment with job description skills."
    }
  ]
}`;

  const userPrompt = `
STRUCTURED RESUME:
"""
${JSON.stringify(structuredResume, null, 2)}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""
`;

  return await callAI(systemPrompt, userPrompt, apiKey);
}

/**
 * Cover Letter Generator - Creates a personalized cover letter matching job requirements and resume experience
 */
export async function generateCoverLetter(resumeText, jobDescription, apiKey) {
  const systemPrompt = `You are an expert career counselor.
Generate a compelling, highly personalized cover letter based on the provided Resume and Job Description.
Write it in a professional, persuasive tone that hooks the recruiter, highlights matching experiences, and states why the candidate is a perfect fit.
Return a JSON object matching this schema:
{
  "coverLetter": "The full cover letter. Use professional spacing and paragraphs. Use placeholder brackets [like this] for date/name details if not identifiable in the resume."
}`;

  const userPrompt = `
RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""
`;

  return await callAI(systemPrompt, userPrompt, apiKey);
}

/**
 * Interview Question Generator - Generates HR, Technical, and Behavioral Questions (20+ questions)
 */
export async function generateInterviewQuestions(resumeText, jobDescription, apiKey) {
  const systemPrompt = `You are a high-level interviewer at a top company.
Based on the Resume and the Job Description, generate exactly 21 interview questions divided into three categories: HR/General Questions (7), Technical Questions (7), and Behavioral/Situational Questions (7).
For each question, provide a detailed model answer (bullet points or explanation) demonstrating how the candidate should structure their response based on their background.
Return a JSON object matching this schema:
{
  "questions": [
    {
      "category": "HR" | "Technical" | "Behavioral",
      "question": "Question text...",
      "answer": "Suggested structure or model answer utilizing STAR methodology for behavioral, or technical facts for technical."
    }
  ]
}`;

  const userPrompt = `
RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""
`;

  return await callAI(systemPrompt, userPrompt, apiKey);
}
