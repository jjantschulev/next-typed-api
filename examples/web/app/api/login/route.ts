import { api } from 'next-typed-api';

export const POST = api().post(({ setCookie }) => {
  setCookie('token', 'valid_token');
  return { status: 'ok' };
});
