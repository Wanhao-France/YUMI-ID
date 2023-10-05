const express = require('express');
const multer = require('multer');
const printerController = require('../controllers/printerController');

const router = express.Router();
const upload = multer(); 

router.post('/route_testing', upload.single('file'), printerController.handleRouteTesting);

module.exports = router;
