const db      = new (require('@lib/DataBase'))();
const request = require('supertest');
const app     = require('../index.js');

let token1;
let token2;
let idUser2;

before(async () => {
  const { expect: _expect } = await import('chai');
  global.expect = _expect;


  const { insertId } = await db.push(
    'user',
    'pseudo,password,email,status,image',
    [
      'friendUser',
      '$2b$10$abcdefghijklmnopqrstuvwx.yzABCDEFGHIJKLmnopqrstuvwxyz12',
      'friend@test.com',
      1,
      null
    ]
  );

  idUser2 = insertId;

  await db.push('session','UserId, token, ip',[idUser2, 'token-user-2', '::ffff:127.0.0.1'])
});

/* ======================================================== */
/*                SUITE DE TESTS DES ROUTES FRIEND          */
/* ======================================================== */

describe('Friend routes', () => {
  token1 = '8a015085551a954d';
  token2 = 'token-user-2';

  it('POST /user/friend -> user2 envoie une demande à user1', async () => {
    const res = await request(app).post('/user/friend').set('Authorization', token2).send({ idReceiver: 1 });

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('send');

    const exists = await db.exist('SELECT 1 FROM friend WHERE idSender = ? AND idReceiver = ? AND state = 0', idUser2, 1 );
    expect(exists).to.equal(true);
  });

  it('GET /user/friend/request -> user1 voit la demande', async () => {
    const res = await request(app).get('/user/friend/request').set('Authorization', token1);

    expect(res.statusCode).to.equal(200);
    expect(res.body.some(r => r.id === idUser2)).to.equal(true);
  });

  it('POST /user/friend -> user1 valide la demande', async () => {
    const res = await request(app).post('/user/friend').set('Authorization', token1).send({ idReceiver: idUser2 });

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('validate');

    const row = await db.oneResult(
      'SELECT state FROM friend WHERE (idSender = ? AND idReceiver = ?) OR (idSender = ? AND idReceiver = ?)', idUser2, 1, 1, idUser2);
    expect(row.state).to.equal(1);
  });

  it('GET /user/friend -> user1 récupère la liste des amis', async () => {
    const res = await request(app).get('/user/friend').set('Authorization', token1);

    expect(res.statusCode).to.equal(200);
    expect(res.body.map(r => r.id)).to.include(idUser2);
  });

  it('DELETE /user/friend/:idReceiver -> user1 supprime l\'ami', async () => {
    const res = await request(app).delete(`/user/friend/${idUser2}`).set('Authorization', token1);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const exists = await db.exist('SELECT 1 FROM friend WHERE (idSender = ? AND idReceiver = ?) OR (idSender = ? AND idReceiver = ?)', idUser2, 1, 1, idUser2);
    expect(exists).to.equal(false);
  });
});
