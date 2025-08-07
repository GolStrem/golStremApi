const express = require('express');
const router = express.Router({ mergeParams: true });

const db = new (require('@lib/DataBase'))();

const { auth, checkFields, cleanPos, move } = require('@lib/RouterMisc');
const broadCast = require('@lib/BroadCast');
const session = new (require('@lib/Session'))();

router.patch('/card', auth('workspace',[1]), checkFields('moveCard'), async (req, res) => {
    const { idWorkSpace } = req.params
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

    await cleanPos('card', oldTableau)
    await cleanPos('card', newTableau)

    broadCast(`workSpace-${idWorkSpace}`, {moveCard: grouped})
    await db.query("update userWorkSpace set news=1 where idUser <> ? and idWorkspace = ?", session.getUserId(), idWorkSpace)
    return res.json(grouped);
});

router.patch('/tableau', auth('workspace',[1]), checkFields('moveTableau'), async (req, res) => {
    const { idWorkSpace } = req.params
    const { newPos, idTableau } = req.body

    const result = await move('tableau', newPos, idTableau, ['idWorkSpace'])

    if (!result) return res.status(409).send("conflict");

    broadCast(`workSpace-${idWorkSpace}`, {moveTableau: req.body})
    await db.query("update userWorkSpace set news=1 where idUser <> ? and idWorkspace = ?", session.getUserId(), idWorkSpace)
    return res.send("success");
});


module.exports = router;