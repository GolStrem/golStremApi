const session = new (require('@lib/Session'))();
async function newRequestMiddleware(req, res, next) {
    await session.checkToken(req.headers['authorization'], req.ip)
    next();
}

module.exports = {
    newRequestMiddleware
};