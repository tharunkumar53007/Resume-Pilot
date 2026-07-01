// Local PDF & DOCX text extraction services
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker in Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts raw text from an ArrayBuffer of a PDF file.
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<string>} Text content of PDF
 */
export async function parsePdfText(arrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    if (!fullText.trim()) {
      throw new Error("No text content found in PDF. The document might be an image/scanned PDF.");
    }
    
    return fullText;
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error(`Failed to parse PDF resume: ${error.message}`);
  }
}

/**
 * Extracts raw text from an ArrayBuffer of a DOCX file.
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<string>} Text content of DOCX
 */
export async function parseDocxText(arrayBuffer) {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '';
    
    if (result.messages && result.messages.length > 0) {
      console.log("Mammoth warnings:", result.messages);
    }
    
    if (!text.trim()) {
      throw new Error("No text content found in DOCX file.");
    }
    
    return text;
  } catch (error) {
    console.error("DOCX Parsing Error:", error);
    throw new Error(`Failed to parse DOCX resume: ${error.message}`);
  }
}
