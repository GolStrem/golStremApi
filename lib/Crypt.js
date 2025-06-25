const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function hashing(str) {
  const saltRounds = 10;
  try {
    const hash = await bcrypt.hash(str, saltRounds);
    return hash;
  } catch (error) {
    throw new Error('Erreur lors du hashage : ' + error.message);
  }
}

async function check(hash,str){
  return await bcrypt.compare(str, hash);
}

function createToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex').slice(0, bytes);
}

module.exports = { hashing, check, createToken };

