import { isNotFoundError } from 'next/dist/client/components/not-found';
import {
  getURLFromRedirectError,
  isRedirectError,
} from 'next/dist/client/components/redirect';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RedirectError } from './errors';
import {
  ContextBase,
  CookieDeleteArgs,
  CookieSetArgs,
  RequestHandler,
  RequestMethod,
  RequestMethodWithBody,
  RouteParamsBase,
} from './handler-types';
import { InferBodyType, ValidBodyTypes } from './type-helpers';
import { UseContext } from './use-context';

export abstract class UseFinishRequest<
  RouteParams extends RouteParamsBase,
  QueryParams extends z.SomeZodObject,
  Cookies extends z.SomeZodObject,
  Body extends ValidBodyTypes,
  InputContext extends ContextBase,
  OutputContext extends ContextBase,
> extends UseContext<
  RouteParams,
  QueryParams,
  Cookies,
  Body,
  InputContext,
  OutputContext
> {
  protected constructor() {
    super();
  }

  private finish<Method extends RequestMethod, D extends object>(
    method: Method,
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      InferBodyType<Body>,
      OutputContext,
      D
    >,
  ): (
    req: NextRequest,
    options: any,
    _typeInfo?: {
      method: Method;
      body: Method extends RequestMethodWithBody
        ? InferBodyType<Body>
        : undefined;
      params: RouteParams;
      query: z.infer<QueryParams>;
      cookies: z.infer<Cookies>;
      data: D;
    },
  ) => Promise<NextResponse> {
    const realHandler = async (
      req: NextRequest,
      { params: rawParams }: { params: RouteParams },
    ) => {
      const cookiesMap = new Map<
        string,
        | { type: 'set'; set: CookieSetArgs }
        | { type: 'delete'; delete: CookieDeleteArgs }
      >();
      function setCookie(...args: CookieSetArgs) {
        const key = typeof args[0] === 'string' ? args[0] : args[0].name;
        cookiesMap.set(key, { type: 'set', set: args });
      }
      function deleteCookie(...args: CookieDeleteArgs) {
        const key = typeof args[0] === 'string' ? args[0] : args[0].name;
        if (cookiesMap.has(key)) {
          cookiesMap.delete(key);
        }
        cookiesMap.set(key, { type: 'delete', delete: args });
      }
      let res;
      const headers = new Headers();
      try {
        let body: InferBodyType<Body>,
          query: z.TypeOf<QueryParams>,
          cookies: z.TypeOf<Cookies>,
          params: RouteParams,
          rawBody: string;
        try {
          const {
            body: b,
            query: q,
            cookies: c,
            params: p,
            rawBody: rb,
          } = await this.getBaseHandler().parseRequest(req, {
            params: rawParams,
          });
          body = b;
          query = q;
          cookies = c;
          params = p;
          rawBody = rb;
        } catch (error) {
          const handlerFunc = this.getBaseHandler().parseErrorHandlerFunction;
          if (handlerFunc) {
            const res = await handlerFunc({ req, params: rawParams, error });
            return res;
          }
          throw error;
        }

        const context = await this.getContextFunction()({
          params,
          query,
          cookies,
          body,
          context: {} as InputContext, // TODO look into how to fix this
          req,
          setCookie,
          deleteCookie,
          headers,
          rawBody,
        });

        if (context instanceof NextResponse) {
          res = context;
        } else {
          const promise = handler({
            params,
            query,
            cookies,
            body,
            context,
            req,
            setCookie,
            deleteCookie,
            headers,
            rawBody,
          });
          if (promise instanceof Promise) {
            res = await promise.catch((e) => errorToResponse(e, req));
          } else {
            res = promise;
          }
        }
      } catch (error) {
        res = errorToResponse(error, req);
      }

      const response =
        res instanceof NextResponse ? res : NextResponse.json(res);

      for (const [key, value] of headers.entries()) {
        response.headers.set(key, value);
      }

      for (const cookie of cookiesMap.values()) {
        if (cookie.type === 'set') {
          response.cookies.set(...cookie.set);
        } else {
          response.cookies.delete(...cookie.delete);
        }
      }

      return response;
    };

    return realHandler as never;
  }

  public get<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >,
  ) {
    return this.finish('GET', handler);
  }
  public post<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      InferBodyType<Body>,
      OutputContext,
      D
    >,
  ) {
    return this.finish('POST', handler);
  }
  public put<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      InferBodyType<Body>,
      OutputContext,
      D
    >,
  ) {
    return this.finish('PUT', handler);
  }
  public patch<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      InferBodyType<Body>,
      OutputContext,
      D
    >,
  ) {
    return this.finish('PATCH', handler);
  }
  public delete<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >,
  ) {
    return this.finish('DELETE', handler);
  }
  public head<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >,
  ) {
    return this.finish('HEAD', handler);
  }
  public options<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >,
  ) {
    return this.finish('OPTIONS', handler);
  }
}

function errorToResponse(error: unknown, req: NextRequest) {
  if (error instanceof RedirectError) {
    let url;
    try {
      const urlObj = new URL(error.url);
      url = urlObj.href;
    } catch (e) {
      const urlObj = new URL(error.url, req.nextUrl.origin);
      url = urlObj.href;
    }
    return NextResponse.redirect(url, error.statusCode);
  } else if (isRedirectError(error)) {
    const url = getURLFromRedirectError(error);
    return NextResponse.redirect(url, 307);
  } else if (isNotFoundError(error)) {
    return NextResponse.json(
      JSON.stringify({ status: 'error', message: 'Not found' }),
      {
        status: 404,
        statusText: 'Not found',
      },
    );
  } else {
    const errorMessage =
      (error as Error).message ?? (error as string) ?? 'Unknown error';
    return NextResponse.json(
      { status: 'error', message: errorMessage },
      {
        status: 500,
        statusText: 'Internal server error',
      },
    );
  }
}
