const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { authPublic } = require('@lib/RouterMisc');



router.get('/:id', authPublic('fiche'), async (req, res) => {
    const { id } = req.params;

    const userId = session.getUserId()
    const fiche = await db.oneResult(
        'SELECT f.idOwner,f.name,f.image,f.idUnivers,u.name as nameUnivers,f.createdAt,f.color,f.visibility FROM fiche f left join univers u on u.id = f.idUnivers WHERE f.id = ?', 
    id)

    if (!fiche) return res.status(404).send("no fiche");
    const module = await db.query('select m.id, m.name, m.extra from module m where m.targetId = ? and m.type = 1', id)
    fiche.droit = 'read'
    fiche.module = module

    console.log(userId)


    if(fiche.idOwner == userId ||
        (fiche.idOwner === null && (await db.exist('select 1 from userUnivers where idUnivers = ? and idUser = ? and state >= 2', fiche.idUnivers, userId)))
    ){
        fiche.droit = 'write'
    }
    



    return res.json(fiche)
})

module.exports = router;