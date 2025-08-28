const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { createToken } = require('@lib/Crypt');
const Discord = require('@lib/Discord');

router.get('/discord', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("Pas de code reçu");
  
    try {
      const discord = new Discord();
      
      // Échanger le code contre un token
      const tokenData = await discord.exchangeCodeForToken(code);
      const accessToken = tokenData.access_token;
  
      // Récupérer les infos utilisateur
      const user = await discord.getUserInfo(accessToken);
      
      const existingUser = await db.oneResult('SELECT id FROM user WHERE email = ?', user.email);
      let token = undefined
      if (existingUser) {
        token = await login(existingUser.id, req, res);
      } else {
        token = await createUser(user, req, res);
      }
      
      return res.redirect(`${process.env.FRONT_URL}/login?token=${token}`);
    } catch (error) {
        console.error('Erreur lors de l\'échange de code:', error);
        return res.status(500).send('Erreur lors de l\'échange de code');
    }
})

async function createUser(user, req, res) {
    const { v4: uuidv4 } = require('uuid');
    
         // Nettoyer le pseudo
     let pseudo = user.username
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '')
       .replace(/[^a-zA-Z0-9\-_]/g, '')
       .substring(0, 20);
    
    if (pseudo.length < 3) {
      const uuid = uuidv4().substring(0, 8);
      pseudo = `${pseudo}-${uuid}`;
    }

    const alreadyExist = await db.exist('SELECT 1 FROM user WHERE pseudo = ?', pseudo);
    if (alreadyExist) {
        pseudo = `user-${uuidv4().substring(0, 10)}`;
    }

    const image = user.avatar === null ? null : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    const email = user.email;
    const result = await db.push('user','pseudo, password, email, image, status', [pseudo, '', email, image, 1])
    const id = result.insertId;
    await db.query('insert into module(type, targetId, name, pos) values (?,?,?,?)', 0, id, 'workspace', 0)
    await db.query('insert into userInfo(userId) values (?)', id)

    return login(id, req, res);
}

async function login(id, req, res) {
    const resultSession = await db.oneResult('SELECT token FROM session WHERE userId = ? and ip = ?', id, req.ip);
    if (resultSession) {
      db.query("update session set createdAt = now() where token = ?", resultSession.token)
      return resultSession.token;
    }
  
    const token = createToken()
  
    await db.query(
      'INSERT INTO session(userId, token, ip) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, createdAt = NOW()',
      id, token, req.ip, token
    );

    return token;
}

module.exports = router;