// Next.js requires the middleware entry-point to be named `middleware.ts`.
// All logic lives in proxy.ts so it can be imported by tests independently.
export { proxy as middleware, config } from "./proxy";
