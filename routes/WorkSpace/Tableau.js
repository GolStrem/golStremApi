const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

const qryCheckOwner = 'SELECT t.idWorkSpace FROM tableau t INNER JOIN workSpace ws ON t.idWorkSpace = ws.id WHERE t.idOwner = ? OR ws.idOwner = ?'
router.get('', async (req, res) => {

})

router.post('', async (req, res) => {
    const { idWorkSpace } = req.params;
    const { color, name, image } = req.body;
    if (!color || !name || !image) return res.status(400).send('Malformation');

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state = ?', session.userId, idWorkSpace, 1);
    if (!workSpaceValidate) return res.status(405).send("no writer");

    await db.push('tableau','idOwner, idWorkSpace, color, name, image', [session.userId, idWorkSpace, color, name, image])
    return res.send("success");
})

router.put('/:idTableau', async (req, res) => {
    const { idTableau } = req.params;
    const keyExist = ['color','name','image'];

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const tableauValidate = await db.exist(qryCheckOwner, session.userId, session.userId);
    if (!tableauValidate) return res.status(405).send("no owner");

    const afterUpdate = await db.update('tableau',keyExist,req.body,['id = ?',[idTableau]])

    if (afterUpdate === false) return res.status(400).send('Malformation');

    return res.send("success");
})

module.exports = router;