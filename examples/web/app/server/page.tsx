import { apiGet } from '../next-typed-api.server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await apiGet(
    '/api/hello/:id',
    { params: { id: '123' } },
    { cache: 'no-cache', next: { revalidate: 0 } },
  );

  return (
    <div>
      <h1>NextJS Typed API</h1>
      <p>Typesafe API Routes for NextJS App Directory</p>
      <pre>Id: {data.params.id}</pre>
    </div>
  );
}
