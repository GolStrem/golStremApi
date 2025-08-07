const db = new (require('@lib/DataBase'))();

async function newPos(type, targetId, id) {
    const nbrFiche = await db.oneResult('select count(1) as nbr from fichePos where type = ? and targetId = ?', type, targetId)
    await db.query('insert into fichePos(type, targetId, idFiche, pos) values (?,?,?,?)', type,targetId,id,nbrFiche.nbr ?? 0)
}

async function movePos(type, targetId, id, pos) {
    const fichePos = await db.oneResult('select pos from fichePos where idFiche = ? and type = ? and targetId = ?', id, type, targetId)

    await db.query(`UPDATE fichePos SET pos = pos - 1 WHERE type = ? and targetId = ? AND pos > ?`, type, targetId, fichePos.pos);
    await db.query(`UPDATE fichePos SET pos = pos + 1 WHERE type = ? and targetId = ? AND pos >= ?`, type, targetId, pos);
    await db.query(`UPDATE fichePos SET pos = ? WHERE idFiche = ?`, pos, id);

}

async function cleanPos(type, targetId) {

    const qry = `WITH ranked AS (SELECT idFiche, ROW_NUMBER() OVER (ORDER BY pos) - 1 AS new_pos FROM fichePos WHERE type = ? and targetId = ? ) UPDATE fichePos JOIN ranked ON fichePos.idFiche = ranked.idFiche SET fichePos.pos = ranked.new_pos WHERE fichePos.type = ? and fichePos.targetId = ?;`

    await db.query(qry, type, targetId, type, targetId)
}
module.exports = { newPos, movePos, cleanPos};