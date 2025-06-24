require('dotenv').config();
require('module-alias/register');
const express = require('express');
const cors = require('cors');


const app = express();
app.use(express.json());
const port = 8000;


const allowedOrigins = [
  'http://83.114.227.65:3000',
  process.env.FRONT_URL
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
