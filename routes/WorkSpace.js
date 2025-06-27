const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { isSubset } = require('@lib/Util');

router.use('/', require('./WorkSpace/GetAllWorkSpace'));

router.post('', async (req, res) => {
    const { name, description, image } = req.body;

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const afterInsert = await db.push('workSpace','idOwner, name, description, image', [session.userId, name, description, image])
    await db.push('userWorkSpace','idUser, idWorkSpace, state', [session.userId, afterInsert.insertId, 1])

    return res.send("success");
})

router.put('/:workSpaceId', async (req, res) => {
    const { workSpaceId } = req.params;
    const keyExist = ['name','description','image']

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM workSpace WHERE idOwner = ? and id = ?', session.userId, workSpaceId);
    if (!workSpaceValidate) return res.status(404).send();

    keys = Object.keys(req.body)
    if(!isSubset(keys,keyExist)) return res.status(400).send('Malformation');

    let qry = "update workSpace set "
    let param = []
    let qryParts = []
    for (key of keys) {
        qryParts.push(`${key} = ?`)
        param.push(req.body[key])
    }
    qry += qryParts.join(',') + " where id = ?"
    await db.query(qry, ...param, workSpaceId)

    return res.send("success");
})

router.post('/:workSpaceId/user', async (req, res) => {
    const { workSpaceId } = req.params;
    const userIds = Array.isArray(req.body) ? req.body : [req.body]

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    const workSpaceValidate = await db.exist('SELECT 1 FROM workSpace WHERE idOwner = ? and id = ?', session.userId, workSpaceId);
    if (!workSpaceValidate) return res.status(404).send();

    const result = await db.oneResult('SELECT count(1) as nbr FROM user WHERE id in (?)', userIds.map(item => item.idUser));
    if (result['nbr'] !== userIds.length) return res.status(404).send('User unknown');
    userIds.forEach(obj => obj.extra = workSpaceId);
    const listValue = userIds.map(obj => Object.values(obj));


    await db.push('userWorkSpace','idUser, state, idWorkSpace', listValue)
    return res.send("success");
})


module.exports = router;