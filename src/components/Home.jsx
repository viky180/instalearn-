import { useState, useRef } from 'react';
import { saveDocument, deleteDocument, getProgress } from '../db/indexedDB';
import { extractTextFromPDF } from '../utils/pdfParser';
import { extractTextFromFile, validateFile, getFileType } from '../utils/textParser';
import { chunkText, getChunkStats } from '../utils/chunker';

function Home({
    documents,
    onDocumentSelect,
    onDocumentAdded,
    onDocumentDeleted,
    showToast,
    theme,
    toggleTheme
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [progress, setProgress] = useState({});
    const fileInputRef = useRef(null);

    // Load progress for all documents
    useState(() => {
        const loadProgress = async () => {
            const progressMap = {};
            for (const doc of documents) {
                const p = await getProgress(doc.id);
                if (p) {
                    progressMap[doc.id] = p;
                }
            }
            setProgress(progressMap);
        };
        loadProgress();
    }, [documents]);

    const handleFileSelect = async (files) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        const validation = validateFile(file);

        if (!validation.valid) {
            showToast(validation.error, 'error');
            return;
        }

        setIsLoading(true);

        try {
            let text;

            if (validation.type === 'pdf') {
                text = await extractTextFromPDF(file);
            } else {
                text = await extractTextFromFile(file);
            }

            if (!text || text.trim().length === 0) {
                throw new Error('Could not extract any text from the file');
            }

            const chunks = chunkText(text);
            const stats = getChunkStats(chunks);

            if (chunks.length === 0) {
                throw new Error('Could not create any readable chunks from the file');
            }

            const doc = await saveDocument({
                name: file.name,
                content: text,
                chunks: chunks
            });

            showToast(`Added "${file.name}" (${stats.totalChunks} pages)`);
            onDocumentAdded();
        } catch (error) {
            console.error('Error processing file:', error);
            showToast(error.message || 'Failed to process file', 'error');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (e, docId) => {
        e.stopPropagation();
        if (window.confirm('Delete this document?')) {
            await deleteDocument(docId);
            showToast('Document deleted');
            onDocumentDeleted();
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = () => {
        setIsDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragActive(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="home">
            {/* Header */}
            <header className="home__header">
                <div className="home__logo">IL</div>
                <h1 className="home__title">Instalearn</h1>
                <p className="home__subtitle">Focused reading, one chunk at a time</p>
            </header>

            {/* Theme Toggle */}
            <button
                className="btn btn--secondary"
                onClick={toggleTheme}
                style={{ alignSelf: 'flex-end', marginBottom: 'var(--spacing-md)' }}
            >
                {theme === 'dark' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                )}
                <span>{theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
            </button>

            {/* Upload Zone */}
            <div
                className={`upload-zone ${isDragActive ? 'upload-zone--active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.text,.md"
                    onChange={(e) => handleFileSelect(e.target.files)}
                />

                {isLoading ? (
                    <div className="loading">
                        <div className="loading__spinner"></div>
                        <span className="loading__text">Processing file...</span>
                    </div>
                ) : (
                    <>
                        <svg className="upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p className="upload-zone__text">Upload PDF or TXT</p>
                        <p className="upload-zone__hint">Tap or drag & drop</p>
                    </>
                )}
            </div>

            {/* Documents List */}
            <section className="documents">
                {documents.length > 0 ? (
                    <>
                        <h2 className="documents__title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            Your Documents
                        </h2>
                        <div className="documents__list">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="document-card"
                                    onClick={() => onDocumentSelect(doc)}
                                >
                                    <div className="document-card__icon">
                                        {getFileType(doc.name) === 'pdf' ? (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                            </svg>
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                    <div className="document-card__info">
                                        <div className="document-card__name">{doc.name}</div>
                                        <div className="document-card__meta">
                                            <span>{doc.totalChunks} pages</span>
                                            <span>{formatDate(doc.createdAt)}</span>
                                            {progress[doc.id] && (
                                                <span className="document-card__progress">
                                                    📖 {Math.round((progress[doc.id].currentIndex / doc.totalChunks) * 100)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        className="document-card__delete"
                                        onClick={(e) => handleDelete(e, doc.id)}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <p>No documents yet</p>
                        <p>Upload a PDF or text file to get started</p>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Home;
