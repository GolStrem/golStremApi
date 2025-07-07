const express = require('express');
const router = express.Router();
const Database = require('@lib/DataBase');
const { hashing, check } = require('@lib/Crypt');
const db = new Database();

router.get('', async (req, res) => {

});

router.post('', checkFields('friends'), async (req, res) => {
    const { idReceiver } = req.body;  
});

module.exports = router;