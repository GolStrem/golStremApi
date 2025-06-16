const bcrypt = require('bcrypt');

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

module.exports = { hashing, check };

