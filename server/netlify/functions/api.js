process.env.NETLIFY = 'true';

const serverless = require('serverless-http');

const {
    app,
    ensureDatabase,
    ensureAdmin
} = require('../../server.js');

let readyPromise;

async function prepare() {
    if (!readyPromise) {
        readyPromise = Promise.resolve()
            .then(ensureDatabase)
            .then(ensureAdmin);
    }

    return readyPromise;
}

const handler = serverless(app, {
    requestId: 'netlify',

    // PDF files must be returned as binary data.
    binary: [
        'application/pdf'
    ]
});

exports.handler = async (event, context) => {
    await prepare();

    return handler(event, context);
};