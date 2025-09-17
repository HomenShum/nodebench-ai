import { defineApp } from "convex/server";
import prosemirrorSync from "@convex-dev/prosemirror-sync/convex.config";
import presence from "@convex-dev/presence/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import rag from "@convex-dev/rag/convex.config";
import twilio from "@convex-dev/twilio/convex.config";
import agent from "@convex-dev/agent/convex.config";
import polar from "@convex-dev/polar/convex.config";
import ossStats from "@erquhart/convex-oss-stats/convex.config";

const app = defineApp();
app.use(prosemirrorSync);
app.use(presence);
app.use(agent);
app.use(workpool);
app.use(rag);
app.use(twilio);
app.use(polar);
app.use(ossStats);

export default app;
