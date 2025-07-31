require('module-alias/register');
require('dotenv').config({ path: '.env.test' });
const db = new (require('@lib/DataBase'))();

before(async () => {
  await db.query("SET FOREIGN_KEY_CHECKS = 0")
  await db.query("DELETE FROM user;");
  await db.query("DELETE FROM token;");
  await db.query("DELETE FROM session;");
  await db.query("DELETE FROM workSpace;");
  await db.query("DELETE FROM userWorkSpace;");
  await db.query("DELETE FROM tableau;");
  await db.query("DELETE FROM card;");
  await db.query("DELETE FROM module;");
  await db.query("SET FOREIGN_KEY_CHECKS = 1");
  await db.query("INSERT INTO user (id, pseudo, password, email, status, image) VALUES (1, 'invite', '$2b$10$4EEjLSLljyGUISGGPmitzeSGWALRZU3NVkyBewHGroEyGIeua46Iu', 'test@test.com', 1, NULL);");
  await db.query("INSERT INTO session ( UserId, token, ip) VALUES (1, '8a015085551a954d', '::ffff:127.0.0.1');");
});

afterEach(async () => {

});

after(async () => {
  await db.close();
});