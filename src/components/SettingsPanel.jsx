import { useState, useEffect } from 'react';
import { getBookmarksByDocument } from '../db/indexedDB';

function SettingsPanel({
    onClose,
    fontSize,
    setFontSize,
    theme,
    toggleTheme,
    documentId,
    documentName,
    onGoToBookmark,
    onExport,
    onShare
}) {
    const [bookmarks, setBookmarks] = useState([]);

    useEffect(() => {
        const loadBookmarks = async () => {
            const marks = await getBookmarksByDocument(documentId);
            setBookmarks(marks.sort((a, b) => a.chunkIndex - b.chunkIndex));
        };
        loadBookmarks();
    }, [documentId]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="settings-overlay" onClick={handleOverlayClick}>
            <div className="settings-panel">
                <header className="settings-panel__header">
                    <h2 className="settings-panel__title">Settings</h2>
                    <button className="settings-panel__close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>

                {/* Theme Toggle */}
                <section className="settings-section">
                    <label className="settings-section__label">Appearance</label>
                    <div className="settings-row">
                        <span>Theme</span>
                        <div className="theme-toggle">
                            <button
                                className={`theme-toggle__option ${theme === 'light' ? 'theme-toggle__option--active' : ''}`}
                                onClick={() => theme !== 'light' && toggleTheme()}
                            >
                                ☀️ Light
                            </button>
                            <button
                                className={`theme-toggle__option ${theme === 'dark' ? 'theme-toggle__option--active' : ''}`}
                                onClick={() => theme !== 'dark' && toggleTheme()}
                            >
                                🌙 Dark
                            </button>
                        </div>
                    </div>
                </section>

                {/* Font Size */}
                <section className="settings-section">
                    <label className="settings-section__label">Font Size</label>
                    <div className="font-slider">
                        <span className="font-slider__label" style={{ fontSize: '14px' }}>A</span>
                        <input
                            type="range"
                            min="14"
                            max="32"
                            value={fontSize}
                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                        />
                        <span className="font-slider__label" style={{ fontSize: '24px' }}>A</span>
                    </div>
                    <p style={{
                        textAlign: 'center',
                        marginTop: 'var(--spacing-sm)',
                        fontSize: `${fontSize}px`,
                        color: 'var(--color-text-secondary)'
                    }}>
                        Preview text
                    </p>
                </section>

                {/* Bookmarks Section */}
                <section className="bookmarks-section">
                    <header className="bookmarks-section__header">
                        <h3 className="bookmarks-section__title">
                            📑 Bookmarks ({bookmarks.length})
                        </h3>
                        {bookmarks.length > 0 && (
                            <div className="bookmarks-section__actions">
                                <button className="btn btn--secondary btn--icon" onClick={onExport} title="Export">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                                <button className="btn btn--primary btn--icon" onClick={onShare} title="Share to WhatsApp">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </header>

                    {bookmarks.length > 0 ? (
                        <div className="bookmarks-list">
                            {bookmarks.map((bookmark) => (
                                <div
                                    key={bookmark.id}
                                    className="bookmark-item"
                                    onClick={() => onGoToBookmark(bookmark.chunkIndex)}
                                >
                                    <p className="bookmark-item__text">{bookmark.text}</p>
                                    <span className="bookmark-item__meta">Page {bookmark.chunkIndex + 1}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            padding: 'var(--spacing-lg)'
                        }}>
                            No bookmarks yet. Tap the bookmark icon while reading to save important chunks.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

export default SettingsPanel;
