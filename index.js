require('dotenv').config();
require('module-alias/register');
const express = require('express');
const cors = require('cors');


const app = express();
app.use(express.json());
const port = 8000;

// Autorise les requêtes venant du front React
app.use(cors({
  origin: process.env.FRONT_URL,
  credentials: true // seulement si tu utilises des cookies ou Authorization headers
}));


app.use('/user', require('@routes/User'));
app.use('/userInfo', require('@routes/UserInfo'));

app.listen(port, async () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
