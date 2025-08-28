const cron = require('node-cron');
const cronDelete = require('@cron/Delete');


// Exécution à 2h du matin tous les jours
cron.schedule('0 2 * * *', cronDelete);