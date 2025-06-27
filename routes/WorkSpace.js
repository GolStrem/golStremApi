const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { isSubset } = require('@lib/Util');

router.use('/', require('./WorkSpace/GetAllWorkSpace'));
router.use('/:idWorkSpace/tableau', require('./WorkSpace/Tableau'));

router.post('', async (req, res) => {
    const { name, description, image } = req.body;

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    if (!name || !description || !image) return res.status(400).send('Malformation');

    const afterInsert = await db.push('workSpace','idOwner, name, description, image', [session.userId, name, description, image])
    await db.push('userWorkSpace','idUser, idWorkSpace, state', [session.userId, afterInsert.insertId, 1])

    return res.send("success");
})

router.put('/:idWorkSpace', async (req, res) => {
    const { idWorkSpace } = req.params;
    const keyExist = ['name','description','image']

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM workSpace WHERE idOwner = ? and id = ?', session.userId, idWorkSpace);
    if (!workSpaceValidate) return res.status(405).send("no owner");

    const afterUpdate = await db.update('workSpace',keyExist,req.body,['id = ?',[idWorkSpace]])
    if (afterUpdate === false) return res.status(400).send('Malformation');


    return res.send("success");
})

router.delete('/:idWorkSpace', async (req, res) => {
    const { idWorkSpace } = req.params;

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM workSpace WHERE idOwner = ? and id = ?', session.userId, idWorkSpace);
    if (!workSpaceValidate) return res.status(405).send("no owner");

    await db.query("delete from workSpace WHERE id = ?", idWorkSpace)
    return res.send("success");
})


router.post('/:idWorkSpace/user', async (req, res) => {
    const { idWorkSpace } = req.params;
    const userIds = Array.isArray(req.body) ? req.body : [req.body]

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM workSpace WHERE idOwner = ? and id = ?', session.userId, idWorkSpace);
    if (!workSpaceValidate) return res.status(405).send("no owner");

    const result = await db.oneResult('SELECT count(1) as nbr FROM user WHERE id in (?)', userIds.map(item => item.idUser));
    if (result['nbr'] !== userIds.length) return res.status(404).send('User unknown');
    userIds.forEach(obj => obj.extra = idWorkSpace);
    const listValue = userIds.map(obj => Object.values(obj));


    await db.push('userWorkSpace','idUser, state, idWorkSpace', listValue)
    return res.send("success");
})

router.delete('/:idWorkSpace/user/:idUser', async (req, res) => {
    const { idWorkSpace, idUser } = req.params;

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM workSpace WHERE idOwner = ? and id = ?', session.userId, idWorkSpace);
    if (!workSpaceValidate) return res.status(405).send("no owner");

    if (idUser === session.userId) return res.status(405).send("impossible delete owner");


    await db.query("delete from userWorkSpace WHERE idWorkSpace = ? and idUser = ?", idWorkSpace, idUser)
    return res.send("success");
})


module.exports = router;