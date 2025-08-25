const db = new (require('@lib/DataBase'))();

async function workSpaceCheck(req, userId, value) {
  const { idWorkSpace } = req.params;
  return await db.oneResult(
    "SELECT 1 FROM userWorkSpace WHERE idUser = ? AND idWorkSpace = ? AND state IN (?)",
    userId,
    idWorkSpace,
    value
  );
}

module.exports = workSpaceCheck;
