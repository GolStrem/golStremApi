const db = new (require('@lib/DataBase'))();
const session = new (require('@lib/Session'))();

async function universCheck(req, userId, value, isPublic, visibility = 0) {
  const { idUnivers } = req.params;

  if (!session.getUserId()) {
    return false;
  }

  if (isPublic) {
    const checkVisibility = await db.oneResult(
      "SELECT 1 FROM univers WHERE id = ? AND visibility <= ?",
      idUnivers,
      visibility
    );
    if (checkVisibility) return true;
  }

  return await db.oneResult(
    "SELECT 1 FROM userUnivers WHERE idUnivers = ? AND idUser = ? AND state >= ?",
    idUnivers,
    userId,
    value ?? 0
  );
}

module.exports = universCheck;
