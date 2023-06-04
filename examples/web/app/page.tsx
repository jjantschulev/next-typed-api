'use client';

import { useEffect } from 'react';
import {
  BodyOfPost,
  GetRoute,
  ParamsOfGet,
  QueryOfGet,
  TypeOfGet,
  apiGet,
} from './next-typed-api-client';

type _T = TypeOfGet<'/api'>;
type _B = BodyOfPost<'/api'>;
type _Q = QueryOfGet<'/api'>;
type _R = ParamsOfGet<'/api/:param'>;

const myRoute: GetRoute = '/api/hello';

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
