const log = (new (require('./lib/Log'))('delete.log', false)).log;

const db = new (require('@lib/DataBase'))();

const action = async () => {
    log('- Lancement de la cron de suppression des données');
    await deleteToken();
    await deleteFiche();
    await deleteUnivers();
    await deleteBookLink();
}

async function deleteBookLink() {
    log('-- Suppresion bookLink');
    const res = await db.query('DELETE bl FROM bookLink bl LEFT JOIN book b ON bl.idLink = b.idLink WHERE b.idLink IS NULL');
    log(`-- ${res.affectedRows} bookLink supprimés`);
}

async function deleteToken() {
    log('-- Suppresion token Mail');
    const res = await db.query('DELETE FROM token WHERE endAt < NOW()');
    log(`-- ${res.affectedRows} tokens supprimés`);
}

// Fonction générique pour supprimer les entités avec leurs modules et alias
async function deleteEntityWithModules(entityName, moduleType) {
    log(`-- Début Suppresion ${entityName}`);
    
    // Récupérer les entités avec leurs extras
    const entities = await db.query(
        `SELECT extra 
         FROM ${entityName} f 
         LEFT JOIN module m ON f.id=m.targetId AND m.type = ? 
         WHERE f.deletedAt < NOW() AND extra IS NOT NULL AND extra != '{}'`,
        [moduleType]
    );
    
    const listIdToDelete = [];
    log('--- Récupération alias');
    
    for (const entity of entities) {
        try {
            const extra = Object.values(JSON.parse(entity.extra ?? '{}')).map(item => {
                const match = String(item).match(/^\$\$(.*)\$\$/);
                return match ? match[1] : null;
            }).filter(Boolean);
            listIdToDelete.push(...extra);
        } catch {
            log(`--- Extra invalide pour une entité, ignoré`);
        }
    }

    // Suppression des alias
    if (listIdToDelete.length > 0) {
        log('--- Suppresion alias');
        const placeholders = listIdToDelete.map(() => '?').join(',');
        const resAlias = await db.query(`DELETE FROM moduleKey WHERE id IN (${placeholders})`, ...listIdToDelete);
        log(`--- ${resAlias.affectedRows} alias supprimés`);
    }

    // Suppression des modulesExtra
    log('--- Suppresion modulesExtra');
    const resExtra = await db.query(
        `DELETE m 
         FROM ${entityName} f 
         LEFT JOIN moduleExtra m ON f.id = m.targetId AND m.type = ? 
         WHERE f.deletedAt < NOW()`,
        [moduleType]
    );
    log(`--- ${resExtra.affectedRows} modulesExtra supprimés`);

    // Suppression des modules + entités
    log(`--- Suppresion module et ${entityName}`);
    const resModules = await db.query(
        `DELETE f, m 
         FROM ${entityName} f 
         LEFT JOIN module m ON f.id = m.targetId AND m.type = ? 
         WHERE f.deletedAt < NOW()`,
        [moduleType]
    );
    log(`--- ${resModules.affectedRows} modules + ${entityName} supprimés`);
}

async function deleteFiche() {
    await deleteEntityWithModules('fiche', 1);
}

async function deleteUnivers() {
    await deleteEntityWithModules('univers', 2);
}

module.exports = action;
