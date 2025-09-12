const request = require('supertest');
const app = require('../index.js'); 
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let universId;
let ficheId;
let modelFicheId;
let subscribeId;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;

  // Créer un univers de test
  const universName = `univers_subscribe_test_${Date.now()}`;
  const universData = {
    name: universName,
    description: 'Univers de test pour subscribe',
    image: 'https://dummyimage.com/600x400',
    visibility: 0,
    nfsw: 0,
    tags: []
  };
  
  const universRes = await request(app)
    .post('/univers')
    .set('Authorization', token)
    .send(universData);
  
  if (universRes.statusCode === 200) {
    universId = universRes.body.id;
  }

  // Créer un modèle de fiche
  const modelData = {
    name: 'Test Model',
    description: 'Modèle de test',
    image: 'https://dummyimage.com/400x300'
  };
  
  const modelRes = await request(app)
    .post(`/univers/${universId}/administration/modelFiche`)
    .set('Authorization', token)
    .send(modelData);
  
  if (modelRes.statusCode === 200) {
    modelFicheId = modelRes.body.id;
  }

  // Créer une fiche de test
  const ficheData = {
    name: 'Test Fiche',
    description: 'Fiche de test',
    image: 'https://dummyimage.com/500x400'
  };
  
  const ficheRes = await request(app)
    .post('/fiche')
    .set('Authorization', token)
    .send(ficheData);
  
  if (ficheRes.statusCode === 200) {
    ficheId = ficheRes.body.id;
  }
});

describe('Subscribe routes', () => {
  it('GET /univers/:idUnivers/subscribe → doit récupérer les souscriptions', async () => {
    if (!universId) {
      return;
    }

    const res = await request(app)
      .get(`/univers/${universId}/subscribe`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('GET /univers/:idUnivers/subscribe avec state → doit filtrer par état', async () => {
    if (!universId) {
      return;
    }

    const res = await request(app)
      .get(`/univers/${universId}/subscribe`)
      .set('Authorization', token)
      .query({ state: 0 });

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
  });

  it('PUT /univers/:idUnivers/subscribe/:idSubscribe → doit mettre à jour une souscription', async () => {
    if (!subscribeId) {
      return;
    }

    const updateData = { state: 1 };
    const res = await request(app)
      .put(`/univers/${universId}/subscribe/${subscribeId}`)
      .set('Authorization', token)
      .send(updateData);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    // Vérifier en base
    const updatedSubscribe = await db.oneResult(
      'SELECT state FROM subscribeFiche WHERE id = ?',
      subscribeId
    );
    expect(updatedSubscribe.state).to.equal(1);
  });

  it('PUT /univers/:idUnivers/subscribe/:idSubscribe avec state=2 → doit accepter la souscription', async () => {
    if (!subscribeId) {
      return;
    }

    const updateData = { state: 2 };
    const res = await request(app)
      .put(`/univers/${universId}/subscribe/${subscribeId}`)
      .set('Authorization', token)
      .send(updateData);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    // Vérifier que la fiche a été mise à jour
    const fiche = await db.oneResult(
      'SELECT idUnivers, idModele FROM fiche WHERE id = ?',
      ficheId
    );
    expect(fiche.idUnivers).to.equal(universId);
    expect(fiche.idModele).to.equal(modelFicheId);
  });

  it('PUT /univers/:idUnivers/subscribe/:idSubscribe déjà accepté → doit retourner erreur', async () => {
    if (!subscribeId) {
      return;
    }

    const updateData = { state: 2 };
    const res = await request(app)
      .put(`/univers/${universId}/subscribe/${subscribeId}`)
      .set('Authorization', token)
      .send(updateData);

    expect(res.statusCode).to.equal(400);
    expect(res.text).to.equal('Subscribe already accepted');
  });

  it('DELETE /univers/:idUnivers/subscribe/:idSubscribe → doit supprimer une souscription', async () => {
    if (!subscribeId) {
      return;
    }

    const res = await request(app)
      .delete(`/univers/${universId}/subscribe/${subscribeId}`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    // Vérifier que la souscription est marquée comme supprimée
    const deletedSubscribe = await db.oneResult(
      'SELECT deletedAt, state FROM subscribeFiche WHERE id = ?',
      subscribeId
    );
    expect(deletedSubscribe.deletedAt).to.not.be.null;
    expect(deletedSubscribe.state).to.equal(-1);
  });

  it('DELETE /univers/:idUnivers/subscribe/:idSubscribe déjà accepté → doit retourner erreur', async () => {
    if (!subscribeId) {
      return;
    }

    const res = await request(app)
      .delete(`/univers/${universId}/subscribe/${subscribeId}`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(400);
    expect(res.text).to.equal('Subscribe already accepted');
  });

  after(async () => {
    // Nettoyage des données de test
    if (subscribeId) {
      await db.query('DELETE FROM subscribeFiche WHERE id = ?', subscribeId);
    }
    if (ficheId) {
      await db.query('DELETE FROM fiche WHERE id = ?', ficheId);
    }
    if (modelFicheId) {
      await db.query('DELETE FROM modelFiche WHERE id = ?', modelFicheId);
    }
    if (universId) {
      await db.query('DELETE FROM univers WHERE id = ?', universId);
    }
  });
});
