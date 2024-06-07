const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per il parsing del body delle richieste POST in formato JSON
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Servi i file statici dalla cartella public
app.use(express.static(path.join(__dirname, 'public')));

// Servi i file statici dalla cartella uploads
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//app.use('/uploads_libreria', express.static(path.join(__dirname, 'uploads_libreria')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/check', (req, res) => {
    const { name, carNumber } = req.body;
    if (!name || !carNumber) {
        return res.status(400).json({ allowed: false, error: 'Nome e numero dell\'auto sono obbligatori.' });
    }

    let data = readData();

    if (!data.carNumbers[carNumber]) {
        return res.json({ allowed: true });
    }

    const userVideos = data.carNumbers[carNumber];
    if (Object.keys(userVideos).length >= 2 && !userVideos[name]) {
        return res.json({ allowed: false, error: `Il numero auto ${carNumber} ha già due nomi assegnati.` });
    }

    return res.json({ allowed: true });
});

const uploadsDir = path.join(__dirname, 'uploads');
const uploadsLibreriaDir = path.join(__dirname, 'uploads_libreria');
const dataFilePath = path.join(__dirname, 'data.json');

// Funzione per leggere i dati dal file JSON
function readData() {
    if (fs.existsSync(dataFilePath)) {
        const rawData = fs.readFileSync(dataFilePath);
        return JSON.parse(rawData);
    } else {
        return { carNumbers: {} };
    }
}

// Funzione per scrivere i dati nel file JSON
function writeData(data) {
    const rawData = JSON.stringify(data, null, 2);
    fs.writeFileSync(dataFilePath, rawData);
}

// Configura multer per salvare i file temporaneamente
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        const fileName = file.originalname;
        cb(null, fileName);
    }
});

const storageLibreria = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadsLibreriaDir);
    },
    filename: function(req, file, cb) {
        const fileName = file.originalname;
        cb(null, fileName);
    }
});

const upload = multer({ storage: storage });
const uploadLibreria = multer({ storage: storageLibreria });

app.post('/upload', upload.single('video'), (req, res) => {
    const name = req.body.name;
    const carNumber = req.body.carNumber;
    const tempPath = path.join(uploadsDir, req.file.filename);

    let data = readData();

    if (!data.carNumbers[carNumber]) {
        data.carNumbers[carNumber] = {};
    }

    const userVideos = data.carNumbers[carNumber];
    if (Object.keys(userVideos).length >= 2 && !userVideos[name]) {
        fs.unlinkSync(tempPath);
        return res.status(400).json({ error: `Il numero auto ${carNumber} ha già due nomi assegnati.` });
    }

    if (!userVideos[name]) {
        userVideos[name] = 0;
    }

    userVideos[name] += 1;

    const newFileName = `${carNumber}_${name}_${userVideos[name]}.mp4`;
    const newPath = path.join(uploadsDir, newFileName);

    const ffmpegCommand = `ffmpeg -fflags +genpts -i ${tempPath} -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k ${newPath}`;
    console.log(`Esecuzione comando FFmpeg: ${ffmpegCommand}`);
    
    exec(ffmpegCommand, (err, stdout, stderr) => {
        fs.unlinkSync(tempPath);

        if (err) {
            console.error("Errore nella conversione del video:", err);
            console.error("Dettagli FFmpeg stdout:", stdout);
            console.error("Dettagli FFmpeg stderr:", stderr);
            return res.status(500).json({ error: "Errore nella conversione del video." });
        }

        writeData(data);

        res.json({ message: "Video caricato e convertito con successo!" });
    });
});

app.post('/upload-libreria', uploadLibreria.single('video'), (req, res) => {
    const name = req.body.name;
    const carNumber = req.body.carNumber;
    const tempPath = path.join(uploadsLibreriaDir, req.file.filename);

    let data = readData();

    if (!data.carNumbers[carNumber]) {
        data.carNumbers[carNumber] = {};
    }

    const userVideos = data.carNumbers[carNumber];
    if (Object.keys(userVideos).length >= 2 && !userVideos[name]) {
        fs.unlinkSync(tempPath);
        return res.status(400).json({ error: `Il numero auto ${carNumber} ha già due nomi assegnati.` });
    }

    if (!userVideos[name]) {
        userVideos[name] = 0;
    }

    userVideos[name] += 1;

    const newFileName = `${carNumber}_${name}_${userVideos[name]}${path.extname(req.file.filename)}`;
    const newPath = path.join(uploadsLibreriaDir, newFileName);

    fs.rename(tempPath, newPath, (err) => {
        if (err) {
            console.error("Errore nel rinominare il file:", err);
            return res.status(500).json({ error: "Errore nel rinominare il file." });
        }

        writeData(data);

        res.json({ message: "Video caricato con successo!" });
    });
});

app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
});
