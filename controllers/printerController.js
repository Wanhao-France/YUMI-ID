// printerController.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const logFilePath = 'logs.json'; // Coloca la ruta correcta al archivo de registros

function generateSequentialShortId() {
    // Implementa la lógica para generar el ID corto secuencial
}

function shouldSaveFile(filePath, newFileHash) {
    // Implementa la lógica para verificar si se debe guardar el archivo
}

// Controlador para la ruta /route_testing
function handleRouteTesting(req, res) {
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
                // Implementa la lógica para generar un ID largo aleatorio
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
            // Lógica para el caso en que el registro ya existe
            // ...
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    handleRouteTesting,
};
