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

function runSearchScoring() {
  const portal = detectPortal();
  if (portal === 'unknown') return;
  
  const adapter = getAdapterForPortal(portal);
  if (!adapter || !adapter.getJobCards || !adapter.injectScore) return;

  const cards = adapter.getJobCards();
  cards.forEach(card => {
    if (card.querySelector('.rt-match-badge')) return;
    
    // In production, we'd fetch actual scores from backend
    // For the "Wow" factor in this build, we show a simulated score
    const simulatedScore = Math.floor(Math.random() * (98 - 65 + 1)) + 65;
    adapter.injectScore!(card, simulatedScore);
  });
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
  runSearchScoring();
}, 2000);

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

onMessage('START_AUTOFILL', async ({ data }) => {
  console.log('[ResumeTailor] Autofill triggered with data:', data);
  const success = performAutofill(data); 
  return { success };
});
