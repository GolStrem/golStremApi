const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

const { auth } = require('@lib/RouterMisc');


const qryPartsWorkSpaceUser = {
    begin : "SELECT uws.idWorkSpace, uws.state, uws.news FROM userWorkSpace uws ",
    where : "WHERE uws.idUser = ? ",
    limit : "LIMIT ? OFFSET ?"
}


const qryWorkSpaceInfo = "SELECT ws.id, ws.idOwner, ws.name, ws.description, ws.image FROM workSpace ws WHERE ws.id in (?)"


router.get('', auth(), async (req, res) => {
    const response = {}
    const userId = session.getUserId()
    const limit = req.headers['limit'];
    const offset = req.headers['offset'] ?? 0;

    let param = []
    let qry = qryPartsWorkSpaceUser.begin


    qry += qryPartsWorkSpaceUser.where
    param.push(userId)

    if (limit !== undefined) {
        qry += qryPartsWorkSpaceUser.limit
        param.push(parseInt(limit), parseInt(offset));
    }

    const resultUws = await db.query(qry, ...param)
    if(resultUws.length === 0) {
        return res.json({})
    }

    for (const item of resultUws) {
        response[item.idWorkSpace] = {news: item.news};
    }
    delete resultUws

    const resultWs = await db.query(qryWorkSpaceInfo, Object.keys(response)) // récupére les informations des workSpace

    for (const item of resultWs) {
        let idWs = item.id
        delete item.id
        response[idWs] = {...item, ...response[idWs]}
    }
    delete resultWs

    res.json(response);
});




module.exports = router;