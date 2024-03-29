import type {
  RequestMethod,
  TRequestMethodHasBody,
} from '../server/handler-types';
import { RequestMethodHasBody } from '../server/handler-types';
import type {
  AddOptionalsToUndefined,
  EmptyRecordToNever,
  MakeObjectWithOptionalKeysUndefinable,
  ObjectToNever,
  RemoveNever,
} from '../server/type-helpers';

export type UrlOverrides = {
  overrideOrigin?: string;
  serverSideOrigin?: string;
};

export type RouteDefinitions = {
  [route: string]: {
    params: Record<string, string | string[]>;
    api: {
      typeSafe: boolean;
      method: RequestMethod;
      body: object | undefined;
      routeParams: object;
      queryParams: object;
      cookies: object;
      data: object;
    };
  };
};

export type RequestConfig<
  RouteData extends RouteDefinitions[keyof RouteDefinitions],
  Method extends RequestMethod,
> = MakeObjectWithOptionalKeysUndefinable<
  AddOptionalsToUndefined<
    RemoveNever<{
      params: EmptyRecordToNever<RouteData['params']>;
      query: RouteData['api']['typeSafe'] extends true
        ? ObjectToNever<RouteData['api']['queryParams']>
        : Record<string, string | string[]> | undefined;
      body: TRequestMethodHasBody[Method] extends true
        ? RouteData['api']['typeSafe'] extends true
          ? ObjectToNever<RouteData['api']['body']>
          : object | string | number | boolean | undefined
        : never;
    }>
  >
>;

export function makeApiRequestFunction<
  Routes extends RouteDefinitions,
  Method extends RequestMethod,
>(method: Method, { overrideOrigin, serverSideOrigin }: UrlOverrides = {}) {
  return async function <Route extends keyof Routes>(
    route: Route,
    data: RequestConfig<Routes[Route], Method>,
    options?: RequestInit & { overrideOrigin?: string },
  ): Promise<Routes[Route]['api']['data']> {
    const dataAny = (data ?? {}) as any;
    const { overrideOrigin: customOverrideOrigin, ...fetchOptions } =
      options || {};

    try {
      const query = new URLSearchParams(dataAny.query);
      const queryStr =
        query.toString().length > 0 ? '?' + query.toString() : '';
      const response = await fetch(
        buildUrl(
          route as string,
          dataAny.params,
          {},
          {
            overrideOrigin: customOverrideOrigin ?? overrideOrigin,
            serverSideOrigin,
          },
        ) + queryStr,
        {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body:
            RequestMethodHasBody[method] && dataAny.body
              ? JSON.stringify(dataAny.body)
              : undefined,
          ...fetchOptions,
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
    let parsedJson = { message: undefined };
    try {
      parsedJson = JSON.parse(message);
    } catch {
      // Empty
    }
    super(parsedJson.message ?? message);
    this.type = type;
    this.data = data;
  }

  public toString() {
    return `RequestError[${this.type}]: ${this.message}`;
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

export function buildUrl(
  path: string,
  params: Record<string, string | string[]>,
  queryParams: Record<string, string>,
  { overrideOrigin, serverSideOrigin }: UrlOverrides = {},
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

  const baseOrigin =
    typeof window === 'undefined' ? serverSideOrigin : window.location.origin;
  const actualOrigin = overrideOrigin ?? baseOrigin;

  const urlObj = new URL(url, actualOrigin);
  const searchParams = new URLSearchParams(queryParams);
  urlObj.search = searchParams.toString();
  return urlObj.toString();
}

export function makeBuildUrlFunction<Routes extends RouteDefinitions>(
  urlOverrides: UrlOverrides = {},
) {
  return function <Route extends keyof Routes>(
    route: Route,
    variables: Routes[Route]['params'],
    queryParams: Routes[Route]['api']['queryParams'],
  ) {
    return buildUrl(
      route as string,
      variables,
      queryParams as any,
      urlOverrides,
    );
  };
}
