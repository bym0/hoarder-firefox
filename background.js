async function sanitizeUrl(url) {
  return url.replace(/\/+$/, '');
}

async function notify(msg) {
  const stored = await browser.storage.local.get(['showNotifications']);
  if (stored.showNotifications === true) {
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Hoarder Extension (Unofficial)',
      message: msg
    });
  }
}

async function createBookmark() {
  const stored = await browser.storage.local.get(['hoarderUrl', 'apiToken']);
  
  if (stored.hoarderUrl && stored.apiToken) {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0].url;
    
    try {
      const sanitizedUrl = sanitizeUrl(stored.hoarderUrl);
      const response = await fetch(`${sanitizedUrl}/api/trpc/bookmarks.createBookmark?batch=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stored.apiToken}`
        },
        body: JSON.stringify({
          "0": {
            "json": {
              "type": "link",
              "url": currentUrl
            }
          }
        })
      });

      if (response.ok) {
        notify("Hoarded!");
      } else if (!response.ok) {
        notify("Failed to hoard! " + response);
        throw new Error('API call failed');
      }
    } catch (error) {
      console.error('Failed to create bookmark:', error);
      notify("Failed to hoard! " + error);
    }
  }
}

// Add bookmark creation listener
browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
  const stored = await browser.storage.local.get(['hoarderUrl', 'apiToken', 'sendOnBookmark']);

  console.log("Bookmark created:", bookmark);
  
  if (stored.hoarderUrl && stored.apiToken && stored.sendOnBookmark) {
    try {
      const sanitizedUrl = await sanitizeUrl(stored.hoarderUrl);
      const response = await fetch(`${sanitizedUrl}/api/trpc/bookmarks.createBookmark?batch=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stored.apiToken}`
        },
        body: JSON.stringify({
          "0": {
            "json": {
              "type": "link",
              "url": bookmark.url
            }
          }
        })
      });

      if (response.ok) {
        notify("Hoarded!");
        console.log(response)
      }
    } catch (error) {
      console.error('Failed to send bookmark to Hoarder:', error);
      notify("Failed to hoard! " + response);
    }
  }
});

browser.commands.onCommand.addListener((command) => {
  if (command === "hoard") {
    createBookmark();
  }
});