import { z } from "zod";
import { BaseRequestHandler } from "./base-request-handler";
import { FullRequestHandler } from "./full-request-handler";

export function api() {
  return new BaseRequestHandler(z.object({}), z.object({}), z.object({}));
}

const aaa = api()
  .params("id")
  .query({
    page: z.literal(1),
  })
  .use(({ query }) => {
    const page = query.page;
    const nextPage = page + 1;
    return { nextPage, page };
  })
  .use(({ context }) => {
    console.log(context.nextPage);
    return { page: "hello" } as const;
  });

const aaaa = api()
  .query({
    page2: z.string(),
  })
  .use(aaa)
  .use(({ context, params, query }) => {
    console.log(context.page);
    return {};
  });

type Ctx = typeof aaa extends FullRequestHandler<
  infer R,
  infer Q,
  infer C,
  infer B,
  infer I,
  infer O
>
  ? O
  : never;
