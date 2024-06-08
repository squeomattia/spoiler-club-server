function uploadVideoInChunks(file) {
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadPromises = [];
    
    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('video', chunk, file.name);
        formData.append('chunkIndex', i);
        formData.append('totalChunks', totalChunks);
        formData.append('name', localStorage.getItem('name'));
        formData.append('carNumber', localStorage.getItem('carNumber'));
        
        uploadPromises.push(uploadChunk(formData));
    }
    
    return Promise.all(uploadPromises);
}

function uploadChunk(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload-chunk', true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                console.log(`Chunk upload completato con successo.`);
                resolve(xhr);
            } else {
                console.error(`Errore nell'upload del chunk: ${xhr.statusText}`);
                reject(xhr);
            }
        };

        xhr.onerror = function() {
            console.error('Errore di rete durante l\'upload del chunk.');
            reject(xhr);
        };

        xhr.send(formData);
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    const loadBtn = document.getElementById('loadBtn');
    const fileInput = document.getElementById('fileInput');

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (validateForm()) {
                console.log('Form convalidato con successo.');
                fileInput.click();
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function(event) {
            const files = event.target.files;
            if (!files.length) {
                console.log('Nessun file selezionato.');
                return;
            }

            console.log(`Numero di file selezionati: ${files.length}`);

            saveFormData();

            const spinner = document.getElementById('spinner');
            spinner.style.display = 'block';

            let uploadPromises = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`Caricamento del file: ${file.name}`);
                uploadPromises.push(uploadVideoInChunks(file));
            }

            Promise.all(uploadPromises)
                .then(results => {
                    spinner.style.display = 'none';
                    results.forEach(result => {
                        result.forEach(xhr => {
                            if (xhr.status === 200) {
                                const response = JSON.parse(xhr.responseText);
                                console.log(`Successo nel caricamento del chunk: ${response.message}`);
                                alert(response.message);
                            } else {
                                const response = JSON.parse(xhr.responseText);
                                console.error(`Errore nel caricamento del chunk: ${response.error}`);
                                alert(response.error);
                            }
                        });
                    });
                })
                .catch(error => {
                    spinner.style.display = 'none';
                    console.error('Errore nel caricamento di uno o più chunk:', error);
                    alert('Errore nel caricamento di uno o più chunk.');
                });
        });
    }

    function validateForm() {
        const name = document.getElementById('name').value;
        const carNumber = document.getElementById('carNumber').value;
        
        if (!name || !carNumber) {
            alert('Nome e Numero Auto sono obbligatori.');
            console.error('Validazione fallita: Nome e Numero Auto sono obbligatori.');
            return false;
        }

        if (isNaN(carNumber)) {
            alert('Numero Auto deve essere un numero.');
            console.error('Validazione fallita: Numero Auto deve essere un numero.');
            return false;
        }

        return true;
    }
});

function saveFormData() {
    const name = document.getElementById('name').value;
    const carNumber = document.getElementById('carNumber').value;
    localStorage.setItem('name', name);
    localStorage.setItem('carNumber', carNumber);
    console.log(`Dati salvati: Nome - ${name}, Numero Auto - ${carNumber}`);
}
