import type { RequestMethod } from '../server/handler-types';
import { RequestMethodHasBody } from '../server/handler-types';
import type {
  AddOptionalsToUndefined,
  EmptyRecordToNever,
  MakeObjectWithOptionalKeysUndefinable,
  ObjectToNever,
  RemoveNever,
} from '../server/type-helpers';

type RouteDefinitions = {
  [route: string]: {
    params: Record<string, string | string[]>;
    api: {
      typeSafe: boolean;
      method: RequestMethod;
      body: object;
      routeParams: object;
      queryParams: object;
      cookies: object;
      data: object;
    };
  };
};

// Create a function header that only applies if the route definition does not have any route params

type RequestConfig<RouteData extends RouteDefinitions[keyof RouteDefinitions]> =
  MakeObjectWithOptionalKeysUndefinable<
    AddOptionalsToUndefined<
      RemoveNever<{
        options?: RequestInit;
        baseUrl?: string;
        params: EmptyRecordToNever<RouteData['params']>;
        query: RouteData['api']['typeSafe'] extends true
          ? ObjectToNever<RouteData['api']['queryParams']>
          : Record<string, string | string[]> | undefined;
        body: RouteData['api']['typeSafe'] extends true
          ? ObjectToNever<RouteData['api']['body']>
          : object | string | number | boolean | undefined;
      }>
    >
  >;

export function makeApiRequestFunction<Routes extends RouteDefinitions>(
  method: Routes[string]['api']['method'],
) {
  return async function <Route extends keyof Routes>(
    route: Route,
    data: RequestConfig<Routes[Route]>,
  ): Promise<Routes[Route]['api']['data']> {
    const dataAny = data as any;

    try {
      const query = new URLSearchParams(dataAny.query as any);
      const queryStr =
        query.toString().length > 0 ? '?' + query.toString() : '';
      const response = await fetch(
        buildUrl(route as string, dataAny.params, dataAny.baseUrl) + queryStr,
        {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: RequestMethodHasBody[method]
            ? JSON.stringify(dataAny.body)
            : undefined,
          ...dataAny.options,
        },
      );

      if (!response.ok) {
        const errorType = errorTypeFromCode(response.status);
        const message = await response.text();
        let data = null;
        try {
          data = JSON.parse(message);
        } catch {
          data = null;
        }

        const error = new RequestError(errorType, message, data);
        throw error;
      }

      const responseData =
        (await response.json()) as Routes[Route]['api']['data'];
      return responseData as any;
    } catch (e) {
      const error =
        e instanceof RequestError
          ? e
          : new RequestError('network-error', (e as Error).message);
      throw error;
    }
  };
}

export type RequestErrorType =
  | 'unauthorized'
  | 'bad-request'
  | 'not-found'
  | 'server-error'
  | 'forbidden'
  | 'network-error'
  | 'unknown';

export class RequestError extends Error {
  public readonly type: RequestErrorType;
  public readonly data?: any | null | { status: 'error'; message: string };
  constructor(type: RequestErrorType, message: string, data?: any | null) {
    super(message);
    this.type = type;
    this.data = data;
  }
}

function errorTypeFromCode(code: number): RequestErrorType {
  if (code === 401) return 'unauthorized';
  if (code === 403) return 'forbidden';
  if (code === 404) return 'not-found';
  if (code >= 500) return 'server-error';
  if (code >= 400) return 'bad-request';
  return 'unknown';
}

function buildUrl(
  path: string,
  params: Record<string, string | string[]>,
  baseUrl?: string,
) {
  const parts = path.split('/');
  const url = parts
    .map((part) => {
      if (part.startsWith(':')) {
        const param = part.slice(1);
        const value = params[param];
        return value as string;
      } else if (part.startsWith('*')) {
        const param = part.slice(1);
        const value = params[param];
        return (value as string[]).join('/');
      } else return part;
    })
    .join('/');

  if (baseUrl) {
    const urlObj = new URL(url, baseUrl);
    return urlObj.toString();
  }
  return url;
}
