const db      = new (require('@lib/DataBase'))();
const request = require('supertest');
const app     = require('../index.js'); 

let token       = '8a015085551a954d';
let idModule;


describe('Module routes', () => {
  it('POST /module → crée un module', async () => {
    const payload = {
      type    : 0,
      targetId: 1,
      name    : 'Module test',
      extra   : 'info extra'
    };

    const res = await request(app).post('/module').set('Authorization', token).send(payload);
    expect(res.statusCode).to.equal(200);

    const keys = Object.keys(res.body);
    expect(keys.length).to.equal(1);
    idModule = parseInt(keys[0]);
    const row = await db.oneResult('SELECT id, name, pos FROM module WHERE id = ?', idModule);
    expect(row).to.not.equal(null);
    expect(row.name).to.equal(payload.name);
    expect(row.pos).to.equal(0);
  });

  it('PUT /module/:idModule → met à jour le module', async () => {
    const update = { name: 'Module renommé' };

    const res = await request(app).put(`/module/${idModule}`).set('Authorization', token).send(update);
    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const row = await db.oneResult('SELECT name, extra FROM module WHERE id = ?', idModule);
    expect(row.name).to.equal(update.name);
  });

  it("GET /module/0/1 → retourne les modules de l'utilisateur", async () => {
    const res = await request(app).get('/module/0/1').set('Authorization', token);
    expect(res.statusCode).to.equal(200);
    expect(Array.isArray(res.body)).to.equal(true);
    expect(res.body.find(m => m.id === idModule)).to.not.equal(undefined);
  });

  it('DELETE /module/:idModule → supprime le module', async () => {
    const res = await request(app).delete(`/module/${idModule}`).set('Authorization', token);
    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const exists = await db.exist('SELECT 1 FROM module WHERE id = ?', idModule);
    expect(exists).to.equal(false);
  });
});
