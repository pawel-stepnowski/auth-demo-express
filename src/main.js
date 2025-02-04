import * as UUID from 'uuid';
import * as Configuration from './configuration.js';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as Auth from '@liquescens/auth-nodejs';
/** @typedef {import('@liquescens/auth-js').Client} Client */
import { ApplicationFactory } from './ApplicationFactory.js';

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
        // TODO: użytkownik nie powinien móc przejmować client_id
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

app.get('/profile', async (request, response) =>
{
    /** @type {Client} */
    // @ts-ignore
    const client = request.client;
    const account = await storage.tryGetAccountForClient(client.id);
    if (!account) response.status(404).send();
    else 
    {
        let profile = await storage.tryGetProfile(account.id);
        if (!profile) profile = { display_name: account.display_name, description: '' };
        response.send(profile);
    }
});

app.put('/profile', text_parser, async (request, response) =>
{
    /** @type {Client} */
    // @ts-ignore
    const client = request.client;
    const account = await storage.tryGetAccountForClient(client.id);
    if (!account) response.status(404);
    else 
    {
        // const profile = service.services.profiles.tryGetProfile(account);
        const profile = JSON.parse(request.body);
        await storage.updateProfile(account.id, profile);
    }
    response.send();
});

app.get('/client', async (request, response) =>
{
    /** @type {Client} */
    // @ts-ignore
    const client = request.client;
    const client_info = await storage.getClientInfo(client.id);
    response.send(client_info);
});

app.get('/auth', async (request, response) =>
{
    /** @type {Client} */
    // @ts-ignore
    const client = request.client;
    try
    {
        // TODO: jeśli istnieje sesja dokładnie na to konto, to należy ją zastąpić
        const { provider, authorization_code } = authentication.handleRedirect(request);
        const access_token = await provider.fetchAccessToken(authorization_code);
        const user_info = await provider.fetchUserInfo(access_token);
        const { identity } = await storage.ensureAccount(provider.configuration.id, user_info.id, user_info.display_name, user_info.mail, true);
        const session = await storage.createSession(client.id, identity.id);
        await storage.setActiveSession(client.id, session.id);
        response.redirect(provider.configuration.return_uri);
    }
    catch (exception)
    {
        const message = exception instanceof Auth.AuthenticationException ? exception.message : 'TODO';
        response.status(400).send(message);
    }
});

app.put('/session', text_parser, async (request, response) =>
{
    /** @type {Client} */
    // @ts-ignore
    const client = request.client;
    const session_id = request.body;
    if (typeof session_id !== 'string' || !session_id) throw new Error('TODO');
    const session = await storage.tryGetSessionForClient(client.id, session_id);
    if (!session) throw new Error('TODO');
    await storage.setActiveSession(client.id, session.id);
    response.send();
});

app.delete('/session', text_parser, async (request, response) =>
{
    /** @type {Client} */
    // @ts-ignore
    const client = request.client;
    const session_id = request.body;
    if (typeof session_id !== 'string' || !session_id) throw new Error('TODO');
    const session = await storage.tryGetSessionForClient(client.id, session_id);
    if (!session) throw new Error('TODO');
    await storage.removeSession(session.id);
    response.send();
});

const listening_port = process.env.PORT || 8080;
// dotnet dev-certs https --export-path ./certificate.crt --no-password --format PEM
// var key = fs.readFileSync('C:/inetpub/certificate.key');
// var cert = fs.readFileSync('C:/inetpub/certificate.crt');
// const server = https.createServer({ key, cert }, app);
// server.listen(listening_port, () => { console.log(`Server listening on port ${listening_port}...`); });
app.listen(listening_port, () => { console.log(`Server listening on port ${listening_port}...`); });