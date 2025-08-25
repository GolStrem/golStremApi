const db = new (require('@lib/DataBase'))();

async function universCheck(req, userId, value) {
  const { idUnivers } = req.params;
  return await db.oneResult(
    "SELECT 1 FROM userUnivers WHERE idUnivers = ? AND idUser = ? AND state >= ?",
    idUnivers,
    userId,
    value ?? 0
  );
}

module.exports = universCheck;
