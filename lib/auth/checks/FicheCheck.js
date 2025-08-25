const db = new (require('@lib/DataBase'))();

async function ficheCheck(req, userId, value, isPublic) {
  const { id } = req.params;
  const fiche = await db.oneResult(
    "SELECT idOwner, idUnivers, visibility FROM fiche WHERE id = ? AND deletedAt IS NULL",
    id
  );
  if (!fiche) return false;

  // --- Mode public ---
  if (isPublic) {
    if (fiche.visibility == 0 || fiche.idOwner == userId) return true;
    if (fiche.visibility == 2 || userId === undefined) return false;

    // Vérif amis / univers
    const qrys = { parts: [], values: [] };
    if (fiche.idOwner !== null) {
      qrys.parts.push(
        "SELECT 1 FROM friend f WHERE ((f.idSender = ? AND f.idReceiver = ?) OR (f.idSender = ? AND f.idReceiver = ?)) AND f.state = 1"
      );
      qrys.values.push(fiche.idOwner, userId, userId, fiche.idOwner);
    }
    if (fiche.idUnivers !== null) {
      qrys.parts.push(
        "SELECT 1 FROM userUnivers WHERE idUnivers = ? AND idUser = ?"
      );
      qrys.values.push(fiche.idUnivers, userId);
    }
    return await db.exist(qrys.parts.join(" UNION "), ...qrys.values);
  }

  // --- Mode privé ---
  if (fiche.idOwner == userId) return true;
  if (fiche.idOwner == null && fiche.idUnivers != null) {
    return await db.exist(
      "SELECT 1 FROM userUnivers WHERE idUnivers = ? AND idUser = ? AND state >= ?",
      fiche.idUnivers,
      userId,
      value ?? 0
    );
  }
  return false;
}

module.exports = ficheCheck;
