require('dotenv').config();
const express = require('express');
const router = express.Router();
const { hashing, check } = require('@lib/Crypt');
const { sendMail, sendMailTpl } = require('@lib/Mail');
const Database = require('@lib/DataBase');
const validator = require('validator');
const crypto = require('crypto');
const db = new Database();

router.post('/login', async (req, res) => {
  const { login, password } = req.body;

  
  if (!login || !password) return res.status(400).send('Malformation');
  

  // Vérifie si le login existe
  const result = await db.oneResult('SELECT password,id FROM login WHERE login = ? and status = ?', login, 1);
  if (!result) return res.status(401).send('Identifiants incorrects');
  

  // Vérifie si le mot de passe est bon
  const valid = await check(result.password, password);
  if (!valid) return res.status(401).send('Identifiants incorrects');

  const token = crypto.randomBytes(16).toString('hex').slice(0, 16);

  await db.query(
    'INSERT INTO session(userId, token, ip) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, createdAt = NOW()',
    result.id, token, req.ip, token
    );

  
  return res.send(token);
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
  await db.query('insert into token(extra,token,type,endAt) values(?, ?, ?, NOW() + INTERVAL 1 DAY)', email, tokenMail, 'createUser');

  link = `${process.env.API_URL}/user/validMail/${email}/${tokenMail}`


  const lang = req.headers['lang'] ?? 'fr';
  const vars = {"link" : link, "login" : login}
  sendMailTpl(email,`Mail de validation pour le compte ${login} sur golstrem`,'welcom/tpl','welcom/tpl', vars, lang)

  return res.send("success");

});

router.get('/validMail/:email/:token', async (req, res) => {
  const { email, token } = req.params;

  const goodToken = await db.exist('delete FROM token WHERE extra = ? and token = ? and type = ? and endAt > now()', email, token, 'createUser');
  if(!goodToken) return res.status(401).send('token/mail incorrects');

  await db.exist('update login set status = ? where email = ?', 1, email);

  return res.send("success");
});

router.use('/changePassword', require('./User/ChangePassword'));

router.get('/sendMailPassword/:email/', async (req, res) => {
  const { email } = req.params;
  if (!validator.isEmail(email)) return res.status(400).send('Mail non conforme');

  const exist = await db.oneResult('SELECT id FROM login WHERE email = ? and status = ?', email, 1);
  if (!exist) return res.send("success"); // Ne pas indiqué si le mail existe.

  token = crypto.randomBytes(16).toString('hex').slice(0, 16);

  await db.query('insert into token(extra,token,type,endAt) values(?, ?, ?, NOW() + INTERVAL 1 DAY)', exist.id, token, 'changePassword');

  link = `${process.env.FRONT_URL}/reset-password?token=${token}&userId=${exist.id}`
  const lang = req.headers['lang'] ?? 'fr';
  sendMailTpl(email,`Mail de changement de mot de passe sur golstrem`,'resetPassword/tpl','welcom/tpl', {"link":link}, lang)

  return res.send("success");
});

module.exports = router;