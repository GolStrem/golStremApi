const db      = new (require('@lib/DataBase'))();
const request = require('supertest');
const app     = require('../index.js'); 


let token       = '8a015085551a954d';
let idWorkSpace;
let idTableauA;
let idTableauB;
let idCard;

before(async () => {
  const { expect: _expect } = await import('chai');
  global.expect = _expect;

  const { insertId: idW } = await db.push('workSpace','idOwner, name',[1, 'WS – Cards']);
  idWorkSpace = idW

  await db.push('userWorkSpace', 'idUser, idWorkSpace, state', [1, idWorkSpace, 1]);

  const { insertId: idA } = await db.push(
    'tableau',
    'idOwner, idWorkSpace, color, name, image, pos',
    [1, idWorkSpace, '#aaaaaa', 'Tableau A', 'icon‑A', 0], [1, idWorkSpace, '#bbbbbb', 'Tableau B', 'icon‑B', 1]
  );
  idTableauA = idA
  idTableauB = idA + 1;
});


describe('Card routes', () => {
  it('POST /workSpace/:idWorkSpace/tableau/:idTableau/card → crée une carte', async () => {
    const payload = {
      name       : 'Ma première carte',
      description: 'Une description',
      color      : '#123456',
      image      : 'icon‑card',
      endAt      : '2025-12-31 00:00:00'
    };

    const res = await request(app).post(`/workSpace/${idWorkSpace}/tableau/${idTableauA}/card`).set('Authorization', token).send(payload);
    expect(res.statusCode).to.equal(200);

    const row = await db.oneResult('SELECT id, pos FROM card WHERE name = ? AND idTableau = ?',payload.name, idTableauA);
    expect(row).to.not.equal(null);
    expect(row.pos).to.equal(0);
    idCard = row.id;
  });

  it('PUT /workSpace/:idWorkSpace/tableau/:idTableau/card/:idCard → met à jour la carte', async () => {

    const update = {name: 'Carte renommée',};
    const res = await request(app).put(`/workSpace/${idWorkSpace}/tableau/${idTableauA}/card/${idCard}`).set('Authorization', token).send(update);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const row = await db.oneResult(
      'SELECT name, description, color, image, state FROM card WHERE id = ?',
      idCard
    );
    expect(row).to.include({name: update.name});

  });

  it('GET /workSpace/:idWorkSpace/tableau/:idTableau/card/:idCard → retourne la carte', async () => {
    const res = await request(app)
      .get(`/workSpace/${idWorkSpace}/tableau/${idTableauA}/card/${idCard}`).set('Authorization', token).send();

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.include.all.keys(
      'image', 'state', 'color', 'name',
      'description', 'createdAt', 'endAt'
    );
    expect(res.body.name).to.equal('Carte renommée');
  });

  it('PATCH /workSpace/:idWorkSpace/move/card → déplace la carte (pos 0 → 1)', async () => {
    const { insertId: secondCard } = await db.push(
      'card',
      'idTableau, idOwner, name, description, color, image, state, endAt, pos',
      [
        idTableauA, 1,
        'Seconde carte', '--', '#aaaaaa', 'icon‑card‑3',
        0, '2025-12-31 00:00:00', 1
      ]
    );

    const patchPayload = {
      idCard,
      oldTableau: idTableauA,
      oldPos    : 0,
      newTableau: idTableauA,
      newPos    : 1
    };

    const res = await request(app).patch(`/workSpace/${idWorkSpace}/move/card`).set('Authorization', token).send(patchPayload);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const rows = await db.query('SELECT id, pos FROM card WHERE idTableau = ? ORDER BY pos', idTableauA);
    expect(rows.map(r => r.id)).to.deep.equal([secondCard, idCard]);
  });

  it('DELETE /workSpace/:idWorkSpace/tableau/:idTableau/card/:idCard → supprime la carte', async () => {
    const res = await request(app).delete(`/workSpace/${idWorkSpace}/tableau/${idTableauA}/card/${idCard}`).set('Authorization', token).send();

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    const exists = await db.exist('SELECT 1 FROM card WHERE id = ?',idCard);
    expect(exists).to.equal(false);
  });
});
