require('dotenv').config();
const mysql = require('mysql2/promise');

function getMethod(sql) {
  return sql.trim().substring(0, 6).toLowerCase();
}

function checkMethod(sql, methodChecked) {
  return getMethod(sql) === methodChecked;
}

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

  // Vérifie si au moins une ligne est concerné
  async exist(sql, ...params) {
    try {
      var key = checkMethod(sql, "select") ? "length" : "affectedRows";
      const [rows] = await this.pool.execute(sql, params);
      return rows[key] > 0;
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
