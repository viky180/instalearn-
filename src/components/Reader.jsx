import { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import {
    saveProgress,
    toggleBookmark,
    isChunkBookmarked,
    getBookmarksByDocument,
    exportBookmarksToJSON,
    shareBookmarksToWhatsApp
} from '../db/indexedDB';
import SettingsPanel from './SettingsPanel';

function Reader({ document, startIndex, onBack, showToast, theme, toggleTheme }) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState(() => {
        const saved = localStorage.getItem('instalearn-fontSize');
        return saved ? parseInt(saved) : 20;
    });
    const [isAnimating, setIsAnimating] = useState(false);

    const chunks = document?.chunks || [];
    const totalChunks = chunks.length;

    // Check if current chunk is bookmarked
    useEffect(() => {
        const checkBookmark = async () => {
            if (document) {
                const bookmarked = await isChunkBookmarked(document.id, currentIndex);
                setIsBookmarked(bookmarked);
            }
        };
        checkBookmark();
    }, [document, currentIndex]);

    // Save progress when index changes
    useEffect(() => {
        if (document) {
            saveProgress(document.id, currentIndex);
        }
    }, [document, currentIndex]);

    // Save font size preference
    useEffect(() => {
        localStorage.setItem('instalearn-fontSize', fontSize.toString());
    }, [fontSize]);

    const goToNext = useCallback(() => {
        if (currentIndex < totalChunks - 1 && !isAnimating) {
            setIsAnimating(true);
            setCurrentIndex(prev => prev + 1);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [currentIndex, totalChunks, isAnimating]);

    const goToPrev = useCallback(() => {
        if (currentIndex > 0 && !isAnimating) {
            setIsAnimating(true);
            setCurrentIndex(prev => prev - 1);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [currentIndex, isAnimating]);

    // Swipe handlers - swipe up = next, swipe down = prev
    const swipeHandlers = useSwipeable({
        onSwipedUp: goToNext,
        onSwipedDown: goToPrev,
        preventScrollOnSwipe: true,
        trackMouse: true
    });

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'ArrowRight') {
                e.preventDefault();
                goToNext();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrev();
            } else if (e.key === 'Escape') {
                onBack();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrev, onBack]);

    // Helper functions to handle both object chunks and string chunks (backwards compat)
    const getChunkText = (chunk) => {
        if (!chunk) return '';
        return typeof chunk === 'object' ? chunk.text : chunk;
    };

    const getChunkContext = (chunk) => {
        if (!chunk || typeof chunk !== 'object') return null;
        return chunk.context;
    };

    const handleBookmarkToggle = async () => {
        if (!document) return;

        const result = await toggleBookmark(
            document.id,
            currentIndex,
            getChunkText(chunks[currentIndex])
        );

        setIsBookmarked(result.added);
        showToast(result.added ? 'Bookmark added' : 'Bookmark removed');
    };

    const handleExportBookmarks = async () => {
        const bookmarks = await getBookmarksByDocument(document.id);
        if (bookmarks.length === 0) {
            showToast('No bookmarks to export', 'error');
            return;
        }
        exportBookmarksToJSON(document.name, bookmarks);
        showToast(`Exported ${bookmarks.length} bookmarks`);
    };

    const handleShareBookmarks = async () => {
        const bookmarks = await getBookmarksByDocument(document.id);
        if (bookmarks.length === 0) {
            showToast('No bookmarks to share', 'error');
            return;
        }
        shareBookmarksToWhatsApp(document.name, bookmarks);
    };

    const progressPercent = totalChunks > 0
        ? ((currentIndex + 1) / totalChunks) * 100
        : 0;

    if (!document || chunks.length === 0) {
        return (
            <div className="reader">
                <div className="loading">
                    <p>No content to display</p>
                    <button className="btn btn--primary" onClick={onBack}>Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="reader" {...swipeHandlers}>
            {/* Progress Bar */}
            <div className="progress-bar">
                <div
                    className="progress-bar__fill"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Header */}
            <header className="reader__header">
                <button className="reader__back" onClick={onBack}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>

                <div className="reader__actions">
                    <button
                        className={`reader__action ${isBookmarked ? 'reader__action--active' : ''}`}
                        onClick={handleBookmarkToggle}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>

                    <button
                        className="reader__action"
                        onClick={() => setShowSettings(true)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>
            </header>

            {/* Navigation Zones */}
            <div className="nav-zone nav-zone--left" onClick={goToPrev}>
                <svg className="nav-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </div>
            <div className="nav-zone nav-zone--right" onClick={goToNext}>
                <svg className="nav-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>

            {/* Chunk Content */}
            <div className="chunk-container">
                <div className="chunk-card" key={currentIndex}>
                    {/* Section Context Badge */}
                    {getChunkContext(chunks[currentIndex]) && (
                        <div className="chunk-card__context">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                            {getChunkContext(chunks[currentIndex])}
                        </div>
                    )}
                    <p
                        className="chunk-card__text"
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        {getChunkText(chunks[currentIndex])}
                    </p>
                    {isBookmarked && (
                        <div className="chunk-card__bookmark-indicator">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Bookmarked
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="reader__footer">
                <div className="reader__counter">
                    {currentIndex + 1} / {totalChunks}
                </div>
                <div className="reader__hint">
                    Swipe up for next • Swipe down for previous
                </div>
            </footer>

            {/* Settings Panel */}
            {showSettings && (
                <SettingsPanel
                    onClose={() => setShowSettings(false)}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    documentId={document.id}
                    documentName={document.name}
                    onGoToBookmark={(index) => {
                        setCurrentIndex(index);
                        setShowSettings(false);
                    }}
                    onExport={handleExportBookmarks}
                    onShare={handleShareBookmarks}
                />
            )}
        </div>
    );
}

export default Reader;
