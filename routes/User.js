require('dotenv').config();
const express = require('express');
const router = express.Router();
const { hashing, check, createToken } = require('@lib/Crypt');
const { sendMailTpl } = require('@lib/Mail');
const Database = require('@lib/DataBase');
const validator = require('validator');
const db = new Database();
const { checkFields, auth } = require('@lib/RouterMisc');
const session = new (require('@lib/Session'))();

router.use('/changePassword', require('./User/ChangePassword'));

router.get('', auth(), async (req, res) => {

    const user = await db.oneResult('SELECT id, login, email, image, status FROM user WHERE id = ?', session.getUserId());
    if (!user) return res.status(404).send("no user");

    return res.json(user);
})

router.put('/:idUser', auth(), async (req, res) => {
    const { idUser } = req.params;
    const keyExist = [ 'login', 'image', 'email'];

    const afterUpdate = await db.update('user',keyExist,req.body,['id = ?',[idUser]])

    if (afterUpdate === false) return res.status(400).send('Malformation');

    return res.send("success");
})


router.post('/login', checkFields('login'), async (req, res) => {
  const { login, password } = req.body;  

  // Vérifie si le login existe
  const result = await db.oneResult('SELECT password,id FROM user WHERE login = BINARY ? and status = ?', login, 1);
  if (!result) return res.status(401).send('Identifiants incorrects');

  // Vérifie si le mot de passe est bon
  const valid = await check(result.password, password);
  if (!valid) return res.status(401).send('Identifiants incorrects');

  const resultSession = await db.oneResult('SELECT token FROM session WHERE userId = ? and ip = ?', result.id, req.ip);
  if (resultSession) {
    db.query("update session set createdAt = now() where token = ?", resultSession.token)
    return res.send(resultSession.token);
  }

  token = createToken()

  await db.query(
    'INSERT INTO session(userId, token, ip) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, createdAt = NOW()',
    result.id, token, req.ip, token
    );

  
  return res.send(token);
});

router.post('/create', checkFields('create'), async (req, res) => {
  const { login, password, email } = req.body;

  if (!validator.isEmail(email)) return res.status(400).send('Mail non conforme');

  const alreadyExist = await db.exist('SELECT 1 FROM user WHERE login = ? or email = ?', login, email);
  if (alreadyExist) return res.status(409).send('alreadyExist');

  tokenMail = createToken();

  passwordHashed = await hashing(password);


  await db.push('user','login,password,email', [login, passwordHashed, email])
  const endAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.push('token','extra,token,type,endAt', [email, tokenMail, 'createUser', endAt])
  link = `${process.env.API_URL}/user/validMail/${email}/${tokenMail}`


  const lang = req.headers['lang'] ?? 'fr';
  const vars = {"link" : link, "login" : login}
  sendMailTpl(email,'{{welcomeSubject}}','welcom/tpl','welcom/tpl', vars, lang)

  return res.send("success");

});

router.get('/validMail/:email/:token', async (req, res) => {
  const { email, token } = req.params;

  const goodToken = await db.exist('delete FROM token WHERE extra = ? and token = ? and type = ? and endAt > now()', email, token, 'createUser');
  if(!goodToken) return res.status(401).send('token/mail incorrects');

  db.exist('update user set status = ? where email = ?', 1, email);

  if (req.useragent.browser !== "PostmanRuntime") {
    return res.redirect(`${process.env.FRONT_URL}`);
  }

  return res.send("success");
});

router.get('/sendMailPassword/:email/', async (req, res) => {
  const { email } = req.params;
  if (!validator.isEmail(email)) return res.status(400).send('Mail non conforme');

  const exist = await db.oneResult('SELECT id FROM user WHERE email = ? and status = ?', email, 1);
  if (!exist) return res.send("success");

  const mailAlreadySend = await db.oneResult('SELECT 1 FROM token WHERE extra = ? AND TYPE = ?', exist.id, 'changePassword')
  if (mailAlreadySend) return res.send("success"); 

  token = createToken();

  const endAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.push('token','extra,token,type,endAt', [exist.id, token, 'changePassword', endAt])

  link = `${process.env.FRONT_URL}/reset-password?token=${token}&userId=${exist.id}`
  const lang = req.headers['lang'] ?? 'fr';
  sendMailTpl(email,`{{resetPasswordSubject}}`,'resetPassword/tpl','welcom/tpl', {"link":link}, lang)

  return res.send("success");
});


router.get('/sendMailPassword/:email/', async (req, res) => {
  const { email } = req.params;
  if (!validator.isEmail(email)) return res.status(400).send('Mail non conforme');

  const exist = await db.oneResult('SELECT id FROM user WHERE email = ? and status = ?', email, 1);
  if (!exist) return res.send("success");

  const mailAlreadySend = await db.oneResult('SELECT 1 FROM token WHERE extra = ? AND TYPE = ?', exist.id, 'changePassword')
  if (mailAlreadySend) return res.send("success"); 

  token = createToken();

  const endAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.push('token','extra,token,type,endAt', [exist.id, token, 'changePassword', endAt])

  link = `${process.env.FRONT_URL}/reset-password?token=${token}&userId=${exist.id}`
  const lang = req.headers['lang'] ?? 'fr';
  sendMailTpl(email,`{{resetPasswordSubject}}`,'resetPassword/tpl','welcom/tpl', {"link":link}, lang)

  return res.send("success");
});

module.exports = router;