const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth } = require('@lib/RouterMisc');


router.get('', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;
    const { state } = req.query;
    let qry = 'SELECT id,pseudo,image, state FROM userUnivers uU LEFT JOIN user u on uU.idUser = u.id WHERE idUnivers = ?'
    let values = [idUnivers];
    if (state) {
        qry += ' AND state = ?';
        values.push(state);
    }
    const users = await db.query(qry, ...values);
    return res.json(users);
})

router.post('', auth('univers', 0, true, 1), async (req, res) => {
    const { idUnivers } = req.params;
    const openRegistration = await db.oneResult('SELECT openRegistration FROM univers WHERE id = ?', idUnivers);
    if (openRegistration.openRegistration == 2) return res.status(403).send('no authorization');

    const state = openRegistration.openRegistration == 1 ? -1 : 0
    await db.query(
        'INSERT IGNORE INTO userUnivers(idUnivers, idUser, state) values(?, ?, ?)', 
        idUnivers, session.getUserId(), state
    );

    return res.json({idUnivers, idUser: session.getUserId(), state: state});
})

router.put('/:idUser', auth('univers', 2, true), async (req, res) => {
    const { idUnivers, idUser } = req.params;
    const { state } = req.body;

    const exist = await db.oneResult(
        'SELECT state FROM userUnivers where idUser = ? and idUnivers = ?',
        idUser, idUnivers
    )
    if (!exist) return res.status(404).send('not found');

    const ok = await db.oneResult(
        'SELECT 1 FROM userUnivers where idUser = ? and idUnivers = ? and state > ? and state > ?',
        session.getUserId(), idUnivers, state, exist.state
    )
    if (!ok) return res.status(403).send('no authorization');

    await db.query(
        'UPDATE userUnivers SET state = ? WHERE idUnivers = ? AND idUser = ?', 
        state, idUnivers, idUser
    );

    return res.json({idUnivers, idUser: idUser, state: state});
})

router.delete('/:idUser', auth('univers', 2, true), async (req, res) => {
    const { idUnivers, idUser } = req.params;
    const exist = await db.oneResult(
        'SELECT state FROM userUnivers where idUser = ? and idUnivers = ?',
        idUser, idUnivers
    )
    if (!exist) return res.status(404).send('not found');

    const ok = await db.oneResult(
        'SELECT 1 FROM userUnivers where idUser = ? and idUnivers = ? and state > ?',
        session.getUserId(), idUnivers, exist.state
    )
    if (!ok) return res.status(403).send('no authorization');

    await db.query(
        'DELETE FROM userUnivers WHERE idUnivers = ? AND idUser = ?', 
        idUnivers, idUser
    );

    return res.json({idUnivers, idUser: idUser});
})

module.exports = router;