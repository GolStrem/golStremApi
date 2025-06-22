const i18next = require('i18next');
const Backend = require('i18next-fs-backend');

let isReady = false;

i18next.use(Backend).init({
  lng: 'fr',
  fallbackLng: 'fr',
  backend: {
    loadPath: './translations/{{lng}}.json',
  },
}, (err) => {
  if (err) {
    console.error('Erreur i18next:', err);
    return;
  }
  isReady = true;
});

function trad(keys, vars = {}) {
  if (!isReady) {
    throw new Error('i18next n\'est pas prêt, appelle trad après l\'initialisation.');
  }

  if (typeof keys === 'string') {
    return i18next.t(keys, vars);
  }

  if (Array.isArray(keys)) {
    return keys.map(k => i18next.t(k, vars));
  }

  throw new TypeError('Le premier argument doit être une chaîne ou un tableau de chaînes.');
}

module.exports = { trad };