const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');

router.post('', auth('univers', 2), checkFields('quest'), async (req, res) => {
    const { type, status, name, image, description, beginAt, endAt } = req.body;
    const { idUnivers } = req.params;
    const idOwner = session.getUserId();

    const afterInsert = await db.pushAndReturn(
        'quest',
        'idOwner, type, status, name, image, description, beginAt, endAt, idUnivers',
        [idOwner, type, status, name, image, description, beginAt, endAt, idUnivers]
    );

    return res.json(afterInsert);
});

router.get('', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;
    const { limit = 20, p = 0, search, filter, sort = 'beginAt', order = 'desc' } = req.query;
    const values = [idUnivers];

    let qry = `from quest where idUnivers = ? and deletedAt is null`;
    
    if (search !== undefined) {
        qry += ` and name LIKE ? or description LIKE ?`;
        values.push(`%${search}%`, `%${search}%`);
    }

    if (filter !== undefined) {
        const filterMapping = {
            'type': '=',
            'status': '=',
            'beginAt>': '>',
            'endAt>': '>',
            'beginAt<': '<',
            'endAt<': '<'
        };

        Object.entries(filterMapping).forEach(([key, operator]) => {
            if (filter[key]) {
                const field = key.replace(/[<>]/, '');
                qry += ` and ${field} ${operator} ?`;
                values.push(filter[key]);
            }
        });
    }

    const allowedSortFields = ['type', 'status', 'name', 'beginAt', 'endAt', 'createdAt'];
    const sanitizedSort = allowedSortFields.includes(sort) ? sort : 'beginAt';

    const sanitizedOrder = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toLowerCase() : 'desc';

    const nbr = await db.oneResult(`select count(1) as nbr ${qry}`, ...values);
    const pagination = {
        total: nbr.nbr,
        pages: Math.ceil(nbr.nbr / limit),
        currentPage: p,
        limit: limit
    }

    qry += ` order by ${sanitizedSort} ${sanitizedOrder}`;
    qry += ` limit ? offset ?`;
    values.push(Number(limit), p * limit);

    const quests = await db.query(`SELECT * ${qry}`, ...values);

    return res.json({data: quests, pagination: pagination});
});

// Récupérer une quête spécifique
router.get('/:idQuest', auth(), async (req, res) => {
    const { idQuest } = req.params;
    const idOwner = session.getUserId();

    const quest = await db.oneResult(
        'SELECT * FROM quest WHERE id = ? AND idOwner = ? AND deletedAt IS NULL',
        idQuest, idOwner
    );

    if (!quest) return res.status(404).send('Quest not found');

    return res.json(quest);
});

// Modifier une quête
router.put('/:idQuest', auth('univers', 2), async (req, res) => {
    const { idQuest } = req.params;
    const { idUnivers } = req.params;
    const idOwner = session.getUserId();

    // Vérifier que la quête appartient à l'utilisateur
    const questExists = await db.oneResult(
        'SELECT id FROM quest WHERE id = ? AND idOwner = ? AND deletedAt IS NULL',
        idQuest, idOwner
    );

    if (!questExists) return res.status(404).send('Quest not found');

    const keyExist = ['type', 'status', 'name', 'image', 'description', 'beginAt', 'endAt'];

    const afterUpdate = await db.update('quest', keyExist, req.body, ['id = ?', [idQuest]]);
    if (afterUpdate === false) return res.status(400).send('Malformation');
    
    return res.json({id: idQuest, ...req.body});
});

// Supprimer une quête (soft delete)
router.delete('/:idQuest', auth('univers', 3), async (req, res) => {
    const { idQuest } = req.params;
    const idOwner = session.getUserId();

    // Vérifier que la quête appartient à l'utilisateur
    const questExists = await db.oneResult(
        'SELECT id FROM quest WHERE id = ? AND idOwner = ? AND deletedAt IS NULL',
        idQuest, idOwner
    );

    if (!questExists) return res.status(404).send('Quest not found');

    await db.query('UPDATE quest SET deletedAt = NOW() WHERE id = ?', idQuest);

    return res.send('success');
});



module.exports = router;
