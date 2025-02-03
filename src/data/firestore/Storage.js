import * as UUID from 'uuid';
import { getFirestore, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { map } from '../../utilities.js';
/** @typedef {import("@liquescens/auth-js").Account} Account */
/** @typedef {import("@liquescens/auth-js").AccountIdentity} AccountIdentity */
/** @typedef {import("@liquescens/auth-js").Client} Client */
/** @typedef {import("@liquescens/auth-js").Session} Session */
/** @typedef {import("../index.js").ClientInfo} ClientInfo */
/** @typedef {import("../index.js").Profile} Profile */

export class Storage
{
    constructor()
    {
        this.db = getFirestore();
    }

    /**
     * @param {string} client_id
     * @param {string} identity_id
     * @returns {Promise<Session>}
     */
    async createSession(client_id, identity_id)
    {
        const client = await this.db.collection('clients').doc(client_id).get();
        if (!client.exists) throw new Error('TODO');
        const identity = await this.db.collection('identities').doc(identity_id).get();
        if (!identity.exists) throw new Error('TODO');
        const id = UUID.v4();
        const document = this.db.collection('sessions').doc(id);
        await document.create({ client: client.ref, identity: identity.ref });
        return { id, client_id, identity_id };
    }
    
    /**
     * @param {string} session_id
     */
    async removeSession(session_id)
    {
        await this.db.collection('sessions').doc(session_id).delete();
    }
    
    /**
     * @param {string} client_id
     * @returns {Promise<Session | undefined>}
     */
    async tryGetActiveSession(client_id)
    {
        const client = await this.db.collection('clients').doc(client_id).get();
        if (!client.exists) throw new Error('TODO');
        const data = client.data();
        if (!data?.active_session) return;
        const session = await data.active_session.get();
        return this._documentToSession(session);
    }
    
    /**
     * @param {string} client_id
     * @param {string} session_id
     */
    async setActiveSession(client_id, session_id)
    {
        const client = this.db.collection('clients').doc(client_id);
        const session = await this.db.collection('sessions').doc(session_id).get();
        if (!session.exists) throw new Error('TODO');
        client.update({ active_session: session.ref });
    }

    /**
     * @param {string} client_id 
     * @param {string} session_id 
     * @returns 
     */
    async tryGetSessionForClient(client_id, session_id)
    {
        const session = await this.db.collection('sessions').doc(session_id).get();
        const data = session.data();
        if (data?.client.id !== client_id) throw new Error('TODO');
        return this._documentToSession(session);
    }

    /**
     * @param {string} client_id
     * @returns {Promise<Client | undefined>}
     */
    async tryGetClient(client_id)
    {
        const document = await this.db.collection('clients').doc(client_id).get();
        if (!document.exists) return;
        return this._documentToClient(document);
    }

    /**
     * @param {string} client_id
     */
    async createClient(client_id)
    {
        const document = this.db.collection('clients').doc(client_id);
        const data = {};
        await document.create(data);
        return { ...data, id: client_id, active_session_id: undefined };
    }

    /**
     * @param {string} account_id
     * @returns {Promise<Account | undefined>}
     */
    async tryGetAccount(account_id)
    {
        return this._tryGetDocumentData('accounts', account_id);
    }

    /**
     * @param {string} client_id
     * @returns {Promise<Account | undefined>}
     */
    async tryGetAccountForClient(client_id)
    {
        const session = await this.tryGetActiveSession(client_id);
        if (!session) return;
        const identity = await this.tryGetAccountIdentityWithId(session.identity_id);
        if (!identity) return;
        return await this.tryGetAccount(identity.account_id);
    }

    /**
     * @param {string} provider_id
     * @param {string} external_id
     * @returns {Promise<AccountIdentity | undefined>}
     */
    async tryGetAccountIdentity(provider_id, external_id)
    {
        return this.tryGetAccountIdentityWithId(`${provider_id}_${external_id}`);
    }

    /**
     * @param {string} identity_id
     * @returns {Promise<AccountIdentity | undefined>}
     */
    async tryGetAccountIdentityWithId(identity_id)
    {
        const document = await this.db.collection('identities').doc(identity_id).get();
        if (!document.exists) return;
        return this._documentToAccountIdentity(document);
    }

    /**
     * @param {string} provider_id
     * @param {string} external_id
     * @param {string} display_name 
     * @param {string} mail 
     * @param {boolean} verified 
     * @returns {Promise<{ account: Account, identity: AccountIdentity }>}
     */
    async ensureAccount(provider_id, external_id, display_name, mail, verified)
    {
        let identity = await this.tryGetAccountIdentity(provider_id, external_id);
        if (identity)
        {
            const account = await this.tryGetAccount(identity.account_id);
            if (account) return { account, identity };
            throw new Error('TODO');
        }
        const account = await this._createAccount(display_name, mail, verified);
        identity = await this._createAccountIdentity(account.document, provider_id, external_id);
        return { account: account.item, identity };
    }

    /**
     * @param {string} display_name 
     * @param {string} mail 
     * @param {boolean} verified 
     * @returns {Promise<{ document: DocumentReference, item: Account }>}
     */
    async _createAccount(display_name, mail, verified)
    {
        const id = UUID.v4();
        const document = this.db.collection('accounts').doc(id);
        const data = { display_name, mail, verified };
        await document.create(data);
        const item = { id, display_name, mail, verified };
        return { document, item };
    }

    /**
     * @param {DocumentReference} account
     * @param {string} provider_id
     * @param {string} external_id
     * @returns {Promise<AccountIdentity>}
     */
    async _createAccountIdentity(account, provider_id, external_id)
    {
        const id = `${provider_id}_${external_id}`;
        const document = this.db.collection('identities').doc(id);
        const data = { account, provider_id, external_id };
        await document.create(data);
        return { id, account_id: account.id, provider_id, external_id };
    }

    /**
     * @param {string} client_id
     * @returns {Promise<Session[]>}
     */
    async getSessions(client_id)
    {
        const client = await this.db.collection('clients').doc(client_id).get();
        if (!client.exists) throw new Error('TODO');
        const entities = await this.db.collection('sessions').where('client', '==', client.ref).get();
        return entities.docs.map(doc => this._documentToSession(doc));;
    }

    /**
     * @param {string} client_id
     * @return {Promise<ClientInfo>}
     */
    async getClientInfo(client_id)
    {
        const client = await this.tryGetClient(client_id);
        if (!client) throw new Error('TODO');
        const session_entities = await this.getSessions(client_id);
        const sessions = Object.fromEntries(session_entities.map(session => [session.id, session]));
        const identities_ids = [...new Set(session_entities.map(session => session.identity_id))];
        const identities_entities = (await map(identities_ids, id => this.tryGetAccountIdentityWithId(id))).filter(identity => identity !== undefined);
        const identities = Object.fromEntries(identities_entities.map(identity => [identity.id, identity]));
        const accounts_ids = [...new Set(identities_entities.map(identity => identity.account_id))];
        const accounts_entities = (await map(accounts_ids, id => this.tryGetAccount(id))).filter(account => account !== undefined);
        const accounts = Object.fromEntries(accounts_entities.map(account => [account.id, account]));
        return { client, sessions, identities, accounts };
    }

    /**
     * @param {string} account_id 
     * @returns {Promise<Profile | undefined>}
     */
    async tryGetProfile(account_id)
    {
        const account = this.db.collection('accounts').doc(account_id);
        const profile = await this._tryGetProfileDocument(account);
        const data = profile ? profile.data() : undefined;
        // @ts-ignore
        return data;
    }

    /**
     * @param {string} account_id 
     * @param {Profile} profile_data
     */
    async updateProfile(account_id, profile_data)
    {
        const account = this.db.collection('accounts').doc(account_id);
        const profile = await this._tryGetProfileDocument(account);
        if (profile) await profile.ref.update({ ...profile_data, account });
        else 
        {
            const document = this.db.collection('profiles').doc();
            await document.create({ ...profile_data, account });
        }
    }

    /**
     * @param {DocumentReference} account 
     * @returns {Promise<DocumentSnapshot | undefined>}
     */
    async _tryGetProfileDocument(account)
    {
        const profiles = await this.db.collection('profiles').where('account', '==', account).get();
        if (profiles.size !== 1) return;
        return profiles.docs[0];
    }

    /**
     * @template T
     * @param {string} collection_path 
     * @param {string} document_id 
     * @returns 
     */
    async _tryGetDocumentData(collection_path, document_id)
    {
        const entity = await this.db.collection(collection_path).doc(document_id).get();
        /** @type {T} */
        // @ts-ignore 
        const data = entity.data();
        if (entity.exists) return { ...data, id: document_id };
    }

    /**
     * @param {DocumentSnapshot} document
     * @returns {Client}
     */
    _documentToClient(document)
    {
        const data = document.data();
        const id = document.id;
        const active_session_id = data?.active_session.id;
        return { id, active_session_id };
    }

    /**
     * @param {DocumentSnapshot} document
     * @returns {Session}
     */
    _documentToSession(document)
    {
        const data = document.data();
        const id = document.id;
        const client_id = data?.client.id;
        const identity_id = data?.identity.id;
        return { id, client_id, identity_id };
    }

    /**
     * @param {DocumentSnapshot} document
     * @returns {AccountIdentity}
     */
    _documentToAccountIdentity(document)
    {
        const data = document.data();
        const id = document.id;
        const account_id = data?.account.id;
        const provider_id = data?.provider_id;
        const external_id = data?.external_id;
        return { id, account_id, provider_id, external_id };
    }
}

