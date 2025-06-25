require('dotenv').config();
require('module-alias/register');
const useragent = require('express-useragent');
const express = require('express');
const cors = require('cors');


const app = express();
app.use(express.json());
app.use(useragent.express());
const port = 8000;


const allowedOrigins = [
  'http://83.114.227.65:3000',
  process.env.FRONT_URL,
  'http://localhost:3000'
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

app.listen(port, async () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
