const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

router.use('/', require('./WorkSpace/GetAllWorkSpace'));

router.post('', async (req, res) => {
    const { name, description, image } = req.body;

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const afterInsert = await db.query('insert into workSpace(idOwner, name, description, image) values(?,?,?,?)', session.userId, name, description, image);
    await db.query('insert into userWorkSpace(idUser, idWorkSpace, state) values(?,?,?)', session.userId, afterInsert.insertId, 1)

    return res.send("success");
})


module.exports = router;