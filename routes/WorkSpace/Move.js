const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

router.patch('/card', async (req, res) => {
    const {idWorkSpace} = req.params
    const {oldTableau, oldPos, newTableau, newPos, idCard} = req.body

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');
    
    if (!oldTableau || !oldPos || !newTableau || !newPos || !idCard) return res.status(400).send('Malformation');

    const workSpaceValidate = await db.exist('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state = ?', session.userId, idWorkSpace, 1);
    if (!workSpaceValidate) return res.status(403).send("no writer");

    //système de lock
    const checkLock = await db.exist('select 1 from card where pos = ? and idTableau = ? and id = ?', oldPos, oldTableau, idCard)
    if (!checkLock) return res.status(409).send("conflict");

    await db.query('update card set pos=pos-1 where idTableau = ? and pos > ?', oldTableau, oldPos, idCard)
    await db.query('update card set pos=pos+1 where idTableau = ? and pos >= ?', newTableau, newPos, idCard)
    await db.query('update card set pos=?,idTableau = ? where id = ?', newPos, newTableau, idCard)

    return res.send("success");
});




module.exports = router;