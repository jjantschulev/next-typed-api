# Next-Typed-API

Next-Typed-API is a robust TypeScript library designed for the new Next.js App Router. It simplifies the process of creating type-safe API routes for Next.js applications. The library ensures safety and predictability by enforcing type checks on incoming API requests' parameters, queries, bodies, and cookies, leveraging the power of Zod for the schema definitions.

Please note that the library is under active development, and some features may change. The most current and detailed implementation can be found at the GitHub repository: [next-typed-api](https://github.com/jjantschulev/next-typed-api). To see the library in action, consider checking out the `/examples/web` directory in the codebase.

## Features

- Strong type-safety across the whole request/response lifecycle
- Middleware style `.use()` function for applying custom middleware to routes
- Support for cookies in requests
- Validation for request body, query, and parameters leveraging Zod schemas
- Auto generation of TypeScript types for client-side usage
- Middleware to handle authentication
- Server-side data fetching using Next.js `apiGet`
- Support for react-query on the client-side

## Usage

### API Routes

Let's create an API route using Next-Typed-API:

```typescript
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
```

The `api()` function initializes a new API route. By chaining methods like `.query()`, `.body()`, `.use()`, and `.post()`, we define the schema, middleware, and request handlers respectively. Zod is used to enforce the schema on the request body and query parameters.

### Middleware

Middlewares such as logging and authentication can be applied to routes as follows:

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
```

These middleware can then be used in other API routes by calling `.use(authenticate)` or `.use(logging)`.

### Client-side Usage with React Query

Next-Typed-API also works great on the client-side and integrates smoothly with `react-query`:

```typescript
// ./examples/web/app//react-query/page.tsx
'use client';

import { useCallback } from 'react';
import { useApiGetQuery, useApiPostMutation } from '../next-typed-api.client';

export default function Page() {
  const { data, error, isLoading } = useApiGetQuery('/api', {
    query: { query: 'Hello World' },
  });

  // Other code...

  return (
    // JSX code...
  );
}
```

### Server-side Usage

Data fetching on the server-side using the Next.js `apiGet` method:

```typescript
// ./examples/web/app//server/page.tsx
import { apiGet } from '../next-typed-api.server';

export default async function Page() {
  const data = await apiGet(
    '/api/hello/:id',
    { params: { id: '123' } },
    { cache: 'no-cache', next: { revalidate: 0 } },
  );

  return (
    // JSX code...
  );
}
```

For more usage examples and detailed guide, check the `/examples/web` directory in the GitHub repository.
