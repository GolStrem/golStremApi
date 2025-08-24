const express = require('express');
const router = express.Router();
const Database = require('@lib/DataBase');
const { checkFields, auth } = require('@lib/RouterMisc');
const db = new Database();
const session = new (require('@lib/Session'))();

const qry = {
    friends: 'SELECT DISTINCT u.id, u.pseudo, u.image FROM friend f JOIN user u ON u.id = CASE WHEN f.idSender = ? THEN f.idReceiver ELSE f.idSender END WHERE ? IN (f.idSender,f.idReceiver) AND f.state = 1',
    request: 'select DISTINCT u.id,u.pseudo,u.image,f.createdAt as date from friend f inner join user u on f.idSender = u.id where idReceiver = ? and f.state = 0',
    delete: 'delete from friend where (idSender = ? and idReceiver = ?) or (idSender = ? and idReceiver = ?)'
}

router.get('', auth(), async (req, res) => {
    const listFriends = await db.query(qry.friends, session.getUserId(), session.getUserId());
    res.json(listFriends)
});

router.get('/request', auth(), async (req, res) => {
    const listRequest = await db.query(qry.request, session.getUserId())
    res.json(listRequest);
});

router.post('', checkFields('friend'), auth(), async (req, res) => {
    const { idReceiver } = req.body;
    if (session.getUserId() == idReceiver) return res.status(409).send("curly")

    const alreadySend = await db.exist('select 1 from friend where idSender = ? and idReceiver = ?', session.getUserId(), idReceiver)
    if (alreadySend) return res.status(409).send('alreadyExist');

    const reverse = await db.oneResult('select id from friend where idReceiver = ? and idSender = ?', session.getUserId(), idReceiver)
    if (reverse) {
        await db.query("update friend set state = 1 where id = ?", reverse.id)
        return res.send("validate");
    }

    await db.push('friend','idSender,idReceiver', [session.getUserId(), idReceiver])

    return res.send("send");
});

router.delete('/:idReceiver', auth(), async (req, res) => {
    const { idReceiver } = req.params;

    await db.query(qry.delete, idReceiver, session.getUserId(), session.getUserId(), idReceiver)


    return res.send("success");
});

module.exports = router;