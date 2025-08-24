const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const fieldsMap = require('@fieldsMap/Move.json');
const { capitalize } = require('@lib/Util');

const qrysOwner = {
  workSpace: 'SELECT 1 FROM workSpace WHERE id = ? and idOwner = ? ',
  tableau: 'SELECT 1 FROM tableau t INNER JOIN workSpace ws ON t.idWorkSpace = ws.id WHERE t.id = ? and ? in (t.idOwner, ws.idOwner)',
  card: 'SELECT 1 FROM card c INNER JOIN tableau t ON c.idTableau = t.id inner join workSpace ws on t.idWorkspace = ws.id WHERE c.id = ? and ? IN (c.idOwner, t.idOwner, ws.idOwner)'
}

function authPublic(type = undefined, value = undefined) {
  return async (req, res, next) => {

    if (type == 'fiche') {
      const { id } = req.params;
      const fiche = await db.oneResult('select idOwner, idUnivers, visibility from fiche where id = ? and deletedAt is null and (idOwner is not null or idUnivers is not null)', id)
      if (!fiche) {
          return res.status(404).send("not found");
      }

      if (fiche.visibility == 0 || fiche.idOwner == session.getUserId()) {
        return next()
      }

      if (fiche.visibility == 2 || undefined === session.getUserId()) {
        return res.status(403).send("no authorization")
      }

      `SELECT 1 AS nbr FROM friend f WHERE ((f.idSender = 49 AND f.idReceiver = 50) OR (f.idSender = 50 AND f.idReceiver = 49)) AND f.state = 1
        UNION
        SELECT 1 AS nbr FROM userUnivers WHERE idUnivers = '0' and idUser = '492'
        `
      const qrys = {
        'parts': [],
        'values': []
      }

      if (fiche.idOwner !== null) {
        qrys.parts.push('SELECT 1 AS nbr FROM friend f WHERE ((f.idSender = ? AND f.idReceiver = ?) OR (f.idSender = ? AND f.idReceiver = ?)) AND f.state = 1')
        qrys.values = [fiche.idOwner, session.getUserId(), session.getUserId(), fiche.idOwner]
      }

      if (fiche.idUnivers !== null) {
        qrys.parts.push('SELECT 1 AS nbr FROM userUnivers WHERE idUnivers = ? and idUser = ?')
        qrys.values = [...qrys.values, fiche.idUnivers, session.getUserId()]
      }

      const check = await db.exist(qrys.parts.join(" union "), ...qrys.values)
      if (!check) { return res.status(403).send("no authorization") }
    }
    next();
  }
}


function auth(type = undefined, value = undefined) {
  return async (req, res, next) => {
    if (session.getUserId() === undefined) return res.status(401).send('token unknown');

    if (type == 'workspace') {
      const { idWorkSpace } = req.params
      const workSpaceValidate = await db.oneResult('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state in (?)', session.getUserId(), idWorkSpace, value);
      if (!workSpaceValidate) return res.status(403).send("no authorization");
    }

    if (type == 'fiche') {
      const { id } = req.params;
      const fiche = await db.oneResult('select idOwner,idUnivers from fiche where id = ?', id)
      if(!fiche) {
          return res.status(404).send("not found");
      }

      if (fiche.idOwner == session.getUserId()) {
        return next()
      }

      if (fiche.idOwner == null && fiche.idUnivers != null){
        const exist = await db.exist('select 1 from userUnivers where idUnivers = ? and idUser = ? and state >= ?', fiche.idUnivers, session.getUserId(), value ?? 0)
        if(!exist) { return res.status(403).send("no authorization") }
      }

    }

    if (type == 'module') {
      let { idModule } = req.params;
      if (idModule == undefined) {
        idModule = req.body['idModule']
      }

      const qryPartsType0 = '(m.type = 0 AND m.targetId = ?)'

      const qryPartsUnivers = '(SELECT 1 FROM userUnivers uU WHERE uU.idUnivers = f.idUnivers AND uU.idUser = ? AND uU.state >= ?)'
      const qryPartsFiche = `SELECT 1 FROM fiche f WHERE f.id = m.targetId AND (f.idOwner = ? OR (f.idOwner IS NULL AND EXISTS ${qryPartsUnivers}))`
      const qryPartsType1 = `(m.type = 1 AND EXISTS (${qryPartsFiche}))`
      
      const qryStruct = `SELECT 1 FROM module m WHERE m.id = ? AND (${qryPartsType0} OR ${qryPartsType1})`
      const exist = await db.exist(qryStruct, idModule, session.getUserId(), session.getUserId(), session.getUserId(), value ?? 0)
      if(!exist) { return res.status(403).send("no authorization") }

    }
    next();
  }
}


function authAndOwner(typeOwner) {
  return async (req, res, next) => {
    if (session.getUserId() === undefined) return res.status(401).send('token unknown');

    const tableauValidate = await db.oneResult(qrysOwner[typeOwner], req.params[`id${capitalize(typeOwner)}`], session.getUserId());
    if (!tableauValidate) return res.status(403).send("no owner");
    next();
  }
};

function checkFields(nameMap) {
  return function (req, res, next) {
    const fieldsMap = require(`@fieldsMap/Default.json`);
    const missing = fieldsMap[nameMap].find(field => req.body[field] === undefined);
    if (missing) {
      return res.status(400).send(`Malformation: missing '${missing}'`);
    }

    next();
  }
};


async function cleanPos(type, value) {
    const key = type === 'card' ? 'idTableau' : 'idWorkspace'

    const qry = `WITH ranked AS (SELECT id, ROW_NUMBER() OVER (ORDER BY pos) - 1 AS new_pos FROM ${type} WHERE ${key} = ? ) UPDATE ${type} JOIN ranked ON ${type}.id = ranked.id SET ${type}.pos = ranked.new_pos WHERE ${type}.${key} = ?;`

    await db.query(qry, value, value)
}

async function move(targetType, newPos, idTarget, targetFieldId) {
    const aimed = await db.oneResult(
        `SELECT ${targetFieldId.join(',')}, pos FROM ${targetType} WHERE id = ?`,
        idTarget
    );
    if (!aimed) return false;

    const whereClause = targetFieldId.map(f => `${f} = ?`).join(' AND ');
    const whereValues = targetFieldId.map(f => aimed[f]);

    const qryParts = `UPDATE ${targetType} SET pos = `
    await db.query(`${qryParts} pos - 1 WHERE ${whereClause} AND pos > ?`, ...whereValues, aimed.pos);
    await db.query(`${qryParts} pos + 1 WHERE ${whereClause} AND pos >= ?`, ...whereValues, newPos);
    await db.query(`${qryParts} ? WHERE id = ?`, newPos, idTarget);

    await cleanPosPoly(targetType, targetFieldId, whereValues);
    return true;
}

async function cleanPosPoly(table, fields, values) {
    const whereClause = fields.map(f => `${table}.${f} = ?`).join(' AND ');
    const joinClause = fields.map(f => `ranked.${f} = ${table}.${f}`).join(' AND ');

    const qry = `
        WITH ranked AS (
            SELECT id, ${fields.join(', ')}, ROW_NUMBER() OVER (ORDER BY pos) - 1 AS new_pos
            FROM ${table}
            WHERE ${whereClause}
        )
        UPDATE ${table}
        JOIN ranked ON ${table}.id = ranked.id AND ${joinClause}
        SET ${table}.pos = ranked.new_pos
        WHERE ${whereClause};
    `;

    await db.query(qry, ...values, ...values);
}




function extraMiddleware(extras) {
  return function (req, res, next) {
    req.extras = extras;
    next();
  };
}


module.exports = { auth, checkFields, authAndOwner, authPublic, cleanPos, extraMiddleware, move, cleanPosPoly };