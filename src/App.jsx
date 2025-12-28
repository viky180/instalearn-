import { useState, useEffect } from 'react';
import Home from './components/Home';
import Reader from './components/Reader';
import Toast from './components/Toast';
import { getAllDocuments, getProgress } from './db/indexedDB';

function App() {
    const [currentView, setCurrentView] = useState('home'); // 'home' or 'reader'
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [startIndex, setStartIndex] = useState(0);
    const [toast, setToast] = useState(null);
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('instalearn-theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('instalearn-theme', theme);
    }, [theme]);

    // Load documents on mount
    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        const docs = await getAllDocuments();
        setDocuments(docs);
    };

    const handleDocumentSelect = async (doc) => {
        // Check for saved progress
        const progress = await getProgress(doc.id);

        setSelectedDocument(doc);

        if (progress && progress.currentIndex > 0) {
            // Show resume option
            const resume = window.confirm(
                `Resume from where you left off? (Page ${progress.currentIndex + 1} of ${doc.chunks.length})`
            );
            setStartIndex(resume ? progress.currentIndex : 0);
        } else {
            setStartIndex(0);
        }

        setCurrentView('reader');
    };

    const handleBackToHome = () => {
        setCurrentView('home');
        setSelectedDocument(null);
        loadDocuments(); // Refresh in case of changes
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="app">
            {currentView === 'home' ? (
                <Home
                    documents={documents}
                    onDocumentSelect={handleDocumentSelect}
                    onDocumentAdded={loadDocuments}
                    onDocumentDeleted={loadDocuments}
                    showToast={showToast}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
            ) : (
                <Reader
                    document={selectedDocument}
                    startIndex={startIndex}
                    onBack={handleBackToHome}
                    showToast={showToast}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
            )}

            {toast && <Toast message={toast.message} type={toast.type} />}
        </div>
    );
}

export default App;
