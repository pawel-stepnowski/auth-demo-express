export * as Mockup from './mockup/index.js';
export * as Firestore from './firestore/index.js';
/** @typedef {import("@liquescens/auth-js").Account} Account */
/** @typedef {import("@liquescens/auth-js").AccountIdentity} AccountIdentity */
/** @typedef {import("@liquescens/auth-js").Client} Client */
/** @typedef {import("@liquescens/auth-js").Session} Session */

/**
 * @typedef ClientInfo
 * @property {Client} client
 * @property {Record<string, Session | undefined>} sessions
 * @property {Record<string, AccountIdentity | undefined>} identities
 * @property {Record<string, Account | undefined>} accounts
 */

/**
 * @typedef Profile
 * @property {string} display_name
 * @property {string} description
 */

/**
 * @typedef IStorage
 * @property {(client_id: string, identity_id: string) => Promise<Session>} createSession
 * @property {(session_id: string) => Promise<void>} removeSession
 * @property {(client_id: string, session_id: string) => Promise<void>} setActiveSession
 * @property {(client_id: string) => Promise<Session | undefined>} tryGetActiveSession
 * @property {(client_id: string) => Promise<Client | undefined>} tryGetClient
 * @property {(client_id: string) => Promise<Client>} createClient
 * @property {(client_id: string) => Promise<Account | undefined>} tryGetAccountForClient
 * @property {(client_id: string, session_id: string) => Promise<Session | undefined>} tryGetSessionForClient
 * @property {(client_id: string) => Promise<ClientInfo>} getClientInfo
 * @property {(provider_id: string, external_id: string, display_name: string, mail: string, verified: boolean) => Promise<{ account: Account, identity: AccountIdentity }>} ensureAccount
 * @property {(account_id: string) => Promise<Profile | undefined>} tryGetProfile
 * @property {(account_id: string, profile: Profile) => Promise<void>} updateProfile
 */