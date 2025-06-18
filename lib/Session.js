require('dotenv').config();
const db = new (require('./DataBase'))();

class Session {
    userId = undefined;
    token = undefined;

    async checkToken (token, ip) {
        const sessionDb = await db.oneResult("select userId from session where token = ? and ip = ?", token, ip);
        if(!sessionDb) return false;

        this.userId = sessionDb.userId
        this.token = token
        return true;
    }

    async getInfo (){
        const userInfo = await db.oneResult("select theme,lastWorkspace from infoUser where userId = ?", this.userId);
        return userInfo
    }
}


module.exports = Session;