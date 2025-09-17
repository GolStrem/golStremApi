const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth } = require('@lib/RouterMisc');
const { newPos  } = require('@lib/MoveFiche');

const qrySubscribe = `
SELECT 
	sF.id, idFiche,f.name AS 'characterName', f.image AS 'characterImage', 
	sF.idModele, mF.name AS 'modeleName', mF.description AS 'modeleDescription',
	f.idOwner, u.pseudo AS 'playerName', u.image AS 'playerImage',
	sF.idModerator, sF.createdAt
FROM subscribeFiche sF
	LEFT JOIN fiche f ON sF.idFiche=f.id
	LEFT JOIN user u ON  u.id=f.idOwner
	LEFT JOIN modelFiche mF ON sF.idModele=mF.id
WHERE 
	sF.idUnivers = ? AND sF.state = ? AND sF.deletedAt IS NULL
`

router.get('', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;
    const { state = 0 } = req.query;
    const subscribe = await db.query(qrySubscribe, idUnivers, state);
    return res.json(subscribe);
})

router.put('/:idSubscribe', auth('univers', 2), async (req, res) => {
    const { idSubscribe } = req.params;
    const { state } = req.body;
    const subscribe = await db.oneResult('select idFiche, idUnivers, idModele, state from subscribeFiche where id = ?', idSubscribe);

    if (subscribe.state == 2) {
        return res.status(400).send('Subscribe already accepted');
    }

    if (state == 2) {
        await db.query("update fiche set idUnivers = ?, idModele = ? where id = ?", subscribe.idUnivers, subscribe.idModele, subscribe.idFiche)
        const posUnivers = await newPos('univers', subscribe.idUnivers, subscribe.idFiche)
    }
    await db.query("update subscribeFiche set state = ?, idModerator = ? where id = ?", state, session.getUserId(), idSubscribe)
    return res.send("success");
})

router.delete('/:idSubscribe', auth(), async (req, res) => {
    const { idUnivers, idSubscribe } = req.params;
    console.log(idUnivers)
    const subscribe = await db.oneResult('select idFiche, idUnivers, idModele, state from subscribeFiche where id = ?', idSubscribe);
    if (!subscribe) return res.status(404).send('not found');
    
    const asOwner = await db.oneResult('select 1 from fiche where id = ? and idOwner = ?', subscribe.idFiche, session.getUserId());
    if (!asOwner) {
        const asAuthorized = await db.oneResult('select 1 from userUnivers where idUnivers = ? and idUser = ? and state >= 2', idUnivers, session.getUserId());
        if (!asAuthorized) return res.status(403).send('no authorization');
    }

    if (subscribe.state == 2) {
        return res.status(400).send('Subscribe already accepted');
    }
    await db.query("update subscribeFiche set deletedAt = now(), idModerator = ?, state = ? where id = ?", session.getUserId(), -1, idSubscribe)
    return res.send("success");
})

module.exports = router;