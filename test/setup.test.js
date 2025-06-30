require('module-alias/register');
require('dotenv').config({ path: '.env.test' });
const db = new (require('@lib/DataBase'))();

before(async () => {
  await db.query("DELETE FROM user;");
  await db.query("DELETE FROM token;");
  await db.query("DELETE FROM session;");
  await db.query("INSERT INTO user (login, password, email, status, image) VALUES ('invite', '$2b$10$4EEjLSLljyGUISGGPmitzeSGWALRZU3NVkyBewHGroEyGIeua46Iu', NULL, 1, NULL);");
});

afterEach(async () => {

});

after(async () => {
  await db.close();
});