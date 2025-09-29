const express = require('express');
const router = express.Router();

const db = new (require('@lib/DataBase'))();
const Stripe = new (require('@lib/Stripe'))();


const bodyParser = require("body-parser");
router.post("", bodyParser.raw({ type: "application/json" }), async (req, res) => {

    const event = await Stripe.webhook(req.body, req.headers["stripe-signature"]);
    if (!event) return res.status(400).send(`Webhook stripe error`);
  
    switch (event.type) {
        case "checkout.session.completed":
            await handleCheckoutSessionCompleted(event.data.object);
            break;
        default:
            break;
    }
  
    res.json({ received: true });
  });

async function handleCheckoutSessionCompleted(session) {
    const dataStripe = {
        idSession: session.id,
        idCustomer: session.customer,
        idInvoice: session.invoice,
        idSubscription: session.subscription,
    };

    await db.push(
        "subscribeStripe",
        "idUser, type, extra",
        [session.metadata.idUser, session.metadata.typeSubscription, JSON.stringify(dataStripe)]
    );
}

module.exports = router;