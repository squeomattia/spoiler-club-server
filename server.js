const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per il parsing del body delle richieste POST in formato JSON
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Servi i file statici dalla cartella public
app.use(express.static(path.join(__dirname, 'public')));

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
const tempUploadsDir = path.join(__dirname, 'temp_uploads');
const dataFilePath = path.join(__dirname, 'data.json');

if (!fs.existsSync(tempUploadsDir)) {
    fs.mkdirSync(tempUploadsDir);
}

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
        cb(null, tempUploadsDir);
    },
    filename: function(req, file, cb) {
        cb(null, `${file.originalname}-chunk-${req.body.chunkIndex}`);
    }
});

const upload = multer({ storage: storage });
const uploadLibreria = multer({ storage: storageLibreria });

app.post('/upload-chunk', uploadLibreria.single('video'), (req, res) => {
    const chunkIndex = parseInt(req.body.chunkIndex, 10);
    const totalChunks = parseInt(req.body.totalChunks, 10);
    const fileName = req.file.originalname;
    const tempPath = req.file.path;

    console.log(`Ricevuto chunk ${chunkIndex + 1} di ${totalChunks} per il file ${fileName}`);

    if (chunkIndex === totalChunks - 1) {
        const finalFilePath = path.join(uploadsLibreriaDir, fileName);
        const writeStream = fs.createWriteStream(finalFilePath);

        writeStream.on('error', (err) => {
            console.error("Errore nello stream di scrittura:", err);
            res.status(500).json({ error: "Errore nello stream di scrittura." });
        });

        writeStream.on('finish', () => {
            console.log(`File ${fileName} ricostruito e salvato in ${finalFilePath}`);
            res.json({ message: 'Video caricato con successo!' });
        });

        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(tempUploadsDir, `${fileName}-chunk-${i}`);
            if (fs.existsSync(chunkPath)) {
                const data = fs.readFileSync(chunkPath);
                writeStream.write(data);
                fs.unlinkSync(chunkPath); // rimuovi il chunk dopo averlo scritto
            } else {
                console.error(`Errore: Il chunk ${i} non esiste.`);
                writeStream.end();
                return res.status(500).json({ error: `Il chunk ${i} non esiste.` });
            }
        }
        writeStream.end();
    } else {
        res.json({ message: `Chunk ${chunkIndex + 1} di ${totalChunks} caricato con successo.` });
    }
});

app.post('/upload-libreria', uploadLibreria.single('video'), (req, res) => {
    const name = req.body.name;
    const carNumber = req.body.carNumber;
    const tempPath = path.join(uploadsLibreriaDir, req.file.filename);

    console.log(`Upload ricevuto: ${req.file.filename}`);

    let data = readData();

    if (!data.carNumbers[carNumber]) {
        data.carNumbers[carNumber] = {};
    }

    const userVideos = data.carNumbers[carNumber];
    if (Object.keys(userVideos).length >= 2 && !userVideos[name]) {
        fs.unlinkSync(tempPath);
        console.error(`Errore: Il numero auto ${carNumber} ha già due nomi assegnati.`);
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

        console.log(`File rinominato correttamente: ${newFileName}`);
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
