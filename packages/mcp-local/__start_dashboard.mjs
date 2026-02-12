import { startDashboardServer } from "./dist/dashboard/server.js";
import { getDb } from "./dist/db.js";
const port = await startDashboardServer(getDb(), 6274);
console.log(`Dashboard at http://127.0.0.1:${port}`);
await new Promise(() => {});
