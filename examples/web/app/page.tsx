'use client';

import { useEffect } from 'react';
import { apiGet } from './next-typed-api-client';

export default function Page() {
  useEffect(() => {
    apiGet('/api', { query: { query: '' } }).then((d) => console.log(d));
  }, []);

  return (
    <div>
      <h1>NextJS Typed API</h1>
      <p>Typesafe API Routes for NextJS App Directory</p>
    </div>
  );
}
