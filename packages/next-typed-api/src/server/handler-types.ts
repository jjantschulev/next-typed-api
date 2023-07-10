import type { ResponseCookies } from 'next/dist/server/web/spec-extension/cookies';
import type { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';

export type RouteParamsBase = Record<string, string | string[]> | object;
export type ContextBase = object;

export type NextJSRequestHandler<RouteParams extends RouteParamsBase> = (
  req: NextRequest,
  params: {
    params: RouteParams;
  },
) => Promise<NextResponse> | NextResponse;

export type CookieSetArgs = Parameters<typeof ResponseCookies.prototype.set>;
export type CookieDeleteArgs = Parameters<
  typeof ResponseCookies.prototype.delete
>;

// eslint-disable-next-line @typescript-eslint/ban-types
export type EmptyZodObject = z.ZodObject<{}, 'strip', z.ZodTypeAny, {}, {}>;

export type RequestHandler<
  RouteParams,
  QueryParams,
  RequestCookies,
  Body,
  Context,
  Res,
> = (options: {
  params: RouteParams;
  query: QueryParams;
  cookies: RequestCookies;
  body: Body;
  context: Context;
  req: NextRequest;
  headers: Headers;
  rawBody: string;
  setCookie: (...args: CookieSetArgs) => void;
  deleteCookie: (...args: CookieDeleteArgs) => void;
}) => Res | NextResponse | Promise<Res | NextResponse>;

export type RequestMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';
export const RequestMethodHasBody = {
  GET: false,
  POST: true,
  PUT: true,
  PATCH: true,
  DELETE: false,
  HEAD: false,
  OPTIONS: false,
} satisfies Record<RequestMethod, boolean>;
export type TRequestMethodHasBody = typeof RequestMethodHasBody;
export type RequestMethodWithBody = {
  [K in RequestMethod]: TRequestMethodHasBody[K] extends true ? K : never;
}[RequestMethod];

export const IS_MUTATION: Record<RequestMethod, boolean> = {
  GET: false,
  POST: true,
  PUT: true,
  PATCH: true,
  DELETE: true,
  HEAD: false,
  OPTIONS: false,
};
