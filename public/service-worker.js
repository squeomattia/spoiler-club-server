self.addEventListener('sync', event => {
    if (event.tag === 'sync-videos') {
        console.log('Sync event triggered: sync-videos');
        event.waitUntil(uploadPendingVideos());
    }
});

async function uploadPendingVideos() {
    const db = await openDatabase();
    const transaction = db.transaction(['pendingUploads'], 'readonly');
    const store = transaction.objectStore('pendingUploads');
    const request = store.getAll();

    request.onsuccess = async function(event) {
        const allUploads = event.target.result;

        if (!Array.isArray(allUploads)) {
            console.error('allUploads non è un array:', allUploads);
            return;
        }

        console.log(`Numero di upload pendenti: ${allUploads.length}`);

        for (const upload of allUploads) {
            const formData = new FormData();
            formData.append('video', upload.video, upload.fileName);
            formData.append('name', upload.name);
            formData.append('carNumber', upload.carNumber);

            try {
                const response = await fetch('/upload-libreria', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Errore del server: ${errorText}`);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    const data = await response.json();
                    if (data.error) {
                        throw new Error(data.error);
                    }
                } else {
                    const errorText = await response.text();
                    throw new Error(`Errore del server: ${errorText}`);
                }

                const deleteTransaction = db.transaction(['pendingUploads'], 'readwrite');
                deleteTransaction.objectStore('pendingUploads').delete(upload.id);
                await deleteTransaction.complete;
                console.log(`Upload completato e rimosso dai pendenti: ${upload.fileName}`);
            } catch (error) {
                console.error('Errore nel caricamento del video:', error);
                return;
            }
        }
    };

    request.onerror = function(event) {
        console.error('Errore nel recupero dei pending uploads:', event.target.error);
    };
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('videoUploads', 1);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            db.createObjectStore('pendingUploads', { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = event => {
            console.log('IndexedDB aperto con successo');
            resolve(event.target.result);
        };
        request.onerror = event => {
            console.error('Errore nell\'apertura di IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}
