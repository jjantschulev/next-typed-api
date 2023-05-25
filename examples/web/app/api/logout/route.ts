import { api } from 'next-typed-api';

export const POST = api().post(({ deleteCookie }) => {
  deleteCookie('token');
  return { status: 'ok' };
});
