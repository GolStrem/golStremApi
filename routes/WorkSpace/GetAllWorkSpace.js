const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

const { auth } = require('@lib/RouterMisc');


const qryPartsWorkSpaceUser = {
    begin : "SELECT uws.idWorkSpace, uws.state FROM userWorkSpace uws inner JOIN userWorkSpace uws2 ON uws.idWorkSpace = uws2.idWorkSpace ",
    where : "WHERE uws2.idUser = ? ",
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

    for (const item of resultUws) {
        response[item.idWorkSpace] = {};
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