const express = require('express');
const router = express.Router();
const os = require('os');
const Database = require('@lib/DataBase');
const broadCast = require('@lib/BroadCast');
const { auth } = require('@lib/RouterMisc');
const { stats } = require('@middleware/monitoring'); // 🔹 même objet que dans le middleware

const db = new Database();
const session = new (require('@lib/Session'))();



router.get('/start', auth(), (req, res) => {
    stats.monitoringActive = true;
    stats.startTime = new Date();
    stats.httpRequests = {};
    stats.totalHttp = 0;

    broadCast('monitoring', 'start');
    res.send('Monitoring started');
});

router.get('/end', auth(), (req, res) => {
    stats.monitoringActive = false;
    broadCast('monitoring', 'end');
    res.send('Monitoring stopped');
});

router.get('/read', auth(), (req, res) => {
    const dataSocket = broadCast('monitoring', 'read');

    res.json({
        running: stats.monitoringActive,
        uptime: stats.startTime
            ? ((Date.now() - new Date(stats.startTime)) / 1000).toFixed(1) + 's'
            : 'N/A',
        http: {
            total: stats.totalHttp,
            perRoute: stats.httpRequests
        },
        socket: dataSocket,
        system: {
            cpuLoad: os.loadavg(),
            memory: {
                total: (os.totalmem() / 1024 / 1024).toFixed(1) + ' MB',
                free: (os.freemem() / 1024 / 1024).toFixed(1) + ' MB',
                usedPercent: (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1) + '%'
            }
        }
    });
});

module.exports = router;
