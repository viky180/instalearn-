import { openDB } from 'idb';

const DB_NAME = 'instalearn-db';
const DB_VERSION = 1;

// Initialize the database
async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Documents store
            if (!db.objectStoreNames.contains('documents')) {
                const docStore = db.createObjectStore('documents', { keyPath: 'id' });
                docStore.createIndex('createdAt', 'createdAt');
            }

            // Bookmarks store
            if (!db.objectStoreNames.contains('bookmarks')) {
                const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
                bookmarkStore.createIndex('documentId', 'documentId');
                bookmarkStore.createIndex('createdAt', 'createdAt');
            }

            // Reading progress store
            if (!db.objectStoreNames.contains('progress')) {
                db.createObjectStore('progress', { keyPath: 'documentId' });
            }
        }
    });
}

// Documents
export async function saveDocument(doc) {
    const db = await initDB();
    const id = doc.id || crypto.randomUUID();
    const document = {
        id,
        name: doc.name,
        content: doc.content,
        chunks: doc.chunks,
        totalChunks: doc.chunks.length,
        createdAt: new Date().toISOString()
    };
    await db.put('documents', document);
    return document;
}

export async function getDocument(id) {
    const db = await initDB();
    return db.get('documents', id);
}

export async function getAllDocuments() {
    const db = await initDB();
    const docs = await db.getAllFromIndex('documents', 'createdAt');
    return docs.reverse(); // Most recent first
}

export async function deleteDocument(id) {
    const db = await initDB();
    await db.delete('documents', id);
    // Also delete related bookmarks and progress
    const bookmarks = await getBookmarksByDocument(id);
    for (const bookmark of bookmarks) {
        await db.delete('bookmarks', bookmark.id);
    }
    await db.delete('progress', id);
}

// Bookmarks
export async function saveBookmark(bookmark) {
    const db = await initDB();
    const id = bookmark.id || crypto.randomUUID();
    const newBookmark = {
        id,
        documentId: bookmark.documentId,
        chunkIndex: bookmark.chunkIndex,
        text: bookmark.text,
        createdAt: new Date().toISOString()
    };
    await db.put('bookmarks', newBookmark);
    return newBookmark;
}

export async function getBookmarksByDocument(documentId) {
    const db = await initDB();
    return db.getAllFromIndex('bookmarks', 'documentId', documentId);
}

export async function deleteBookmark(id) {
    const db = await initDB();
    await db.delete('bookmarks', id);
}

export async function isChunkBookmarked(documentId, chunkIndex) {
    const bookmarks = await getBookmarksByDocument(documentId);
    return bookmarks.some(b => b.chunkIndex === chunkIndex);
}

export async function toggleBookmark(documentId, chunkIndex, text) {
    const bookmarks = await getBookmarksByDocument(documentId);
    const existing = bookmarks.find(b => b.chunkIndex === chunkIndex);

    if (existing) {
        await deleteBookmark(existing.id);
        return { added: false };
    } else {
        const bookmark = await saveBookmark({ documentId, chunkIndex, text });
        return { added: true, bookmark };
    }
}

// Reading Progress
export async function saveProgress(documentId, currentIndex) {
    const db = await initDB();
    await db.put('progress', {
        documentId,
        currentIndex,
        lastRead: new Date().toISOString()
    });
}

export async function getProgress(documentId) {
    const db = await initDB();
    return db.get('progress', documentId);
}

// Export bookmarks as JSON
export function exportBookmarksToJSON(documentName, bookmarks) {
    const data = {
        documentName,
        exportedAt: new Date().toISOString(),
        bookmarks: bookmarks.map(b => ({
            chunkIndex: b.chunkIndex,
            text: b.text,
            createdAt: b.createdAt
        }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName.replace(/\.[^/.]+$/, '')}_bookmarks.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Share bookmarks to WhatsApp
export function shareBookmarksToWhatsApp(documentName, bookmarks) {
    const text = `📚 Bookmarks from "${documentName}"\n\n` +
        bookmarks.map((b, i) => `${i + 1}. "${b.text.substring(0, 100)}${b.text.length > 100 ? '...' : ''}"`).join('\n\n');

    // Try Web Share API first
    if (navigator.share) {
        navigator.share({
            title: `Bookmarks from ${documentName}`,
            text: text
        }).catch(() => {
            // Fallback to WhatsApp URL
            openWhatsApp(text);
        });
    } else {
        openWhatsApp(text);
    }
}

function openWhatsApp(text) {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}
