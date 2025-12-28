/**
 * Chunker utility - splits text into digestible chunks of ~50 words
 * Supports Markdown-based structural chunking: prepends section headers as context.
 */

const MAX_WORDS = 50;

/**
 * Split text into chunks of approximately MAX_WORDS words.
 * If the text contains Markdown headers, it will use structural chunking
 * to prepend the current section's header to each chunk for context.
 * @param {string} text - The full text to chunk
 * @param {object} options - Optional settings
 * @param {boolean} options.structuralChunking - Enable structural chunking (default: true)
 * @returns {Array<{text: string, context: string | null}>} Array of chunk objects
 */
export function chunkText(text, options = {}) {
    const { structuralChunking = true } = options;

    if (!text || typeof text !== 'string') {
        return [];
    }

    // Normalize line endings but preserve structure for header detection
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    if (!normalizedText) {
        return [];
    }

    // Check if text has Markdown-like headers
    const hasHeaders = /^#{1,6}\s+.+/m.test(normalizedText);

    if (structuralChunking && hasHeaders) {
        return chunkByStructure(normalizedText);
    }

    // Fallback to simple sentence-based chunking (returns strings for backwards compatibility)
    const cleanText = normalizedText.replace(/\s+/g, ' ').trim();
    const sentences = splitIntoSentences(cleanText);
    return chunkSentences(sentences).map(chunkText => ({ text: chunkText, context: null }));
}

/**
 * Chunk text by Markdown structure (headers).
 * Each chunk will have the current section's header prepended as context.
 * @param {string} text - The full text with Markdown headers
 * @returns {Array<{text: string, context: string | null}>} Array of chunk objects
 */
function chunkByStructure(text) {
    const lines = text.split('\n');
    const sections = [];
    let currentHeader = null;
    let currentContent = [];

    for (const line of lines) {
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            // Save previous section if it has content
            if (currentContent.length > 0) {
                sections.push({
                    header: currentHeader,
                    content: currentContent.join('\n').trim()
                });
            }
            // Start new section
            currentHeader = headerMatch[2].trim(); // Just the header text
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    // Push the last section
    if (currentContent.length > 0) {
        sections.push({
            header: currentHeader,
            content: currentContent.join('\n').trim()
        });
    }

    // Now chunk each section and prepend context
    const allChunks = [];
    for (const section of sections) {
        if (!section.content) continue;

        const cleanContent = section.content.replace(/\s+/g, ' ').trim();
        const sentences = splitIntoSentences(cleanContent);
        const sectionChunks = chunkSentences(sentences);

        for (const chunkText of sectionChunks) {
            allChunks.push({
                text: chunkText,
                context: section.header // e.g., "Introduction" or "Chapter 1"
            });
        }
    }

    return allChunks;
}

/**
 * Chunk an array of sentences into ~MAX_WORDS word chunks.
 * @param {string[]} sentences
 * @returns {string[]} Array of text chunks
 */
function chunkSentences(sentences) {
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;

    for (const sentence of sentences) {
        const sentenceWords = countWords(sentence);

        if (sentenceWords > MAX_WORDS) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.join(' ').trim());
                currentChunk = [];
                currentWordCount = 0;
            }
            const sentenceChunks = splitLongSentence(sentence);
            chunks.push(...sentenceChunks);
        } else if (currentWordCount + sentenceWords > MAX_WORDS) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.join(' ').trim());
            }
            currentChunk = [sentence];
            currentWordCount = sentenceWords;
        } else {
            currentChunk.push(sentence);
            currentWordCount += sentenceWords;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' ').trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Split text into sentences
 * Handles common sentence endings: . ! ? and also handles abbreviations
 */
function splitIntoSentences(text) {
    // This regex tries to split on sentence boundaries while being careful about:
    // - Abbreviations (Mr., Mrs., Dr., etc.)
    // - Numbers with decimals (3.14)
    // - Ellipsis (...)
    const sentencePattern = /(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?]\s*)$/g;

    // Simple approach: split on common sentence endings followed by space and capital
    const sentences = [];
    let current = '';
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
        current += (current ? ' ' : '') + words[i];

        // Check if this word ends a sentence
        const lastChar = words[i].slice(-1);
        const isEndPunctuation = ['.', '!', '?'].includes(lastChar);
        const nextWord = words[i + 1];
        const nextStartsWithCapital = nextWord && /^[A-Z]/.test(nextWord);

        // Check for common abbreviations
        const isAbbreviation = /^(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g)\.$/.test(words[i]);

        if (isEndPunctuation && !isAbbreviation && (nextStartsWithCapital || i === words.length - 1)) {
            sentences.push(current.trim());
            current = '';
        }
    }

    // Push any remaining text
    if (current.trim()) {
        sentences.push(current.trim());
    }

    return sentences;
}

/**
 * Split a long sentence (>MAX_WORDS) into smaller chunks
 * Tries to break at natural points (commas, semicolons, etc.)
 */
function splitLongSentence(sentence) {
    const words = sentence.split(' ');
    const chunks = [];
    let currentChunk = [];

    for (const word of words) {
        currentChunk.push(word);

        if (currentChunk.length >= MAX_WORDS) {
            // Try to find a natural break point (comma, semicolon, dash)
            let breakIndex = currentChunk.length - 1;

            // Look back for a natural break within the last 10 words
            for (let i = currentChunk.length - 1; i >= Math.max(0, currentChunk.length - 10); i--) {
                const w = currentChunk[i];
                if (w.endsWith(',') || w.endsWith(';') || w.endsWith(':') || w.endsWith('—') || w.endsWith('-')) {
                    breakIndex = i;
                    break;
                }
            }

            // Create chunk up to break point
            const chunk = currentChunk.slice(0, breakIndex + 1).join(' ');
            chunks.push(chunk);

            // Keep remaining words for next chunk
            currentChunk = currentChunk.slice(breakIndex + 1);
        }
    }

    // Push remaining words
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks.filter(c => c.trim().length > 0);
}

/**
 * Count words in a string
 */
function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get statistics about the chunks
 */
export function getChunkStats(chunks) {
    if (!chunks || chunks.length === 0) {
        return { totalChunks: 0, avgWords: 0, minWords: 0, maxWords: 0 };
    }

    // Handle both object chunks {text, context} and plain string chunks
    const getTextFromChunk = (chunk) => {
        if (!chunk) return '';
        return typeof chunk === 'object' ? chunk.text : chunk;
    };

    const wordCounts = chunks.map(chunk => countWords(getTextFromChunk(chunk)));
    const totalWords = wordCounts.reduce((a, b) => a + b, 0);

    return {
        totalChunks: chunks.length,
        totalWords,
        avgWords: Math.round(totalWords / chunks.length),
        minWords: Math.min(...wordCounts),
        maxWords: Math.max(...wordCounts)
    };
}
