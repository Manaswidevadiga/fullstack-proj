const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { getSkins, saveCustomSkin } = require('../controllers/skins.controller');

router.get('/', authMiddleware, getSkins);
router.post('/custom', authMiddleware, saveCustomSkin);

module.exports = router;