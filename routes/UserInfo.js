require('dotenv').config();
const express = require('express');
const router = express.Router();
const { isSubset } = require('@lib/Util');


const session = new (require('@lib/Session'))();

const { auth } = require('@lib/RouterMisc');


router.get('', auth(), async (req, res) => {
    const userInfo = await session.getInfo();
    return res.send(userInfo ? userInfo : {});
});

router.put('', auth(), async (req, res) => {
    const keyExist = ['theme','lastWorkspace', 'color', 'banner', 'hideClock']
    const keys = Object.keys(req.body)

    if(!isSubset(keys,keyExist)) return res.status(400).send('Malformation');

    await session.updateInfo(keys, Object.values(req.body));
    return res.send("success");
});


module.exports = router;