require('dotenv').config();
const mysql = require('mysql2/promise');

const { isSubset } = require('@lib/Util');



let pool = null;  // variable globale partagée

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
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
  return pool;
}



function getMethod(sql) {
  return sql.trim().substring(0, 6).toLowerCase();
}

function checkMethod(sql, methodChecked) {
  return getMethod(sql) === methodChecked;
}

class Database {
  constructor() {
    this.pool = getPool();
  }

  async query(sql, ...params) {
    try {
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('❌ Erreur dans query():', err);
      throw err;
    }
  }

    async oneResult(sql, ...params) {
      try {
        const [rows] = await this.pool.query(sql, params);
        if(rows.length === 0) return false;
        return rows[0];
      } catch (err) {
        console.error('❌ Erreur dans query():', err);
        throw err;
      }
    }

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

  async push(table, label, values) {
    let qry = `insert into ${table}(${label})`
    if(!Array.isArray(values[0])) {
        values = [values]
    }
    let partQry = `(${Array(values[0].length).fill('?').join(',')})`
    let partQryFull = Array(values.length).fill(partQry).join(',')
    qry += ` values ${partQryFull}`

    const [rows] = await this.pool.query(qry, values.flat());
    return rows;
  }

  async update(table, labelExist, json, where){
    const keys = Object.keys(json)
    if(!isSubset(keys,labelExist)) return false;

    let qry = `update ${table} set `
    let param = []
    let qryParts = []
    for (let key of keys) {
        qryParts.push(`${key} = ?`)
        param.push(json[key])
    }
    qry += qryParts.join(',') + " where " + where[0]
    return await this.query(qry, ...param, ...where[1])
  }



  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
