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
