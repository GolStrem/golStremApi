const request = require('supertest');
const app = require('../index.js'); 
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let universId;
let tagId;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;
});

describe('Univers routes', () => {
  it('POST /univers → doit créer un univers', async () => {
    // Créer les tags nécessaires d'abord
    await db.query('INSERT INTO tags (name, image) VALUES (?, ?), (?, ?)', 
      'fantasy', 'https://dummyimage.com/100x100', 'aventure', 'https://dummyimage.com/100x100');

    const universName = `univers_test_${Date.now()}`;
    const data = {
      name: universName,
      description: 'Univers de test',
      image: 'https://dummyimage.com/600x400',
      visibility: 0,
      nfsw: 0,
      tags: ['fantasy', 'aventure']
    };
    
    const res = await request(app)
      .post('/univers')
      .set('Authorization', token)
      .send(data);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('name', universName);
    expect(res.body).to.have.property('tags');
    expect(res.body.tags).to.be.an('array');
    // Maintenant que les tags existent, on devrait en avoir 2
    expect(res.body.tags.length).to.equal(2);

    universId = res.body.id;
  });

  it('GET /univers → doit récupérer les univers avec pagination', async () => {
    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ limit: 10, p: 0 });

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('data');
    expect(res.body).to.have.property('pagination');
    expect(res.body.pagination).to.have.property('total');
    expect(res.body.pagination).to.have.property('pages');
    expect(res.body.pagination).to.have.property('currentPage', 0);
    expect(res.body.pagination).to.have.property('limit', 10);
    expect(res.body.data).to.be.an('array');
  });

  it('GET /univers avec recherche → doit filtrer par nom', async () => {
    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ search: 'univers_test' });

    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.be.an('array');
    expect(res.body.data.length).to.be.greaterThan(0);
    expect(res.body.data[0]).to.have.property('name');
    expect(res.body.data[0].name).to.include('univers_test');
  });

  it('GET /univers avec tri par étoiles → doit trier par nombre d\'étoiles', async () => {
    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ sort: 'stars', order: 'desc' });

    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.be.an('array');
  });

  it('GET /univers avec tri par membres → doit trier par nombre de membres', async () => {
    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ sort: 'members', order: 'desc' });

    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.be.an('array');
  });

  it('GET /univers avec filtre star → doit filtrer les univers avec étoiles', async () => {
    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ filter: JSON.stringify({ star: true }) });

    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.be.an('array');
  });

  it('GET /univers avec filtre nfsw → doit inclure le contenu nfsw', async () => {
    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ filter: JSON.stringify({ nfsw: true }) });

    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.be.an('array');
  });

  it('GET /univers avec filtre withMe → doit filtrer les univers où je suis membre', async () => {
    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ filter: JSON.stringify({ withMe: true }) });

    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.be.an('array');
  });

  it('GET /univers avec filtre byTag → doit filtrer par tag', async () => {
    // Créer un tag pour le test
    const tagName = 'test_tag';
    await db.query('INSERT INTO tags (name, image) VALUES (?, ?)', tagName, 'https://dummyimage.com/100x100');
    const tag = await db.oneResult('SELECT id FROM tags WHERE name = ?', tagName);
    tagId = tag.id;

    const res = await request(app)
      .get('/univers')
      .set('Authorization', token)
      .query({ filter: JSON.stringify({ byTag: tagId }) });

    expect(res.statusCode).to.equal(200);
    expect(res.body.data).to.be.an('array');
  });

  it('PUT /univers/:idUnivers → doit mettre à jour un univers', async () => {
    // Vérifier que l'univers existe avant de tester
    if (!universId) {
      return;
    }

    const newDescription = 'Description mise à jour';
    const res = await request(app)
      .put(`/univers/${universId}`)
      .set('Authorization', token)
      .send({ 
        description: newDescription,
        tags: ['Discord']
      });

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(Number(res.body.id)).to.equal(universId);
    expect(res.body).to.have.property('description', newDescription);
    expect(res.body).to.have.property('tags');
    expect(res.body.tags).to.be.an('array');
  });

  it('POST /univers/:idUnivers/star → doit ajouter une étoile', async () => {
    // Vérifier que l'univers existe avant de tester
    if (!universId) {
      return;
    }

    const res = await request(app)
      .post(`/univers/${universId}/star`)
      .set('Authorization', token)
      .send();

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    // Récupérer l'ID de l'utilisateur connecté via la table session
    const session = await db.oneResult('SELECT UserId FROM session WHERE token = ?', token);
    const starExists = await db.exist(
      'SELECT 1 FROM star WHERE type = 1 AND userId = ? AND targetType = ?',
      session.UserId, universId
    );
    expect(starExists).to.be.true;
  });

  it('DELETE /univers/:idUnivers/star → doit supprimer une étoile', async () => {
    // Vérifier que l'univers existe avant de tester
    if (!universId) {
      return;
    }

    const res = await request(app)
      .delete(`/univers/${universId}/star`)
      .set('Authorization', token)
      .send();

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    // Récupérer l'ID de l'utilisateur connecté via la table session
    const session = await db.oneResult('SELECT UserId FROM session WHERE token = ?', token);
    const starExists = await db.exist(
      'SELECT 1 FROM star WHERE type = 1 AND userId = ? AND targetType = ?',
      session.UserId, universId
    );
    expect(starExists).to.be.false;
  });

  it('DELETE /univers/:idUnivers → doit supprimer un univers', async () => {
    // Vérifier que l'univers existe avant de tester
    if (!universId) {
      return;
    }

    const res = await request(app)
      .delete(`/univers/${universId}`)
      .set('Authorization', token)
      .send();

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const exists = await db.exist('SELECT 1 FROM univers WHERE id = ? AND deletedAt IS NULL', universId);
    expect(exists).to.be.false;
  });

  after(async () => {
    // Nettoyage des données de test
    if (tagId) {
      await db.query('DELETE FROM tags WHERE id = ?', tagId);
    }
    if (universId) {
      await db.query('DELETE FROM univers WHERE id = ?', universId);
    }
    // Nettoyer les tags créés pour le test
    await db.query('DELETE FROM tags WHERE name IN (?, ?)', 'fantasy', 'aventure');
  });
});
