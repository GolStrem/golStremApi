const stats = {
    monitoringActive: false,
    startTime: null,
    httpRequests: {},
    totalHttp: 0
};

function normalizeRoute(path) {
  return path.split('/').map(segment => {return (/^\d+$/.test(segment)) ? ':id' : segment}).join('/');
}

function countHttpMiddleware(req, res, next) {
    if (!stats.monitoringActive) return next();

    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        stats.totalHttp++;

        const fullRoute = req.baseUrl + req.path;

        const routeKey = normalizeRoute(fullRoute);

        if (!stats.httpRequests[routeKey]) {
            stats.httpRequests[routeKey] = { count: 0, avgTime: 0 };
        }

        let entry = stats.httpRequests[routeKey];
        entry.count++;
        entry.avgTime = ((entry.avgTime * (entry.count - 1)) + duration) / entry.count;
    });

    next();
}


module.exports = {
    stats,
    countHttpMiddleware
};
