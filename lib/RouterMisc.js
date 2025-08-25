const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { capitalize } = require('@lib/Util');

const qrysOwner = {
  workSpace: 'SELECT 1 FROM workSpace WHERE id = ? and idOwner = ? ',
  tableau: 'SELECT 1 FROM tableau t INNER JOIN workSpace ws ON t.idWorkSpace = ws.id WHERE t.id = ? and ? in (t.idOwner, ws.idOwner)',
  card: 'SELECT 1 FROM card c INNER JOIN tableau t ON c.idTableau = t.id inner join workSpace ws on t.idWorkspace = ws.id WHERE c.id = ? and ? IN (c.idOwner, t.idOwner, ws.idOwner)'
}

// Import des vérifications d'authentification
const ficheCheck = require('./auth/checks/FicheCheck');
const workSpaceCheck = require('./auth/checks/WorkSpaceCheck');
const moduleCheck = require('./auth/checks/ModuleCheck');
const universCheck = require('./auth/checks/UniversCheck');

function auth(type = undefined, value = undefined, isPublic = false) {
  return async (req, res, next) => {
    const userId = session.getUserId();
    if (!isPublic && userId === undefined) {
      return res.status(401).send("token unknown");
    }

    const checkers = {
      fiche: () => ficheCheck(req, userId, value, isPublic),
      workspace: () => workSpaceCheck(req, userId, value),
      module: () => moduleCheck(req, userId, value),
      univers: () => universCheck(req, userId, value),
    };

    if (type && checkers[type]) {
      const ok = await checkers[type]();
      if (ok === false) {
        // Cas spécial pour fiche non trouvée
        if (type === 'fiche') {
          return res.status(404).send("not found");
        }
        return res.status(403).send("no authorization");
      }
    }

    next();
  };
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


module.exports = { auth, checkFields, authAndOwner, cleanPos, move, cleanPosPoly };