const express = require('express');
const router = express.Router();
const { check } = require('../lib/Crypt');
const Database = require('../lib/DataBase');
const db = new Database();

router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).send('Malformation');
  }

  const result = await db.query('SELECT password FROM login WHERE login = ?', login);
  if (!result || result.length === 0) {
    return res.status(401).send('Identifiants incorrects');
  }

  const valid = await check(result[0].password, password);
  if (!valid) {
    return res.status(401).send('Identifiants incorrects');
  }

  return res.send("success");
});

module.exports = router;