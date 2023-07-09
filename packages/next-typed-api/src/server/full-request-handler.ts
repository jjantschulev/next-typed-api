import { z } from 'zod';
import { BaseRequestHandler } from './base-request-handler';
import {
  EmptyZodObject,
  RequestHandler,
  RouteParamsBase,
} from './handler-types';
import {
  IgnoreRequestBody,
  InferBodyType,
  ValidBodyTypes,
} from './type-helpers';
import { UseFinishRequest } from './use-finish-request';

export class FullRequestHandler<
  RouteParams extends RouteParamsBase = object,
  QueryParams extends z.SomeZodObject = EmptyZodObject,
  Cookies extends z.SomeZodObject = EmptyZodObject,
  Body extends ValidBodyTypes = IgnoreRequestBody,
  InputContext extends object = object,
  OutputContext extends object = object,
> extends UseFinishRequest<
  RouteParams,
  QueryParams,
  Cookies,
  Body,
  InputContext,
  OutputContext
> {
  private baseHandler: BaseRequestHandler<
    RouteParams,
    QueryParams,
    Cookies,
    Body
  >;
  private contextFunction: RequestHandler<
    RouteParams,
    z.TypeOf<QueryParams>,
    z.TypeOf<Cookies>,
    InferBodyType<Body>,
    InputContext,
    OutputContext
  >;

  getBaseHandler() {
    return this.baseHandler;
  }

  getContextFunction() {
    return this.contextFunction;
  }

  constructor(
    baseHandler: BaseRequestHandler<RouteParams, QueryParams, Cookies, Body>,
    contextFunction: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      InferBodyType<Body>,
      InputContext,
      OutputContext
    >,
  ) {
    super();
    this.baseHandler = baseHandler;
    this.contextFunction = contextFunction;
  }
}
