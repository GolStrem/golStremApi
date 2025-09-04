const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');


router.post('/massif', auth('univers', 2), async (req, res) => {
    const { idUnivers } = req.params;
    
    const dataToInsert = [];
    Object.keys(req.body).forEach((key) => {
        req.body[key].forEach((image) => {    
            dataToInsert.push([idUnivers, key, image]);
        });
    });

    await db.push('galleryUnivers', 'idUnivers, folder, image', dataToInsert);

    const formattedResponse = dataToInsert.map((item) => ({
        id: item[0],
        folder: item[1],
        image: item[2]
    }));

    return res.json(formattedResponse);
});

router.post('', auth('univers', 2), checkFields('gallery'), async (req, res) => {
    const { idUnivers } = req.params;
    const { folder, image } = req.body;

    const afterInsert = await db.pushAndReturn(
        'galleryUnivers',
        'idUnivers, folder, image',
        [idUnivers, folder || null, image]
    );

    return res.json(afterInsert);
});

router.put('/:idImage', auth('univers', 2), async (req, res) => {
    const { idImage } = req.params;

    const keyExist = ['folder', 'image'];

    const afterUpdate = await db.update('galleryUnivers',keyExist,req.body,['id = ?',[idImage]])
    if (afterUpdate === false) return res.status(400).send('Malformation');
    
    return res.json({id: idImage, ...req.body})
})

router.delete('/folder/:folder', auth('univers', 3), async (req, res) => {
    const { idUnivers, folder } = req.params;

    await db.query('DELETE FROM galleryUnivers WHERE idUnivers = ? and folder = ?', idUnivers, folder);

    return res.send('success');
});

router.delete('/:idImage', auth('univers', 3), async (req, res) => {
    const { idImage } = req.params;

    await db.query('DELETE FROM galleryUnivers WHERE id = ?', idImage);

    return res.send('success');
});

router.post('/delete', auth('univers', 3), async (req, res) => {
    const { idUnivers } = req.params;
    const { listId } = req.body;

    await db.query('DELETE FROM galleryUnivers WHERE idUnivers = ? and id in (?)', idUnivers, listId);

    return res.send('success');
});

router.get('', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;


    const images = await db.query(
        'SELECT folder, count(1) as nbr FROM galleryUnivers WHERE idUnivers = ? group by folder',
        idUnivers
    );


    return res.json(images);
});

router.get('/:folder', auth('univers', 0, true), async (req, res) => {
    const { idUnivers, folder } = req.params;
    const images = await db.query(
        'SELECT image FROM galleryUnivers WHERE idUnivers = ? and folder = ?',
        idUnivers, folder
    );
    return res.json(images);
});

module.exports = router;