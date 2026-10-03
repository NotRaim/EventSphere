process.env.NETLIFY = 'true';

const serverless = require('serverless-http');

const {
    app,
    ensureDatabase,
    ensureAdmin
} = require('../../server.js');

let readyPromise = null;

async function prepare() {
    if (!readyPromise) {
        readyPromise = (async () => {
            await ensureDatabase();
            await ensureAdmin();
        })().catch(error => {
            readyPromise = null;
            throw error;
        });
    }

    return readyPromise;
}

const handler = serverless(app, {
    requestId: 'netlify'
});

exports.handler = async (event, context) => {
    try {
        await prepare();

        console.log('Netlify request:', {
            path: event.path,
            httpMethod: event.httpMethod,
            contentType:
                event.headers?.['content-type'] ||
                event.headers?.['Content-Type'],
            hasBody: !!event.body,
            isBase64Encoded: !!event.isBase64Encoded
        });

        return await handler(event, context);

    } catch (error) {
        console.error(
            'EventSphere Netlify Function Error:',
            error
        );

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Server initialization failed'
            })
        };
    }
};