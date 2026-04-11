import { defineExtensionMessaging } from '@webext-core/messaging';
import { ExtensionMessaging } from '@resumetailor/types';
import { detectPortal, getAdapterForPortal } from './detector';

const { sendMessage } = defineExtensionMessaging<ExtensionMessaging>();

async function main() {
  const portal = detectPortal();
  console.log(`[ResumeTailor] Portal detected: ${portal}`);

  if (portal !== 'unknown') {
    sendMessage('PORTAL_DETECTED', { portal });

    // Wait for the page to load or content to be ready
    setTimeout(() => {
      const adapter = getAdapterForPortal(portal);
      if (adapter) {
        const payload = {
          jobTitle: adapter.getJobTitle(),
          company: adapter.getCompany(),
          description: adapter.getDescription(),
          requirements: adapter.getRequirements(),
          sourceUrl: window.location.href,
        };

        console.log('[ResumeTailor] JD Scraped:', payload);
        
        if (payload.jobTitle || payload.description) {
          sendMessage('JD_SCRAPED', payload);
        }
      }
    }, 2000); // 2 second delay to wait for SPA renders
  }
}

main();
