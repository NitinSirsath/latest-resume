import { defineExtensionMessaging } from '@webext-core/messaging';
import { ExtensionMessaging } from '@resumetailor/types';
import { detectPortal, getAdapterForPortal } from './detector';
import { performAutofill } from './autofill';

const { sendMessage, onMessage } = defineExtensionMessaging<ExtensionMessaging>();

let lastUrl = window.location.href;

async function attemptScrape(retries = 10): Promise<boolean> {
  const portal = detectPortal();
  if (portal === 'unknown') return false;

  const adapter = getAdapterForPortal(portal);
  if (!adapter) return false;

  // Check if content is ready
  const title = adapter.getJobTitle();
  const desc = adapter.getDescription();

  if (!title && !desc && retries > 0) {
    console.log(`[ResumeTailor] Content not ready, retrying... (${retries} left)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return attemptScrape(retries - 1);
  }

  const payload = {
    jobTitle: title,
    company: adapter.getCompany(),
    description: desc,
    requirements: adapter.getRequirements(),
    sourceUrl: window.location.href,
  };

  if (payload.jobTitle || payload.description) {
    console.log('[ResumeTailor] Sending scraped JD:', payload);
    sendMessage('JD_SCRAPED', payload);
    return true;
  }
  return false;
}

// Watch for URL changes (SPAs)
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('[ResumeTailor] URL changed, re-detecting...');
    const portal = detectPortal();
    if (portal !== 'unknown') {
      sendMessage('PORTAL_DETECTED', { portal });
      attemptScrape();
    }
  }
}, 1000);

// Initial detection
const portal = detectPortal();
if (portal !== 'unknown') {
  sendMessage('PORTAL_DETECTED', { portal });
  attemptScrape();
}

// Manual trigger from popup
onMessage('MANUAL_DETECT', async () => {
  console.log('[ResumeTailor] Manual detection triggered');
  const portal = detectPortal();
  if (portal !== 'unknown') {
    sendMessage('PORTAL_DETECTED', { portal });
  }
  const success = await attemptScrape(3); // Less retries for manual to fail fast
  return { success, error: success ? undefined : 'Could not find job details on this page.' };
});

onMessage('START_AUTOFILL', async () => {
  console.log('[ResumeTailor] Autofill triggered');
  // Data mapping will be handled in the next step (TASK-162)
  const success = performAutofill({}); 
  return { success };
});
