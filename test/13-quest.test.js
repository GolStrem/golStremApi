const request = require('supertest');
const app = require('../index.js'); 
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let universId;
let questId;
let questId2;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;

  // Créer un univers de test
  const universName = `univers_quest_test_${Date.now()}`;
  const universData = {
    name: universName,
    description: 'Univers de test pour les quêtes',
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
});

describe('Quest routes', () => {
  describe('POST routes', () => {
    it('POST /univers/:idUnivers/quest → doit créer une quête', async () => {
      if (!universId) {
        return;
      }

      const data = {
        type: 'quest',
        status: 1,
        name: 'Test Quest',
        image: 'https://dummyimage.com/400x300',
        description: 'Description de la quête de test',
        beginAt: '2025-01-01 00:00:00',
        endAt: '2025-12-31 23:59:59'
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/quest`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('type', 'quest');
      expect(res.body).to.have.property('status', 1);
      expect(res.body).to.have.property('name', 'Test Quest');
      expect(res.body).to.have.property('image', 'https://dummyimage.com/400x300');
      expect(res.body).to.have.property('description', 'Description de la quête de test');

      questId = res.body.id;
    });

    it('POST /univers/:idUnivers/quest → doit créer une deuxième quête', async () => {
      if (!universId) {
        return;
      }

      const data = {
        type: 'quest',
        status: 2,
        name: 'Test Quest 2',
        image: 'https://dummyimage.com/400x300',
        description: 'Deuxième quête de test',
        beginAt: '2025-06-01 00:00:00',
        endAt: '2025-06-30 23:59:59'
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/quest`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('type', 'quest');
      expect(res.body).to.have.property('status', 2);
      expect(res.body).to.have.property('name', 'Test Quest 2');

      questId2 = res.body.id;
    });
  });

  describe('GET routes', () => {
    it('GET /univers/:idUnivers/quest → doit récupérer la liste des quêtes', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body).to.have.property('pagination');
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.at.least(2);
    });

    it('GET /univers/:idUnivers/quest?search=Test → doit filtrer par recherche', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest?search=Test`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
    });

    it('GET /univers/:idUnivers/quest?filter[type]=quest → doit filtrer par type', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest?filter[type]=quest`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('type', 'quest');
      }
    });

    it('GET /univers/:idUnivers/quest?filter[status]=1 → doit filtrer par status', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest?filter[status]=1`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('status', 1);
      }
    });

    it('GET /univers/:idUnivers/quest?sort=name&order=asc → doit trier par nom', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest?sort=name&order=asc`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
    });

    it('GET /univers/:idUnivers/quest?limit=1&p=0 → doit paginer les résultats', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest?limit=1&p=0`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body).to.have.property('pagination');
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.equal(1);
      expect(res.body.pagination).to.have.property('total');
      expect(res.body.pagination).to.have.property('pages');
      expect(res.body.pagination).to.have.property('currentPage', '0');
      expect(res.body.pagination).to.have.property('limit', '1');
    });
  });

  describe('GET detail routes', () => {
    it('GET /univers/:idUnivers/quest/:idQuest → doit récupérer le détail d\'une quête', async () => {
      if (!universId || !questId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest/${questId}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id', questId);
      expect(res.body).to.have.property('name', 'Test Quest');
      expect(res.body).to.have.property('description', 'Description de la quête de test');
      expect(res.body).to.have.property('type', 'quest');
      expect(res.body).to.have.property('status', 1);
    });

    it('GET /univers/:idUnivers/quest/:idQuest → doit retourner 404 si la quête n\'existe pas', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/quest/99999`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(404);
      expect(res.text).to.equal('Quest not found');
    });
  });

  describe('PUT routes', () => {
    it('PUT /univers/:idUnivers/quest/:idQuest → doit mettre à jour une quête', async () => {
      if (!universId || !questId) {
        return;
      }

      const updateData = {
        name: 'Updated Quest',
        description: 'Description mise à jour',
        status: 3,
        type: 'quest'
      };

      const res = await request(app)
        .put(`/univers/${universId}/quest/${questId}`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('name', 'Updated Quest');
      expect(res.body).to.have.property('description', 'Description mise à jour');
      expect(res.body).to.have.property('status', 3);
      expect(res.body).to.have.property('type', 'quest');

      // Vérifier en base
      const updatedQuest = await db.oneResult(
        'SELECT name, description, status, type FROM quest WHERE id = ?',
        questId
      );
      expect(updatedQuest.name).to.equal('Updated Quest');
      expect(updatedQuest.description).to.equal('Description mise à jour');
      expect(updatedQuest.status).to.equal(3);
      expect(updatedQuest.type).to.equal('quest');
    });

    it('PUT /univers/:idUnivers/quest/:idQuest → doit retourner 404 si la quête n\'existe pas', async () => {
      if (!universId) {
        return;
      }

      const updateData = {
        name: 'Updated Quest'
      };

      const res = await request(app)
        .put(`/univers/${universId}/quest/99999`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(404);
      expect(res.text).to.equal('Quest not found');
    });
  });

  describe('DELETE routes', () => {
    it('DELETE /univers/:idUnivers/quest/:idQuest → doit supprimer une quête (soft delete)', async () => {
      if (!universId || !questId2) {
        return;
      }

      const res = await request(app)
        .delete(`/univers/${universId}/quest/${questId2}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier que la quête a bien un deletedAt
      const deletedQuest = await db.oneResult(
        'SELECT deletedAt FROM quest WHERE id = ?',
        questId2
      );
      expect(deletedQuest.deletedAt).to.not.be.null;
    });

    it('DELETE /univers/:idUnivers/quest/:idQuest → doit retourner 404 si la quête n\'existe pas', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .delete(`/univers/${universId}/quest/99999`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(404);
      expect(res.text).to.equal('Quest not found');
    });
  });

  after(async () => {
    // Nettoyage des données de test
    if (questId) {
      await db.query('DELETE FROM quest WHERE id = ?', questId);
    }
    if (questId2) {
      await db.query('DELETE FROM quest WHERE id = ?', questId2);
    }
    if (universId) {
      await db.query('DELETE FROM univers WHERE id = ?', universId);
    }
  });
});

