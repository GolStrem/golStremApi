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

  
  if (!login || !password) return res.status(400).send('Malformation');
  

  // Vérifie si le login existe
  const result = await db.query('SELECT password FROM login WHERE login = ?', login);
  if (!result || result.length === 0) return res.status(401).send('Identifiants incorrects');
  

  // Vérifie si le mot de passe est bon
  const valid = await check(result[0].password, password);
  if (!valid) return res.status(401).send('Identifiants incorrects');
  
  return res.send("success");
});

router.post('/create', async (req, res) => {
  const { login, password, email } = req.body;

  if (!login || !password || !email) return res.status(400).send('Malformation');

  if (!validator.isEmail(email)) return res.status(400).send('Mail non conforme');

  const alreadyExist = await db.exist('SELECT 1 FROM login WHERE login = ? or email = ?', login, email);
  if (alreadyExist) return res.status(409).send('alreadyExist');

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

router.get('/validMail/:email/:token', async (req, res) => {
  const { email, token } = req.params;

  const goodToken = await db.exist('delete FROM tokenMail WHERE mail = ? and token = ?', email, token);
  if(!goodToken) return res.status(401).send('token/mail incorrects');

  await db.exist('update login set status = ?', 1);

  return res.send("success");

});

module.exports = router;