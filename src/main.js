import * as UUID from 'uuid';
import * as Configuration from './configuration.js';
import * as Auth from '@liquescens/auth-nodejs';
import * as AuthClient from '@liquescens/auth-js';
import https from 'https';
import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApplicationFactory } from './ApplicationFactory.js';

/** @typedef {import('@liquescens/auth-js').Client} Client */

const config = await Configuration.load();
const { authentication, storage } = await new ApplicationFactory(config).create();
const app = express();
const text_parser = bodyParser.text();

app.use(cors({ origin: config.cors.origin, credentials: true }));
// @ts-ignore
app.use(cookieParser());
app.use(async (request, response, next) => 
{
    try
    {
        let client_id = request.cookies[config.authentication.id];
        if (typeof client_id !== 'string' || !client_id)
        {
            client_id = UUID.v4();
            response.cookie(config.authentication.id, client_id, { secure: true, httpOnly: false, sameSite: 'none' });
        }
        const client = await storage.tryGetClient(client_id) || await storage.createClient(client_id);
        // @ts-ignore
        request.client = client;
        next();
    }
    catch (exception)
    { 
        console.error(exception);
        response.status(500).send();
    }
});

/**
 * @param {import('express').Request} request
 * @returns {Client | undefined}
 */
function getClient(request)
{
    // @ts-ignore
    return request.client;
}

/**
 * @returns {AuthClient.AuthenticationConfiguration}
 */
function getConfiguration()
{
    const service_id = config.authentication.id;
    const base_uri = config.authentication.base_uri;
    const redirect_uri = config.authentication.redirect_uri;
    const providers = Object.values(config.authentication.providers).map(({ client_id, type }) => ({ type, parameters: { client_id } }));
    return { service_id, base_uri, redirect_uri, providers };
}

app.get('/configuration', async (request, response) =>
{
    try
    {
        const configuration = getConfiguration();
        response.send(configuration);
    }
    catch (exception)
    {
        console.error(exception);
        response.status(400).send();
    }
});

app.get('/profile', async (request, response) =>
{
    try
    {
        const client = getClient(request);
        if (!client) { response.status(404).send(); return; }
        const account = await storage.tryGetAccountForClient(client.id);
        if (!account) { response.status(404).send(); return; }
        let profile = await storage.tryGetProfile(account.id);
        if (!profile) profile = { display_name: account.display_name, description: '' };
        response.send(profile);
    }
    catch (exception)
    {
        console.error(exception);
        response.status(400).send();
    }
});

app.put('/profile', text_parser, async (request, response) =>
{
    try
    {
        const client = getClient(request);
        if (!client) { response.status(404).send(); return; }
        const account = await storage.tryGetAccountForClient(client.id);
        if (!account) { response.status(404).send(); return; }
        const profile = JSON.parse(request.body);
        await storage.updateProfile(account.id, profile);
        response.send();
    }
    catch (exception)
    {
        console.error(exception);
        response.status(400).send();
    }
});

app.get('/client', async (request, response) =>
{
    try
    {
        const client = getClient(request);
        if (!client) { response.status(404).send(); return; }
        const client_info = await storage.getClientInfo(client.id);
        response.send(client_info);
    }
    catch (exception)
    {
        console.error(exception);
        response.status(400).send();
    }
});

app.get('/auth', async (request, response) =>
{
    try
    {
        const client = getClient(request);
        if (!client) { response.status(404).send(); return; }
        // TODO: jeśli istnieje sesja dokładnie na to konto, to należy ją przedłużyć
        const { provider, provider_id, authorization_code } = authentication.handleRedirect(request);
        const access_token = await provider.fetchAccessToken(authorization_code, config.authentication.redirect_uri);
        const user_info = await provider.fetchUserInfo(access_token);
        const { identity } = await storage.ensureAccount(provider_id, user_info.id, user_info.display_name, user_info.mail, true);
        const session = await storage.createSession(client.id, identity.id);
        await storage.setActiveSession(client.id, session.id);
        response.redirect(config.authentication.return_uri);
    }
    catch (exception)
    {
        console.error('test');
        if (exception instanceof Error) console.error(exception.stack);
        console.error(exception);
        // const message = exception instanceof Auth.AuthenticationError ? exception.message : (exception ?? 'TODO');
        response.status(400).send(exception);
    }
});

app.put('/session', text_parser, async (request, response) =>
{
    try
    {
        const client = getClient(request);
        if (!client) { response.status(404).send(); return; }
        const session_id = request.body;
        if (typeof session_id !== 'string' || !session_id) throw new Error('TODO');
        const session = await storage.tryGetSessionForClient(client.id, session_id);
        if (!session) throw new Error('TODO');
        await storage.setActiveSession(client.id, session.id);
        response.send();
    }
    catch (exception)
    {
        console.error(exception);
        const message = exception instanceof Auth.AuthenticationError ? exception.message : 'TODO';
        response.status(400).send(message);
    }
});

app.delete('/session', text_parser, async (request, response) =>
{
    try
    {
        const client = getClient(request);
        if (!client) { response.status(404).send(); return; }
        const session_id = request.body;
        if (typeof session_id !== 'string' || !session_id) throw new Error('TODO');
        const session = await storage.tryGetSessionForClient(client.id, session_id);
        if (!session) throw new Error('TODO');
        await storage.removeSession(session.id);
        response.send();
    }
    catch (exception)
    {
        console.error(exception);
        const message = exception instanceof Auth.AuthenticationError ? exception.message : 'TODO';
        response.status(400).send(message);
    }
});

const listening_port = process.env.PORT || 8080;

if (process.env.node_env === 'local' )
{
    // dotnet dev-certs https --export-path ./certificate.crt --no-password --format PEM
    var key = fs.readFileSync('C:/inetpub/certificate.key');
    var cert = fs.readFileSync('C:/inetpub/certificate.crt');
    const server = https.createServer({ key, cert }, app);
    server.listen(listening_port, () => { console.log(`Server listening on port ${listening_port}...`); });
}
else
{
    app.listen(listening_port, () => { console.log(`Server listening on port ${listening_port}...`); });
}