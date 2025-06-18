require('dotenv').config();
const express = require('express');
const router = express.Router();

const session = new (require('../lib/Session'))();
const db = new (require('../lib/DataBase'))();

router.get('', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');
    const userInfo = await session.getInfo();
    return res.send(userInfo ? userInfo : {});
});


module.exports = router;