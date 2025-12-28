/**
 * Text file parser utility
 * Reads and cleans text from .txt files
 */

/**
 * Extract text from a text file
 * @param {File} file - Text file object
 * @returns {Promise<string>} Text content
 */
export async function extractTextFromFile(file) {
    try {
        const text = await file.text();
        return cleanText(text);
    } catch (error) {
        console.error('Error reading text file:', error);
        throw new Error(`Failed to read text file: ${error.message}`);
    }
}

/**
 * Clean up text content
 * - Normalize line endings
 * - Remove excessive whitespace
 * - Handle common encoding issues
 */
function cleanText(text) {
    return text
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Replace multiple newlines with double newline
        .replace(/\n{3,}/g, '\n\n')
        // Replace tabs with spaces
        .replace(/\t/g, ' ')
        // Replace multiple spaces with single space
        .replace(/ +/g, ' ')
        // Remove spaces at start/end of lines
        .replace(/^ +/gm, '')
        .replace(/ +$/gm, '')
        // Remove BOM if present
        .replace(/^\uFEFF/, '')
        .trim();
}

/**
 * Get file type from extension
 * @param {string} filename - File name
 * @returns {string} File type (pdf, txt, unknown)
 */
export function getFileType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();

    switch (ext) {
        case 'pdf':
            return 'pdf';
        case 'txt':
        case 'text':
            return 'txt';
        case 'md':
        case 'markdown':
            return 'txt'; // Treat markdown as text
        default:
            return 'unknown';
    }
}

/**
 * Validate file for supported types
 * @param {File} file - File to validate
 * @returns {{valid: boolean, type: string, error?: string}}
 */
export function validateFile(file) {
    const type = getFileType(file.name);

    if (type === 'unknown') {
        return {
            valid: false,
            type,
            error: 'Unsupported file type. Please upload a PDF or TXT file.'
        };
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        return {
            valid: false,
            type,
            error: 'File too large. Maximum size is 50MB.'
        };
    }

    return { valid: true, type };
}
