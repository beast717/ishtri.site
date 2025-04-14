// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://4cb627e4e2cb38629abf1676342ede0f@o4509152984498176.ingest.de.sentry.io/4509152986726480",

   // Enable tracing
  integrations: [
    nodeProfilingIntegration(), // Add the profiling integration
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
  ],
  tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring. Adjust in production!
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0, // Capture profiling for 100% of traced transactions. Adjust in production!

});