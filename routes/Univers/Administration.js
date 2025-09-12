const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');


router.post('/modelFiche', checkFields('modelFiche'), auth('univers', 2, true), async (req, res) => {
    const { idUnivers } = req.params;
    const { name, description, image } = req.body;
    const modelFiche = await db.pushAndReturn('modelFiche', 'idUnivers, name, description, image', [idUnivers, name, description, image]);
    return res.json(modelFiche);
})

router.get('/modelFiche', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;
    const modelFiche = await db.query('SELECT * FROM modelFiche WHERE idUnivers = ?', idUnivers);
    return res.json(modelFiche);
})

router.put('/modelFiche/:idModelFiche', auth('univers', 2, true), async (req, res) => {
    const { idModelFiche } = req.params;
    await db.update('modelFiche', 'name, description, image', req.body, ['id = ?', [idModelFiche]]);
    const modelFiche = await db.oneResult('SELECT * FROM modelFiche WHERE id = ?', idModelFiche);
    return res.json(modelFiche);
})

router.delete('/modelFiche/:idModelFiche', auth('univers', 2, true), async (req, res) => {
    const { idModelFiche } = req.params;
    const fiche = await db.oneResult('SELECT * FROM fiche WHERE idModele = ?', idModelFiche);
    if (fiche) {
        return res.status(400).send('cannot delete modelFiche with fiche');
    }
    await db.query('DELETE FROM modelFiche WHERE id = ?', idModelFiche);
    return res.send('success');
})


router.post('/modelFiche/:idModelFiche/ruleFiche', checkFields('modelFicheRule'), auth('univers', 2, true), async (req, res) => {
    const { idModelFiche } = req.params;
    const { target, rule, value } = req.body;
    const modelFiche = await db.pushAndReturn('modelFicheRule', 'idModele, target, rule, value', [idModelFiche, target, rule, value]);
    return res.json(modelFiche);
})

router.get('/modelFiche/:idModelFiche/ruleFiche', auth('univers', 2, true), async (req, res) => {
    const { idModelFiche } = req.params;
    const modelFiche = await db.query('SELECT * FROM modelFicheRule WHERE idModele = ?', idModelFiche);
    return res.json(modelFiche);
})

router.put('/modelFiche/:idModelFiche/ruleFiche/:idRuleFiche', auth('univers', 2, true), async (req, res) => {
    const { idRuleFiche } = req.params;
    await db.update('modelFicheRule', 'target, rule, value', req.body, ['id = ?', [idRuleFiche]]);
    const modelFicheRule = await db.oneResult('SELECT * FROM modelFicheRule WHERE id = ?', idRuleFiche);
    return res.json(modelFicheRule);
})

router.delete('/modelFiche/:idModelFiche/ruleFiche/:idRuleFiche', auth('univers', 2, true), async (req, res) => {
    const { idRuleFiche } = req.params;
    await db.query('DELETE FROM modelFicheRule WHERE id = ?', idRuleFiche);
    return res.send('success');
})

module.exports = router;