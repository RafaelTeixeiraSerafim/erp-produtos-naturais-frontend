import { test as base, expect, request as createRequest } from "playwright/test";
export const test = base.extend({
  request: async ({}, provide) => {
    if(process.env.CATALOG_DISPOSABLE !== "1" || !process.env.LIVE_SESSION || !process.env.LIVE_HEADERS)throw new Error("Use npm run test:integration.");
    const request=await createRequest.newContext({baseURL:"http://127.0.0.1:3100",storageState:JSON.parse(process.env.LIVE_SESSION),extraHTTPHeaders:JSON.parse(process.env.LIVE_HEADERS)});
    await provide(request);await request.dispose();
  },
});
export { expect };
export type { Page } from "playwright/test";
