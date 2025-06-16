require('dotenv').config();
const mysql = require('mysql2/promise');

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('✅ Pool de connexions MySQL initialisé.');
  }

  // Exécute une requête SQL (supporte les paramètres dynamiques)
  async query(sql, ...params) {
    try {
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('❌ Erreur dans query():', err);
      throw err;
    }
  }

  // Vérifie si au moins une ligne est trouvée
  async exist(sql, ...params) {
    try {
      const rows = await this.query(sql, ...params);
      return rows.length > 0;
    } catch (err) {
      console.error('❌ Erreur dans exist():', err);
      return false;
    }
  }

  // Ferme le pool (utile à la fin d'un script, pas forcément dans un serveur)
  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
