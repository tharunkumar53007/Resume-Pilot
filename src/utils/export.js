// Exporter utilities for PDF and DOCX file generation with parsed document merging
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

/**
 * Heuristic parser to extract sections from the original resume text that AI did not modify
 */
function extractOriginalSection(fullText, sectionKeywords) {
  if (!fullText) return "";
  const lines = fullText.split('\n');
  let inSection = false;
  let sectionContent = [];
  
  // Standard list of headers to detect when a section ends
  const allHeaders = [
    "EXPERIENCE", "WORK", "HISTORY", "EMPLOYMENT", "PROJECTS", 
    "EDUCATION", "SKILLS", "SUMMARY", "CERTIFICATIONS", 
    "LANGUAGES", "COURSES", "INTERESTS", "ACHIEVEMENTS", "PUBLICATIONS"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    // Check if this line matches our target section header
    const isTargetHeader = sectionKeywords.some(keyword => {
      const cleanLine = line.toUpperCase().replace(/[^A-Z\s]/g, "").trim();
      return cleanLine === keyword || cleanLine.startsWith(keyword + " ") || cleanLine.endsWith(" " + keyword);
    });
    
    if (isTargetHeader) {
      inSection = true;
      continue;
    }
    
    if (inSection) {
      // Check if we hit any other section heading, indicating target section ended
      const isNextHeader = allHeaders.some(kw => {
        const cleanLine = line.toUpperCase().replace(/[^A-Z\s]/g, "").trim();
        return (line.length < 35) && (cleanLine === kw || cleanLine.startsWith(kw + " ") || cleanLine.endsWith(" " + kw));
      });
      
      if (isNextHeader) {
        break;
      }
      sectionContent.push(line);
    }
  }
  
  return sectionContent.join('\n');
}

/**
 * Parses the first few lines of original resume to pull contact details if missing
 */
function extractOriginalContactDetails(fullText) {
  if (!fullText) return "";
  const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  
  let emails = [];
  let phones = [];
  
  // Inspect first 10 lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const emailMatch = lines[i].match(emailRegex);
    if (emailMatch) emails.push(emailMatch[0]);
    
    const phoneMatch = lines[i].match(phoneRegex);
    if (phoneMatch) phones.push(phoneMatch[0]);
  }
  
  return [emails[0], phones[0]].filter(Boolean).join("   |   ");
}

/**
 * Exports plain text content as a beautifully formatted PDF.
 */
export function exportToPDF(title, content, filename = "document.pdf") {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    
    // Title Styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(139, 92, 246); // Brand primary
    doc.text(title, margin, margin + 5);
    
    // Horizontal Rule divider
    doc.setDrawColor(220, 215, 254);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 12, pageWidth - margin, margin + 12);
    
    // Content Body styling
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(55, 65, 81); // Slate gray
    
    const splitText = doc.splitTextToSize(content, maxWidth);
    
    let y = margin + 22;
    const lineHeight = 6.5;
    
    for (let i = 0; i < splitText.length; i++) {
      if (y > pageHeight - margin - 10) {
        doc.addPage();
        y = margin + 10;
      }
      doc.text(splitText[i], margin, y);
      y += lineHeight;
    }
    
    doc.save(filename);
  } catch (error) {
    console.error("PDF Export failed:", error);
    alert(`Could not export PDF: ${error.message}`);
  }
}

/**
 * Exports text content to a production-ready Microsoft Word DOCX file.
 */
export async function exportToDocx(title, content, filename = "document.docx") {
  try {
    const lines = content.split("\n");
    const docChildren = [
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        spacing: { before: 240, after: 240 }
      })
    ];
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith("*") || trimmed.startsWith("-");
      const cleanText = isBullet ? trimmed.substring(1).trim() : trimmed;
      
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cleanText,
              size: 22,
              font: "Calibri"
            })
          ],
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: { after: 120 }
        })
      );
    });
    
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren
        }
      ]
    });
    
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error("DOCX Export failed:", error);
    alert(`Could not export DOCX: ${error.message}`);
  }
}

/**
 * Exports a COMPLETE, merged, beautifully structured recruiter-friendly resume to PDF.
 */
/**
 * Generates a clean, readable, professional alphanumeric filename
 */
export function getSafeFileName(userName, companyName, docType, ext) {
  const safeUser = (userName || "My").trim().replace(/[^a-zA-Z0-9]/g, "_").replace(/__+/g, "_");
  const safeCompany = (companyName || "Match").trim().replace(/[^a-zA-Z0-9]/g, "_").replace(/__+/g, "_");
  return `${safeUser}_${docType}_${safeCompany}.${ext}`;
}

/**
 * Exports a COMPLETE, merged, beautifully structured recruiter-friendly resume to PDF in a high-end Corporate style.
 */
export function exportResumeToPDF(resume, optData, filename = "resume.pdf") {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    
    const margin = 18;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - (margin * 2);
    
    let y = margin + 5;
    
    // --- SLEEK CORPORATE SLATE & INDIGO PALETTE ---
    const primaryColor = [15, 23, 42]; // Slate 900: #0F172A
    const accentColor = [79, 70, 229]; // Indigo 600: #4F46E5
    const bodyColor = [51, 65, 85]; // Slate 700: #334155
    const lightBorderColor = [226, 232, 240]; // Slate 200: #E2E8F0
    
    // --- HEADER SECTION ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(resume.name || "Candidate Name", margin, y);
    y += 6.5;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text((resume.title || "").toUpperCase(), margin, y);
    y += 5.5;
    
    // Sub-header contact info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
    
    const contacts = [
      resume.email,
      resume.phone,
      resume.location
    ].filter(Boolean);
    
    if (resume.links && resume.links.length > 0) {
      resume.links.forEach(link => {
        const cleanLink = link.replace(/https?:\/\/(www\.)?/, "");
        contacts.push(cleanLink);
      });
    }
    
    const contactsLine = contacts.join("   |   ");
    const splitContacts = doc.splitTextToSize(contactsLine, maxWidth);
    splitContacts.forEach(line => {
      doc.text(line, margin, y);
      y += 4.5;
    });
    
    y += 2.5;
    
    // Helper to draw clean sections
    const drawSectionHeader = (title) => {
      if (y > pageHeight - margin - 15) {
        doc.addPage();
        y = margin + 10;
      }
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(title.toUpperCase(), margin, y);
      y += 2.5;
      
      // Full-width subtle slate line divider
      doc.setDrawColor(lightBorderColor[0], lightBorderColor[1], lightBorderColor[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5.5;
    };
    
    // --- PROFESSIONAL SUMMARY ---
    const summaryText = optData?.professionalSummary || resume.summary;
    if (summaryText) {
      drawSectionHeader("Professional Summary");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
      
      const splitSummary = doc.splitTextToSize(summaryText, maxWidth);
      splitSummary.forEach(line => {
        if (y > pageHeight - margin) { doc.addPage(); y = margin + 10; }
        doc.text(line, margin, y);
        y += 4.6;
      });
      y += 3.5;
    }
    
    // --- TECHNICAL SKILLS ---
    const skillsList = optData?.skills || resume.skills;
    if (skillsList && skillsList.length > 0) {
      drawSectionHeader("Core Competencies");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
      
      const skillsLine = skillsList.join("  •  ");
      const splitSkills = doc.splitTextToSize(skillsLine, maxWidth);
      splitSkills.forEach(line => {
        if (y > pageHeight - margin) { doc.addPage(); y = margin + 10; }
        doc.text(line, margin, y);
        y += 4.8;
      });
      y += 3.5;
    }
    
    // --- WORK EXPERIENCE ---
    const workHistory = optData?.work || resume.work;
    if (workHistory && workHistory.length > 0) {
      drawSectionHeader("Professional Experience");
      
      workHistory.forEach(job => {
        if (y > pageHeight - margin - 15) { doc.addPage(); y = margin + 10; }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(job.position || "Position", margin, y);
        
        // Right align date range
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
        const dateText = job.date || "";
        const dateWidth = doc.getTextWidth(dateText);
        doc.text(dateText, pageWidth - margin - dateWidth, y);
        y += 4.5;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(job.company || "Company", margin, y);
        
        // Right align location
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
        const locText = job.location || "";
        const locWidth = doc.getTextWidth(locText);
        doc.text(locText, pageWidth - margin - locWidth, y);
        y += 5.5;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
        
        if (job.bullets && job.bullets.length > 0) {
          job.bullets.forEach(bullet => {
            const bulletText = `•  ${bullet}`;
            const splitBullet = doc.splitTextToSize(bulletText, maxWidth - 4);
            splitBullet.forEach((line, index) => {
              if (y > pageHeight - margin) { doc.addPage(); y = margin + 10; }
              const indent = index === 0 ? margin : margin + 4;
              doc.text(line, indent, y);
              y += 4.8;
            });
          });
        }
        y += 3.5;
      });
    }
    
    // --- FEATURED PROJECTS ---
    const projectsList = optData?.projects || resume.projects;
    if (projectsList && projectsList.length > 0) {
      drawSectionHeader("Featured Projects");
      
      projectsList.forEach(proj => {
        if (y > pageHeight - margin - 15) { doc.addPage(); y = margin + 10; }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(proj.title || "Project Title", margin, y);
        y += 4.5;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
        
        const descText = proj.description || "";
        const splitDesc = doc.splitTextToSize(descText, maxWidth);
        splitDesc.forEach(line => {
          if (y > pageHeight - margin) { doc.addPage(); y = margin + 10; }
          doc.text(line, margin, y);
          y += 4.5;
        });
        y += 3.5;
      });
    }
    
    // --- EDUCATION ---
    if (resume.education && resume.education.length > 0) {
      drawSectionHeader("Education");
      resume.education.forEach(edu => {
        if (y > pageHeight - margin - 12) { doc.addPage(); y = margin + 10; }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(edu.studyType || "Degree", margin, y);
        
        // Right align date
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
        const dateText = edu.date || "";
        const dateWidth = doc.getTextWidth(dateText);
        doc.text(dateText, pageWidth - margin - dateWidth, y);
        y += 4.5;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
        doc.text(edu.institution || "Institution", margin, y);
        y += 6;
      });
    }
    
    // --- CERTIFICATIONS ---
    if (resume.certifications && resume.certifications.length > 0) {
      drawSectionHeader("Certifications & Credentials");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
      
      const certsText = resume.certifications.join("   |   ");
      const splitCerts = doc.splitTextToSize(certsText, maxWidth);
      splitCerts.forEach(line => {
        if (y > pageHeight - margin) { doc.addPage(); y = margin + 10; }
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 3.5;
    }
    
    // --- LANGUAGES ---
    if (resume.languages && resume.languages.length > 0) {
      drawSectionHeader("Languages");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(bodyColor[0], bodyColor[1], bodyColor[2]);
      
      const langsText = resume.languages.join("   |   ");
      const splitLangs = doc.splitTextToSize(langsText, maxWidth);
      splitLangs.forEach(line => {
        if (y > pageHeight - margin) { doc.addPage(); y = margin + 10; }
        doc.text(line, margin, y);
        y += 4.5;
      });
    }
    
    doc.save(filename);
  } catch (error) {
    console.error("Resume PDF Export failed:", error);
    alert(`Could not export Resume PDF: ${error.message}`);
  }
}

/**
 * Exports a COMPLETE, merged, recruiter-ready resume to DOCX format in high-end styling.
 */
export async function exportResumeToDocx(resume, optData, filename = "resume.docx") {
  try {
    const docChildren = [];
    
    // Name heading
    docChildren.push(
      new Paragraph({
        text: resume.name || "Candidate Name",
        heading: HeadingLevel.TITLE,
        spacing: { before: 100, after: 30 }
      })
    );
    
    // Sub-title
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (resume.title || "").toUpperCase(),
            bold: true,
            size: 22, // 11pt
            color: "4F46E5", // Indigo 600
            font: "Calibri"
          })
        ],
        spacing: { after: 80 }
      })
    );
    
    // Contact line
    const contacts = [
      resume.email,
      resume.phone,
      resume.location
    ].filter(Boolean);
    
    if (resume.links && resume.links.length > 0) {
      resume.links.forEach(link => {
        const cleanLink = link.replace(/https?:\/\/(www\.)?/, "");
        contacts.push(cleanLink);
      });
    }
    const contactsLine = contacts.join("   |   ");
    
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactsLine,
            size: 18, // 9pt
            color: "475569" // Slate 600
          })
        ],
        spacing: { after: 180 }
      })
    );
    
    // Helper to add sections
    const addSectionHeader = (title) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 20, // 10pt
              color: "0F172A" // Slate 900
            })
          ],
          spacing: { before: 200, after: 80 },
          border: {
            bottom: {
              color: "CBD5E1", // Slate 300
              space: 4,
              value: "single",
              size: 8
            }
          }
        })
      );
    };
    
    // --- SUMMARY ---
    const summaryText = optData?.professionalSummary || resume.summary;
    if (summaryText) {
      addSectionHeader("Professional Summary");
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: summaryText,
              size: 19, // 9.5pt
              font: "Calibri"
            })
          ],
          spacing: { after: 100 }
        })
      );
    }
    
    // --- SKILLS ---
    const skillsList = optData?.skills || resume.skills;
    if (skillsList && skillsList.length > 0) {
      addSectionHeader("Core Competencies");
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: skillsList.join("  •  "),
              bold: true,
              size: 18, // 9pt
              color: "334155" // Slate 700
            })
          ],
          spacing: { after: 100 }
        })
      );
    }
    
    // --- EXPERIENCE ---
    const workHistory = optData?.work || resume.work;
    if (workHistory && workHistory.length > 0) {
      addSectionHeader("Professional Experience");
      
      workHistory.forEach(job => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: job.position || "Position",
                bold: true,
                size: 20 // 10pt
              }),
              new TextRun({
                text: `   |   ${job.date || ""}`,
                size: 17,
                color: "475569"
              })
            ],
            spacing: { before: 100 }
          })
        );
        
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: job.company || "Company",
                bold: true,
                size: 18, // 9pt
                color: "4F46E5"
              }),
              new TextRun({
                text: `   |   ${job.location || ""}`,
                size: 17,
                color: "475569"
              })
            ],
            spacing: { after: 100 }
          })
        );
        
        if (job.bullets && job.bullets.length > 0) {
          job.bullets.forEach(bullet => {
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: bullet,
                    size: 19,
                    font: "Calibri"
                  })
                ],
                bullet: { level: 0 },
                spacing: { after: 50 }
              })
            );
          });
        }
      });
    }
    
    // --- PROJECTS ---
    const projectsList = optData?.projects || resume.projects;
    if (projectsList && projectsList.length > 0) {
      addSectionHeader("Featured Projects");
      
      projectsList.forEach(proj => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: proj.title,
                bold: true,
                size: 19
              })
            ],
            spacing: { before: 100, after: 30 }
          })
        );
        
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: proj.description,
                size: 19,
                font: "Calibri",
                color: "334155"
              })
            ],
            spacing: { after: 100 }
          })
        );
      });
    }
    
    // --- EDUCATION ---
    if (resume.education && resume.education.length > 0) {
      addSectionHeader("Education");
      resume.education.forEach(edu => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${edu.studyType || "Degree"} - ${edu.institution || "Institution"}`,
                bold: true,
                size: 19
              }),
              new TextRun({
                text: ` (${edu.date || ""})`,
                size: 17,
                color: "475569"
              })
            ],
            spacing: { after: 60 }
          })
        );
      });
    }
    
    // --- CERTIFICATIONS ---
    if (resume.certifications && resume.certifications.length > 0) {
      addSectionHeader("Certifications & Credentials");
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resume.certifications.join("   |   "),
              size: 19,
              font: "Calibri"
            })
          ],
          spacing: { after: 60 }
        })
      );
    }
    
    // --- LANGUAGES ---
    if (resume.languages && resume.languages.length > 0) {
      addSectionHeader("Languages");
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resume.languages.join("   |   "),
              size: 19,
              font: "Calibri"
            })
          ],
          spacing: { after: 60 }
        })
      );
    }
    
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren
        }
      ]
    });
    
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error("Resume DOCX Export failed:", error);
    alert(`Could not export Resume DOCX: ${error.message}`);
  }
}
