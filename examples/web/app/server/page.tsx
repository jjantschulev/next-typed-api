import { apiGet } from '../next-typed-api-client';

export default async function Page() {
  const data = await apiGet('/api/hello/:id', { params: { id: '123' } });

  return (
    <div>
      <h1>NextJS Typed API</h1>
      <p>Typesafe API Routes for NextJS App Directory</p>
      <pre>Id: {data.params.id}</pre>
    </div>
  );
}
