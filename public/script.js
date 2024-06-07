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
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            saveFormData();

            const name = localStorage.getItem('name');
            const carNumber = localStorage.getItem('carNumber');
            const formData = new FormData();
            formData.append('video', file, file.name);
            formData.append('name', name);
            formData.append('carNumber', carNumber);

            const spinner = document.getElementById('spinner');
            spinner.style.display = 'block';

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload-libreria', true);

            xhr.onload = function() {
                spinner.style.display = 'none';
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    alert(response.message);
                } else {
                    const response = JSON.parse(xhr.responseText);
                    alert(response.error);
                }
            };

            xhr.onerror = function() {
                spinner.style.display = 'none';
                alert('Errore nel caricamento del video.');
            };

            xhr.send(formData);
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
