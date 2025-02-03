import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { chdir } from 'process';
import jsdoc from 'json-schema-to-jsdoc';
import { TypeDeclarationBuilder } from './jsdoc.js';

// @ts-ignore
const path_script = import.meta.dirname;
const path_build = path.join(path_script, '../');
const path_root = path.join(path_build, '../');
const path_schemas = path.join(path_root, 'schemas');
const path_src = path.join(path_root, 'src');
const path_dist = path.join(path_root, 'dist');
const path_local_cdn = 'C:/inetpub/wwwroot/cdn/auth-js';

export function jsDoc()
{
    const builder = new TypeDeclarationBuilder();
    builder._addNamespace('http://liquescens/gcloud.schema.json#ServiceAccount', '', "import('firebase-admin').ServiceAccount");
    // builder.fromJsonSchema('ServiceAccount', JSON.parse(fs.readFileSync('./schemas/gcloud.schema.json', { encoding: 'utf-8' })));
    builder.fromJsonSchema('Configuration', JSON.parse(fs.readFileSync('./schemas/configuration.schema.json', { encoding: 'utf-8' })));
    const types = [...builder.namespaces.values()].flatMap(namespace => [...namespace.types.values()]);
    const types_path = './src/types.d.ts';
    if (fs.existsSync(types_path)) fs.rmSync(types_path);
    types.forEach(type => { fs.appendFileSync(types_path, type); fs.appendFileSync(types_path, '\r\n'); });
}

// export function build()
// {
//     fs.rmSync(path_dist, { recursive: true, force: true });
//     fs.cpSync(path_src, path_dist, { recursive: true });
//     fs.copyFileSync(path.join(path_root, 'package.template.json'), path.join(path_dist, 'package.json'));
// }

// export function pack()
// {
//     chdir(path_dist);
//     execSync('npm pack');
// }

// export function publishToLocalCdn()
// {
//     fs.rmSync(path_local_cdn, { recursive: true, force: true });
//     fs.cpSync(path_dist, path_local_cdn, { recursive: true });
// }
