const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();


router.get('', async (req, res) => {

})

router.post('', async (req, res) => {
    const { idWorkSpace } = req.params;
    const { color, name, image } = req.body;
    if (!color || !name || !image) return res.status(400).send('Malformation');

    const authHeader = req.headers['authorization'];
    if(!await session.checkToken(authHeader, req.ip)) return res.status(401).send('token unknown');

    console.log(idWorkSpace)
    const workSpaceValidate = await db.exist('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state = ?', session.userId, idWorkSpace, 1);
    if (!workSpaceValidate) return res.status(405).send("no writer");

    await db.push('tableau','idOwner, idWorkSpace, color, name, image', [session.userId, idWorkSpace, color, name, image])
    return res.send("success");
})

module.exports = router;