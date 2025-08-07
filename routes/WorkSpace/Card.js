const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

const broadCast = require('@lib/BroadCast');

const { auth, checkFields, authAndOwner, cleanPos } = require('@lib/RouterMisc');

router.post('', checkFields('card'), auth('workspace',['1']), async (req, res) => {
    const { idWorkSpace, idTableau } = req.params;
    const { name, description, color, image, endAt } = req.body;


    const tableauExist = await db.exist('SELECT 1 FROM tableau WHERE id = ?', idTableau);
    if (!tableauExist) return res.status(404).send("no tableau");

    const resultPos = await db.oneResult('SELECT count(1) as nbr FROM card WHERE idTableau = ?', idTableau);
    const pos = (!resultPos) ? 0 : resultPos['nbr']

    const afterInsert = await db.push('card','idTableau, idOwner, name, description, color, image, state, endAt, pos', [idTableau, session.getUserId(), name, description, color, image, 0, endAt, pos])

    const id = afterInsert.insertId;

    req.body.idOwner = session.getUserId()
    broadCast(`workSpace-${idWorkSpace}`, {newCard: {id, idTableau, ...req.body}})
    await db.query("update userWorkSpace set news=1 where idUser <> ? and idWorkspace = ?", session.getUserId(), idWorkSpace)
    return res.json({
        [id]: req.body
    });
})

router.put('/:idCard', auth('workspace',['1']), async (req, res) => {
    const { idWorkSpace, idTableau, idCard } = req.params;
    const keyExist = [ 'name', 'description', 'color', 'image', 'endAt' , 'state' ];

    const afterUpdate = await db.update('card',keyExist,req.body,['id = ?',[idCard]])

    if (afterUpdate === false) return res.status(400).send('Malformation');

    broadCast(`workSpace-${idWorkSpace}`, {updateCard: {id: idCard, idTableau, ...req.body}})
    await db.query("update userWorkSpace set news=1 where idUser <> ? and idWorkspace = ?", session.getUserId(), idWorkSpace)
    return res.send("success");
})

router.delete('/:idCard', authAndOwner('card'), async (req, res) => {
    const { idWorkSpace, idTableau, idCard } = req.params;

    await db.query("delete from card WHERE id = ?", idCard)
    cleanPos('card', idTableau)
    broadCast(`workSpace-${idWorkSpace}`, {deleteCard: {id: idCard}})
    await db.query("update userWorkSpace set news=1 where idUser <> ? and idWorkspace = ?", session.getUserId(), idWorkSpace)
    return res.send("success");
})

router.get('/:idCard', auth('workspace',['0','1']), async (req, res) => {
    const { idCard } = req.params;

    const card = await db.oneResult('SELECT image,state,color,name,description,createdAt,endAt FROM card WHERE id = ?', idCard);
    if (!card) return res.status(404).send("no card");

    return res.json(card);
})

module.exports = router;