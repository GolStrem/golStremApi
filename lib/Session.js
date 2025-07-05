require('dotenv').config();
const db = new (require('./DataBase'))();

var userId = undefined;


class Session {
    token = undefined;

    getUserId() {
        return userId
    }

    async checkToken (token, ip) {
        const sessionDb = await db.oneResult("select userId from session where token = ? and ip = ?", token, ip);
        if(!sessionDb) return false;

        userId = sessionDb.userId

        this.token = token
        return true;
    }

    async getInfo (){
        if (userId === undefined) return false;

        const userInfo = await db.oneResult("select * from userInfo where userId = ?", userId);
        return userInfo
    }

    async updateInfo(keys, values){
        if (userId === undefined) return false;

        const partQry = Array(keys.length).fill('?').join(',')
        const qry = `insert into userInfo(userId, ${keys.join(',')}) values (?, ${partQry}) ON DUPLICATE KEY UPDATE ${keys.join(' = ?, ')} = ?`
    
        await db.query(qry, userId, ...values, ...values)
    }
}


module.exports = Session;
