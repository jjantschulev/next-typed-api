import { ZodObject, ZodRawShape, z } from 'zod';
import {
  EmptyZodObject,
  NextJSRequestHandler,
  RequestMethod,
  RequestMethodHasBody,
  RouteParamsBase,
} from './handler-types';
import {
  Expand,
  ExtendZodObject,
  IgnoreRequestBody,
  InferBodyType,
  MergeValidBodyTypes,
  MergeZodObjects,
  ValidBodyTypeClasses,
  ValidBodyTypes,
} from './type-helpers';
import { UseFinishRequest } from './use-finish-request';

export class BaseRequestHandler<
  RouteParams extends RouteParamsBase = object,
  QueryParams extends z.SomeZodObject = EmptyZodObject,
  Cookies extends z.SomeZodObject = EmptyZodObject,
  Body extends ValidBodyTypes = IgnoreRequestBody,
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

  public query<O extends z.ZodRawShape>(schema: O | ZodObject<O>) {
    const merged = this.queryParamsSchema.extend(
      getSchemaFromZodObjectOrDef(schema),
    );
    return new BaseRequestHandler<
      RouteParams,
      ExtendZodObject<QueryParams, O>,
      Cookies,
      Body
    >(merged as never, this.cookieSchema, this.bodySchema);
  }
  public cookies<O extends z.ZodRawShape>(schema: O | ZodObject<O>) {
    const merged = this.cookieSchema.extend(
      getSchemaFromZodObjectOrDef(schema),
    );
    return new BaseRequestHandler<
      RouteParams,
      QueryParams,
      ExtendZodObject<Cookies, O>,
      Body
    >(this.queryParamsSchema, merged as never, this.bodySchema);
  }

  public body<O>(
    schema: O,
  ): O extends ValidBodyTypes
    ? BaseRequestHandler<
        RouteParams,
        QueryParams,
        Cookies,
        MergeValidBodyTypes<Body, O>
      >
    : O extends ZodRawShape
    ? BaseRequestHandler<
        RouteParams,
        QueryParams,
        Cookies,
        MergeValidBodyTypes<Body, ZodObject<O>>
      >
    : never {
    let schemaAny = schema as any;
    let isValidClass = false;
    for (const typeClass of ValidBodyTypeClasses) {
      if (schema instanceof typeClass) {
        isValidClass = true;
      }
    }
    if (!isValidClass && typeof schemaAny === 'object') {
      schemaAny = z.object(schemaAny);
    }
    const merged = mergeValidBodyTypes(this.bodySchema, schemaAny);

    return new BaseRequestHandler(
      this.queryParamsSchema,
      this.cookieSchema,
      merged,
    ) as never;
  }

  public extend<
    R extends RouteParamsBase,
    Q extends z.AnyZodObject,
    C extends z.AnyZodObject,
    B extends ValidBodyTypes,
  >(
    other: BaseRequestHandler<R, Q, C, B>,
  ): BaseRequestHandler<
    RouteParams & R,
    MergeZodObjects<QueryParams, Q>,
    MergeZodObjects<Cookies, C>,
    MergeValidBodyTypes<Body, B>
  > {
    const mergedQ = this.queryParamsSchema.merge(other.queryParamsSchema);
    const mergedB = mergeValidBodyTypes(this.bodySchema, other.bodySchema);
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
    body: InferBodyType<Body>;
    cookies: z.infer<Cookies>;
    params: RouteParams;
  }> {
    const query = this.queryParamsSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    const method = req.method as RequestMethod;
    const hasBody = RequestMethodHasBody[method];
    let body = undefined;
    if (hasBody && !(this.bodySchema instanceof IgnoreRequestBody)) {
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

function mergeValidBodyTypes<
  A extends ValidBodyTypes,
  B extends ValidBodyTypes,
>(a: A, b: B): MergeValidBodyTypes<A, B> {
  if (a instanceof IgnoreRequestBody) {
    return b as any;
  }
  if (b instanceof IgnoreRequestBody) {
    return a as any;
  }

  if (a instanceof ZodObject && b instanceof ZodObject) {
    return a.merge(b) as any;
  }
  return b as any;
}

function getSchemaFromZodObjectOrDef<T extends ZodRawShape>(
  schema: T | ZodObject<T>,
) {
  if (schema instanceof ZodObject) {
    return schema._def.shape();
  } else {
    return schema;
  }
}
