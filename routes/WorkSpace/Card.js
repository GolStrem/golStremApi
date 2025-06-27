const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

const qryCheckOwner = 'SELECT 1 FROM card c INNER JOIN tableau t ON c.idTableau = t.id inner join workSpace ws on t.idWorkspace = ws.id WHERE c.id = ? and ? IN (c.idOwner, t.idOwner, ws.idOwner)'

router.post('', async (req, res) => {
    const { idWorkSpace, idTableau } = req.params;
    const { name, description, color, image, endAt } = req.body;
    if (!color || !name || !image || !description || !endAt) return res.status(400).send('Malformation');

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state = ?', session.userId, idWorkSpace, 1);
    if (!workSpaceValidate) return res.status(403).send("no writer");

    const tableauExist = await db.exist('SELECT 1 FROM tableau WHERE id = ?', idTableau);
    if (!tableauExist) return res.status(404).send("no tableau");

    const resultPos = await db.oneResult('SELECT count(1) as nbr FROM card WHERE idTableau = ?', idTableau);
    const pos = (!resultPos) ? 0 : resultPos['nbr']

    await db.push('card','idTableau, idOwner, name, description, color, image, state, endAt, pos', [idTableau, session.userId, name, description, color, image, 0, endAt, pos])
    return res.send("success");
})

router.put('/:idCard', async (req, res) => {
    const { idCard } = req.params;
    const keyExist = [ 'name', 'description', 'color', 'image', 'endAt' , 'state' ];

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const cardValidate = await db.exist(qryCheckOwner, idCard, session.userId);
    if (!cardValidate) return res.status(403).send("no owner");

    const afterUpdate = await db.update('card',keyExist,req.body,['id = ?',[idCard]])

    if (afterUpdate === false) return res.status(400).send('Malformation');

    return res.send("success");
})

router.delete('/:idCard', async (req, res) => {
    const { idCard } = req.params;
    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const cardValidate = await db.exist(qryCheckOwner, idCard, session.userId);
    if (!cardValidate) return res.status(403).send("no owner");

    await db.query("delete from card WHERE id = ?", idCard)
    return res.send("success");
})

router.get('/:idCard', async (req, res) => {
    const { idWorkSpace, idCard } = req.params;
    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.oneResult('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state in (?)', session.userId, idWorkSpace, [0,1]);
    if (!workSpaceValidate) return res.status(403).send("no read/write");

    const card = await db.oneResult('SELECT image,state,color,name,description,createdAt,endAt FROM card WHERE id = ?', idCard);
    if (!card) return res.status(404).send("no card");

    return res.json(card);
})

module.exports = router;