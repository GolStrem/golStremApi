require('dotenv').config();
const express = require('express');
const router = express.Router();
const { hashing, check } = require('../lib/Crypt');
const { sendMail } = require('../lib/Mail');
const Database = require('../lib/DataBase');
const validator = require('validator');
const crypto = require('crypto');
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

router.post('/create', async (req, res) => {
  const { login, password, email } = req.body;

  if (!login || !password || !email) {
    return res.status(400).send('Malformation');
  }

  if (!validator.isEmail(email)) {
    return res.status(400).send('Mail non conforme');
  }

  const alreadyExist = await db.exist('SELECT 1 FROM login WHERE login = ? or email = ?', login, email);
  if (alreadyExist) {
    return res.status(409).send('alreadyExist');
  }

  tokenMail = crypto.randomBytes(16).toString('hex').slice(0, 16);

  passwordHashed = await hashing(password);


  await db.query('insert into login(login,password,email) values(?,?,?)', login, passwordHashed, email);
  await db.query('insert into tokenMail values(?,?)', email, tokenMail);

  link = `${process.env.API_URL}/user/validMail/${email}/${tokenMail}`

  sendMail(
    email, 
    `Mail de validation pour le compte ${login} sur golstrem`,
    `<a href='${link}'>Clique-sur moi !</a><br><br> et si marche pas, accède directement à cette url <a href='${link}'>${link}</a>`
  );


});

module.exports = router;