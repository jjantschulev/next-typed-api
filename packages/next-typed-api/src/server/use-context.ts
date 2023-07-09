import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BaseRequestHandler } from './base-request-handler';
import type { FullRequestHandler } from './full-request-handler';
import { ContextBase, RequestHandler, RouteParamsBase } from './handler-types';
import {
  BodyTypesDontConflict,
  Expand,
  InferBodyType,
  MergeTypes,
  MergeValidBodyTypes,
  MergeZodObjects,
  TripleMerge,
  ValidBodyTypes,
  ZodObjectsDontConflict,
} from './type-helpers';

export abstract class UseContext<
  RouteParams extends RouteParamsBase,
  QueryParams extends z.SomeZodObject,
  Cookies extends z.SomeZodObject,
  Body extends ValidBodyTypes,
  InputContext extends ContextBase,
  OutputContext extends ContextBase,
> {
  protected constructor() {
    /* */
  }

  protected abstract getBaseHandler(): BaseRequestHandler<
    RouteParams,
    QueryParams,
    Cookies,
    Body
  >;

  protected abstract getContextFunction(): RequestHandler<
    RouteParams,
    z.TypeOf<QueryParams>,
    z.TypeOf<Cookies>,
    InferBodyType<Body>,
    InputContext,
    OutputContext
  >;

  private useFn<Out extends ContextBase>(
    fn: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      InferBodyType<Body>,
      MergeTypes<InputContext, OutputContext>,
      Out | undefined | void
    >,
  ): FullRequestHandler<
    RouteParams,
    QueryParams,
    Cookies,
    Body,
    InputContext,
    TripleMerge<InputContext, OutputContext, Out>
  > {
    const newBase = this.getBaseHandler();
    const myContextFunction = this.getContextFunction();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FullRequestHandler: FRH } = require('./full-request-handler');
    return new FRH(newBase, async (data: any) => {
      const first = await myContextFunction(data);
      if (first instanceof NextResponse) return first;
      const newContext = { ...data.context, ...first } as MergeTypes<
        InputContext,
        OutputContext
      >;
      const second = await fn({ ...data, context: newContext });
      if (second instanceof NextResponse) return second;
      const finalContext = { ...newContext, ...second } as TripleMerge<
        InputContext,
        OutputContext,
        Out
      >;
      return finalContext;
    });
  }

  private useFullApi<
    RouteParams2 extends object,
    QueryParams2 extends z.AnyZodObject,
    Cookies2 extends z.AnyZodObject,
    Body2 extends ValidBodyTypes,
    OutputContext2 extends ContextBase,
  >(
    api: UseContext<
      RouteParams2,
      ZodObjectsDontConflict<QueryParams2, QueryParams>,
      ZodObjectsDontConflict<Cookies2, Cookies>,
      BodyTypesDontConflict<Body2, Body>,
      MergeTypes<InputContext, OutputContext>,
      OutputContext2
    >,
  ): FullRequestHandler<
    Expand<RouteParams & RouteParams2>,
    MergeZodObjects<QueryParams, QueryParams2>,
    MergeZodObjects<Cookies, Cookies2>,
    MergeValidBodyTypes<Body, Body2>,
    InputContext,
    TripleMerge<InputContext, OutputContext, OutputContext2>
  > {
    const newBase = this.getBaseHandler().extend(api.getBaseHandler());
    const myContextFunction = this.getContextFunction();
    const otherContextFunction = api.getContextFunction();

    const reqHandler: RequestHandler<
      RouteParams & RouteParams2,
      z.TypeOf<MergeZodObjects<QueryParams, QueryParams2>>,
      z.TypeOf<MergeZodObjects<Cookies, Cookies2>>,
      InferBodyType<MergeValidBodyTypes<Body, Body2>>,
      InputContext,
      TripleMerge<InputContext, OutputContext, OutputContext2>
    > = async (data) => {
      const first = await myContextFunction(data);
      if (first instanceof NextResponse) return first;
      const newContext = { ...data.context, ...first } as MergeTypes<
        InputContext,
        OutputContext
      >;
      const second = await otherContextFunction({
        ...data,
        context: newContext,
      });
      if (second instanceof NextResponse) return second;
      const finalContext = { ...newContext, ...second } as TripleMerge<
        InputContext,
        OutputContext,
        OutputContext2
      >;
      return finalContext;
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FullRequestHandler: FRH } = require('./full-request-handler');
    return new FRH(newBase, reqHandler as never) as never;
  }

  public use<Out extends ContextBase>(
    fn: RequestHandler<
      RouteParams,
      z.TypeOf<QueryParams>,
      z.TypeOf<Cookies>,
      InferBodyType<Body>,
      MergeTypes<InputContext, OutputContext>,
      Out | undefined | void
    >,
  ): FullRequestHandler<
    RouteParams,
    QueryParams,
    Cookies,
    Body,
    InputContext,
    TripleMerge<InputContext, OutputContext, Out>
  >;
  public use<
    Out extends ContextBase,
    RouteParams2 extends object,
    QueryParams2 extends z.AnyZodObject,
    Cookies2 extends z.AnyZodObject,
    Body2 extends ValidBodyTypes,
  >(
    api: UseContext<
      RouteParams2,
      ZodObjectsDontConflict<QueryParams2, QueryParams>,
      ZodObjectsDontConflict<Cookies2, Cookies>,
      BodyTypesDontConflict<Body2, Body>,
      MergeTypes<InputContext, OutputContext>,
      Out
    >,
  ): FullRequestHandler<
    Expand<RouteParams & RouteParams2>,
    MergeZodObjects<QueryParams, QueryParams2>,
    MergeZodObjects<Cookies, Cookies2>,
    MergeValidBodyTypes<Body, Body2>,
    InputContext,
    TripleMerge<InputContext, OutputContext, Out>
  >;
  public use<
    Out extends ContextBase,
    RouteParams2 extends object,
    QueryParams2 extends z.AnyZodObject,
    Cookies2 extends z.AnyZodObject,
    Body2 extends ValidBodyTypes,
  >(
    arg:
      | RequestHandler<
          RouteParams,
          z.TypeOf<QueryParams>,
          z.TypeOf<Cookies>,
          InferBodyType<Body>,
          MergeTypes<InputContext, OutputContext>,
          Out | undefined | void
        >
      | UseContext<
          RouteParams2,
          ZodObjectsDontConflict<QueryParams2, QueryParams>,
          ZodObjectsDontConflict<Cookies2, Cookies>,
          BodyTypesDontConflict<Body2, Body>,
          MergeTypes<InputContext, OutputContext>,
          Out
        >,
  ):
    | FullRequestHandler<
        RouteParams,
        QueryParams,
        Cookies,
        Body,
        InputContext,
        TripleMerge<InputContext, OutputContext, Out>
      >
    | FullRequestHandler<
        Expand<RouteParams & RouteParams2>,
        MergeZodObjects<QueryParams, QueryParams2>,
        MergeZodObjects<Cookies, Cookies2>,
        MergeValidBodyTypes<Body, Body2>,
        InputContext,
        TripleMerge<InputContext, OutputContext, Out>
      > {
    if (typeof arg === 'function') {
      return this.useFn(arg);
    }
    return this.useFullApi(arg);
  }
}
