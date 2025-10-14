const request = require('supertest');
const app = require('../index.js'); 
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let universId;
let placeId;
let placeId2;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;

  // Créer un univers de test
  const universName = `univers_places_test_${Date.now()}`;
  const universData = {
    name: universName,
    description: 'Univers de test pour les lieux',
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

describe('Places routes', () => {
  describe('POST routes', () => {
    it('POST /univers/:idUnivers/places → doit créer un lieu', async () => {
      if (!universId) {
        return;
      }

      const data = {
        name: 'Test Place',
        type: 'restaurant',
        description: 'Description du lieu de test',
        image: 'https://dummyimage.com/400x300',
        public: 1,
        date: [["08:00", "12:00"], ["14:00", "18:00"]]
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/places`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('type', 'restaurant');
      expect(res.body).to.have.property('name', 'Test Place');
      expect(res.body).to.have.property('image', 'https://dummyimage.com/400x300');
      expect(res.body).to.have.property('description', 'Description du lieu de test');

      placeId = res.body.id;
    });

    it('POST /univers/:idUnivers/places → doit créer un deuxième lieu', async () => {
      if (!universId) {
        return;
      }

      const data = {
        name: 'Test Place 2',
        type: 'hotel',
        description: 'Deuxième lieu de test',
        image: 'https://dummyimage.com/400x300',
        public: 1,
        date: [["00:00", "02:00"], ["19:00", "23:30"]]
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/places`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('type', 'hotel');
      expect(res.body).to.have.property('name', 'Test Place 2');

      placeId2 = res.body.id;
    });
  });

  describe('GET routes', () => {
    it('GET /univers/:idUnivers/places → doit récupérer la liste des lieux', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body).to.have.property('pagination');
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.at.least(2);
    });

    it('GET /univers/:idUnivers/places?search=Test → doit filtrer par recherche', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places?search=Test`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
    });

    it('GET /univers/:idUnivers/places?type=restaurant → doit filtrer par type', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places?type=restaurant`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).to.have.property('type', 'restaurant');
      }
    });

    it('GET /univers/:idUnivers/places?status=open → doit filtrer par status ouvert', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places?status=open`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
    });

    it('GET /univers/:idUnivers/places?status=soon → doit filtrer par status bientôt ouvert', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places?status=soon`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
    });

    it('GET /univers/:idUnivers/places?limit=1&p=0 → doit paginer les résultats', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places?limit=1&p=0`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('data');
      expect(res.body).to.have.property('pagination');
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.equal(1);
      expect(res.body.pagination).to.have.property('total');
      expect(res.body.pagination).to.have.property('pages');
      expect(res.body.pagination).to.have.property('limit', '1');
    });
  });

  describe('GET detail routes', () => {
    it('GET /univers/:idUnivers/places/:idPlace → doit récupérer le détail d\'un lieu', async () => {
      if (!universId || !placeId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places/${placeId}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id', placeId);
      expect(res.body).to.have.property('name', 'Test Place');
      expect(res.body).to.have.property('description', 'Description du lieu de test');
      expect(res.body).to.have.property('type', 'restaurant');
      expect(res.body).to.have.property('public', '1');
    });

    it('GET /univers/:idUnivers/places/:idPlace → doit retourner 404 si le lieu n\'existe pas', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/places/99999`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(404);
      expect(res.text).to.equal('Place not found');
    });
  });

  describe('PUT routes', () => {
    it('PUT /univers/:idUnivers/places/:idPlace → doit mettre à jour un lieu', async () => {
      if (!universId || !placeId) {
        return;
      }

      const updateData = {
        name: 'Updated Place',
        description: 'Description mise à jour',
        type: 'cafe',
        public: 0
      };

      const res = await request(app)
        .put(`/univers/${universId}/places/${placeId}`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier en base
      const updatedPlace = await db.oneResult(
        'SELECT name, description, type, public FROM places WHERE id = ?',
        placeId
      );
      expect(updatedPlace.name).to.equal('Updated Place');
      expect(updatedPlace.description).to.equal('Description mise à jour');
      expect(updatedPlace.type).to.equal('cafe');
      expect(updatedPlace.public).to.equal('0');
    });

    it('PUT /univers/:idUnivers/places/:idPlace → doit mettre à jour les horaires d\'ouverture', async () => {
      if (!universId || !placeId) {
        return;
      }

      const updateData = {
        date: [["09:00", "17:00"]]
      };

      const res = await request(app)
        .put(`/univers/${universId}/places/${placeId}`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier en base
      const openingHours = await db.oneResult(
        'SELECT h FROM placesOpeningHours WHERE idPlace = ?',
        placeId
      );
      expect(openingHours.h).to.not.be.null;
    });

    it('PUT /univers/:idUnivers/places/:idPlace → doit retourner 404 si le lieu n\'existe pas', async () => {
      if (!universId) {
        return;
      }

      const updateData = {
        name: 'Updated Place'
      };

      const res = await request(app)
        .put(`/univers/${universId}/places/99999`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(404);
      expect(res.text).to.equal('Place not found');
    });
  });

  describe('DELETE routes', () => {
    it('DELETE /univers/:idUnivers/places/:idPlace → doit supprimer un lieu (soft delete)', async () => {
      if (!universId || !placeId2) {
        return;
      }

      const res = await request(app)
        .delete(`/univers/${universId}/places/${placeId2}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier que le lieu a bien un deletedAt
      const deletedPlace = await db.oneResult(
        'SELECT deletedAt FROM places WHERE id = ?',
        placeId2
      );
      expect(deletedPlace.deletedAt).to.not.be.null;
    });

    it('DELETE /univers/:idUnivers/places/:idPlace → doit retourner 404 si le lieu n\'existe pas', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .delete(`/univers/${universId}/places/99999`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(404);
      expect(res.text).to.equal('Place not found');
    });
  });

  after(async () => {
    // Nettoyage des données de test
    if (placeId) {
      await db.query('DELETE FROM placesOpeningHours WHERE idPlace = ?', placeId);
      await db.query('DELETE FROM places WHERE id = ?', placeId);
    }
    if (placeId2) {
      await db.query('DELETE FROM placesOpeningHours WHERE idPlace = ?', placeId2);
      await db.query('DELETE FROM places WHERE id = ?', placeId2);
    }
    if (universId) {
      await db.query('DELETE FROM univers WHERE id = ?', universId);
    }
  });
});


