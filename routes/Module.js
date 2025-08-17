const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields, move, cleanPosPoly } = require('@lib/RouterMisc');

router.post('', checkFields('module'), auth(), async (req, res) => {
    let { type, targetId, name, extra } = req.body;

    try {
        extra = typeof extra === 'string' ? JSON.parse(extra) : (extra || {});
    } catch (err) {}

    const old = await db.oneResult(
        'SELECT extra FROM moduleExtra WHERE type = ? AND targetId = ? AND name = ? ORDER BY createdAt DESC LIMIT 1',
        type, targetId, name
    );

    if (old?.extra) {
        try {
            const oldExtra = JSON.parse(old.extra);
            extra = { ...oldExtra, ...extra };
        } catch (err) {}

    }

    const resultPos = await db.oneResult('SELECT COUNT(1) as nbr FROM module WHERE type = ? AND targetId = ?', type, targetId);
    const pos = resultPos?.nbr || 0;

    const afterInsert = await db.push(
        'module',
        'type, targetId, name, extra, pos',
        [type, targetId, name, JSON.stringify(extra), pos]
    );

    req.body.pos = pos;
    req.body.extra = JSON.stringify(extra);
    return res.json({ [afterInsert.insertId]: req.body });
});


router.put('/:idModule', auth('module'), async (req, res) => {
    const { idModule } = req.params;
    const keyExist = ['name', 'extra', 'type', 'targetId'];

    const afterUpdate = await db.update('module', keyExist, req.body, ['id = ?', [idModule]]);
    if (afterUpdate === false) return res.status(400).send('Malformation');

    return res.send('success');
});

router.post('/:idModule/:idExtra', auth('module'), async (req, res) => {
    const { idModule, idExtra } = req.params;
    const { value } = req.body;

    const extra = await db.oneResult('SELECT extra FROM module WHERE id = ?', idModule);
    const jsonExtra = JSON.parse(extra['extra'])
    jsonExtra[idExtra] = value
    await db.query('update module set extra = ? where id = ?', JSON.stringify(jsonExtra), idModule)


    return res.send('success');
});

router.put('/:idModule/:idExtra', auth('module'), async (req, res) => {
    const { idModule, idExtra } = req.params;
    const { value } = req.body;

    const extra = await db.oneResult('SELECT extra FROM module WHERE id = ?', idModule);
    const jsonExtra = JSON.parse(extra['extra'])
    jsonExtra[idExtra] = value
    await db.query('update module set extra = ? where id = ?', JSON.stringify(jsonExtra), idModule)


    return res.send('success');
});

router.delete('/:idModule', auth('module'), async (req, res) => {
    const { idModule } = req.params;

    const moduleData = await db.oneResult('SELECT type, targetId, name, extra FROM module WHERE id = ?',idModule);

    if (moduleData) { 
        await db.push('moduleExtra','type, targetId, name, extra',[moduleData.type, moduleData.targetId, moduleData.name, moduleData.extra]);
    }

    await db.query('DELETE FROM module WHERE id = ?', idModule);
    
    await cleanPosPoly('module', ['type','targetId'], [moduleData.type, moduleData.targetId]);
    return res.send('success');
});

router.delete('/:idModule/:idExtra', auth('module'), async (req, res) => {
    const { idModule, idExtra } = req.params;

    const extra = await db.oneResult('SELECT extra FROM module WHERE id = ?', idModule);
    const jsonExtra = JSON.parse(extra['extra'])
    delete jsonExtra[idExtra]

    await db.query('update module set extra = ? where id = ?', JSON.stringify(jsonExtra), idModule)

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

router.patch('/move', auth('module'), checkFields('moveModule'), async (req, res) => {
    const { newPos, idModule } = req.body

    const result = await move('module', newPos, idModule, ['type','targetId'])
    if (!result) return res.status(409).send("conflict");
    return res.send("success");
});

module.exports = router;
