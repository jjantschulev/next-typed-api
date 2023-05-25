'use client';

import { useAPIGetQuery } from '../next-typed-api-client';

export default function Page() {
  const { data } = useAPIGetQuery('/api', { query: { query: 'test' } });

  return (
    <div>
      <h1>React Query {data?.query.query} </h1>
    </div>
  );
}
