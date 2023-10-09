const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const devices = {};
let idShortCounter = 0;

const logFilePath = path.join(__dirname, 'logs.json');

if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '[]');
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function generateFolderTree(folderPath) {
    const folderTree = {};
    return folderTree;
}

function getListSubDirectory(folderName) {
    const folderPath = path.join(__dirname, 'users_config', folderName);

    const contents = fs.readdirSync(folderPath);

    const subfolders = [];
    const files = [];

    contents.forEach((content) => {
        const contentPath = path.join(folderPath, content);
        const stats = fs.statSync(contentPath);

        if (stats.isDirectory()) {
            subfolders.push(content);
        } else {
            files.push(content);
        }
    });

    return { subfolders, files };
}

app.post('/route_testing', upload.single('file'), (req, res) => {
    try {
        const data = req.body || {};
        const uploadedFile = req.file;
        const macAddress = data.mac_address || '';
        const macHash = crypto.createHash('sha256').update(macAddress).digest('hex');
        const logs = JSON.parse(fs.readFileSync(logFilePath));
        const existingLog = logs.find((log) => log.macHash === macHash);

        if (!existingLog) {
            const idShort = generateSequentialShortId();
            function generateRandomHex16() {
                const bytes = crypto.randomBytes(8);
                const hexString = bytes.toString('hex').toUpperCase().slice(0, 16);
                return hexString;
            }
            const idLong = generateRandomHex16();
            const combinedId = `${idShort}_${idLong}`;
            const timestamp = data.timestamp || '';
            const folderName = path.join(__dirname, 'users_config', combinedId);
            if (!fs.existsSync(folderName)) {
                fs.mkdirSync(folderName, { recursive: true });
            }
            let filePath = '';
            if (timestamp) {
                const sanitizedTimestamp = timestamp.replace(/[^a-zA-Z0-9-_]/g, '');
                filePath = path.join(folderName, sanitizedTimestamp, 'printer.cfg');
            } else {
                console.error('Timestamp is undefined or empty.');
            }
            if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
            }
            const newFileHash = crypto.createHash('md5').update(uploadedFile.buffer).digest('hex');
            if (shouldSaveFile(filePath, newFileHash)) {
                fs.writeFileSync(filePath, uploadedFile.buffer);
            } else {
                console.log(`File already exists with the same content: ${filePath}`);
            }
            const newLog = {
                macHash: macHash,
                idLong: idLong,
                idShort: idShort,
                timestamp: new Date().toISOString()
            };
            logs.push(newLog);
            fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
            res.status(200).json({
                id_long: idLong,
                id_short: idShort,
            });
            console.log(`[${new Date().toISOString()}] Request handled successfully for MAC ${macAddress}`);
        } else {
            const timestamp = data.timestamp || '';

            if (timestamp) {
                const sanitizedTimestamp = timestamp.replace(/[^a-zA-Z0-9-_]/g, '');
                const folderPath = path.join(__dirname, 'users_config', existingLog.idShort + '_' + existingLog.idLong);
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }
                const newFilePath = path.join(folderPath, sanitizedTimestamp, 'printer.cfg');
                if (!fs.existsSync(path.dirname(newFilePath))) {
                    fs.mkdirSync(path.dirname(newFilePath), { recursive: true });
                }
                const newFileHash = crypto.createHash('md5').update(uploadedFile.buffer).digest('hex');
                if (shouldSaveFile(newFilePath, newFileHash)) {
                    fs.writeFileSync(newFilePath, uploadedFile.buffer);
                    console.log(`File saved to existing directory: ${newFilePath}`);
                } else {
                    console.log(`File already exists with the same content: ${newFilePath}`);
                }
            } else {
                console.error('Timestamp is undefined or empty.');
            }
            res.status(200).json({
                id_long: existingLog.idLong,
                id_short: existingLog.idShort,
            });
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error);
        res.status(500).send('Internal Server Error');
    }
});

function shouldSaveFile(filePath, newFileHash) {
    if (!fs.existsSync(filePath)) {
        return true; 
    }
    const existingFileContent = fs.readFileSync(filePath);
    const existingFileHash = crypto.createHash('md5').update(existingFileContent).digest('hex');
    return newFileHash !== existingFileHash; 
}


function generateSequentialShortId() {
    const id = String(++idShortCounter).padStart(8, '0');
    console.log('Generated ID:', id);
    return id.toUpperCase();
}


module.exports = app;
