const db = new (require('@lib/DataBase'))();

const getQryUniv = (alias, key) => {
  return `(SELECT 1 FROM userUnivers ${alias} WHERE ${alias}.idUnivers = ${key} AND ${alias}.idUser = :userId AND ${alias}.state >= :minState)`;
};

async function moduleCheck(req, userId, value = 0) {
  let { idModule } = req.params;
  if (idModule === undefined) idModule = req.body["idModule"];

  if (!idModule) {
    return false;
  }

  const qryFiche = `SELECT 1 FROM fiche f WHERE f.id = m.targetId AND (f.idOwner = :userId OR (f.idOwner IS NULL AND EXISTS ${getQryUniv('uU', 'f.idUnivers')}))`;
  
  const mainQuery = `
    SELECT 1 FROM module m 
    WHERE m.id = :idModule 
    AND (
      (m.type = 0 AND m.targetId = :userId) 
      OR (m.type = 1 AND EXISTS (${qryFiche})) 
      OR (m.type = 2 AND EXISTS ${getQryUniv('uU2', 'm.targetId')})
    )
  `;

  const params = {
    idModule: idModule,
    userId: userId,
    minState: value
  };

  const result = await db.namedQuery(mainQuery, params);
  return result.length > 0;
}

module.exports = moduleCheck;
