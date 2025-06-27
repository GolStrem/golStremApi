const express = require('express');
const router = express.Router();


const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

router.get('', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');
    var response = {}

    const resultUws = await db.query(`SELECT 
        uws.idWorkSpace,
        uws.idUser,
        uws.state
    FROM userWorkSpace uws
        inner JOIN userWorkSpace uws2 ON uws.idWorkSpace = uws2.idWorkSpace
    WHERE uws2.idUser = ?
    `, session.userId)

    for (const item of resultUws) {
        (response[item.idWorkSpace] ??= {}).user ??= {}; // Instancie les clefs si nécessaire dans le tableau pour éviter erreur
        response[item.idWorkSpace].user[item.idUser] = { state: item.state == 1 ? "write" : "read" };
    }
    delete resultUws

    const resultWs = await db.query(`SELECT
        ws.id,
        ws.idOwner,
        ws.name,
        ws.description,
        ws.image
    FROM workSpace ws
    WHERE ws.id in (?)
    `, Object.keys(response)) // récupére les informations des workSpace

    const uniqueUserIds = new Set();
    for (const item of resultWs) {
        let idWs = item.id
        delete item.id
        response[idWs] = {...item, ...response[idWs]}

        Object.keys(response[idWs].user).forEach(userId => uniqueUserIds.add(userId));
    }
    delete resultWs

    const resultU = await db.query(`SELECT
        u.id,
        u.login,
        u.image
    FROM user u
    where u.id in (?)
    `, Array.from(uniqueUserIds)) // Récupère les informations des user
    const userInfo = Object.fromEntries(resultU.map(({ id, ...rest }) => [id, rest]));
    delete resultU,uniqueUserIds

    for (const workSpaceId of Object.keys(response)) {
        for(const userId of Object.keys(response[workSpaceId]['user'])) {
            response[workSpaceId]['user'][userId] = {...response[workSpaceId]['user'][userId], ...userInfo[userId]}
        }
    }

    res.json(response);
});




module.exports = router;