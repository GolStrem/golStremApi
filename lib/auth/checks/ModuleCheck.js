const db = new (require('@lib/DataBase'))();

async function moduleCheck(req, userId, value) {
  let { idModule } = req.params;
  if (idModule === undefined) idModule = req.body["idModule"];

  const qryUnivers = `(SELECT 1 FROM userUnivers uU WHERE uU.idUnivers = f.idUnivers AND uU.idUser = ? AND uU.state >= ?)`;
  const qryFiche = `SELECT 1 FROM fiche f WHERE f.id = m.targetId AND (f.idOwner = ? OR (f.idOwner IS NULL AND EXISTS ${qryUnivers}))`;

  return await db.exist(
    `SELECT 1 FROM module m WHERE m.id = ? AND ( (m.type = 0 AND m.targetId = ?) OR (m.type = 1 AND EXISTS (${qryFiche})) )`,
    idModule,
    userId,
    userId,
    userId,
    value ?? 0
  );
}

module.exports = moduleCheck;
