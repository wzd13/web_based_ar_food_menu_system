/**
 * HTTPS front for the phone camera.
 * PHP's built-in server has no TLS, and a phone blocks the camera on plain HTTP.
 * Forwards https://<computer>:8443 to the local PHP server on port 8000.
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cert = fs.readFileSync(path.join(root, 'certs', 'cert.pem'));
const key = fs.readFileSync(path.join(root, 'certs', 'key.pem'));

const server = https.createServer({ cert, key }, (req, res) => {
    const headers = { ...req.headers };
    headers['x-forwarded-proto'] = 'https';
    headers['x-forwarded-host'] = req.headers.host || '';
    delete headers.host;

    const upstream = http.request({
        hostname: '127.0.0.1',
        port: 8000,
        path: req.url,
        method: req.method,
        headers,
    }, (response) => {
        res.writeHead(response.statusCode || 502, response.headers);
        response.pipe(res);
    });
    upstream.on('error', () => {
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('The menu server is not running. Start it with start-phone.bat.');
    });
    req.pipe(upstream);
});

server.listen(8443, '0.0.0.0', () => {
    console.log('Phone HTTPS is ready on port 8443');
});
