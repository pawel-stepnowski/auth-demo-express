import * as fs from 'fs';

/**
 * @template T
 */
export class StorageFile
{
    /**
     * @param {string} path 
     * @param {() => T} initializer 
     */
    constructor(path, initializer)
    {
        this.path = path;
        /** @type {T} */
        this.data = fs.existsSync(this.path) ? JSON.parse(fs.readFileSync(this.path).toLocaleString()) : initializer();
    }

    save()
    {
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }
}
