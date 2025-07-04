const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();

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


    const result = await db.oneResult('SELECT count(1) as nbr FROM user WHERE id in (?)', userIds.map(item => item.idUser));
    if (result['nbr'] !== userIds.length) return res.status(404).send('User unknown');
    userIds.forEach(obj => obj.extra = idWorkSpace);
    const listValue = userIds.map(obj => Object.values(obj));


    await db.push('userWorkSpace','idUser, state, idWorkSpace', listValue)
    return res.send("success");
})

router.delete('/:idWorkSpace/user/:idUser', authAndOwner('workSpace'), async (req, res) => {
    const { idWorkSpace, idUser } = req.params;


    if (idUser === session.getUserId()) return res.status(403).send("impossible delete owner");


    await db.query("delete from userWorkSpace WHERE idWorkSpace = ? and idUser = ?", idWorkSpace, idUser)
    return res.send("success");
})


module.exports = router;