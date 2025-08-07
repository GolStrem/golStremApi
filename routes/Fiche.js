const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');
const { newPos, movePos, cleanPos } = require('@lib/MoveFiche');

const qryFriends = 'SELECT COUNT(1) as nbr FROM friend f WHERE ((f.idSender = ? AND f.idReceiver = ?) OR (f.idSender = ? AND f.idReceiver = ?))AND f.state = 1 LIMIT 1'
const qryFiche = 'SELECT f.* from fiche f INNER JOIN fichePos fp ON f.id = fp.idFiche AND fp.type = ? AND fp.targetId = ?'

router.post('', checkFields('fiche'), auth(), async (req, res) => {
    const { idOwner, name, color, image, idUnivers, visibility } = req.body;

    if (idOwner !== undefined && Number(session.getUserId()) !== Number(idOwner)) {
        return res.status(403).send("no authorization");
    }

    if (idUnivers  !== undefined) {
        //@todo gérer l'univers ici
    }

    const afterInsert = 
        await db.pushAndReturn('fiche','idOwner, name, color, image, idUnivers, visibility', [idOwner, name, color, image, idUnivers, visibility])

    const id = afterInsert.id;
    if (idOwner !== undefined) {
        newPos('owner', idOwner, id)
    }
    if (idUnivers !== undefined) {
        newPos('univers', idUnivers, id)
    }

    return res.json(afterInsert);
})

router.get('/:type/:targetId', auth(), async (req, res) => {
    const { type, targetId } = req.params;

    const userId = session.getUserId()
    let visibility
    if (type == 'owner') {
        visibility = (targetId == userId) ? 2 : (await db.oneResult(qryFriends,targetId, userId, userId, targetId)).nbr
    }
    if (type == 'univers') {
        //@todo univers
    }

    const fiche = await db.query(`${qryFiche} where id${type} = ? and visibility <= ? ORDER BY fp.pos`, type, targetId, targetId, visibility )

    return res.json(fiche)
})

router.delete('/:id', auth('fiche', 2), async (req, res) => {
    const { id } = req.params;

    await db.query('delete from fiche where id = ?', id)

    const listFichePos = await db.query('SELECT type,targetId FROM fichePos WHERE idFiche = ? GROUP BY TYPE,targetId', id)
    await Promise.all(
        listFichePos.map(({ type, targetId }) => cleanPos(type, targetId))
    );

    await db.query('delete from fichePos where idFiche = ?', id)
    return res.send("success");
})

router.put('/:id', auth('fiche', 2), async (req, res) => {
    const { id } = req.params;

    const keyExist = ['name', 'color', 'image', 'visibility'];

    const afterUpdate = await db.update('fiche',keyExist,req.body,['id = ?',[id]])
    if (afterUpdate === false) return res.status(400).send('Malformation');
    
    return res.json({id: id, ...req.body})
})

router.patch('/move/:id', checkFields('moveFiche'), auth('fiche', 2), async(req, res) => {
    const { id } = req.params;
    const { type, targetId, pos } = req.body;

    movePos(type, targetId, id, pos) 
    cleanPos(type, targetId)

    return res.send("success");
})

module.exports = router;