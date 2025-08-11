// Chrome extension background script for web page scraping and replication

// Types
interface AssetContent {
  href?: string;
  src?: string;
  media?: string | null;
  type?: string;
  content?: string;
  index?: number;
}

interface ScrapedPage {
  url: string;
  title: string;
  collectedAt: string;
  html: string;
  assets: {
    stylesheets: { linked: AssetContent[]; inline: AssetContent[] };
    scripts: { linked: AssetContent[]; inline: AssetContent[] };
  };
}

interface ReplicatorPage {
  url: string;
  js: string;
  css: string;
  html: { head: string; body: string };
}

// Utility functions
async function fetchAssetContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, { credentials: "omit", mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    return `/* Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)} */`;
  }
}

function combineAssets(assets: AssetContent[]): string {
  return assets
    .map(asset => {
      const source = asset.href || asset.src || `inline-${asset.index}`;
      return `/* Source: ${source} */\n${asset.content || ''}`;
    })
    .join('\n\n');
}

function extractHtmlSections(html: string): { head: string; body: string } {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  
  return {
    head: headMatch?.[1] || '',
    body: bodyMatch?.[1] || html
  };
}

function transformToReplicatorFormat(scrape: ScrapedPage): { pages: ReplicatorPage[] } {
  const { head, body } = extractHtmlSections(scrape.html);
  
  const allStyles = [...scrape.assets.stylesheets.linked, ...scrape.assets.stylesheets.inline];
  const allScripts = [...scrape.assets.scripts.linked, ...scrape.assets.scripts.inline];
  
  return {
    pages: [{
      url: scrape.url,
      css: combineAssets(allStyles),
      js: combineAssets(allScripts),
      html: { head, body }
    }]
  };
}

// Main page capture functionality
async function capturePage(tabId: number): Promise<void> {
  try {
    // Inject script to collect page data
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const absoluteUrl = (url: string) => new URL(url, location.href).href;

        const stylesheets = {
          linked: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
            .map(link => ({ href: absoluteUrl(link.href), media: link.media || null })),
          inline: Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
            .map((style, index) => ({ index, media: style.media || null, content: style.textContent || "" }))
        };

        const scripts = {
          linked: Array.from(document.scripts)
            .filter(script => script.src)
            .map(script => ({ src: absoluteUrl(script.src), type: script.type || "text/javascript" })),
          inline: Array.from(document.scripts)
            .filter(script => !script.src)
            .map((script, index) => ({ index, type: script.type || "text/javascript", content: script.textContent || "" }))
        };

        return {
          url: location.href,
          title: document.title,
          collectedAt: new Date().toISOString(),
          html: document.documentElement.outerHTML,
          assets: { stylesheets, scripts }
        };
      },
    });

    const scrapedData = results[0]?.result;
    if (!scrapedData) throw new Error('Failed to scrape page data');

    // Fetch external assets
    const linkedStyles = await Promise.all(
      scrapedData.assets.stylesheets.linked.map(async (stylesheet) => ({
        ...stylesheet,
        content: await fetchAssetContent(stylesheet.href!)
      }))
    );

    const linkedScripts = await Promise.all(
      scrapedData.assets.scripts.linked.map(async (script) => ({
        ...script,
        content: await fetchAssetContent(script.src!)
      }))
    );

    const completeData: ScrapedPage = {
      ...scrapedData,
      assets: {
        stylesheets: { linked: linkedStyles, inline: scrapedData.assets.stylesheets.inline },
        scripts: { linked: linkedScripts, inline: scrapedData.assets.scripts.inline }
      }
    };

    // Send to replicator API
    await sendToReplicator(completeData);

  } catch (error) {
    console.error('Page capture failed:', error);
  }
}

async function sendToReplicator(scrapedData: ScrapedPage): Promise<void> {
  const { authToken, apiBase, appUrl } = await chrome.storage.local.get(['authToken', 'apiBase', 'appUrl']);
  
  if (!authToken || !apiBase) {
    throw new Error('Missing authentication credentials');
  }

  const replicatorData = transformToReplicatorFormat(scrapedData);
  
  const response = await fetch(`${apiBase}/replicator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(replicatorData)
  });

  if (!response.ok) {
    throw new Error(`Replicator API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  // Open the created repo or main app
  const targetUrl = result?.repoId && appUrl 
    ? `${appUrl}/repos/${result.repoId}`
    : appUrl || 'https://app.hypershape.com';
    
  await chrome.tabs.create({ url: targetUrl });
}

// Event listeners
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await capturePage(tab.id);
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'pong', timestamp: new Date().toISOString() });
    return false;
  }

  if (request.action === 'capturePage' && request.tabId) {
    capturePage(request.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});