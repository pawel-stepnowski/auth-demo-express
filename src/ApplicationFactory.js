import * as Data from './data/index.js';
import * as FirebaseApp from 'firebase-admin/app';
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
        
        const authentication = new Authentication(this.configuration.authentication.providers);
        const storage = this.createStorage();
        return { authentication, storage };
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