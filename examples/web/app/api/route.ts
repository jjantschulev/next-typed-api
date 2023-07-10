import { api, z } from 'next-typed-api';
import { NextResponse } from 'next/server';
import { logging, user } from './context';

export const POST = api()
  .query({ param: z.string() })
  .body({ foo: z.literal('bar') })
  .use(logging)
  .post(({ body, params, rawBody }) => {
    return {
      status: 'ok',
      body,
      params,
      rawBody,
    };
  });

export const GET = api()
  .query({ query: z.string() })
  .use(logging)
  .use(user)
  .get(({ query, context }) => {
    console.log('query', query, 'context', context);
    return {
      status: 'ok',
      query,
      context,
    };
  });

export const PUT = api()
  .query({ query: z.string() })
  .body(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('foo'), foo: z.string() }),
      z.object({ type: z.literal('bar'), bar: z.number() }),
    ]),
  )
  .onParseError(() => {
    return NextResponse.json(
      { status: 'error but its actually a success' },
      { status: 200 },
    );
  })
  .use(logging)
  // .use(user)
  .put(({ query, body, context }) => {
    console.log('query', query, 'body', body, 'context', context);
    if (body.type === 'foo') {
      body.foo;
    }
    if (query.query === 'error') {
      return NextResponse.json({ status: 'error' }, { status: 400 });
    }

    return {
      status: 'ok',
      query,
      body,
      context,
    };
  });

// export const GET = async () => {
//   return NextResponse.json({ status: "ok" });
// };
