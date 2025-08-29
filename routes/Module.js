const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields, move, cleanPosPoly } = require('@lib/RouterMisc');
const { check } = require('@lib/Util');

const STATE = 2;

// Fonction pour vérifier si l'utilisateur a le droit de créer un module sur la cible
async function canCreateModuleOnTarget(userId, type, targetId, minState = 0) {
    const getQryUniv = (alias, key) => {
        return `(SELECT 1 FROM userUnivers ${alias} WHERE ${alias}.idUnivers = ${key} AND ${alias}.idUser = :userId AND ${alias}.state >= :minState)`;
    };

    let query;
    let params = {userId: userId, targetId: targetId, minState: minState};

    switch (parseInt(type)) {
        case 0:
            return parseInt(targetId) === parseInt(userId);

        case 1:
            query = 
            `SELECT 1 FROM fiche f WHERE f.id = :targetId AND (f.idOwner = :userId OR (f.idOwner IS NULL AND EXISTS ${getQryUniv('uU', 'f.idUnivers')}))`;
        break;
        case 2:
            query = `SELECT 1 FROM univers u WHERE u.id = :targetId AND EXISTS ${getQryUniv('uU', 'u.id')}`;
        break;

        default:
            return false;
    }

    const result = await db.namedQuery(query, params);
    return result.length > 0;
}

router.post('', checkFields('module'), auth(), async (req, res) => {
    let { type, targetId, name, extra } = req.body;

    // Vérifier si l'utilisateur a le droit de créer un module sur cette cible
    const userId = session.getUserId();
    const canCreate = await canCreateModuleOnTarget(userId, type, targetId, STATE);
    
    if (!canCreate) return res.status(403).send("no authorization");

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


router.put('/:idModule', auth('module', STATE), async (req, res) => {
    const { idModule } = req.params;
    const keyExist = ['name', 'extra', 'type', 'targetId'];

    if (req.body.extra) {
            // Récupération de l'extra actuel
            const result = await db.oneResult('SELECT extra FROM module WHERE id = ?', [idModule]);
            const dbExtra = result?.extra ? JSON.parse(result.extra) : {};
            const reqExtra = typeof req.body.extra === 'string' ? JSON.parse(req.body.extra) : req.body.extra;

            for (const [idExtra, oldValue] of Object.entries(dbExtra)) {
                if (!(idExtra in reqExtra)) {
                    await keyModule(oldValue, undefined);
                }
            }

            const newExtra = {};
            for (const [idExtra, newValue] of Object.entries(reqExtra)) {
                const oldValue = dbExtra[idExtra];
                newExtra[idExtra] = await keyModule(oldValue, newValue);
            }

            req.body.extra = JSON.stringify(newExtra);
        }

    const afterUpdate = await db.update('module', keyExist, req.body, ['id = ?', [idModule]]);
    if (afterUpdate === false) return res.status(400).send('Malformation');

    return res.send('success');
});

router.delete('/:idModule', auth('module', STATE), async (req, res) => {
    const { idModule } = req.params;

    const moduleData = await db.oneResult('SELECT type, targetId, name, extra FROM module WHERE id = ?',idModule);

    if (moduleData) { 
        await db.push('moduleExtra','type, targetId, name, extra',[moduleData.type, moduleData.targetId, moduleData.name, moduleData.extra]);
    }

    await db.query('DELETE FROM module WHERE id = ?', idModule);
    
    await cleanPosPoly('module', ['type','targetId'], [moduleData.type, moduleData.targetId]);
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

// Récupération des modules de l'utilisateur
router.post('/alias', async (req, res) => {
    if (!Array.isArray(req.body) || req.body.length === 0) {
        return res.json({});
    }
    const cleaned = req.body.map(s => s.replace(/\$\$/g, ''));
    const result = await db.query('select id,text from moduleKey where id in (?)', cleaned)
    const obj = Object.fromEntries(
        result.map(({ id, text }) => [String(id), text])
      );
    return res.json(obj);
});

router.patch('/move', auth('module', STATE), checkFields('moveModule'), async (req, res) => {
    const { newPos, idModule } = req.body

    const result = await move('module', newPos, idModule, ['type','targetId'])
    if (!result) return res.status(409).send("conflict");
    return res.send("success");
});





async function keyModule(oldExtra = '', newExtra = '') {
    if (oldExtra === newExtra) {
        return newExtra
    }
    const regex = /^\$\$([^ ]+)\$\$$/;
    const oldExtraId = check(oldExtra, regex)
    if (newExtra.length > 200) {
        if(oldExtraId === false) {
            const afterInsert = await db.push('moduleKey', 'text', [newExtra]);
            return `$$${afterInsert.insertId}$$`
        }else{
            await db.query('update moduleKey set text = ? where id = ?', newExtra, oldExtraId)
            return oldExtra
        }
    }else{
        if(oldExtraId !== false) {
            await db.query('delete from moduleKey where id = ?', oldExtraId)
        }
        return newExtra
    }
}

const postPutExtra = async (req, res) => {
    const { idModule, idExtra } = req.params;
    const { value } = req.body;

    const extra = await db.oneResult('SELECT extra FROM module WHERE id = ?', idModule);
    const jsonExtra = JSON.parse(extra['extra'])
    jsonExtra[idExtra] = await keyModule(jsonExtra[idExtra], value)
    await db.query('update module set extra = ? where id = ?', JSON.stringify(jsonExtra), idModule)


    return res.send('success');
}
router.post('/:idModule/:idExtra', auth('module', STATE), postPutExtra);
router.put('/:idModule/:idExtra', auth('module', STATE), postPutExtra);

router.delete('/:idModule/:idExtra', auth('module', STATE), async (req, res) => {
    const { idModule, idExtra } = req.params;

    const extra = await db.oneResult('SELECT extra FROM module WHERE id = ?', idModule);
    const jsonExtra = JSON.parse(extra['extra'])
    keyModule(jsonExtra[idExtra], undefined)
    delete jsonExtra[idExtra]

    await db.query('update module set extra = ? where id = ?', JSON.stringify(jsonExtra), idModule)

    return res.send('success');
});


module.exports = router;
