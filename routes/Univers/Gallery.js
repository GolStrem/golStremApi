const express = require('express');
const router = express.Router({ mergeParams: true });

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');

// Route POST pour créer une nouvelle image dans la galerie
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

// Route PUT pour modifier une image de la galerie
router.put('/:idImage', auth('univers', 2), async (req, res) => {
    const { idImage } = req.params;

    const keyExist = ['folder', 'image'];

    const afterUpdate = await db.update('galleryUnivers',keyExist,req.body,['id = ?',[idImage]])
    if (afterUpdate === false) return res.status(400).send('Malformation');
    
    return res.json({id: idImage, ...req.body})
})

// Route DELETE pour supprimer une image de la galerie
router.delete('/:idImage', auth('univers', 3), async (req, res) => {
    const { idImage } = req.params;

    await db.query('DELETE FROM galleryUnivers WHERE id = ?', idImage);

    return res.send('success');
});

// Route GET / pour récupérer toutes les images d'un univers
router.get('', auth('univers', 0, true), async (req, res) => {
    const { idUnivers } = req.params;


    const images = await db.query(
        'SELECT folder, count(1) as nbr FROM galleryUnivers WHERE idUnivers = ? group by folder',
        idUnivers
    );


    return res.json(images);
});

// Route GET /folder pour récupérer les images par dossier (laissée vide comme demandé)
router.get('/:folder', auth('univers', 0, true), async (req, res) => {
    const { idUnivers, folder } = req.params;
    const images = await db.query(
        'SELECT image FROM galleryUnivers WHERE idUnivers = ? and folder = ?',
        idUnivers, folder
    );
    // Route laissée vide comme demandé
    return res.json(images);
});

module.exports = router;