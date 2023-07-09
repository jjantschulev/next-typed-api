import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseRequestHandler } from './base-request-handler';
import {
  NextJSRequestHandler,
  RequestMethod,
  RequestMethodHasBody,
} from './handler-types';
import { IgnoreRequestBody } from './type-helpers';

type UntypedAPIType<RouteParams = Record<string, string | string[]>> = {
  typeSafe: false;
  method: RequestMethod;
  body: object;
  routeParams: RouteParams;
  queryParams: object;
  cookies: object;
  data: object;
};

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
  },
) => Promise<NextResponse>
  ? unknown extends M
    ? UntypedAPIType
    : {
        typeSafe: true;
        method: M;
        body: B;
        routeParams: RP;
        queryParams: Q;
        cookies: C;
        data: D;
      }
  : T extends NextJSRequestHandler<infer RP>
  ? UntypedAPIType<RP>
  : UntypedAPIType;

export { redirect } from './errors';
export { RequestMethodHasBody };
export type { RequestMethod };

export function api() {
  return new BaseRequestHandler(
    z.object({}),
    z.object({}),
    new IgnoreRequestBody(),
  );
}
