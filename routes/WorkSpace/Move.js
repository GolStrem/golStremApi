const express = require('express');
const router = express.Router({ mergeParams: true });

const db = new (require('@lib/DataBase'))();

const { auth, checkFields, cleanPos } = require('@lib/RouterMisc');


router.patch('/card', auth([1]), checkFields('moveCard'), async (req, res) => {
    const { newTableau, newPos, idCard } = req.body


    const check = await db.oneResult('select idTableau, pos from card where id = ?', idCard)
    if (!check) return res.status(409).send("conflict");
    const oldTableau = check.idTableau
    const oldPos = check.pos

    await db.query('update card set pos=pos-1 where idTableau = ? and pos > ?', oldTableau, oldPos, idCard)
    await db.query('update card set pos=pos+1 where idTableau = ? and pos >= ?', newTableau, newPos, idCard)
    await db.query('update card set pos=?,idTableau = ? where id = ?', newPos, newTableau, idCard)

    const newPosForFront = await db.query('SELECT idTableau,id,pos FROM card WHERE idTableau IN (?,?)', newTableau, oldTableau)
    const grouped = newPosForFront.reduce((acc, item) => {
        const key = item.idTableau.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push({ id: item.id, pos: item.pos });
        return acc;
    }, {});

    if (grouped[oldTableau] === undefined) {
        grouped[oldTableau] = []
    }

    cleanPos('card', oldTableau)
    cleanPos('card', newTableau)
    return res.json(grouped);
});

router.patch('/tableau', auth([1]), checkFields('moveTableau'), async (req, res) => {
    const { idWorkSpace } = req.params
    const { oldPos, newPos, idTableau } = req.body

    //système de lock
    const checkLock = await db.exist('select 1 from tableau where pos = ? and id = ?', oldPos, idTableau)
    if (!checkLock) return res.status(409).send("conflict");

    await db.query('update tableau set pos=pos-1 where idWorkSpace = ? and pos > ?', idWorkSpace, oldPos)
    await db.query('update tableau set pos=pos+1 where idWorkSpace = ? and pos >= ?', idWorkSpace, newPos)
    await db.query('update tableau set pos=?,idWorkSpace = ? where id = ?', newPos, idWorkSpace, idTableau)

    cleanPos('tableau', idWorkSpace)
    return res.send("success");
});


module.exports = router;