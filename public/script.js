document.addEventListener('DOMContentLoaded', (event) => {
    const loadBtn = document.getElementById('loadBtn');
    const fileInput = document.getElementById('fileInput');

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (validateForm()) {
                fileInput.click();
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function(event) {
            const files = event.target.files;
            if (!files.length) {
                return;
            }

            saveFormData();

            const name = localStorage.getItem('name');
            const carNumber = localStorage.getItem('carNumber');
            const spinner = document.getElementById('spinner');
            spinner.style.display = 'block';

            let uploadPromises = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
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
                            alert(response.message);
                        } else {
                            const response = JSON.parse(result.responseText);
                            alert(response.error);
                        }
                    });
                })
                .catch(error => {
                    spinner.style.display = 'none';
                    alert('Errore nel caricamento di uno o più video.');
                });
        });
    }

    function validateForm() {
        const name = document.getElementById('name').value;
        const carNumber = document.getElementById('carNumber').value;
        
        if (!name || !carNumber) {
            alert('Nome e Numero Auto sono obbligatori.');
            return false;
        }

        if (isNaN(carNumber)) {
            alert('Numero Auto deve essere un numero.');
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
}

function uploadVideo(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload-libreria', true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                resolve(xhr);
            } else {
                reject(xhr);
            }
        };

        xhr.onerror = function() {
            reject(xhr);
        };

        xhr.send(formData);
    });
}
