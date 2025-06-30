const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

const qrys = {
    workSpace : "SELECT ws.idOwner, ws.name, ws.description, ws.image FROM workSpace ws WHERE ws.id = ?",
    userWS : "SELECT uws.idWorkSpace, uws.idUser, uws.state FROM userWorkSpace uws inner JOIN userWorkSpace uws2 ON uws.idWorkSpace = uws2.idWorkSpace WHERE uws2.idWorkSpace = ?",
    user : "SELECT u.id, u.login, u.image FROM user u where u.id in (?)",
    tableau : "SELECT t.id, t.name, t.idOwner, t.color, t.image, t.createdAt FROM tableau t WHERE t.idWorkSpace = ? order by pos",
    card : "SELECT c.idTableau, c.id, c.name, c.description, c.idOwner, c.color, c.image, c.state, c.createdAt, c.endAt FROM card c WHERE c.idTableau in (?) order by pos"
}

router.get('', async (req, res) => {
    const { idWorkSpace } = req.params
    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');
    const workSpaceValidate = await db.oneResult('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state in (?)', session.userId, idWorkSpace, [0,1]);
    if (!workSpaceValidate) return res.status(403).send("no read/write");

    
    const resultWs = await db.oneResult(qrys.workSpace, idWorkSpace)
    if(!resultWs) return res.status(404).send('workSpace unknown');

    let response = {...resultWs, user : [], tableau : []}
    let responseUser = {}

    const resultUws = await db.query(qrys.userWS, idWorkSpace)

    for (const item of resultUws) {
        responseUser[item['idUser']] = { state: item.state == 1 ? "write" : "read" };
    }

    const resultU = await db.query(qrys.user,  Object.keys(responseUser))
    for (const user of resultU) {
        response.user.push({...user, ...responseUser[user.id]})
    }

    response.tableau = await db.query(qrys.tableau, idWorkSpace)
    const listIdTableau = response.tableau.map(item => item.id)
    if(listIdTableau.length === 0) {
        return res.json(response);
    }
    resultC = await db.query(qrys.card, listIdTableau)


    const tableauxById = Object.fromEntries(response.tableau.map(t => [t.id, t]));
    response.tableau.forEach(t => t.card = []);
    resultC.forEach(c => {
        const { idTableau, ...cardSansIdTableau } = c;
        tableauxById[idTableau]?.card.push(cardSansIdTableau);
    });


    res.json(response);
});




module.exports = router;