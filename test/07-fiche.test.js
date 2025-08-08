const request = require('supertest');
const app = require('../index.js');
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let ficheId;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;
});

describe('Fiche routes', () => {
  it('POST /fiche → doit créer une fiche', async () => {
    const data = {
      idOwner: 1,
      name: 'Test fiche',
      color: '#ff0000',
      image: 'https://dummyimage.com/200x200',
      idUnivers: null,
      visibility: 2
    };

    const res = await request(app).post('/fiche')
      .set('Authorization', token)
      .send(data);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('id');

    ficheId = res.body.id;

    const exists = await db.exist('SELECT 1 FROM fiche WHERE id = ?', ficheId);
    expect(exists).to.be.true;
  });

  it('GET /fiche/owner/1 → doit récupérer les fiches visibles du user', async () => {
    const res = await request(app).get('/fiche/owner/1')
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    const fiche = res.body.find(f => f.id === ficheId);
    expect(fiche).to.be.ok;
    expect(fiche).to.have.property('name', 'Test fiche');
  });

  it('PUT /fiche/:id → doit mettre à jour la fiche', async () => {
    const res = await request(app).put(`/fiche/${ficheId}`)
      .set('Authorization', token)
      .send({ name: 'Fiche modifiée', visibility: 1 });

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('name', 'Fiche modifiée');

    const row = await db.oneResult('SELECT name, visibility FROM fiche WHERE id = ?', ficheId);
    expect(row.name).to.equal('Fiche modifiée');
    expect(row.visibility).to.equal(1);
  });

  it('PATCH /fiche/move/:id → doit déplacer la fiche', async () => {
    const res = await request(app).patch(`/fiche/move/${ficheId}`)
      .set('Authorization', token)
      .send({ type: 'owner', targetId: 1, pos: 0 });

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const row = await db.oneResult('SELECT pos FROM fichePos WHERE idFiche = ? and targetId = ?', ficheId, 1);
    expect(row.pos).to.equal(0);
  });

  it('DELETE /fiche/:id → doit supprimer la fiche', async () => {
    const res = await request(app).delete(`/fiche/${ficheId}`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const exists = await db.exist('SELECT 1 FROM fiche WHERE id = ? and deletedAt is null', ficheId);
    expect(exists).to.be.false;
  });
});
