const db      = new (require('@lib/DataBase'))();
const request = require('supertest');
const app     = require('../index.js'); 

let token       = '8a015085551a954d';
let idModule;
let idExtra;

// Fonction utilitaire pour vérifier les références (utilisée dans keyModule)
function check(value, regex) {
    const match = value.match(regex);
    return match ? match[1] : false;
}


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

  // Tests pour les nouvelles routes d'extra
  it('POST /module/:idModule/:idExtra → crée un extra dans un module', async () => {
    // Créer un nouveau module pour les tests d'extra
    const modulePayload = {
      type    : 0,
      targetId: 1,
      name    : 'Module extra test',
      extra   : '{"test": "valeur"}'
    };

    const moduleRes = await request(app).post('/module').set('Authorization', token).send(modulePayload);
    const moduleId = parseInt(Object.keys(moduleRes.body)[0]);
    
    const payload = { value: 'Nouvelle valeur pour l\'extra' };
    const res = await request(app).post(`/module/${moduleId}/test`).set('Authorization', token).send(payload);
    
    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const module = await db.oneResult('SELECT extra FROM module WHERE id = ?', moduleId);
    const extra = JSON.parse(module.extra);
    expect(extra.test).to.equal(payload.value);
  });

  it('PUT /module/:idModule/:idExtra → met à jour un extra dans un module', async () => {
    // Créer un module avec un extra existant
    const modulePayload = {
      type    : 0,
      targetId: 1,
      name    : 'Module extra update test',
      extra   : '{"updateTest": "ancienne valeur"}'
    };

    const moduleRes = await request(app).post('/module').set('Authorization', token).send(modulePayload);
    const moduleId = parseInt(Object.keys(moduleRes.body)[0]);
    
    const payload = { value: 'Nouvelle valeur mise à jour' };
    const res = await request(app).put(`/module/${moduleId}/updateTest`).set('Authorization', token).send(payload);
    
    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const module = await db.oneResult('SELECT extra FROM module WHERE id = ?', moduleId);
    const extra = JSON.parse(module.extra);
    expect(extra.updateTest).to.equal(payload.value);
  });

  it('DELETE /module/:idModule/:idExtra → supprime un extra d\'un module', async () => {
    // Créer un module avec un extra à supprimer
    const modulePayload = {
      type    : 0,
      targetId: 1,
      name    : 'Module extra delete test',
      extra   : '{"deleteTest": "valeur à supprimer", "keepTest": "valeur à garder"}'
    };

    const moduleRes = await request(app).post('/module').set('Authorization', token).send(modulePayload);
    const moduleId = parseInt(Object.keys(moduleRes.body)[0]);
    
    const res = await request(app).delete(`/module/${moduleId}/deleteTest`).set('Authorization', token);
    
    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const module = await db.oneResult('SELECT extra FROM module WHERE id = ?', moduleId);
    const extra = JSON.parse(module.extra);
    expect(extra.deleteTest).to.equal(undefined);
    expect(extra.keepTest).to.equal('valeur à garder');
  });

  it('POST /module/:idModule/:idExtra → gère le contenu lourd avec moduleKey', async () => {
    // Créer un module pour tester le contenu lourd
    const modulePayload = {
      type    : 0,
      targetId: 1,
      name    : 'Module contenu lourd test',
      extra   : '{"lourd": "court"}'
    };

    const moduleRes = await request(app).post('/module').set('Authorization', token).send(modulePayload);
    const moduleId = parseInt(Object.keys(moduleRes.body)[0]);
    
    // Test avec un contenu lourd (>200 caractères)
    const contenuLourd = 'A'.repeat(250); // 250 caractères
    const payload = { value: contenuLourd };
    const res = await request(app).post(`/module/${moduleId}/lourd`).set('Authorization', token).send(payload);
    
    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const module = await db.oneResult('SELECT extra FROM module WHERE id = ?', moduleId);
    const extra = JSON.parse(module.extra);
    expect(extra.lourd).to.match(/^\$\$[0-9]+\$\$$/); // Format de référence

    // Vérifier que le contenu est bien stocké dans moduleKey
    const refId = extra.lourd.replace(/\$\$/g, '');
    const keyContent = await db.oneResult('SELECT text FROM moduleKey WHERE id = ?', refId);
    expect(keyContent.text).to.equal(contenuLourd);
  });
});
