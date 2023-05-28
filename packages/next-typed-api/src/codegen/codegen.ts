import { IS_MUTATION } from '../server/handler-types';
import { RequestMethod } from '../server/typed-api';
import { BuildConfig } from './build';
import { ApiPath } from './parse-appdir';

export function codegen(
  paths: ApiPath[],
  baseFolderPath: string,
  { reactQuery, baseUrl }: BuildConfig,
) {
  if (baseUrl !== undefined) {
    if (baseUrl.endsWith('/')) {
      throw new Error('baseUrl must not end with a slash');
    }
    try {
      new URL(baseUrl);
    } catch {
      throw new Error(
        'baseUrl must be a valid URL and include a protocol and host. For example: https://example.com',
      );
    }
  }

  const imports: string[] = [];
  const params: string[] = [];
  const asserts: string[] = [];
  const routes: Record<RequestMethod, string[]> = {
    DELETE: [],
    GET: [],
    HEAD: [],
    OPTIONS: [],
    PATCH: [],
    POST: [],
    PUT: [],
  };
  let currentIndex = 0;

  for (const path of paths) {
    const importId = `Route${currentIndex++}`;
    const importPath =
      './' + path.filepath.slice(baseFolderPath.length + 1, -3);

    const methods = Object.entries(path.methods)
      .filter(([, hasMethod]) => hasMethod)
      .map(([method]) => method as RequestMethod);

    imports.push(
      `import type { ${methods
        .map((m) => `${m} as ${importId}${m}`)
        .join(', ')} } from "${importPath}";`,
    );

    const paramsTypeArgs = Object.entries(path.params)
      .map(([param, type]) => {
        return `${param}:${type === 'string' ? 'string' : 'string[]'};`;
      })
      .join('');

    if (paramsTypeArgs.length > 0)
      params.push(`type ${importId}Params = {${paramsTypeArgs}};`);
    else params.push(`type ${importId}Params = Record<string, never>;`);

    methods.forEach((m) => {
      asserts.push(`Assert<APIType<typeof ${importId}${m}>["method"], "${m}">`);
      asserts.push(
        `Assert<APIType<typeof ${importId}${m}>["routeParams"], ${importId}Params>`,
      );

      routes[m].push(
        `'${path.url}': { api: APIType<typeof ${importId}${m}>; params: ${importId}Params; };`,
      );
    });
  }

  const routeDict = Object.entries(routes)
    .filter(([, r]) => r.length)
    .map(([method, routes]) => {
      return `type Routes${method} = {
    ${routes.join('\n    ')}
};`;
    });

  const functions = Object.entries(routes)
    .filter(([, r]) => r.length)
    .map(([method]) => {
      return `export const api${upperFirst(
        method,
      )} = makeApiRequestFunction<Routes${method}, '${method}'>('${method}');`;
    });

  const reactQueryFunctions = reactQuery
    ? Object.entries(routes)
        .filter(([, r]) => r.length)
        .map(([method]) => {
          const mutation = `export const useApi${upperFirst(
            method,
          )}Mutation = makeUseApiMutation<Routes${method}, '${method}'>('${method}', useMutation, BASE_URL);`;
          if (IS_MUTATION[method as RequestMethod]) {
            return mutation;
          } else {
            const query = `export const useApi${upperFirst(
              method,
            )}Query = makeUseApiQuery<Routes${method}, '${method}'>('${method}', useQuery, BASE_URL);`;
            return [query, mutation];
          }
        })
        .flat()
    : [];

  return `/* eslint-disable */
  
// Do not edit this file, it is auto-generated. All changes will be lost.

import type { APIType } from "next-typed-api/client"
import { makeApiRequestFunction, makeUseApiMutation, makeUseApiQuery } from "next-typed-api/client"
${
  reactQuery
    ? `import { useMutation, useQuery } from '@tanstack/react-query';`
    : ''
}  

${imports.join('\n')}

const BASE_URL = ${baseUrl ? `'${baseUrl}'` : 'undefined'};

${params.join('\n')}

${routeDict.join('\n')}

${functions.join('\n')}

${reactQueryFunctions.join('\n')}

type _Asserts = [
    ${asserts.join(',\n    ')}
];

type Assert<T, U extends T> = T;
`;
}

function upperFirst(str: string) {
  if (str.length === 0) return str;
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
