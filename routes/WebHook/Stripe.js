const express = require('express');
const router = express.Router();

const db = new (require('@lib/DataBase'))();
const Stripe = new (require('@lib/Stripe'))();

const webhookLink = {
    "checkout.session.completed": handleCheckoutSessionCompleted,
    "customer.subscription.deleted": handleSubscriptionDeleted,
    "customer.subscription.updated": handleSubscriptionUpdated,
    "invoice.payment_succeeded": handleInvoicePaymentSucceeded,
    "invoice.payment_failed": handleInvoicePaymentFailed
}


const bodyParser = require("body-parser");
router.post("", bodyParser.raw({ type: "application/json" }), async (req, res) => {

    const event = await Stripe.webhook(req.body, req.headers["stripe-signature"]);
    if (!event) return res.status(400).send(`Webhook stripe error`);

    if(webhookLink[event.type]) {
        await webhookLink[event.type](event.data.object);
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

async function handleSubscriptionDeleted(subscription) {
    console.log(subscription);

    await db.query(
        "update subscribeStripe set deletedAt = now() WHERE JSON_EXTRACT(extra, '$.idSubscription') = ?",
        subscription.id
    );
}

async function handleSubscriptionUpdated(subscription) {

    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        await db.query(
            "update subscribeStripe set deletedAt = now() WHERE JSON_EXTRACT(extra, '$.idSubscription') = ?",
            subscription.id
        );
    }
}

async function handleInvoicePaymentSucceeded(invoice) {
    await db.query(
        "UPDATE subscribeStripe SET availableAt = DATE_ADD(NOW(), INTERVAL 1 MONTH) WHERE JSON_EXTRACT(extra, '$.idSubscription') = ?"
        , invoice.parent.subscription_details.subscription
    );
}

// @todo pas sûr de devoir faire un truc.
async function handleInvoicePaymentFailed(invoice) {
    //console.log(invoice);
}


module.exports = router;