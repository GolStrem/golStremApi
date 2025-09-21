const request = require('supertest');
const app = require('../index.js'); 
const db = new (require('@lib/DataBase'))();

let expect;
let token = '8a015085551a954d';
let universId;
let bookId;
let bookId2;
let linkId;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;

  // Créer un univers de test
  const universName = `univers_book_test_${Date.now()}`;
  const universData = {
    name: universName,
    description: 'Univers de test pour les livres',
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

describe('Book routes', () => {
  describe('GET routes', () => {
    it('GET /univers/:idUnivers/book → doit récupérer la liste des livres', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/book`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('GET /univers/:idUnivers/book?searchInUnivers=1 → doit récupérer les livres publics', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/book?searchInUnivers=1`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('GET /univers/:idUnivers/book?nameBook=test → doit filtrer par nom de livre', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/book?nameBook=test`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('GET /univers/:idUnivers/book/listUnivers → doit récupérer la liste des univers avec livres publics', async () => {
      const res = await request(app)
        .get(`/univers/${universId}/book/listUnivers`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('GET /univers/:idUnivers/book/listUnivers?nameUnivers=test → doit filtrer par nom d\'univers', async () => {
      const res = await request(app)
        .get(`/univers/${universId}/book/listUnivers?nameUnivers=test`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
    });
  });

  describe('POST routes', () => {
    it('POST /univers/:idUnivers/book → doit créer un livre', async () => {
      if (!universId) {
        return;
      }

      const data = {
        name: 'Test Book',
        description: 'Description du livre de test',
        texte: 'Contenu du livre de test',
        image: 'https://dummyimage.com/400x300',
        public: 0,
        type: 'article'
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/book`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('idUnivers', universId);
      expect(res.body).to.have.property('name', 'Test Book');
      expect(res.body).to.have.property('description', 'Description du livre de test');
      expect(res.body).to.have.property('texte', 'Contenu du livre de test');
      expect(res.body).to.have.property('image', 'https://dummyimage.com/400x300');
      expect(res.body).to.have.property('public', 0);
      expect(res.body).to.have.property('type', 'article');

      bookId = res.body.id;
    });

    it('POST /univers/:idUnivers/book → doit créer un livre avec lien externe', async () => {
      if (!universId) {
        return;
      }

      const data = {
        name: 'Test Book External',
        description: 'Livre avec lien externe',
        externalLink: 'https://example.com',
        image: 'https://dummyimage.com/400x300',
        public: 1,
        type: 'link'
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/book`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('name', 'Test Book External');
      expect(res.body).to.have.property('externalLink', 'https://example.com');
      expect(res.body).to.have.property('public', 1);

      bookId2 = res.body.id;
    });

    it('POST /univers/:idUnivers/book → doit créer un livre avec des liens', async () => {
      if (!universId || !bookId) {
        return;
      }

      const data = {
        name: 'Test Book with Links',
        description: 'Livre avec des liens vers d\'autres livres',
        texte: 'Contenu avec liens',
        image: 'https://dummyimage.com/400x300',
        public: 0,
        link: [bookId]
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/book`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('name', 'Test Book with Links');

      linkId = res.body.id;
    });

    it('POST /univers/:idUnivers/book → doit refuser si link et idLink sont utilisés ensemble', async () => {
      if (!universId) {
        return;
      }

      const data = {
        name: 'Test Book Error',
        image: 'https://dummyimage.com/400x300',
        description: 'Livre avec erreur',
        link: [1],
        idLink: 1
      };
      
      const res = await request(app)
        .post(`/univers/${universId}/book`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(400);
      expect(res.text).to.equal('link and idLink cannot be used together');
    });
  });

  describe('GET detail routes', () => {
    it('GET /univers/:idUnivers/book/:idBook → doit récupérer le détail d\'un livre', async () => {
      if (!universId || !bookId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/book/${bookId}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id', bookId);
      expect(res.body).to.have.property('name', 'Test Book');
      expect(res.body).to.have.property('description', 'Description du livre de test');
      expect(res.body).to.have.property('texte', 'Contenu du livre de test');
      expect(res.body).to.not.have.property('externalLink');
    });

    it('GET /univers/:idUnivers/book/:idBook → doit récupérer le détail d\'un livre avec lien externe', async () => {
      if (!universId || !bookId2) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/book/${bookId2}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id', bookId2);
      expect(res.body).to.have.property('name', 'Test Book External');
      expect(res.body).to.have.property('externalLink', 'https://example.com');
      expect(res.body).to.not.have.property('texte');
    });

    it('GET /univers/:idUnivers/book/:idBook → doit retourner 404 si le livre n\'existe pas', async () => {
      if (!universId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/book/99999`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(404);
      expect(res.text).to.equal('book not found');
    });

    it('GET /univers/:idUnivers/book/:idBook → doit récupérer un livre avec ses liens', async () => {
      if (!universId || !linkId) {
        return;
      }

      const res = await request(app)
        .get(`/univers/${universId}/book/${linkId}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property('id', linkId);
      expect(res.body).to.have.property('link');
      expect(res.body.link).to.be.an('array');
    });
  });

  describe('PUT routes', () => {
    it('PUT /univers/:idUnivers/book/:idBook → doit mettre à jour un livre', async () => {
      if (!universId || !bookId) {
        return;
      }

      const updateData = {
        name: 'Updated Book',
        description: 'Description mise à jour',
        texte: 'Contenu mis à jour',
        public: 1
      };

      const res = await request(app)
        .put(`/univers/${universId}/book/${bookId}`)
        .set('Authorization', token)
        .send(updateData);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier en base
      const updatedBook = await db.oneResult(
        'SELECT name, description, texte, public FROM book WHERE id = ?',
        bookId
      );
      expect(updatedBook.name).to.equal('Updated Book');
      expect(updatedBook.description).to.equal('Description mise à jour');
      expect(updatedBook.texte).to.equal('Contenu mis à jour');
      expect(updatedBook.public).to.equal(1);
    });
  });

  describe('Link management routes', () => {
    it('POST /univers/:idUnivers/book/link/:idLink → doit ajouter un lien entre livres', async () => {
      if (!universId || !linkId || !bookId2) {
        return;
      }

      const data = {
        idBook: bookId2
      };

      const res = await request(app)
        .post(`/univers/${universId}/book/link/${linkId}`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier que le lien existe en base
      const linkExists = await db.exist(
        'SELECT 1 FROM bookLink WHERE idLink = ? AND idBook = ?',
        linkId, bookId2
      );
      expect(linkExists).to.be.true;
    });

    it('DELETE /univers/:idUnivers/book/link/:idLink → doit supprimer un lien entre livres', async () => {
      if (!universId || !linkId || !bookId2) {
        return;
      }

      const data = {
        idBook: bookId2
      };

      const res = await request(app)
        .delete(`/univers/${universId}/book/link/${linkId}`)
        .set('Authorization', token)
        .send(data);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier que le lien n'existe plus en base
      const linkExists = await db.exist(
        'SELECT 1 FROM bookLink WHERE idLink = ? AND idBook = ?',
        linkId, bookId2
      );
      expect(linkExists).to.be.false;
    });
  });

  describe('DELETE routes', () => {
    it('DELETE /univers/:idUnivers/book/:idBook → doit supprimer un livre', async () => {
      if (!universId || !bookId2) {
        return;
      }

      const res = await request(app)
        .delete(`/univers/${universId}/book/${bookId2}`)
        .set('Authorization', token);

      expect(res.statusCode).to.equal(200);
      expect(res.text).to.equal('success');

      // Vérifier que le livre n'existe plus
      const exists = await db.exist('SELECT 1 FROM book WHERE id = ?', bookId2);
      expect(exists).to.be.false;
    });
  });

  after(async () => {
    // Nettoyage des données de test
    if (linkId) {
      await db.query('DELETE FROM bookLink WHERE idLink = ? OR idBook = ?', linkId, linkId);
      await db.query('DELETE FROM book WHERE id = ?', linkId);
    }
    if (bookId) {
      await db.query('DELETE FROM bookLink WHERE idLink = ? OR idBook = ?', bookId, bookId);
      await db.query('DELETE FROM book WHERE id = ?', bookId);
    }
    if (bookId2) {
      await db.query('DELETE FROM bookLink WHERE idLink = ? OR idBook = ?', bookId2, bookId2);
      await db.query('DELETE FROM book WHERE id = ?', bookId2);
    }
    if (universId) {
      await db.query('DELETE FROM univers WHERE id = ?', universId);
    }
  });
});
