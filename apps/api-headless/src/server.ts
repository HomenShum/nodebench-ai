import { createApp } from "./app.js";

const PORT = parseInt(process.env.API_PORT || "8020", 10);
const app = createApp();

app.listen(PORT, () => {
  console.log(`[api-headless] listening on :${PORT}`);
});

export default app;
