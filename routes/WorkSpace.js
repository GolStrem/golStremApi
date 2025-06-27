const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

router.use('/', require('./WorkSpace/GetAllWorkSpace'));

router.post('', async (req, res) => {
    const { name, description, image } = req.body;

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const afterInsert = await db.push('workSpace','idOwner, name, description, image', [session.userId, name, description, image])
    await db.push('userWorkSpace','idUser, idWorkSpace, state', [session.userId, afterInsert.insertId, 1])

    return res.send("success");
})


module.exports = router;