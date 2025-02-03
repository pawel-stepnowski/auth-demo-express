import * as UUID from 'uuid';
import { StorageFile } from './StorageFile.js';
import { map } from '../../utilities.js';
/** @typedef {import("@liquescens/auth-js").Account} Account */
/** @typedef {import("@liquescens/auth-js").Client} Client */
/** @typedef {import("@liquescens/auth-js").AccountIdentity} AccountIdentity */
/** @typedef {import("@liquescens/auth-js").Session} Session */
/** @typedef {import("../index.js").Profile} Profile */

export class Storage
{
    constructor()
    {
        /** @type {StorageFile<Record<string, Client>>} */
        this.clients = new StorageFile('../../clients.json', () => ({}));
        /** @type {StorageFile<{ accounts: Record<string, Account>, identities: Record<string, AccountIdentity> }>} */
        this.accounts = new StorageFile('../../accounts.json', () => ({ accounts: {}, identities: {} }));
        /** @type {StorageFile<Record<string, Session>>} */
        this.sessions = new StorageFile('../../sessions.json', () => ({}));
        /** @type {StorageFile<Record<string, Profile>>} */
        this.profiles = new StorageFile('../../profiles.json', () => ({}));
    }

    /**
     * @param {string} id
     */
    async tryGetClient(id)
    {
        return this.clients.data[id];
    }

    /**
     * @param {string} id
     */
    async createClient(id)
    {
        const entity = { id, active_session_id: undefined };
        this.clients.data[id] = entity;
        this.clients.save();
        return entity;
    }

    /**
     * @param {string} id
     * @param {string} session_id
     */
    async setActiveSession(id, session_id)
    {
        const client = await this.tryGetClient(id);
        if (!client) throw new Error('TODO');
        client.active_session_id = session_id;
        this.clients.save();
    }

    /**
     * @param {string} id
     * @return {Promise<Session | undefined>}
     */
    async tryGetSession(id)
    {
        return this.sessions.data[id];
    }

    /**
     * @param {string} client_id 
     * @returns {Promise<Session[]>}
     */
    async getSessions(client_id)
    {
        return Object.values(this.sessions.data).filter(session => session.client_id === client_id);
    }

    /**
     * @param {string} client_id
     * @param {string} identity_id
     * @returns {Promise<Session>}
     */
    async createSession(client_id, identity_id)
    {
        const id = UUID.v4();
        const entity = { id, client_id, identity_id };
        this.sessions.data[id] = entity;
        this.sessions.save();
        return entity;
    }

    /**
     * @param {string} id
     */
    async removeSession(id)
    {
        delete this.sessions.data[id];
        this.sessions.save();
    }

    /**
     * @param {string} client_id
     * @returns {Promise<Session>}
     */
    async getActiveSession(client_id)
    {
        const client = await this.tryGetClient(client_id);
        if (!client) throw new Error('TODO');
        if (!client.active_session_id) throw new Error('TODO');
        const session = await this.tryGetSession(client.active_session_id);
        if (!session) throw new Error('TODO');
        return session;
    }

    /**
     * @param {string} client_id
     * @returns {Promise<Session | undefined>}
     */
    async tryGetActiveSession(client_id)
    {
        try { return this.getActiveSession(client_id); } catch {}
    }

    /**
     * @param {string} client_id
     * @returns {Promise<Account | undefined>}
     */
    async tryGetAccountForClient(client_id)
    {
        const session = await this.getActiveSession(client_id);
        const identity = await this.tryGetAccountIdentityWithId(session.identity_id);
        if (!identity) throw new Error('TODO');
        const account = await this.tryGetAccount(identity.account_id);
        if (!account) throw new Error('TODO');
        return account;
    }

    /**
     * @param {string} id
     * @returns {Promise<AccountIdentity | undefined>}
     */
    async tryGetAccountIdentityWithId(id)
    {
        return this.accounts.data.identities[id];
    }

    /**
     * @param {string} provider_id
     * @param {string} external_id
     * @returns {Promise<AccountIdentity | undefined>}
     */
    async tryGetAccountIdentity(provider_id, external_id)
    {
        const id = `${provider_id}_${external_id}`;
        return this.accounts.data.identities[id];
    }

    /**
     * @param {string} id
     * @returns {Promise<Account | undefined>}
     */
    async tryGetAccount(id)
    {
        return this.accounts.data.accounts[id];
    }

    /**
     * @param {string} provider_id
     * @param {string} external_id
     * @returns {Promise<Account | undefined>}
     */
    async tryGetAccountForIdentity(provider_id, external_id)
    {
        const identity = await this.tryGetAccountIdentity(provider_id, external_id);
        if (identity) return this.accounts.data.accounts[identity.account_id];
    }

    /**
     * @param {string} display_name 
     * @param {string} mail 
     * @param {boolean} verified 
     * @returns {Promise<Account>}
     */
    async createAccount(display_name, mail, verified)
    {
        // TODO: sprawdzenie czy istnieje identity
        const id = UUID.v4();
        const entity = { id, display_name, mail, verified };
        this.accounts.data.accounts[id] = entity;
        this.accounts.save();
        return entity;
    }

    /**
     * @param {string} account_id
     * @param {string} provider_id
     * @param {string} external_id
     */
    async createAccountIdentity(account_id, provider_id, external_id)
    {
        const id = `${provider_id}_${external_id}`;
        const entity = { id, account_id, provider_id, external_id };
        this.accounts.data.identities[id] = entity;
        this.accounts.save();
        return entity;
    }

    /**
     * @param {string} client_id
     */
    async getClientInfo(client_id)
    {
        const client = await this.tryGetClient(client_id);
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
     * @param {string} client_id 
     * @param {string} session_id 
     * @return {Promise<Session | undefined>}
     */
    async tryGetSessionForClient(client_id, session_id)
    {
        const session = await this.tryGetSession(session_id);
        if (session?.client_id !== client_id) throw new Error('TODO');
        return session;
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
        const account = await this.createAccount(display_name, mail, verified);
        identity = await this.createAccountIdentity(account.id, provider_id, external_id);
        return { account, identity };
    }    

    /**
     * @param {string} account_id 
     * @returns {Promise<Profile | undefined>}
     */
    async tryGetProfile(account_id)
    {
        const account = await this.tryGetAccount(account_id);
        if (!account) return;
        const display_name = account.display_name;
        const data = this.profiles.data[account_id];
        return { ...data, display_name };
    }

    /**
     * @param {string} account_id 
     * @param {Profile} profile
     */
    async updateProfile(account_id, profile)
    {
        const account = await this.tryGetAccount(account_id);
        if (!account) throw new Error('TODO');
        account.display_name = profile.display_name;
        this.accounts.save();
        this.profiles.data[account_id] = profile;
        this.profiles.save();
    }
}
