const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields, move } = require('@lib/RouterMisc');

// Création d'un module
router.post('', checkFields('module'), auth(), async (req, res) => {
    const { type, targetId, name, extra } = req.body;    

    const resultPos = await db.oneResult(
        'SELECT COUNT(1) as nbr FROM module WHERE type = ? AND targetId = ?',
        type, targetId
    );
    const pos = resultPos ? resultPos.nbr : 0;

    const afterInsert = await db.push(
        'module',
        'type, targetId, name, extra, pos',
        [type, targetId, name, extra, pos]
    );

    const id = afterInsert.insertId;
    req.body.pos = pos

    return res.json({ [id]: req.body });
});

router.put('/:idModule', auth(), async (req, res) => {
    const { idModule } = req.params;
    const keyExist = ['name', 'extra', 'type', 'targetId'];

    const afterUpdate = await db.update('module', keyExist, req.body, ['id = ?', [idModule]]);
    if (afterUpdate === false) return res.status(400).send('Malformation');

    return res.send('success');
});

router.delete('/:idModule', auth(), async (req, res) => {
    const { idModule } = req.params;

    await db.query('DELETE FROM module WHERE id = ?', idModule);
    // mettre un cleanPos !!!

    return res.send('success');
});

// Récupération des modules de l'utilisateur
router.get('/:type/:targetId', auth(), async (req, res) => {
    const { type, targetId } = req.params;
    const modules = await db.query(
        'SELECT id, name, extra, pos FROM module WHERE type = ? AND targetId = ? ORDER BY pos ASC',
        type, targetId
    );
    return res.json(modules);
});

router.patch('/move', auth(), checkFields('moveModule'), async (req, res) => {
    const { newPos, idModule } = req.body

    const result = await move('module', newPos, idModule, ['type','targetId'])
    if (!result) return res.status(409).send("conflict");
    return res.send("success");
});

module.exports = router;
