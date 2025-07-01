const request = require('supertest');
const app = require('../index.js'); 
const db  = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let workSpaceId;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;

});


describe('WorkSpace routes',  () => {
  it('POST /workSpace → doit créer un workspace', async () => {
    const wsName = `ws_test_${Date.now()}`
    const data = {
        name: `ws_test_${Date.now()}`,
        description: 'Workspace de test',
        image: 'https://dummyimage.com/600x400'
      }
    const res = await request(app).post('/workSpace').set('Authorization', token).send(data);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const row = await db.oneResult('SELECT id FROM workSpace WHERE name = ?', wsName);
    expect(row).to.be.ok;
    workSpaceId = row.id;
  });

    it('GET /workSpace → doit récupérer les workspaces pour un user', async () => {
    const res = await request(app).get('/workSpace').set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body[workSpaceId]).to.have.property('name');
  });

  it('GET /workSpace/:idWorkSpace → doit récupérer le détail du workspace', async () => {
    const res = await request(app).get(`/workSpace/${workSpaceId}`).set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('name');
    expect(res.body).to.have.property('tableau');
    expect(res.body).to.have.property('user');
  });

  it('PUT /workSpace/:id → doit mettre à jour le workspace', async () => {
    const res = await request(app).put(`/workSpace/${workSpaceId}`).set('Authorization', token).send({ description: 'New' });

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const updated = await db.oneResult( 'SELECT description FROM workSpace WHERE id = ?', workSpaceId);

    expect(updated.description).to.equal('New');
  });

  it('DELETE /workSpace/:id → doit supprimer le workspace', async () => {
    const res = await request(app).delete(`/workSpace/${workSpaceId}`).set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const exists = await db.exist('SELECT 1 FROM workSpace WHERE id = ?', workSpaceId);
    expect(exists).to.be.false;
  });

});
