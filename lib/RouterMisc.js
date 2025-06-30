const session = new (require('@lib/Session'))();
const db = new (require('@lib/DataBase'))();
const fieldsMap = require('@fieldsMap/Move.json');

var extraData = {}

const authWrite = async(req, res, next) => { typeAuth = '1'; return auth(req, res, next) }
const authRead = async(req, res, next) => { typeAuth = '0'; return auth(req, res, next) }
const auth = async(req, res, next) => {
    if(!await session.checkToken(req.headers['authorization'], req.ip)) return res.status(401).send('token unknown');

    if(typeAuth !== undefined) {
        const {idWorkSpace} = req.params
        const workSpaceValidate = await db.exist('SELECT 1 FROM userWorkSpace WHERE idUser = ? and idWorkSpace = ? and state = ?', session.userId, idWorkSpace, typeAuth);
        if (!workSpaceValidate) return res.status(403).send("no authorization");
    }

    next();
}

const checkFields = (req, res, next) => {
  const fieldsMap = require(`@fieldsMap/${extraData['nameMap']}.json`);
  const missing = fieldsMap[req.route.path].find(field => req.body[field] === undefined);
  if (missing) {
    return res.status(400).send(`Malformation: missing '${missing}'`);
  }

  next();
};

const setExtra = (label, value) => {
    extraData[label] = value;
}

module.exports = { authWrite, checkFields, setExtra };