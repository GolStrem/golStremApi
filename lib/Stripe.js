const RealStripe = require('stripe');


class Stripe {
    realStripe = undefined;
    constructor() {
        this.realStripe = new RealStripe(process.env.STRIPE_SECRET);
    }

    async createSession(productId, metadata) {
        try {
            const stripeSession = await this.realStripe.checkout.sessions.create({
              mode: "subscription",
              payment_method_types: ["card"],
              line_items: [
                {
                  price: productId, // ID du prix défini dans Stripe Dashboard
                  quantity: 1,
                },
              ],
              success_url: process.env.FRONT_URL + "?sucess=true",
              cancel_url: process.env.FRONT_URL + "?sucess=false",
              metadata: metadata,
            });
    
            return { status: 200, data: { url: stripeSession.url } };
          } catch (err) {
            return { status: 500, data: { error: err.message } };
          }
    }

    async webhook(body, sig) {
        let event;
        try {
          event = this.realStripe.webhooks.constructEvent(body, sig, process.env.STRIPE_CHECKOUTSESSION);
        } catch (err) {
          return false;
        }
        return event
    }

    async cancelSubscription(subscriptionId) {
        try {
            await this.realStripe.subscriptions.cancel(subscriptionId);
            return { status: 200, data: { message: 'Subscription cancelled' } };
        } catch (err) {
            return { status: 500, data: { error: err.message } };
        }
    }
}

module.exports = Stripe;