const db      = new (require('@lib/DataBase'))();
const request = require('supertest');
const app     = require('../index.js');

let token;
let idWorkSpace;
let idTableau;



before(async () => {
  const { expect: _expect } = await import('chai');
  global.expect = _expect;
  

  const { insertId } = await db.push('workSpace', 'idOwner, name', [1, 'Tab test space']);
  idWorkSpace = insertId;

  await db.push('userWorkSpace','idUser, idWorkSpace, state',[1, idWorkSpace, 1]);
});


describe('Tableau routes', () => {
  token = '8a015085551a954d'

  it('POST /workSpace/:idWorkSpace/tableau -> crée un tableau', async () => {
    const payload = {
      color : '#ff0000',
      name  : 'Mon premier tableau',
      image : 'icon‑1'
    };

    const res = await request(app).post(`/workSpace/${idWorkSpace}/tableau`).set('Authorization', token).send(payload);
    
    expect(res.statusCode).to.equal(200);


    const row = await db.oneResult('SELECT id FROM tableau WHERE name = ? AND idWorkSpace = ?',payload.name, idWorkSpace);
    expect(row).to.not.equal(null);
    idTableau = row.id;
  });


  it('PUT /workSpace/:idWorkSpace/tableau/:idTableau -> met à jour le tableau', async () => {
    const update = { name: 'Tableau renommé', color: '#00ff00' };

    const res = await request(app).put(`/workSpace/${idWorkSpace}/tableau/${idTableau}`).set('Authorization', token).send(update);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const row = await db.oneResult('SELECT name, color FROM tableau WHERE id = ?', idTableau);
    expect(row.name).to.equal(update.name);
    expect(row.color).to.equal(update.color);
  });

it('PATCH /workSpace/:idWorkSpace/move/tableau -> déplace le tableau', async () => {
  const second = await db.push(
    'tableau',
    'idOwner, idWorkSpace, color, name, image, pos',
    [1, idWorkSpace, '#cccccc', 'Second tab', 'icon‑2', 1]
  );

  const patchPayload = {
    oldPos   : 0,
    newPos   : 1,
    idTableau: idTableau
  };

  const res = await request(app).patch(`/workSpace/${idWorkSpace}/move/tableau`).set('Authorization', token).send(patchPayload);

  expect(res.statusCode).to.equal(200);
  expect(res.text).to.equal('success');

  const rows = await db.query('SELECT id, pos FROM tableau WHERE idWorkSpace = ? ORDER BY pos',idWorkSpace);
  expect(rows.map(r => r.id)).to.deep.equal([second.insertId, idTableau]);
});

  it('DELETE /workSpace/:idWorkSpace/tableau/:idTableau -> supprime le tableau', async () => {

    const res = await request(app).delete(`/workSpace/${idWorkSpace}/tableau/${idTableau}`).set('Authorization', token).send();
    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const exists = await db.exist('SELECT 1 FROM tableau WHERE id = ?',idTableau);
    expect(exists).to.equal(false);
  });
});