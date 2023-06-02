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
