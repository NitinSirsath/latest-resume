import { defineExtensionMessaging } from '@webext-core/messaging';
import { ExtensionMessaging } from '@resumetailor/types';
import { detectPortal, getAdapterForPortal } from './detector';

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>();

let lastUrl = window.location.href;

async function attemptScrape(retries = 10) {
  const portal = detectPortal();
  if (portal === 'unknown') return;

  const adapter = getAdapterForPortal(portal);
  if (!adapter) return;

  // Check if content is ready
  const title = adapter.getJobTitle();
  const desc = adapter.getDescription();

  if (!title && !desc && retries > 0) {
    console.log(`[ResumeTailor] Content not ready, retrying... (${retries} left)`);
    setTimeout(() => attemptScrape(retries - 1), 1000);
    return;
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
  }
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
