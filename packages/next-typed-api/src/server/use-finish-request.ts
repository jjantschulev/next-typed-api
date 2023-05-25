import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RedirectError } from "./errors";
import {
  APIResponseWrapper,
  ContextBase,
  CookieDeleteArgs,
  CookieSetArgs,
  RequestHandler,
  RequestMethod,
  RequestMethodWithBody,
  RouteParamsBase,
} from "./handler-types";
import { UseContext } from "./use-context";

export abstract class UseFinishRequest<
  RouteParams extends RouteParamsBase,
  QueryParams extends z.SomeZodObject,
  Cookies extends z.SomeZodObject,
  Body extends z.SomeZodObject,
  InputContext extends ContextBase,
  OutputContext extends ContextBase
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
      Method extends RequestMethodWithBody ? z.TypeOf<Body> : undefined,
      OutputContext,
      D
    >
  ) {
    const realHandler = async (
      req: NextRequest,
      { params: rawParams }: { params: RouteParams }
    ) => {
      const { body, query, cookies, params } =
        this.getBaseHandler().parseRequest(req, { params: rawParams });

      const headers = new Headers();

      const cookiesMap = new Map<
        string,
        | { type: "set"; set: CookieSetArgs }
        | { type: "delete"; delete: CookieDeleteArgs }
      >();

      function setCookie(...args: CookieSetArgs) {
        const key = typeof args[0] === "string" ? args[0] : args[0].name;
        cookiesMap.set(key, { type: "set", set: args });
      }
      function deleteCookie(...args: CookieDeleteArgs) {
        const key = typeof args[0] === "string" ? args[0] : args[0].name;
        if (cookiesMap.has(key)) {
          cookiesMap.delete(key);
        }
        cookiesMap.set(key, { type: "delete", delete: args });
      }

      let res;

      try {
        const realBody = body as Method extends RequestMethodWithBody
          ? z.TypeOf<Body>
          : undefined;
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
        });

        if (context instanceof NextResponse) {
          res = context;
        } else {
          res = await handler({
            params,
            query,
            cookies,
            body: realBody,
            context,
            req,
            setCookie,
            deleteCookie,
            headers,
          });
        }
      } catch (error) {
        if (error instanceof RedirectError) {
          res = NextResponse.redirect(error.url, error.statusCode);
        }
        const errorMessage =
          (error as Error).message ?? (error as string) ?? "Unknown error";
        res = getJsonResponse({ status: "error", message: errorMessage });
      }

      const response =
        res instanceof NextResponse
          ? res
          : getJsonResponse({ status: "ok", data: res });

      for (const [key, value] of headers.entries()) {
        response.headers.set(key, value);
      }
      for (const cookie of cookies.values()) {
        if (cookie.type === "set") {
          response.cookies.set(...cookie.set);
        } else {
          response.cookies.delete(...cookie.delete);
        }
      }

      return response;
    };

    return realHandler as unknown as (
      req: NextRequest,
      options: any,
      _typeInfo?: {
        method: Method;
        body: z.infer<Body>;
        params: RouteParams;
        query: z.infer<QueryParams>;
        cookies: z.infer<Cookies>;
        data: D;
      }
    ) => Promise<NextResponse>;
  }

  public get<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >
  ) {
    return this.finish("GET", handler);
  }
  public post<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      z.TypeOf<Body>,
      OutputContext,
      D
    >
  ) {
    return this.finish("POST", handler);
  }
  public put<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      z.TypeOf<Body>,
      OutputContext,
      D
    >
  ) {
    return this.finish("PUT", handler);
  }
  public patch<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      z.TypeOf<Body>,
      OutputContext,
      D
    >
  ) {
    return this.finish("PATCH", handler);
  }
  public delete<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >
  ) {
    return this.finish("DELETE", handler);
  }
  public head<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >
  ) {
    return this.finish("HEAD", handler);
  }
  public options<D extends object>(
    handler: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      undefined,
      OutputContext,
      D
    >
  ) {
    return this.finish("OPTIONS", handler);
  }
}

function getJsonResponse<D extends object>(data: APIResponseWrapper<D>) {
  return NextResponse.json(data);
}