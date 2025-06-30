const express = require('express');
const router = express.Router({ mergeParams: true });

const db = new (require('@lib/DataBase'))();

const { authWrite, checkFields, setExtra } = require('@lib/RouterMisc');


setExtra("nameMap","Move")

router.patch('/card', authWrite, checkFields, async (req, res) => {
    const {oldTableau, oldPos, newTableau, newPos, idCard} = req.body
    

    const checkLock = await db.exist('select 1 from card where pos = ? and idTableau = ? and id = ?', oldPos, oldTableau, idCard)
    if (!checkLock) return res.status(409).send("conflict");

    await db.query('update card set pos=pos-1 where idTableau = ? and pos > ?', oldTableau, oldPos, idCard)
    await db.query('update card set pos=pos+1 where idTableau = ? and pos >= ?', newTableau, newPos, idCard)
    await db.query('update card set pos=?,idTableau = ? where id = ?', newPos, newTableau, idCard)

    return res.send("success");
});

router.patch('/tableau', authWrite, checkFields, async (req, res) => {
    const {idWorkSpace} = req.params
    const {oldPos, newPos, idTableau} = req.body

    //système de lock
    const checkLock = await db.exist('select 1 from tableau where pos = ? and id = ?', oldPos, idTableau)
    if (!checkLock) return res.status(409).send("conflict");

    await db.query('update tableau set pos=pos-1 where idWorkSpace = ? and pos > ?', idWorkSpace, oldPos)
    await db.query('update tableau set pos=pos+1 where idWorkSpace = ? and pos >= ?', idWorkSpace, newPos)
    await db.query('update tableau set pos=?,idWorkSpace = ? where id = ?', newPos, idWorkSpace, idTableau)

    return res.send("success");
});


module.exports = router;