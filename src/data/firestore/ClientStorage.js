/** @typedef {import("@liquescens/auth-js").Client} Client */

export class ClientStorage
{
    /**
     * @param {FirebaseFirestore.Firestore} db
     */
    constructor(db)
    {
        this.db = db;
    }

    /**
     * @param {string} id
     */
    async tryGetClient(id)
    {
        const doc = await this.db.collection('clients').doc(id).get();
        return doc.exists ? { ...doc.data(), id } : undefined;
    }

    /**
     * @param {string} id
     */
    createClient(id)
    {
        this.db.collection('clients').doc(id).set({ active_session_id: undefined })
        return { id, active_session_id: undefined };
    }

    /**
     * @param {string} id
     * @param {string} session_id
     */
    setActiveSession(id, session_id)
    {
        this.db.collection('clients').doc(id).update({ active_session_id: session_id });
    }
}