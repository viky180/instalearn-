/**
 * PDF Parser utility using pdf.js
 * Extracts text content from PDF files client-side
 * Enhanced with heading detection via font size and patterns
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdf.js worker from local bundle
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extract text from a PDF file with automatic heading detection
 * @param {File} file - PDF file object
 * @returns {Promise<string>} Extracted text with Markdown-style headings
 */
export async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // First pass: collect all text items with their font sizes
        const allItems = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            for (const item of textContent.items) {
                if ('str' in item && item.str.trim()) {
                    allItems.push({
                        text: item.str,
                        height: item.height || 12, // Font size approximation
                        y: item.transform[5],
                        pageNum
                    });
                }
            }
        }

        // Calculate font size statistics to detect headings
        const heights = allItems.map(item => item.height).filter(h => h > 0);
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        const headingThreshold = avgHeight * 1.2; // 20% larger = heading

        // Second pass: build text with heading markers
        let fullText = '';
        let lastY = null;
        let lastPageNum = 0;
        let currentLine = '';
        let currentLineHeight = 0;
        let currentLineItems = [];

        const flushLine = () => {
            if (!currentLine.trim()) return;

            const lineText = currentLine.trim();
            const isLargerFont = currentLineHeight > headingThreshold;
            const isShortLine = lineText.split(/\s+/).length <= 8;
            const isHeadingPattern = detectHeadingPattern(lineText);

            // Determine if this line is a heading
            const isHeading = (isLargerFont && isShortLine) || isHeadingPattern;

            if (isHeading) {
                // Add as Markdown heading
                fullText += `\n\n# ${lineText}\n\n`;
            } else {
                fullText += currentLine;
            }

            currentLine = '';
            currentLineHeight = 0;
            currentLineItems = [];
        };

        for (const item of allItems) {
            // Page break
            if (item.pageNum !== lastPageNum) {
                flushLine();
                fullText += '\n\n';
                lastY = null;
                lastPageNum = item.pageNum;
            }

            // Check for new line (Y position changed)
            if (lastY !== null && Math.abs(item.y - lastY) > 5) {
                flushLine();

                // Paragraph break (larger gap)
                if (Math.abs(item.y - lastY) > 15) {
                    fullText += '\n\n';
                } else {
                    fullText += ' ';
                }
            }

            currentLine += item.text;
            currentLineHeight = Math.max(currentLineHeight, item.height);
            currentLineItems.push(item);
            lastY = item.y;
        }

        // Flush remaining line
        flushLine();

        return cleanText(fullText);
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

/**
 * Detect heading patterns in text
 * @param {string} text - Line of text to check
 * @returns {boolean} True if text matches a heading pattern
 */
function detectHeadingPattern(text) {
    const trimmed = text.trim();

    // Skip empty or very short text
    if (trimmed.length < 2) return false;

    // Pattern 1: "Chapter X" or "CHAPTER X"
    if (/^chapter\s+[\divxlc]+/i.test(trimmed)) return true;

    // Pattern 2: "Section X.X" or numbered sections
    if (/^section\s+[\d.]+/i.test(trimmed)) return true;
    if (/^\d+(\.\d+)*\s+[A-Z]/.test(trimmed)) return true; // "1.2 Title"

    // Pattern 3: ALL CAPS (at least 3 words, all caps)
    const words = trimmed.split(/\s+/);
    if (words.length >= 2 && words.length <= 8) {
        const allCaps = words.every(w => w === w.toUpperCase() && /[A-Z]/.test(w));
        if (allCaps) return true;
    }

    // Pattern 4: Common heading keywords at start
    if (/^(introduction|conclusion|abstract|summary|overview|background|methodology|results|discussion|references|appendix|acknowledgments?)/i.test(trimmed)) {
        return true;
    }

    // Pattern 5: Roman numerals followed by text
    if (/^[IVXLC]+\.\s+[A-Z]/i.test(trimmed)) return true;

    return false;
}

/**
 * Clean up extracted text
 */
function cleanText(text) {
    return text
        // Fix multiple newlines around headings
        .replace(/\n{4,}/g, '\n\n\n')
        // Replace multiple spaces with single space
        .replace(/ +/g, ' ')
        // Remove spaces at start of lines
        .replace(/^ +/gm, '')
        // Remove hyphenation at end of lines
        .replace(/-\n(\S)/g, '$1')
        // Clean up form feeds
        .replace(/\f/g, '\n\n')
        // Normalize heading spacing
        .replace(/\n\n\n# /g, '\n\n# ')
        .trim();
}

/**
 * Get PDF metadata (page count, etc.)
 */
export async function getPDFMetadata(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        return {
            pageCount: pdf.numPages,
            info: await pdf.getMetadata()
        };
    } catch (error) {
        console.error('Error getting PDF metadata:', error);
        return { pageCount: 0, info: {} };
    }
}
