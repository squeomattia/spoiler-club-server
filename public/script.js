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

            const name = localStorage.getItem('name');
            const carNumber = localStorage.getItem('carNumber');
            const spinner = document.getElementById('spinner');
            spinner.style.display = 'block';

            let uploadPromises = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`Caricamento del file: ${file.name}`);
                const formData = new FormData();
                formData.append('video', file, file.name);
                formData.append('name', name);
                formData.append('carNumber', carNumber);

                uploadPromises.push(uploadVideo(formData));
            }

            Promise.all(uploadPromises)
                .then(results => {
                    spinner.style.display = 'none';
                    results.forEach(result => {
                        if (result.status === 200) {
                            const response = JSON.parse(result.responseText);
                            console.log(`Successo nel caricamento del file: ${response.message}`);
                            alert(response.message);
                        } else {
                            const response = JSON.parse(result.responseText);
                            console.error(`Errore nel caricamento del file: ${response.error}`);
                            alert(response.error);
                        }
                    });
                })
                .catch(error => {
                    spinner.style.display = 'none';
                    console.error('Errore nel caricamento di uno o più video:', error);
                    alert('Errore nel caricamento di uno o più video.');
                });
        });
    }

    function validateForm() {
        const name = document.getElementById('name').value;
        const carNumber = document.getElementById('carNumber').value;
        
        if (!name || !carNumber) {
            alert('Name and Car Number are required.');
            console.error('Validazione fallita: Nome e Numero Auto sono obbligatori.');
            return false;
        }

        if (isNaN(carNumber)) {
            alert('Car Number must be a number.');
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

function uploadVideo(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload-libreria', true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                console.log('Upload completato con successo.');
                resolve(xhr);
            } else {
                console.error(`Errore nell'upload: ${xhr.statusText}`);
                reject(xhr);
            }
        };

        xhr.onerror = function() {
            console.error('Errore di rete durante l\'upload.');
            reject(xhr);
        };

        xhr.send(formData);
    });
}
