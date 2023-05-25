import type {
  APIResponseWrapper,
  RequestMethod,
} from '../server/handler-types';
import { RequestMethodHasBody } from '../server/handler-types';
import type {
  EmptyRecordToNever,
  ObjectToNever,
  RemoveNever,
  WithErrors,
} from '../server/type-helpers';

type RouteDefinitions = {
  [route: string]: {
    params: Record<string, string | string[]>;
    api: {
      method: RequestMethod;
      body: object;
      routeParams: Record<string, string | string[]>;
      queryParams: object;
      cookies: object;
      data: object;
    };
  };
};

export function makeApiRequestFunction<Routes extends RouteDefinitions>(
  method: Routes[string]['api']['method'],
) {
  return async function <
    Route extends keyof Routes,
    ThrowErrors extends boolean = true,
  >(
    route: Route,
    data: RemoveNever<{
      throwErrors?: ThrowErrors;
      options?: RequestInit;
      baseUrl?: string;
      params: EmptyRecordToNever<Routes[Route]['params']>;
      query: ObjectToNever<Routes[Route]['api']['queryParams']>;
      body: ObjectToNever<Routes[Route]['api']['body']>;
    }>,
  ): Promise<
    WithErrors<Routes[Route]['api']['data'], RequestError, ThrowErrors>
  > {
    const dataAny = data as any;
    const shouldThrowErrors = dataAny.throwErrors ?? true;

    try {
      const query = new URLSearchParams(dataAny.query as any);
      const queryStr =
        query.toString().length > 0 ? '?' + query.toString() : '';
      const response = await fetch(
        buildUrl(route as string, dataAny.params, data.baseUrl) + queryStr,
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
        const error = new RequestError(errorType, message);
        throw error;
      }

      const responseData = (await response.json()) as APIResponseWrapper<
        Routes[Route]['api']['data']
      >;

      if (responseData.status === 'error') {
        const error = new RequestError('server-error', responseData.message);
        throw error;
      }

      return responseData.data as any;
    } catch (e) {
      const error =
        e instanceof RequestError
          ? e
          : new RequestError('network-error', (e as Error).message);
      if (shouldThrowErrors) throw error;
      return { status: 'error', error: error } as any;
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
  constructor(type: RequestErrorType, message: string) {
    super(message);
    this.type = type;
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
