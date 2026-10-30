// Run only from the serialized, explicitly enabled GitHub Actions workflow.
const { load } = require('./load-typescript.cjs');
const { newsletterWorkerMain } = load('lib/newsletter-worker.ts');
newsletterWorkerMain().then(result => {
  console.log(JSON.stringify(result));
}).catch(() => {
  console.error('Newsletter worker stopped. Check the private campaign records and configuration.');
  process.exitCode = 1;
});
