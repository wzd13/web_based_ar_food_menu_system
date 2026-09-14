import { drawQr } from './qr.js';

const canvas = document.getElementById('qr-code');
const urlNode = document.getElementById('qr-url');
const warning = document.getElementById('qr-warning');
const homeConfig = document.getElementById('home-config');
if (!canvas || !urlNode) {
    // Home page only.
} else {
    const config = homeConfig ? JSON.parse(homeConfig.textContent) : {};
    const here = new URL('ar.php', document.baseURI).href;
    const local = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const url = (!local && window.isSecureContext) ? here : (config.phoneUrl || here);
    urlNode.textContent = url;
    if (!config.phoneUrl && local && warning) {
        warning.hidden = false;
    }
    try {
        drawQr(canvas, url);
    } catch (error) {
        canvas.replaceWith(Object.assign(document.createElement('p'), {
            className: 'note',
            textContent: 'The QR code could not be drawn. Open the address above on the phone instead.'
        }));
        console.error(error);
    }
}
