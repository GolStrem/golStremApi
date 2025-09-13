const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');


const qryFriends = 'SELECT CASE WHEN f.idSender = ? THEN f.idReceiver ELSE f.idSender END AS id FROM friend f WHERE ? IN (f.idSender,f.idReceiver) AND f.state = 1'
const qryUnivers = `SELECT 
  u.id, u.name, u.description, u.image, u.idOwner,
  us.pseudo AS ownerPseudo, us.image AS ownerImage, CASE 
    WHEN COUNT(s.id) > 0 THEN 1
    ELSE 0
  END AS hasStar,
  CASE 
    WHEN COUNT(t.id) = 0 THEN JSON_ARRAY()
    ELSE JSON_ARRAYAGG(JSON_OBJECT('name', t.name, 'image', t.image))
  END AS tags,
  IF(u.visibility = 0, 0, IF(EXISTS(SELECT 1 FROM userUnivers uU WHERE uU.idUnivers = u.id AND uU.idUser = ? and uU.state >= 0), 0, u.visibility)) AS visibility, openRegistration
FROM univers u
INNER JOIN user us ON us.id = u.idOwner
LEFT JOIN universTags uT ON uT.idUnivers = u.id
LEFT JOIN tags t ON uT.idTag = t.id
left join star s on s.type = 1 and s.targetType = u.id and s.userId = ?
WHERE u.id IN (?)
GROUP BY u.id
`

const defaultModule = ['gallery', 'board', 'inscription', 'etablissement', 'encyclopedie', 'fiche']

const qryOneUnivers = `SELECT u.id,u.name,u.description,u.image,u.background, u.nfsw, u.visibility, u.idOwner,
uU.state as stateUser,
if(u.idOwner=?, 'owner', if(uU.state >= 2, 'write', 'read')) AS droit 

FROM univers u 
LEFT JOIN userUnivers uU ON uU.idUnivers = u.id AND uU.idUser = ?
WHERE u.id=? and u.deletedAt is null`


router.post('', checkFields('univers'), auth(), async (req, res) => {
    const { name, description, image, background, visibility, nfsw, tags, openRegistration } = req.body;

    const alreadyExist = await db.exist('SELECT 1 FROM univers WHERE name = ?', name);
    if (alreadyExist) return res.status(409).send('alreadyExist');

    const afterInsert = 
        await db.pushAndReturn('univers','idOwner, name, description, image, background, visibility, nfsw, openRegistration', [session.getUserId(), name, description, image, background, visibility, nfsw ?? 0, openRegistration ?? 0])

    const id = afterInsert.id;

    await db.query('insert into userUnivers values (?, ?, ?)', id, session.getUserId(), 3)
    const listUsers = await db.query('select u.id, u.pseudo, u.image from user u where u.id = ?', session.getUserId())

    await db.push('module', 'type, targetId, name, pos', Object.keys(defaultModule).map(i => {return [2, id , defaultModule[i], i]}))

    let listTags = [];
    if (tags.length > 0) {
        await db.query('INSERT INTO universTags SELECT ?, t.id FROM tags t WHERE t.name IN (?)', id, tags)
        listTags = await db.query('select t.id, t.name, t.image from universTags ut join tags t on ut.idTag = t.id where ut.idUnivers = ?', id)
    }


    return res.json({...afterInsert, tags: listTags, users: listUsers});
})

router.get('', auth(), async (req, res) => {
    var noNeed = false;
    const { limit = 20, p = 0, search, filter, sort, order = 'desc' } = req.query;

    const dataQry = {
        select: ['u.id'],
        join: ['left JOIN userUnivers uuFm ON uuFm.idUnivers = u.id AND uuFm.idUser = :myUserId'],
        where: ['u.nfsw = :nfsw', 'u.deletedAt is null', '(u.visibility != 2 or uuFm.idUser is not null)'],
        order: [],
        values: { nfsw: 0, myUserId: session.getUserId() }
    };

    if (search !== undefined) {
        dataQry.where.push("u.name LIKE :search");
        dataQry.values['search'] = `%${search}%`;
    }

    if (sort !== undefined) {
        if (sort === 'createdAt') {
            dataQry.order.push(`ORDER BY u.createdAt ${order}`);
        } else if (sort === 'stars') {
            dataQry.select.push(`COALESCE(s.count,0) as sort`);
            dataQry.join.push(`LEFT JOIN (
                SELECT targetType, COUNT(*) as count
                FROM star
                WHERE type = 1
                GROUP BY targetType
            ) s ON s.targetType = u.id`);
            dataQry.order.push(`ORDER BY sort ${order}`);
        } else if (sort === 'members') {
            dataQry.select.push(`COALESCE(uu.count,0) as sort`);
            dataQry.join.push(`LEFT JOIN (
                SELECT idUnivers, COUNT(*) as count
                FROM userUnivers
                where state >= 0
                GROUP BY idUnivers
            ) uu ON uu.idUnivers = u.id`);
            dataQry.order.push(`ORDER BY sort ${order}`);
        }
    }

    if (filter !== undefined) {
        if (filter.byFriend !== undefined && filter.withFriends !== undefined) {
            delete filter.withFriends;
        }

        for (const key of Object.keys(filter)) {
            switch (key) {
                case 'star':
                    dataQry.join.push(
                        "INNER JOIN star sFM ON u.id = sFM.targetType AND sFM.type = 1 AND sFM.userId = :myUserId"
                    );
                    dataQry.values['myUserId'] = session.getUserId();
                    break;

                case 'nfsw':
                    dataQry.where = dataQry.where.filter(cond => cond !== 'u.nfsw = :nfsw');
                    delete dataQry.values['nfsw'];
                    break;

                case 'withFriends':
                    const listFriends = await db.query(qryFriends, session.getUserId(), session.getUserId());
                    if (listFriends.length === 0) {
                        noNeed = true;
                        break;
                    }
                    dataQry.join.push(
                        "INNER JOIN userUnivers uuF ON uuF.idUnivers = u.id AND uuF.idUser IN (:listFriends) and uuF.state >= 0"
                    );
                    dataQry.values['listFriends'] = listFriends.map(f => f.id);
                    break;
                case 'withMe':
                        dataQry.where.push("uuFm.idUser is not null");
                        break;

                case 'byTag':
                    dataQry.join.push(
                        "INNER JOIN universTags utF ON utF.idUnivers = u.id AND utF.idTag = :idTag"
                    );
                    dataQry.values['idTag'] = filter.byTag;
                    break;

                case 'byFriend':
                    dataQry.join.push(
                        "INNER JOIN userUnivers uuF ON uuF.idUnivers = u.id AND uuF.idUser = :byFriend and uuF.state >= 0"
                    );
                    dataQry.values['byFriend'] = filter.byFriend;
                    break;
            }

            if (noNeed) break;
        }
    }

    if (noNeed) return res.json([]);

    const qry = `
        SELECT ${dataQry.select.join(', ')}
        FROM univers u
        ${dataQry.join.join(' ')}
        ${dataQry.where.length > 0 ? 'WHERE ' + dataQry.where.join(' AND ') : ''}
        ${dataQry.order.join(' ')}
        LIMIT :limit OFFSET :offset
    `;

    dataQry.values['limit'] = Number(limit);
    dataQry.values['offset'] = p * limit;

    // Requête de comptage en parallèle (sans LIMIT/OFFSET)
    const countQry = `
        SELECT COUNT(*) as total
        FROM univers u
        ${dataQry.join.join(' ')}
        ${dataQry.where.length > 0 ? 'WHERE ' + dataQry.where.join(' AND ') : ''}
    `;
    
    const [listUnivers, countResult] = await Promise.all([
        db.namedQuery(qry, dataQry.values),
        db.namedQuery(countQry, dataQry.values)
    ]);
    
    if (listUnivers.length === 0) return res.json({ data: [], pagination: { total: 0, pages: 0, currentPage: Number(p), limit: Number(limit) } });
    
    const listUniversId = listUnivers.map(u => u.id);
    const lastResult = await db.query(qryUnivers, session.getUserId(), session.getUserId(), listUniversId);
    
    // Préserver l'ordre de listUnivers
    const orderedResult = listUniversId.map(id => 
      lastResult.find(univers => univers.id === id)
    );
    
    const total = countResult[0].total;
    const pages = Math.ceil(total / limit);
    
    res.json({
        data: orderedResult,
        pagination: {
            total,
            pages,
            currentPage: Number(p),
            limit: Number(limit)
        }
    });
});

router.get('/:idUnivers', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;
    const { resume = 0 } = req.query;
    const univers = await db.oneResult(qryOneUnivers, session.getUserId(),session.getUserId(), idUnivers);
    if (resume == 1) {
        return res.json(univers);
    }
    const universModule = await db.query('select m.id, m.name, m.extra from module m where m.targetId = ? and m.type = 2', idUnivers);
    univers.module = universModule;
    listTags = await db.query('select t.id, t.name, t.image from universTags ut join tags t on ut.idTag = t.id where ut.idUnivers = ?', idUnivers)
    univers.tags = listTags
    return res.json(univers);
})

router.put('/:idUnivers', auth('univers', 2), async (req, res) => {
    const { idUnivers } = req.params;

    let listTags = [];

    if (req.body.tags) {
        await db.query('delete from universTags where idUnivers = ?', idUnivers)
        await db.query('insert into universTags select ?, t.id from tags t where t.name in (?)', idUnivers, req.body.tags)
        listTags = await db.query('select t.id, t.name, t.image from universTags ut join tags t on ut.idTag = t.id where ut.idUnivers = ?', idUnivers)
        delete req.body.tags
    }

    const keyExist = ['name', 'description', 'image', 'background', 'visibility', 'nfsw', 'openRegistration'];

    const afterUpdate = await db.update('univers',keyExist,req.body,['id = ?',[idUnivers]])
    if (listTags === undefined && afterUpdate === false) return res.status(400).send('Malformation');

    if (listTags.length > 0) {
        req.body.tags = listTags;
    }
    
    return res.json({id: idUnivers, ...req.body})
    
    
})

router.delete('/:idUnivers', auth('univers', 3), async (req, res) => {
    const { idUnivers } = req.params;

    await db.query('UPDATE univers SET deletedAt = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?', idUnivers );
    
    return res.send("success");
})

router.post('/:idUnivers/star', auth(), async (req, res) => {
    const { idUnivers } = req.params;

    await db.push('star','type, userId, targetType', [1, session.getUserId(), idUnivers], '', true)

    return res.send("success");
})

router.delete('/:idUnivers/star', auth(), async (req, res) => {
    const { idUnivers } = req.params;

    await db.query("delete from star where type = 1 and userId = ? and targetType = ?", session.getUserId(), idUnivers)

    return res.send("success");
})

router.use('/:idUnivers/gallery', require('./Univers/Gallery'));
router.use('/:idUnivers/user', require('./Univers/User'));
router.use('/:idUnivers/subscribe', require('./Univers/Subscribe'));
router.use('/:idUnivers/administration', require('./Univers/Administration'));

module.exports = router;