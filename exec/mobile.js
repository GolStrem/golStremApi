require('dotenv').config();
require('module-alias/register');


const listExec = {
    delete: '@exec/Delete'
}
const name = process.argv.slice(2)[0];
process.env.consoleLog = '1';

if (listExec[name]) {
    (async () => {
    const exec = require(listExec[name]);
    await exec();
    process.exit(0);
    })();
}
