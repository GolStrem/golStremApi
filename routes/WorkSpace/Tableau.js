const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const broadCast = require('@lib/BroadCast');

const { auth, checkFields, authAndOwner, cleanPos } = require('@lib/RouterMisc');
router.use('/:idTableau/card', require('@routes/WorkSpace/Card'));


router.post('', checkFields('tableau'), auth([1]), async (req, res) => {
    const { idWorkSpace } = req.params;
    const { color, name, image } = req.body;

    const resultPos = await db.oneResult('SELECT count(1) as nbr FROM tableau WHERE idWorkSpace = ?', idWorkSpace);
    const pos = (!resultPos) ? 0 : resultPos['nbr']
    const afterInsert = await db.push('tableau','idOwner, idWorkSpace, color, name, image, pos', [session.getUserId(), idWorkSpace, color, name, image, pos])
    
    const id = afterInsert.insertId;

    broadCast(`workSpace-${idWorkSpace}`, {newTableau: {id, ...req.body}})
    
    return res.json({
        [id]: req.body
    });
})

router.put('/:idTableau', authAndOwner('tableau'), async (req, res) => {
    const { idWorkSpace, idTableau } = req.params;
    const keyExist = ['color','name','image'];

    const afterUpdate = await db.update('tableau',keyExist,req.body,['id = ?',[idTableau]])
    if (afterUpdate === false) return res.status(400).send('Malformation');

    broadCast(`workSpace-${idWorkSpace}`, {updateTableau: {id: idTableau, ...req.body}})
    return res.send("success");
})

router.delete('/:idTableau', authAndOwner('tableau'), async (req, res) => {
    const { idWorkSpace, idTableau } = req.params;
    await db.query("delete from tableau WHERE id = ?", idTableau)
    cleanPos('tableau', idWorkSpace)
    broadCast(`workSpace-${idWorkSpace}`, {deleteTableau: {id: idTableau}})
    return res.send("success");
})

module.exports = router;