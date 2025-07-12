const express = require('express');
const router = express.Router();
const Database = require('@lib/DataBase');
const { auth } = require('@lib/RouterMisc');
const db = new Database();
const session = new (require('@lib/Session'))();

const qryParts = 'SELECT DISTINCT u.id, u.pseudo, u.image FROM friend f JOIN user u ON u.id ='
const qryFriends = `${qryParts} CASE WHEN f.idSender = ? THEN f.idReceiver ELSE f.idSender END WHERE ? IN (f.idSender,f.idReceiver) and f.state = 1`
const qryRequest = `${qryParts} f.idSender where f.idReceiver = ? and f.state = 0`


router.get('', auth(), async (req, res) => {
    const user = await db.oneResult('SELECT u.pseudo, u.email, u.image as avatar, ui.* FROM user u LEFT JOIN userInfo ui ON u.id = ui.userId WHERE id = ?', session.getUserId());
    if (!user) return res.status(404).send("no user");
    delete user.userId

    const friends = await db.query(qryFriends, session.getUserId(), session.getUserId())
    user.friends = {validate: friends}

    const request = await db.query(qryRequest, session.getUserId())
    user.friends.request = request

    return res.json(user);
})

module.exports = router;
