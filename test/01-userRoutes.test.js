const db = new (require('@lib/DataBase'))();
const request = require('supertest');
const app = require('../index.js');

let token = '8a015085551a954d';

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;
});

describe('User routes', () => {
  it('POST /user/create -> doit créer un utilisateur', async () => {
    const res = await request(app).post('/user/create').send({ login: "test", password: "chocolat", email: "test@gmail.com" });


    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal("success")

    const rows = await db.query("select 1 from user where login = ?", "test")
    expect(rows.length).to.equal(1);
  });


  it('GET /user/validMail -> doit valider un utilisateur', async () => {
    const token = await db.oneResult("select token from token where extra = ? and type = ?", "test@gmail.com", "createUser")

    await request(app).get(`/user/validMail/test@gmail.com/${token.token}`).send();

    const rows = await db.query("select 1 from user where login = ? and status = ?", "test", 1)
    expect(rows.length).to.equal(1);
  });

  it('POST /user/login -> doit connecter un user', async () => {
    const res = await request(app).post('/user/login').send({ login: "test", password: "chocolat"});

    expect(res.statusCode).to.equal(200);
    const rows = await db.query("select 1 from session where token = ?", res.text)
  });

  it('GET /user/sendMailPassword -> doit envoyer le mail mot de passe perdu', async () => {
    const res = await request(app).get('/user/sendMailPassword/test@gmail.com').send();

    expect(res.statusCode).to.equal(200);
  });

  it('PUT user/changePassword -> doit changer le password pour un user', async () => {
    const tokenPassword = await db.oneResult("select extra, token from token where type = ?", "changePassword")
    const res = await request(app).put('/user/changePassword').send({userId: tokenPassword.extra, newPassword: "chocolat2",token: tokenPassword.token});

    
    expect(res.statusCode).to.equal(200);
  });

    it('GET /user -> doit retourner les informations de l\'utilisateur authentifié', async () => {
    const res = await request(app)
      .get('/user')
      .set('authorization', token)
      .send();

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('login', 'invite');
    // l\'image peut être NULL, on ne teste donc pas sa valeur ici
  });

  it('PUT /user/:idUser -> doit mettre à jour un utilisateur', async () => {
    // on récupère l\'id de l\'utilisateur "test" pour construire la route

    const res = await request(app)
      .put(`/user/1`)
      .set('authorization', token)
      .send({ login: "test2" });

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal("success");

    const rows = await db.query("select 1 from user where login = ?", "test2");
    expect(rows.length).to.equal(1);
  });

});