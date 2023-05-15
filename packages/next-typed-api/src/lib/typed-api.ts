import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BaseRequestHandler } from "./base-request-handler";
import {
  NextJSRequestHandler,
  RequestMethod,
  RequestMethodHasBody,
} from "./handler-types";

export type APIType<T> = T extends (
  req: NextRequest,
  options: any,
  _typeInfo?: {
    method: infer M;
    body: infer B;
    params: infer RP;
    query: infer Q;
    cookies: infer C;
    data: infer D;
  }
) => Promise<NextResponse>
  ? {
      method: M;
      body: B;
      routeParams: RP;
      queryParams: Q;
      cookies: C;
      data: D;
    }
  : T extends NextJSRequestHandler<infer RP>
  ? {
      method: RequestMethod;
      body: object;
      routeParams: RP;
      queryParams: object;
      cookies: object;
      data: object;
    }
  : {
      method: RequestMethod;
      body: object;
      routeParams: Record<string, string | string[]>;
      queryParams: object;
      cookies: object;
      data: object;
    };

export { redirect } from "./errors";
export type { RequestMethod };
export { RequestMethodHasBody };

export function api() {
  return new BaseRequestHandler(z.object({}), z.object({}), z.object({}));
}
