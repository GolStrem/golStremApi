const express = require('express');
const router = express.Router();

const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const { auth, checkFields } = require('@lib/RouterMisc');
const Stripe = new (require('@lib/Stripe'))();


router.post('/subscribe', checkFields('subscribe'), auth(), async (req, res) => {
    const { typeSubscription } = req.body;
    const productId = process.env[typeSubscription];
    if (!productId) return res.status(400).send('Invalid subscription type');

    const asSubscribe = await db.exist('SELECT 1 FROM subscribeStripe WHERE idUser = ? and deletedAt is null', session.getUserId());
    if (asSubscribe) return res.status(400).send('Already subscribed');



    const response = await Stripe.createSession(productId, {
        idUser: session.getUserId(),
        typeSubscription: typeSubscription,
    });

    return res.status(response.status).json(response.data);

})

router.get('/subscribe', auth(), async (req, res) => {
    try {
        const subscriptions = await db.query('SELECT * FROM subscribeStripe WHERE idUser = ? and availableAt > now()', session.getUserId());
        subscriptions.map(sub => {
            sub.extra = JSON.parse(sub.extra);
            return sub;
        });
        res.json(subscriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

router.delete('/subscribe/:id', auth(), async (req, res) => {
    const { id } = req.params;
    
    try {

        const subscription = await db.oneResult('SELECT * FROM subscribeStripe WHERE idUser = ? AND id = ?', session.getUserId(), id);
        if (!subscription) {
            return res.status(400).json({ error: 'Subscription not found' });
        }


        const extraData = JSON.parse(subscription.extra);
        if (extraData.idSubscription) {
            const response = await Stripe.cancelSubscription(extraData.idSubscription);
            if (response.status !== 200) {
                return res.status(500).json({ error: 'Failed to cancel subscription in Stripe' });
            }
        }
        
        res.json({ message: 'Subscription cancellation requested. The webhook will handle the final processing.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

module.exports = router;