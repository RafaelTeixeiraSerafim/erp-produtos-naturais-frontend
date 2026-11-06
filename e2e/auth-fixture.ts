import { test as base, expect } from "playwright/test";
export const test = base.extend<{ authenticated: void }>({
  authenticated: [async ({ context }, provide) => {
    await context.addCookies([{ name:"SESSION",value:"fixture-admin",domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Lax" }]);
    await provide();
  },{ auto: true }],
});
export { expect };
export type { Page } from "playwright/test";
