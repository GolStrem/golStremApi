const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');


router.get('', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;
    const { searchInUnivers = null, nameBook = null, type = null } = req.query;
    let qry = 'SELECT b.id, b.externalLink, b.name, b.image, b.description, b.type FROM book b WHERE idUnivers = ?';
    let values = [];
    if(searchInUnivers !== null) {
        qry += ' AND public = 1';
        values.push(searchInUnivers);
    }else{
        values.push(idUnivers);
    }
    if(nameBook !== null) {
        qry += ' AND name LIKE ?';
        values.push(`%${nameBook}%`);
    }
    if(type !== null) {
        qry += ' AND type = ?';
        values.push(type);
    }

    const books = await db.query(qry, ...values);
    return res.json(books);
})

router.get('/listUnivers', auth('univers', 0, true), async (req, res) => {
    const { nameUnivers = null } = req.query;
    let qry = 'SELECT DISTINCT b.idUnivers, u.name, u.image FROM book b INNER JOIN univers u on b.idUnivers = u.id where public = 1';
    let values = [];
    if(nameUnivers !== null) {
        qry += ' AND u.name LIKE ?';
        values.push(`%${nameUnivers}%`);
    }
    const books = await db.query(qry, ...values);
    return res.json(books);
})

router.get('/:idBook', auth('univers', 0, true), async (req, res) => {
    const { idUnivers, idBook } = req.params;
    
    const book = await db.oneResult('SELECT * FROM book WHERE id = ? and (idUnivers = ? or public = 1)', idBook, idUnivers);
    if(!book) return res.status(404).send('book not found');

    if(book.externalLink !== null) {
        delete book.texte;
    }else{
        delete book.externalLink;
    }

    if(book.idLink !== null) {
        let link = await db.query('SELECT b.id, b.name, b.image, b.externalLink, b.description, b.type FROM bookLink bl left join book b on bl.idBook = b.id WHERE bl.idLink = ?', book.idLink);
        if(link && link.length > 0) {
            link = link.map(l => {
                l.location = l.externalLink === null ? `/encyclopedie/${l.id}` : l.externalLink;
                delete l.externalLink;
                return l;
            });
            book.link = link;
        }
    }



    return res.json(book);
});

router.post('', auth('univers', 2), checkFields('book'), async (req, res) => {
    const { idUnivers } = req.params;
    let { name, description, type = null,texte = null, idLink = null, link = [], externalLink = null, image = null, public = 0, connectArticle = null } = req.body;

    if (link.length > 0 && idLink !== null) {
        return res.status(400).send('link and idLink cannot be used together');
    }

    const afterInsert = await db.pushAndReturn(
        'book',
        'idUnivers, name, description, texte, idLink, externalLink, image, public, type',
        [idUnivers, name, description, texte, idLink, externalLink, image, public, type]
    );

    if(idLink === null) {
        idLink = afterInsert.id;
        await db.query('update book set idLink = ? where id = ?', idLink, afterInsert.id);
    }

    if (link.length > 0) {
        const listBook = await db.query('select id from book where id in (?) and (idUnivers = ? or public = 1)', link, idUnivers);
        if(listBook.length > 0) {
            await db.push('bookLink', 'idLink, idBook', listBook.map(l => [idLink, l.id]));
        }
    }

    if (connectArticle !== null) {
        const asPossible = await db.exist('SELECT 1 FROM book WHERE id = ? and idUnivers = ?', connectArticle, idUnivers);
        if(asPossible) {
            await db.push('bookLink', 'idLink, idBook', [connectArticle, idLink]);
        }
    }

    return res.json(afterInsert);
});

router.delete('/:idBook', auth('univers', 2), async (req, res) => {
    const { idUnivers, idBook } = req.params;
    await db.query('delete from book where id = ? and idUnivers = ?', idBook, idUnivers);
    return res.send('success');
});

router.put('/:idBook', auth('univers', 2), async (req, res) => {
    const { idUnivers, idBook } = req.params;
    const keyExist = ['name', 'description', 'texte', 'idLink', 'externalLink', 'image', 'public', 'type'];
    await db.update('book', keyExist, req.body, ['id = ? and idUnivers = ?', [idBook, idUnivers]])
    return res.send('success');
});

router.post('/link/:idLink', auth('univers', 2), async (req, res) => {
    const { idUnivers, idLink } = req.params;
    const { idBook } = req.body;
    await db.push('bookLink', 'idLink, idBook', [idLink, idBook], '', true)
    return res.send('success');
});

router.delete('/link/:idLink', auth('univers', 2), async (req, res) => {
    const { idUnivers, idLink } = req.params;
    const { idBook } = req.body;
    await db.query('delete from bookLink where idLink = ? and idBook = ?', idLink, idBook)
    return res.send('success');
});




module.exports = router;