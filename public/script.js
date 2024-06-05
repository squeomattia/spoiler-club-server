let mediaRecorder;
let recordedChunks = [];

document.addEventListener('DOMContentLoaded', (event) => {
    const registerBtn = document.getElementById('registerBtn');
    const loadBtn = document.getElementById('loadBtn');
    const fileInput = document.getElementById('fileInput');

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            saveFormData();
            window.location.href = 'record.html';
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            fileInput.click();
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

    if (window.location.pathname.endsWith('record.html')) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                let video = document.getElementById('video');
                video.srcObject = stream;
                video.play();

                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = function(event) {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = function() {
                    let blob = new Blob(recordedChunks, {
                        type: 'video/webm'
                    });
                    let url = URL.createObjectURL(blob);
                    let video = document.getElementById('video');
                    video.srcObject = null;
                    video.src = url;
                    video.controls = true;
                };
            })
            .catch(function(err) {
                console.error("Errore nell'accesso alla fotocamera: ", err);
            });

        document.getElementById('startBtn').addEventListener('click', function() {
            recordedChunks = [];
            mediaRecorder.start();
            document.getElementById('startBtn').style.display = 'none';
            document.getElementById('stopBtn').style.display = 'inline';
        });

        document.getElementById('stopBtn').addEventListener('click', function() {
            mediaRecorder.stop();
            document.getElementById('stopBtn').style.display = 'none';
            document.getElementById('uploadBtn').style.display = 'inline';
        });

        document.getElementById('uploadBtn').addEventListener('click', function() {
            const name = localStorage.getItem('name');
            const carNumber = localStorage.getItem('carNumber');
            const fileName = `${carNumber}_${name}_temp.webm`;

            let blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });

            const spinner = document.getElementById('spinner');
            spinner.style.display = 'block';
            document.getElementById('uploadBtn').style.display = 'none';

            let formData = new FormData();
            formData.append('video', blob, fileName);
            formData.append('name', name);
            formData.append('carNumber', carNumber);

            let xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload', true);

            xhr.onload = function() {
                spinner.style.display = 'none';
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    alert(response.message);
                    window.location.href = 'index.html';
                } else {
                    const response = JSON.parse(xhr.responseText);
                    alert(response.error);
                    document.getElementById('uploadBtn').style.display = 'inline';
                }
            };

            xhr.onerror = function() {
                spinner.style.display = 'none';
                alert('Errore nel caricamento del video. Verifica la tua connessione e riprova.');
                document.getElementById('uploadBtn').style.display = 'inline';
            };

            xhr.send(formData);
        });
    }
});

function saveFormData() {
    const name = document.getElementById('name').value;
    const carNumber = document.getElementById('carNumber').value;
    localStorage.setItem('name', name);
    localStorage.setItem('carNumber', carNumber);
}
