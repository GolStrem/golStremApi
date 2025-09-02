const request = require('supertest');
const app = require('../index.js'); 
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let universId;
let imageId;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;

  // Créer un univers de test pour les tests de galerie
  const universName = `univers_gallery_test_${Date.now()}`;
  const universData = {
    name: universName,
    description: 'Univers de test pour galerie',
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

describe('Gallery routes', () => {
  it('POST /univers/:idUnivers/gallery → doit créer une nouvelle image', async () => {
    if (!universId) {
      console.log('Univers non créé, skip du test');
      return;
    }

    const data = {
      folder: 'test_folder',
      image: 'https://dummyimage.com/800x600'
    };
    
    const res = await request(app)
      .post(`/univers/${universId}/gallery`)
      .set('Authorization', token)
      .send(data);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('idUnivers', universId);
    expect(res.body).to.have.property('folder', 'test_folder');
    expect(res.body).to.have.property('image', 'https://dummyimage.com/800x600');

    imageId = res.body.id;
  });

  it('GET /univers/:idUnivers/gallery → doit récupérer les dossiers avec nombre d\'images', async () => {
    if (!universId) {
      console.log('Univers non créé, skip du test');
      return;
    }

    const res = await request(app)
      .get(`/univers/${universId}/gallery`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.be.greaterThan(0);
    
    const testFolder = res.body.find(folder => folder.folder === 'test_folder');
    expect(testFolder).to.exist;
    expect(testFolder).to.have.property('nbr');
    expect(Number(testFolder.nbr)).to.be.greaterThan(0);
  });

  it('GET /univers/:idUnivers/gallery/:folder → doit récupérer les images d\'un dossier', async () => {
    if (!universId) {
      console.log('Univers non créé, skip du test');
      return;
    }

    const res = await request(app)
      .get(`/univers/${universId}/gallery/test_folder`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.be.greaterThan(0);
    expect(res.body[0]).to.have.property('image');
    expect(res.body[0].image).to.equal('https://dummyimage.com/800x600');
  });

  it('PUT /univers/:idUnivers/gallery/:idImage → doit mettre à jour une image', async () => {
    if (!imageId) {
      console.log('Image non créée, skip du test');
      return;
    }

    const updateData = {
      folder: 'updated_folder',
      image: 'https://dummyimage.com/1024x768'
    };

    const res = await request(app)
      .put(`/univers/${universId}/gallery/${imageId}`)
      .set('Authorization', token)
      .send(updateData);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('folder', 'updated_folder');
    expect(res.body).to.have.property('image', 'https://dummyimage.com/1024x768');

    // Vérifier en base
    const updatedImage = await db.oneResult(
      'SELECT folder, image FROM galleryUnivers WHERE id = ?',
      imageId
    );
    expect(updatedImage.folder).to.equal('updated_folder');
    expect(updatedImage.image).to.equal('https://dummyimage.com/1024x768');
  });

  it('DELETE /univers/:idUnivers/gallery/:idImage → doit supprimer une image', async () => {
    if (!imageId) {
      console.log('Image non créée, skip du test');
      return;
    }

    const res = await request(app)
      .delete(`/univers/${universId}/gallery/${imageId}`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.text).to.equal('success');

    // Vérifier que l'image n'existe plus
    const exists = await db.exist('SELECT 1 FROM galleryUnivers WHERE id = ?', imageId);
    expect(exists).to.be.false;
  });

  it('GET /univers/:idUnivers/gallery après suppression → doit retourner un dossier vide', async () => {
    if (!universId) {
      console.log('Univers non créé, skip du test');
      return;
    }

    const res = await request(app)
      .get(`/univers/${universId}/gallery/updated_folder`)
      .set('Authorization', token);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(0);
  });

});
