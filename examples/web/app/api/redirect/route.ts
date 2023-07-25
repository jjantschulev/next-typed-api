import { api, redirect } from 'next-typed-api';

export const GET = api().get(async () => {
  redirect('/redirected');
});
