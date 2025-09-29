const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');
const Stripe = new (require('@lib/Stripe'))();


router.post('/subscribe', checkFields('subscribe'), auth(), async (req, res) => {
    const { typeSubscription } = req.body;
    const productId = process.env[typeSubscription];

    const asSubscribe = await db.exist('SELECT 1 FROM subscribeStripe WHERE idUser = ? AND type = ?', session.getUserId(), typeSubscription);
    if (asSubscribe) return res.status(400).send('Already subscribed');

    if (!productId) return res.status(400).send('Invalid subscription type');

    const response = await Stripe.createSession(productId, {
        idUser: session.getUserId(),
        typeSubscription: typeSubscription,
    });

    return res.status(response.status).json(response.data);

})

module.exports = router;