import { z } from 'zod';
import {
  EmptyZodObject,
  NextJSRequestHandler,
  RequestMethod,
  RequestMethodHasBody,
  RouteParamsBase,
} from './handler-types';
import { Expand, ExtendZodObject, MergeZodObjects } from './type-helpers';
import { UseFinishRequest } from './use-finish-request';

export class BaseRequestHandler<
  RouteParams extends RouteParamsBase = object,
  QueryParams extends z.SomeZodObject = EmptyZodObject,
  Cookies extends z.SomeZodObject = EmptyZodObject,
  Body extends z.SomeZodObject = EmptyZodObject,
> extends UseFinishRequest<
  RouteParams,
  QueryParams,
  Cookies,
  Body,
  object,
  object
> {
  private queryParamsSchema: QueryParams;
  private bodySchema: Body;
  private cookieSchema: Cookies;

  getBaseHandler() {
    return this;
  }

  getContextFunction() {
    return () => {
      return {};
    };
  }

  constructor(
    queryParamsSchema: QueryParams,
    cookieSchema: Cookies,
    bodySchema: Body,
  ) {
    super();
    this.queryParamsSchema = queryParamsSchema;
    this.bodySchema = bodySchema;
    this.cookieSchema = cookieSchema;
  }

  public params<RP extends string>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ..._params: readonly RP[]
  ): BaseRequestHandler<
    Expand<{ [K in RP]: string } & RouteParams>,
    QueryParams,
    Cookies,
    Body
  > {
    return this as never;
  }

  public catchAllParams<RP extends string>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _segment: RP,
  ): BaseRequestHandler<
    Expand<{ [K in RP]: string[] } & RouteParams>,
    QueryParams,
    Cookies,
    Body
  > {
    return this as never;
  }

  public query<O extends z.ZodRawShape>(schema: O) {
    const merged = this.queryParamsSchema.extend(schema);
    return new BaseRequestHandler<
      RouteParams,
      ExtendZodObject<QueryParams, O>,
      Cookies,
      Body
    >(merged as never, this.cookieSchema, this.bodySchema);
  }
  public cookies<O extends z.ZodRawShape>(schema: O) {
    const merged = this.cookieSchema.extend(schema);
    return new BaseRequestHandler<
      RouteParams,
      QueryParams,
      ExtendZodObject<Cookies, O>,
      Body
    >(this.queryParamsSchema, merged as never, this.bodySchema);
  }

  public body<O extends z.ZodRawShape>(schema: O) {
    const merged = this.bodySchema.extend(schema);
    return new BaseRequestHandler<
      RouteParams,
      QueryParams,
      Cookies,
      ExtendZodObject<Body, O>
    >(this.queryParamsSchema, this.cookieSchema, merged as never);
  }

  public extend<
    R extends RouteParamsBase,
    Q extends z.AnyZodObject,
    C extends z.AnyZodObject,
    B extends z.AnyZodObject,
  >(
    other: BaseRequestHandler<R, Q, C, B>,
  ): BaseRequestHandler<
    RouteParams & R,
    MergeZodObjects<QueryParams, Q>,
    MergeZodObjects<Cookies, C>,
    MergeZodObjects<Body, B>
  > {
    const mergedQ = this.queryParamsSchema.merge(other.queryParamsSchema);
    const mergedB = this.bodySchema.merge(other.bodySchema);
    const mergedC = this.cookieSchema.merge(other.cookieSchema);

    return new BaseRequestHandler<
      RouteParams & R,
      typeof mergedQ,
      typeof mergedC,
      typeof mergedB
    >(mergedQ, mergedC, mergedB) as never;
  }

  public async parseRequest(
    ...[req, { params }]: Parameters<NextJSRequestHandler<RouteParams>>
  ): Promise<{
    query: z.infer<QueryParams>;
    body: z.infer<Body>;
    cookies: z.infer<Cookies>;
    params: RouteParams;
  }> {
    const query = this.queryParamsSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    const method = req.method as RequestMethod;
    const hasBody = RequestMethodHasBody[method];
    let body = {};
    if (hasBody) {
      const bodyData = await req.json().catch(() => ({}));
      body = this.bodySchema.parse(bodyData);
    }
    const cookiesObject: Record<string, string | string[]> = {};
    for (const [key, cookie] of req.cookies) {
      if (cookiesObject[key]) {
        const existing = cookiesObject[key];
        cookiesObject[key] = Array.isArray(existing)
          ? [...existing, cookie.value]
          : [existing, cookie.value];
      } else {
        cookiesObject[key] = cookie.value;
      }
    }
    const cookies = this.cookieSchema.parse(cookiesObject);
    return { query, body, cookies, params };
  }

  getRequirements() {
    return this;
  }
}
