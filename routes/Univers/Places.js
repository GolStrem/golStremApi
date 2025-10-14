const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');

const { fctCodeToDate, fctDateToCode } = require('@lib/PlageDate');

router.post('', auth('univers', 2), checkFields('places'), async (req, res) => {
    const { name, type, description, image, public, date = '1dvxwqtywv' } = req.body;
    const { idUnivers } = req.params;
    const idOwner = session.getUserId();

    const afterInsert = await db.pushAndReturn(
        'places',
        'idOwner, type, name, description, image, public, idUnivers',
        [idOwner, type, name, description, image, public, idUnivers]
    );

    await db.pushAndReturn(
        'placesOpeningHours',
        'idPlace, d, h',
        [afterInsert.id, '*', date === '*' ? '*' : fctDateToCode(date)]
    );

    return res.json({...afterInsert, date});
});

router.get('', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;
    const { limit = 20, p = 0, search, type, status } = req.query;
    const qryBegin = 'select p.id, name, type, description, image, public, poh.h as hour'
    let qryBody = 'from places p left join placesOpeningHours poh on poh.idPlace = p.id where deletedAt is null and idUnivers = ? and (public = 1 or idOwner = ?)'
    const args = [idUnivers, session.getUserId()];

    if (search !== undefined) {
        qryBody += ` and (name LIKE ? or description LIKE ?)`;
        args.push(`%${search}%`, `%${search}%`);
    }

    if (type !== undefined) {
        qryBody += ` and type = ?`;
        args.push(type);
    }

    if (status !== undefined) {
        const now = new Date();
        const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
        const timeValue = Math.floor(minutesSinceMidnight / 30);

        if (status === 'open') {
            qryBody += ' and (CAST(CONV(h, 36, 10) AS UNSIGNED) & (1 << FLOOR(?))) != 0'
            args.push(timeValue);
        }

        if (status === 'soon') {
            const nextHourMinutes = (minutesSinceMidnight + 60) % (24 * 60);
            const nextHourValue = Math.floor(nextHourMinutes / 30);
            qryBody += ' and (CAST(CONV(h, 36, 10) AS UNSIGNED) & (1 << FLOOR(?))) = 0'
            qryBody += ' and (CAST(CONV(h, 36, 10) AS UNSIGNED) & (1 << FLOOR(?))) != 0'
            args.push(timeValue, nextHourValue);
        }
    }
    const nbr = await db.oneResult(`select count(1) as nbr ${qryBody}`, ...args);
    const pagination = {
        total: nbr.nbr,
        pages: Math.ceil(nbr.nbr / limit),
        currentPage: p,
        limit: limit
    }

    const places = await db.query(`${qryBegin} ${qryBody} limit ? offset ?`, ...args, Number(limit), p * limit);
    places.map(place => {
        place.hour = fctCodeToDate(place.hour);
    });
    return res.json({data: places, pagination: pagination});
});

router.get('/:idPlace', auth('univers', 0, true), async (req, res) => {
    const { idPlace } = req.params;
    const place = await db.oneResult('select id, name, type, description, image, public from places where id = ?', idPlace);
    if (!place) return res.status(404).send('Place not found');
    return res.json(place);
});

router.put('/:idPlace', auth('univers', 2), async (req, res) => {
    const { idPlace } = req.params;
    const idOwner = session.getUserId();
    const exist = await db.exist('select 1 from places where id = ? and idOwner = ?', idPlace, idOwner);
    if (!exist) return res.status(404).send('Place not found');

    const date = req.body.date;
    delete req.body.date;

    if (Object.values(req.body).length > 0) {
        const keyExist = ['name', 'type', 'description', 'image', 'public'];
        const afterUpdate = await db.update('places', keyExist, req.body, ['id = ?', [idPlace]]);
        if (afterUpdate === false) return res.status(400).send('Malformation');
    }

    if (date !== undefined) {
        await db.query('update placesOpeningHours set h = ? where idPlace = ?', fctDateToCode(date), idPlace);
    }


    return res.send("success");
});

router.delete('/:idPlace', auth('univers', 2), async (req, res) => {
    const { idPlace } = req.params;
    const idOwner = session.getUserId();
    const exist = await db.exist('select 1 from places where id = ? and idOwner = ?', idPlace, idOwner);
    if (!exist) return res.status(404).send('Place not found');
    await db.query('update places SET deletedAt = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?', idPlace );
    return res.send("success");
});



module.exports = router;