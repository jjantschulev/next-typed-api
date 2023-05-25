import { RequestMethod, RequestMethodHasBody } from '../server/typed-api';
import { ApiPath } from './parse-appdir';

export function codegen(
  paths: ApiPath[],
  baseFolderPath: string,
  { reactQuery }: { reactQuery?: boolean } = {},
) {
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
      return `export async function api${method}<Route extends keyof Routes${method}, ThrowErrors extends boolean = true>(
    route: Route,
    data: RemoveNever<{
        throwErrors?: ThrowErrors,
        options?: RequestInit,
        baseUrl?: string,
        params: EmptyRecordToNever<Routes${method}[Route]["params"]>,
        query: ObjectToNever<Routes${method}[Route]["api"]["queryParams"]>,${
        RequestMethodHasBody[method as RequestMethod]
          ? `
        body: ObjectToNever<Routes${method}[Route]["api"]["body"]>,`
          : ''
      }
    }>,
): Promise<WithErrors<Routes${method}[Route]["api"]["data"], RequestError, ThrowErrors>> {
    const dataAny = data as any;
    const shouldThrowErrors = dataAny.throwErrors ?? true;

    try {
        
        const query = new URLSearchParams(dataAny.query as any);
        const queryStr = query.toString().length > 0
            ? "?" + query.toString()
            : "";
        const response = await fetch(buildUrl(route, dataAny.params) + queryStr, {
            method: "${method}",
            headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            },
            ${
              RequestMethodHasBody[method as RequestMethod]
                ? 'body: JSON.stringify(dataAny.body),'
                : ''
            }
            ...dataAny.options,
        });

        if (!response.ok) {
            const errorType = errorTypeFromCode(response.status);
            const message = await response.text();
            const error = new RequestError(errorType, message);
            throw error;
        }

        const responseData = await response.json() as APIResponseWrapper<Routes${method}[Route]["api"]["data"]>;

        if (responseData.status === "error") {
            const error = new RequestError("server-error", responseData.message);
            throw error;
        }

        return responseData.data as any;
    } catch (e) {
        const error = e instanceof RequestError ? e : new RequestError("network-error", (e as Error).message);
        if (shouldThrowErrors) throw error;
        return {status: "error", error: error} as any;
    }
}`;
    });

  return `/* eslint-disable */
  
import type { APIType, APIResponseWrapper } from "next-typed-api/lib"
  
${imports.join('\n')}

${params.join('\n')}

${routeDict.join('\n')}

${functions.join('\n')}

type _Asserts = [
    ${asserts.join(',\n    ')}
];

type Assert<T, U extends T> = T;
type WithErrors<T, E, ThrowErrors extends boolean | undefined> = ThrowErrors extends false ? {status: "error", error: E} | {"status": "ok", data: T} : T;
type RemoveNever<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends never ? never : K;
  }[keyof T]
>;
type ObjectToNever<T> = object extends T ? never : T;
type EmptyRecordToNever<T> = Record<string, never> extends T ? never : T;

export type RequestErrorType = "unauthorized" | "bad-request" | "not-found" | "server-error" | "forbidden" | "network-error" | "unknown";

export class RequestError extends Error {
    public readonly type: RequestErrorType;
    constructor(type: RequestErrorType, message: string) {
        super(message);
        this.type = type;
    }
}

function errorTypeFromCode(code: number): RequestErrorType {
    if (code === 401) return "unauthorized";
    if (code === 403) return "forbidden";
    if (code === 404) return "not-found";
    if (code >= 500) return "server-error";
    if (code >= 400) return "bad-request";
    return "unknown";
}

function buildUrl(path: string, params: Record<string, string | string[]>, baseUrl?: string) {
    const parts = path.split("/");
    const url = parts
      .map((part) => {
        if (part.startsWith(":")) {
          const param = part.slice(1);
          const value = params[param];
          return value as string;
        } else if (part.startsWith("*")) {
          const param = part.slice(1);
          const value = params[param];
          return (value as string[]).join("/");
        } else return part;
      })
      .join("/");
    const u = new URL(url, baseUrl);
    return u.href;
}
`;
}
