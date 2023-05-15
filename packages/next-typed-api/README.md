# Next-Typed-API Documentation

## Introduction

`next-typed-api` is a library for creating Typesafe API routes in Next.js applications. It offers a convenient way to define APIs with TypeScript typings and advanced features like middleware.

## Installation

You can install `next-typed-api` using npm, yarn, or pnpm.

```bash
# using npm
npm install next-typed-api

# using yarn
yarn add next-typed-api

# using pnpm
pnpm add next-typed-api
```

## Usage

### Setup

In your `next.config.js` file, you need to use the `withTypedApi` function to wrap your Next.js configuration:

```javascript
const { withTypedApi } = require('next-typed-api');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
};

module.exports = withTypedApi(nextConfig);
```

### Defining API routes

`next-typed-api` provides an `api` function to define your API routes. You can use it to specify query parameters, request bodies, and middleware for each route. Here are examples for POST, GET, and PUT endpoints:

```typescript
import { api, z } from 'next-typed-api/lib';
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
  .body({ foo: z.literal('bar') })
  .use(logging)
  .use(user)
  .put(({ query, body, context }) => {
    console.log('query', query, 'body', body, 'context', context);

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
```

Each `api` function call represents a new API route. The `.query`, `.body`, and `.use` methods are used to define the query parameters, request body, and middleware for the route, respectively. The actual handler function (`.get`, `.post`, `.put`, etc.) takes an argument with the query parameters, body, and context, and should return the response data.

### Making requests

To make requests to your API routes from your Next.js application, you can use the `apiGET` function provided by the `next-typed-api-client`:

```typescript
import { useEffect } from 'react';
import { apiGET } from './next-typed-api-client';

export default function Page() {
  useEffect(() => {
    apiGET('/api', { query: { query: '' } }).then((d) => console.log(d));
  }, []);

  return (
    <div>
      <h1>NextJS Typed API</h1>
      <p>Typesafe API Routes for NextJS App Directory</p>
    </div>
  );
}
```

The `apiGET` function takes two parameters: the path of the API route and an options object. This options object can include a `query` property to specify the query parameters for the request. The function returns a promise that resolves to the response data.

In this example, a GET request is made to the "/api" route as soon as the component is mounted, with an empty string as the `query` parameter. The response data is then logged to the console.

## Middleware & Context

Middleware functions in `next-typed-api` provide a way to add additional functionality to your API routes, like logging, authentication, or other pre-processing of the request. They can also be used to add additional data to the request context.

Here's how you can define middleware functions:

```typescript
import { api, z } from 'next-typed-api/lib';

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
```

In this example, three middleware functions are defined:

1. `authenticate`: This middleware function checks if the request includes a valid token in its cookies. If the token is not valid, it throws an error. If the token is valid, it adds the token to the context.

2. `logging`: This middleware function logs the HTTP method and URL of the request.

3. `user`: This middleware function first applies the `authenticate` middleware, then adds a `user` object to the context.

To use these middleware functions in your API routes, you can call the `.use` method with the middleware function:

```typescript
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
```

In this example, the `logging` and `user` middleware are applied to the GET route. When a request is made to this route, it will first log the request method and URL, then authenticate the request and add a `user` object to the context. The handler function then has access to this `user` object through the `context` parameter.
