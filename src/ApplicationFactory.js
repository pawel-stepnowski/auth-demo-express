import * as Data from './data/index.js';
import * as FirebaseApp from 'firebase-admin/app';
import * as Auth from '@liquescens/auth-nodejs';
import { Authentication } from './Authentication.js';

export class ApplicationFactory
{
    /**
     * @param {Configuration} configuration 
     */
    constructor(configuration)
    {
        this.configuration = configuration;
    }

    async create()
    {
        process.on('uncaughtException', error =>
        {
            console.error(error);
        });
        const providers = this.createProviders();
        const authentication = new Authentication(providers);
        const storage = this.createStorage();
        return { authentication, storage };
    }

    createProviders()
    {
        /** @type {Record<string, import('@liquescens/auth-nodejs').OAuth2.Provider>} */
        const providers = {};
        for (const [id, properties] of Object.entries(this.configuration.authentication.providers))
        {
            const { client_id, client_secret, token_uri, user_info, type } = properties;
            const access_token = { client_id, client_secret, token_uri };
            const configuration = { access_token, user_info };
            switch (type)
            {
                case 'google': providers[id] = new Auth.OAuth2.Google(configuration); break;
                case 'microsoft': providers[id] = new Auth.OAuth2.Microsoft(configuration); break;
                case 'github': providers[id] = new Auth.OAuth2.GitHub(configuration); break;
            }
        }
        return providers;
    }

    /**
     * @returns {import('./data/index.js').IStorage}
     */
    createStorage()
    {
        if (this.configuration.application.storage.type === 'firestore')
        {
            FirebaseApp.initializeApp({ credential: FirebaseApp.cert(this.configuration.application.storage.service_account) });
        }
    
        switch (this.configuration.application.storage.type)
        {
            case 'mockup': return new Data.Mockup.Storage();
            case 'firestore': return new Data.Firestore.Storage();
            default: throw new Error();
        }
    }
}