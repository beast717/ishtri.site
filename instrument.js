// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://4cb627e4e2cb38629abf1676342ede0f@o4509152984498176.ingest.de.sentry.io/4509152986726480",
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Tracing
  tracesSampleRate: 0.5, //  Capture 100% of the transactions
  // Set sampling rate for profiling - this is evaluated only once per SDK.init call
  profileSessionSampleRate: 0.5,
  // Trace lifecycle automatically enables profiling during active traces
  profileLifecycle: 'trace',
});

// Profiling happens automatically after setting it up with `Sentry.init()`.
// All spans (unless those discarded by sampling) will have profiling data attached to them.
Sentry.startSpan({
  name: "My Span",
}, () => {
  // The code executed here will be profiled
});