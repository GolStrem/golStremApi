const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields, move, cleanPosPoly } = require('@lib/RouterMisc');
const { check } = require('@lib/Util');

router.get('/tags', async (req, res) => {
    const listTags = await db.query('select id, name, image from tags')
    return res.json(listTags)
})

module.exports = router;