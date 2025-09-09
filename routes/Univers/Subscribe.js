const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth } = require('@lib/RouterMisc');

const qrySubscribe = `
SELECT 
	idFiche,f.name AS 'characterName', f.image AS 'characterImage', 
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

module.exports = router;