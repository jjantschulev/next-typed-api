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
