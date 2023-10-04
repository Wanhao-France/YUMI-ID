const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const treeify = require('treeify');
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

app.use('/route_testing', upload.single('file'), (req, res) => {
    try {
        const data = req.body;
        const uploadedFile = req.file;
        const macAddress = data.mac_address;

        const macHash = crypto.createHash('sha256').update(macAddress).digest('hex');

        const logs = JSON.parse(fs.readFileSync(logFilePath));
        const existingLog = logs.find((log) => log.macHash === macHash);

        if (!existingLog) {

            const idShort = generateSequentialShortId();

            const idLong = crypto.randomBytes(5).toString('hex').toUpperCase();


            const combinedId = `${idShort}_${idLong}`;

            const timestamp = data.timestamp;

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

            fs.writeFileSync(filePath, uploadedFile.buffer);

            const newLog = {
                macHash: macHash,
                idLong: idLong,
                idShort: idShort,
                timestamp: new Date().toISOString()
            };

            logs.push(newLog);

            fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));

            console.log(idLong, idShort)

            res.status(200).json({
                id_long: idLong,
                id_short: idShort,
            });

            console.log(`[${new Date().toISOString()}] Request handled successfully for MAC ${macAddress}`);
        } else {
            const timestamp = data.timestamp;

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

                fs.writeFileSync(newFilePath, uploadedFile.buffer);
                console.log(`File saved to existing directory: ${newFilePath}`);
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


app.post('/update_mac', (req, res) => {
    try {
        const data = req.body;
        const macAddress = data.mac_address;
        const newMacAddress = data.new_mac;
        const timestamp = data.timestamp;

        res.status(200).json({
            message: 'MAC address updated',
        });

        console.log(`[${new Date().toISOString()}] MAC address updated for MAC ${macAddress}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error);
        res.status(500).send('Internal Server Error');
    }
});

function generateSequentialShortId() {
    const id = String(++idShortCounter).padStart(8, '0');
    return id.toUpperCase();
}

function findDeviceByMacAddress(macAddress) {
    for (const idShort in devices) {
        if (devices[idShort].mac_address === macAddress) {
            return devices[idShort];
        }
    }
    return null;
}

app.get('/logs', (req, res) => {
    const logFilePath = path.join(__dirname, 'logs.json');
    console.log(logFilePath)
    try {
        const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));

        res.render('logs', { logs });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/users_config', (req, res) => {
    const usersConfigDir = path.join(__dirname, 'users_config');

    fs.readdir(usersConfigDir, (err, folders) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading the directory.');
            return;
        }

        const folderTree = {};
        folders.forEach((folder) => {
            const folderPath = path.join(usersConfigDir, folder);
            const stats = fs.statSync(folderPath);

            if (stats.isDirectory()) {
                folderTree[folder] = generateFolderTree(folderPath);
            }
        });

        res.render('userConfigFolders', { folders });
    });
});

app.get('/folder_details/:folderName', (req, res) => {
    const folderName = req.params.folderName;
    const { subfolders, files } = getListSubDirectory(folderName);
    res.render('folderDetails', { folderName, subfolders, files });
});

module.exports = app