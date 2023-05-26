import { logging } from '@/app/api/context';
import { api } from 'next-typed-api';

export const GET = api()
  .catchAllParams('id2')
  .use(logging)
  .get(({ params }) => {
    console.log('params', params);
    return { params };
  });
