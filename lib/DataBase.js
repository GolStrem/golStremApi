const dotenv = require('dotenv'); // ✅ ajoute ça !
dotenv.config(); // ← première config globale
const mysql = require('mysql2/promise');
const toUnnamed = require('named-placeholders')();
const { isSubset } = require('@lib/Util');



let pool = null;  // variable globale partagée

function getPool() {
  if (!pool) {
    const envFile = `.env${`.${process.env.NODE_ENV}` || ''}`;
    dotenv.config({ path: envFile });

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

  async push(table, label, values, extra = '') {
    let qry = `insert into ${table}(${label})`
    if(!Array.isArray(values[0])) {
        values = [values]
    }
    let partQry = `(${Array(values[0].length).fill('?').join(',')})`
    let partQryFull = Array(values.length).fill(partQry).join(',')
    qry += ` values ${partQryFull} ${extra}`

    const [rows] = await this.pool.query(qry, values.flat());
    return rows;
  }

async pushAndReturn(table, label, values, extra = '') {
  let qry = `INSERT INTO ${table}(${label})`;

  if (!Array.isArray(values[0])) {
    values = [values];
  }

  const partQry = `(${Array(values[0].length).fill('?').join(',')})`;
  const partQryFull = Array(values.length).fill(partQry).join(',');

  qry += ` VALUES ${partQryFull} ${extra}`;

  const [result] = await this.pool.query(qry, values.flat());

  if (values.length === 1) {
    const [rows] = await this.pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
    return rows[0];
  } else {
    const insertIds = Array.from({ length: result.affectedRows }, (_, i) => result.insertId + i);
    const [rows] = await this.pool.query(
      `SELECT * FROM ${table} WHERE id IN (${insertIds.map(() => '?').join(',')})`,
      insertIds
    );
    return rows;
  }
}


  async update(table, labelExist, json, where) {
      const keys = Object.keys(json);
      if (!isSubset(keys, labelExist)) return false;

      const qryParts = keys.map(k => `${k} = ?`);
      const param = keys.map(k => {
          const val = json[k];
          return typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
      });

      const qry = `UPDATE ${table} SET ${qryParts.join(', ')} WHERE ${where[0]}`;
      return await this.query(qry, ...param, ...(Array.isArray(where[1]) ? where[1] : [where[1]]));
  }

  async namedQuery(qry, params) {
    const [query, values] = toUnnamed(qry, params);
    return await this.query(query, ...values);
  }



  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
