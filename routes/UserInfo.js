require('dotenv').config();
const express = require('express');
const router = express.Router();
const { isSubset } = require('../lib/Util');


const session = new (require('../lib/Session'))();
const db = new (require('../lib/DataBase'))();

router.get('', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');
    const userInfo = await session.getInfo();
    return res.send(userInfo ? userInfo : {});
});

router.put('', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const keyExist = ['theme','lastWorkspace','seriousMode']

    const keys = Object.keys(req.body)

    if(!isSubset(keys,keyExist)) return res.status(400).send('Malformation');


    await session.updateInfo(keys, Object.values(req.body));
    return res.send("success");
});


module.exports = router;