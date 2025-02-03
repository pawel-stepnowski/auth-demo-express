/**
 * @template T
 * @template U
 * @param {T[]} collection 
 * @param {(item: T) => Promise<U>} map 
 */
export async function map(collection, map)
{
    const result = [];
    for (const item of collection) result.push(await map(item));
    return result;
}
