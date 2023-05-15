import { api } from "next-typed-api/lib";

export const POST = api().post(({ deleteCookie }) => {
  deleteCookie("token");
  return { status: "ok" };
});
