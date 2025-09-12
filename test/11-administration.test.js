const request = require('supertest');
const app = require('../index.js'); 
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let universId;
let modelFicheId;
let ruleFicheId;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;

  // Créer un univers de test
  const universName = `univers_admin_test_${Date.now()}`;
  const universData = {
    name: universName,
    description: 'Univers de test pour administration',
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

describe('Administration routes', () => {
  describe('ModelFiche routes', () => {
    it('POST /univers/:idUnivers/administration/modelFiche → doit créer un modèle de fiche', async () => {
      if (!universId) {
        return;
      }

      const data = {
        name: 'Test Model',
        description: 'Modèle de test pour administration',
        image: 'https://dummyimage.com/400x300'
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/administration/modelFiche`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('idUnivers', universId);
      expect(res.body).to.have.property('name', 'Test Model');
      expect(res.body).to.have.property('description', 'Modèle de test pour administration');
      expect(res.body).to.have.property('image', 'https://dummyimage.com/400x300');

      modelFicheId = res.body.id;
    });

    it('GET /univers/:idUnivers/administration/modelFiche → doit récupérer les modèles de fiche', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/administration/modelFiche`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThan(0);
      
      const testModel = res.body.find(model => model.id === modelFicheId);
      expect(testModel).to.exist;
      expect(testModel).to.have.property('name', 'Test Model');
    });

    it('PUT /univers/:idUnivers/administration/modelFiche/:idModelFiche → doit mettre à jour un modèle', async () => {
      if (!modelFicheId) {
        return;
      }

      const updateData = {
        name: 'Updated Model',
        description: 'Modèle mis à jour',
        image: 'https://dummyimage.com/500x400'
      };

      const res = await request(app)
        .put(`/univers/${universId}/administration/modelFiche/${modelFicheId}`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id', modelFicheId);
      expect(res.body).to.have.property('name', 'Updated Model');
      expect(res.body).to.have.property('description', 'Modèle mis à jour');
      expect(res.body).to.have.property('image', 'https://dummyimage.com/500x400');

      // Vérifier en base
      const updatedModel = await db.oneResult(
        'SELECT name, description, image FROM modelFiche WHERE id = ?',
        modelFicheId
      );
      expect(updatedModel.name).to.equal('Updated Model');
      expect(updatedModel.description).to.equal('Modèle mis à jour');
    });

    it('DELETE /univers/:idUnivers/administration/modelFiche/:idModelFiche → doit supprimer un modèle', async () => {
      if (!modelFicheId) {
        return;
      }

      const res = await request(app)
        .delete(`/univers/${universId}/administration/modelFiche/${modelFicheId}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier que le modèle n'existe plus
      const exists = await db.exist('SELECT 1 FROM modelFiche WHERE id = ?', modelFicheId);
      expect(exists).to.be.false;
    });
  });

  describe('ModelFicheRule routes', () => {
    before(async () => {
      // Recréer un modèle pour les tests de règles
      if (universId) {
        const modelData = {
          name: 'Test Model for Rules',
          description: 'Modèle pour tester les règles',
          image: 'https://dummyimage.com/400x300'
        };
        
        const modelRes = await request(app)
          .post(`/univers/${universId}/administration/modelFiche`)
          .set('Authorization', token)
          .send(modelData);
        
        if (modelRes.statusCode === 200) {
          modelFicheId = modelRes.body.id;
        }
      }
    });

    it('POST /univers/:idUnivers/administration/modelFiche/:idModelFiche/ruleFiche → doit créer une règle', async () => {
      if (!modelFicheId) {
        return;
      }

      const data = {
        target: 'user',
        rule: 'role',
        value: '2'
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/administration/modelFiche/${modelFicheId}/ruleFiche`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('idModele', modelFicheId);
      expect(res.body).to.have.property('target', 'user');
      expect(res.body).to.have.property('rule', 'role');
      expect(res.body).to.have.property('value', '2');

      ruleFicheId = res.body.id;
    });

    it('GET /univers/:idUnivers/administration/modelFiche/:idModelFiche/ruleFiche → doit récupérer les règles', async () => {
      if (!modelFicheId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/administration/modelFiche/${modelFicheId}/ruleFiche`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThan(0);
      
      const testRule = res.body.find(rule => rule.id === ruleFicheId);
      expect(testRule).to.exist;
      expect(testRule).to.have.property('target', 'user');
      expect(testRule).to.have.property('rule', 'role');
    });

    it('PUT /univers/:idUnivers/administration/modelFiche/:idModelFiche/ruleFiche/:idRuleFiche → doit mettre à jour une règle', async () => {
      if (!ruleFicheId) {
        return;
      }

      const updateData = {
        target: 'user',
        rule: 'role',
        value: '3'
      };

      const res = await request(app)
        .put(`/univers/${universId}/administration/modelFiche/${modelFicheId}/ruleFiche/${ruleFicheId}`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id', ruleFicheId);
      expect(res.body).to.have.property('value', '3');

      // Vérifier en base
      const updatedRule = await db.oneResult(
        'SELECT value FROM modelFicheRule WHERE id = ?',
        ruleFicheId
      );
      expect(updatedRule.value).to.equal('3');
    });

    it('DELETE /univers/:idUnivers/administration/modelFiche/:idModelFiche/ruleFiche/:idRuleFiche → doit supprimer une règle', async () => {
      if (!ruleFicheId) {
        return;
      }

      const res = await request(app)
        .delete(`/univers/${universId}/administration/modelFiche/${modelFicheId}/ruleFiche/${ruleFicheId}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier que la règle n'existe plus
      const exists = await db.exist('SELECT 1 FROM modelFicheRule WHERE id = ?', ruleFicheId);
      expect(exists).to.be.false;
    });
  });

  after(async () => {
    // Nettoyage des données de test
    if (ruleFicheId) {
      await db.query('DELETE FROM modelFicheRule WHERE id = ?', ruleFicheId);
    }
    if (modelFicheId) {
      await db.query('DELETE FROM modelFiche WHERE id = ?', modelFicheId);
    }
    if (universId) {
      await db.query('DELETE FROM univers WHERE id = ?', universId);
    }
  });
});
