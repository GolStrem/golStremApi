const express = require('express');
const router = express.Router();
const Database = require('@lib/DataBase');
const { hashing, check } = require('@lib/Crypt');
const db = new Database();

async function checkChangeIsPossible(userId, token, oldPassword, passwordAlreadySet){
  if (token) {
    const goodToken = await db.exist('delete FROM token WHERE extra = ? and token = ? and type = ? and endAt > now()', userId, token, 'changePassword');
    return goodToken;
  }

  if (oldPassword) {
    return await check(passwordAlreadySet, oldPassword)
  }
  
  return false
}

router.put('', async (req, res) => {
  const { userId, oldPassword, token, newPassword } = req.body;

  if (!userId || !newPassword || !(token || oldPassword)) return res.status(400).send('Malformation');
  const result = await db.oneResult('SELECT password FROM user WHERE id = ? and status = ?', userId, 1);
  if (!result) return res.status(404).send('UserId not found');
  
  if (!await checkChangeIsPossible(userId, token, oldPassword, result.password)) {
    return res.status(401).send('Unauthorized');
  }

  if(await check(result.password, newPassword)) return res.status(409).send('alreadySet.password');

  passwordHashed = await hashing(newPassword);

  await db.exist('update user set password = ? where id = ?', passwordHashed, userId);

  return res.send("success");
});

module.exports = router;