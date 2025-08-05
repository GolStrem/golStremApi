const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

const broadCast = require('@lib/BroadCast');

router.use('/', require('@routes/WorkSpace/GetAllWorkSpace'));
router.use('/:idWorkSpace', require('@routes/WorkSpace/GetDetailWorkSpace'));
router.use('/:idWorkSpace/tableau', require('@routes/WorkSpace/Tableau'));
router.use('/:idWorkSpace/move', require('@routes/WorkSpace/Move'));

const { auth, checkFields, authAndOwner } = require('@lib/RouterMisc');

router.post('', auth(), checkFields('workSpace'), async (req, res) => {
    const { name, description, image } = req.body;

    const afterInsert = await db.push('workSpace','idOwner, name, description, image', [session.getUserId(), name, description, image])
    const id = afterInsert.insertId;
    await db.push('userWorkSpace','idUser, idWorkSpace, state', [session.getUserId(), id, 1])


    return res.json({
        [id]: req.body
    });
})

router.put('/:idWorkSpace', authAndOwner('workSpace'), async (req, res) => {
    const { idWorkSpace } = req.params;
    const keyExist = ['name','description','image']

    const afterUpdate = await db.update('workSpace',keyExist,req.body,['id = ?',[idWorkSpace]])
    if (afterUpdate === false) return res.status(400).send('Malformation');

    req.body.id = idWorkSpace
    await db.query("update userWorkSpace set news=1 where idUser <> ? and idWorkspace = ?", session.getUserId(), idWorkSpace)
    broadCast(`workSpaceOnly-${idWorkSpace}`, {updateWorkspace: req.body})
    return res.send("success");
})

router.delete('/:idWorkSpace', authAndOwner('workSpace'), async (req, res) => {
    const { idWorkSpace } = req.params;

    await db.query("delete from workSpace WHERE id = ?", idWorkSpace)
    return res.send("success");
})


router.post('/:idWorkSpace/user', authAndOwner('workSpace'), async (req, res) => {
    const { idWorkSpace } = req.params;
    const userIds = Array.isArray(req.body) ? req.body : [req.body]


    const result = await db.query('SELECT id,pseudo,image FROM user WHERE id in (?)', userIds.map(item => item.idUser));
    if (result.length !== userIds.length) return res.status(404).send('User unknown');
    
    userIds.forEach(obj => obj.extra = idWorkSpace);
    const listValue = userIds.map(obj => Object.values(obj));


    await db.push('userWorkSpace','idUser, state, idWorkSpace', listValue, 'AS new ON DUPLICATE KEY UPDATE state = new.state')

    const resultWorkSpace = await db.oneResult('select id,name,description,image from workSpace where id = ?', idWorkSpace)
    for (const { idUser } of userIds) {
        const user = result.find(u => u.id === idUser);
        broadCast(`user-${idUser}`, { newWorkspace: resultWorkSpace });
        broadCast(`workSpaceOnly-${idWorkSpace}`, {
            createWorkSpaceUser: {
                idWorkSpace: idWorkSpace,
                user: user
            }
        });
    }

    return res.send("success");
})

router.delete('/:idWorkSpace/user/:idUser', auth(), async (req, res) => {
    const { idWorkSpace, idUser } = req.params;

    if (String(session.getUserId()) !== String(idUser)) {
        const validate = await db.oneResult('SELECT 1 FROM workSpace WHERE id = ? and idOwner = ?', idWorkSpace, session.getUserId());
        if (!validate) return res.status(403).send("no owner");
    }


    if (idUser === session.getUserId()) return res.status(403).send("impossible delete owner");


    await db.query("delete from userWorkSpace WHERE idWorkSpace = ? and idUser = ?", idWorkSpace, idUser)
    broadCast(`user-${idUser}`, {deleteWorkspace: idWorkSpace})
    broadCast(`workSpaceOnly-${idWorkSpace}`, {deleteWorkSpaceUser: {idWorkSpace: idWorkSpace, idUser: idUser}})
    return res.send("success");
})

router.put('/:idWorkSpace/user/:idUser', authAndOwner('workSpace'), async (req, res) => {
    const { idWorkSpace, idUser } = req.params;
    const { state } = req.body;


    if (idUser === session.getUserId()) return res.status(403).send("impossible d'edit owner");


    await db.query("update userWorkSpace set state = ? WHERE idWorkSpace = ? and idUser = ?", state, idWorkSpace, idUser)
    broadCast(`workSpaceOnly-${idWorkSpace}`, {updateUserWorkSpace: {idUser: idUser, idWorkSpace: idWorkSpace, state: state}})
    return res.send("success");
})


module.exports = router;