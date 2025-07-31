require('dotenv').config();
require('module-alias/register');
const useragent = require('express-useragent');
const express = require('express');
const cors = require('cors');
require('@lib/BroadCast');

const app = express();
app.use(express.json());
app.use(useragent.express());
const port = 8000;


const allowedOrigins = [
  'http://83.114.227.65:3000',
  process.env.FRONT_URL,
  'http://localhost:3000',
  process.env.NAME_HOST,
  process.env.NAME_HOST_SECURE
];

// Autorise les requêtes venant du front React
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));



app.use('/user', require('@routes/User'));
app.use('/userInfo', require('@routes/UserInfo'));
app.use('/workSpace', require('@routes/WorkSpace'));
app.use('/module', require('@routes/Module'));

// Lance le serveur uniquement si on n’est **pas** en mode test
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, async () => {
      console.log(`Serveur lancé sur http://localhost:${port}`);
  });
}

module.exports = app; 
