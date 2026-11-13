const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const port = Number(process.env.PORT) || 8080;
const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.env': 'text/plain; charset=utf-8'
};

function cacheControl(file, ext) {
    if (path.basename(file) === 'sw.js') return 'public, max-age=0, must-revalidate';
    if (ext === '.js' || ext === '.css') return 'public, max-age=0, must-revalidate';
    if (ext === '.html') return 'public, max-age=0, must-revalidate';
    return 'no-cache';
}

function send(req, res, file, data) {
    const ext = path.extname(file);
    const headers = {
        'Content-Type': mime[ext] || 'application/octet-stream',
        'Cache-Control': cacheControl(file, ext),
        'Vary': 'Accept-Encoding'
    };
    const accept = String(req.headers['accept-encoding'] || '');
    const canGzip = /\bgzip\b/.test(accept) && (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json');
    if (!canGzip) {
        res.writeHead(200, headers);
        res.end(data);
        return;
    }
    zlib.gzip(data, function (err, compressed) {
        if (err) {
            res.writeHead(200, headers);
            res.end(data);
            return;
        }
        headers['Content-Encoding'] = 'gzip';
        res.writeHead(200, headers);
        res.end(compressed);
    });
}

http.createServer(function (req, res) {
    let url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/') url = '/index.html';
    if (!path.extname(url)) url += '.html';
    const file = path.join(root, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
    fs.readFile(file, function (err, data) {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }
        send(req, res, file, data);
    });
}).listen(port, '127.0.0.1', function () {
    console.log('Prixburg at http://127.0.0.1:' + port + '/');
});
