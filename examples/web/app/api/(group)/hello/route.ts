import { logging } from '@/app/api/context';
import { api } from 'next-typed-api';

export const GET = api()
  .use(logging)
  .get(() => {
    console.log('hello world!');
    return { hello: 'world!' };
  });
