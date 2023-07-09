## SERVER USAGE

```typescript
// ./examples/web/app//api/context.ts
import { api, z } from 'next-typed-api';

export const authenticate = api()
  .cookies({ token: z.string() })
  .use(({ cookies }) => {
    if (cookies.token !== 'valid_token') throw Error('Invalid token');
    return { token: cookies.token };
  });

export const logging = api().use(({ req }) => {
  console.log(`${req.method.toUpperCase()} ${req.url}`);
});

export const user = api()
  .use(authenticate)
  .use(({ context }) => {
    return {
      user: {
        id: 1,
        token: context.token,
        name: 'John Doe',
        email: 'email@email.com',
      },
    };
  });
// ./examples/web/app//api/logout/route.ts
import { api } from 'next-typed-api';

export const POST = api().post(({ deleteCookie }) => {
  deleteCookie('token');
  return { status: 'ok' };
});
// ./examples/web/app//api/route.ts
import { api, z } from 'next-typed-api';
import { NextResponse } from 'next/server';
import { logging, user } from './context';

export const POST = api()
  .query({ param: z.string() })
  .body({ foo: z.literal('bar') })
  .use(logging)
  .use(user)
  .post(({ body, params }) => {
    return {
      status: 'ok',
      body,
      params,
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
  .use(logging)
  .use(user)
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
// ./examples/web/app//api/[param]/route.ts
import { logging } from '@/app/api/context';
import { api, z } from 'next-typed-api';

export const GET = api()
  .params('param')
  .use(logging)
  .get(({ params }) => {
    console.log('params', params);
    return { params };
  });

export const POST = api()
  .params('param')
  .body({ body: z.string().optional() })
  .use(logging)
  .post(({ params, body }) => {
    console.log('params', params, body);
    return { params, body };
  });
// ./examples/web/app//api/(group)/hello/route.ts
import { logging } from '@/app/api/context';
import { api } from 'next-typed-api';

export const GET = api()
  .use(logging)
  .get(() => {
    console.log('hello world!');
    return { hello: 'world!' };
  });
// ./examples/web/app//api/(group)/hello/[...id2]/route.ts
import { logging } from '@/app/api/context';
import { api } from 'next-typed-api';

export const GET = api()
  .catchAllParams('id2')
  .use(logging)
  .get(({ params }) => {
    console.log('params', params);
    return { params };
  });
// ./examples/web/app//api/(group)/hello/[id]/route.ts
import { logging } from '@/app/api/context';
import { api } from 'next-typed-api';

export const GET = api()
  .params('id')
  .use(logging)
  .get(({ params }) => {
    console.log('params', params);
    return { params };
  });
// ./examples/web/app//api/login/route.ts
import { api } from 'next-typed-api';

export const POST = api().post(({ setCookie }) => {
  setCookie('token', 'valid_token');
  return { status: 'ok' };
});
```

## CLIENT USAGE:

```typescript
// ./examples/web/app//react-query/page.tsx
'use client';

import { useCallback } from 'react';
import { useApiGetQuery, useApiPostMutation } from '../next-typed-api.client';

export default function Page() {
  const { data, error, isLoading } = useApiGetQuery('/api', {
    query: { query: 'Hello World' },
  });

  const { mutate: login } = useApiPostMutation('/api/login');
  const { mutate: logout } = useApiPostMutation('/api/logout');
  const { mutate: test } = useApiPostMutation('/api/:param');

  const call = useCallback(() => {
    test({ params: { param: 'test' }, body: { body: '23' } });
  }, [test]);

  return (
    <div>
      <h1>React Query </h1>
      {isLoading && <div>Loading...</div>}
      {data && <div>Data: {data.query.query}</div>}
      {error && <div>Error: {error.message}</div>}
      <div>
        <button onClick={login}>Login</button>
      </div>
      <div>
        <button onClick={logout}>Logout</button>
      </div>
      <div>
        <button onClick={call}>Call</button>
      </div>
    </div>
  );
}
// ./examples/web/app//server/page.tsx
import { apiGet } from '../next-typed-api.server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await apiGet(
    '/api/hello/:id',
    { params: { id: '123' } },
    { cache: 'no-cache', next: { revalidate: 0 } },
  );

  return (
    <div>
      <h1>NextJS Typed API</h1>
      <p>Typesafe API Routes for NextJS App Directory</p>
      <pre>Id: {data.params.id}</pre>
    </div>
  );
}
// ./examples/web/app//layout.tsx
import { Providers } from './Providers';

export const metadata = {
  title: 'NextJS Typed API',
  description: 'Typesafe API Routes for NextJS App Directory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
// ./examples/web/app//page.tsx
('use client');

import { useEffect } from 'react';
import {
  BodyOfPost,
  GetRoute,
  ParamsOfGet,
  QueryOfGet,
  TypeOfGet,
  apiGet,
} from './next-typed-api.server';

type _T = TypeOfGet<'/api'>;
type _B = BodyOfPost<'/api'>;
type _Q = QueryOfGet<'/api'>;
type _R = ParamsOfGet<'/api/:param'>;

const myRoute: GetRoute = '/api/hello';

export default function Page() {
  useEffect(() => {
    apiGet('/api', { query: { query: '' } }).then((d) => console.log(d));
  }, []);

  return (
    <div>
      <h1>NextJS Typed API</h1>
      <p>Typesafe API Routes for NextJS App Directory</p>
    </div>
  );
}
// ./examples/web/app//Providers.tsx
('use client');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC, PropsWithChildren } from 'react';

const queryClient = new QueryClient();

export const Providers: FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
```

The above is the usage of an API library i made in typescript for NEXT JS (specifically the new App Router, and new API route style of writing web apps).

Please write a concise readme that outlines how to use the library to create api routes, and also breifly outline the features of the library. At the top mention that the library may change, and that a full up to date example project can be found at the github repo link here: https://github.com/jjantschulev/next-typed-api in the examples/web folder in the code. Focus on code examples to give examples for the features. Showcase the client side usage and server side usage separately
