import { api } from "next-typed-api/lib";

export const POST = api().post(({ setCookie }) => {
  setCookie("token", "valid_token");
  return { status: "ok" };
});
