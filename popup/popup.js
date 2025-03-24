document.addEventListener('DOMContentLoaded', async function() {
  const settingsToggle = document.querySelector('.settings-toggle');
  const settingsPanel = document.querySelector('.settings-panel');

  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('show');
    settingsToggle.textContent = settingsPanel.classList.contains('show') ? 'Settings ▼' : 'Settings ►';
  });
  
  const form = document.querySelector('form');
  const urlInput = document.getElementById('hoarderUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const notificationsCheckbox = document.getElementById('showNotifications');
  const hoardOnOpenCheckbox = document.getElementById('hoardOnOpen');

  // Load saved values when popup opens
  // Add to const declarations
  const sendOnBookmarkCheckbox = document.getElementById('sendOnBookmark');

  // Update stored values loading
  const stored = await browser.storage.local.get(['hoarderUrl', 'apiToken', 'showNotifications', 'hoardOnOpen', 'sendOnBookmark']);
  if (stored.hoarderUrl) {
    urlInput.value = stored.hoarderUrl;
  }
  if (stored.apiToken) {
    apiTokenInput.value = stored.apiToken;
  }
  if (stored.showNotifications !== undefined) {
    notificationsCheckbox.checked = stored.showNotifications;
  }
  if (stored.hoardOnOpen !== undefined) {
    hoardOnOpenCheckbox.checked = stored.hoardOnOpen;
  }
  if (stored.sendOnBookmark !== undefined) {
    sendOnBookmarkCheckbox.checked = stored.sendOnBookmark;
  }

  async function saveValues() {
    const formData = {
      hoarderUrl: urlInput.value,
      apiToken: apiTokenInput.value,
      showNotifications: notificationsCheckbox.checked,
      hoardOnOpen: hoardOnOpenCheckbox.checked,
      sendOnBookmark: sendOnBookmarkCheckbox.checked
    };
    await browser.storage.local.set(formData);
  }

  // Add input change listeners for instant saving
  urlInput.addEventListener('input', saveValues);
  apiTokenInput.addEventListener('input', saveValues);
  notificationsCheckbox.addEventListener('change', saveValues);
  hoardOnOpenCheckbox.addEventListener('change', saveValues);
  sendOnBookmarkCheckbox.addEventListener('change', saveValues);

  async function notify(msg) {
    if (stored.showNotifications === true) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Hoarder Extension (Unofficial)',
        message: msg
      });
    }
  }

  // Add a URL sanitization function
  async function sanitizeUrl(url) {
    return url.replace(/\/+$/, '');
  }
  
  // If we have both values, get current tab URL and make API call
  // Extract bookmark creation into a function
  async function createBookmark() {
    const stored = await browser.storage.local.get(['hoarderUrl', 'apiToken']);
    
    if (stored.hoarderUrl && stored.apiToken) {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0].url;
      
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
                "url": currentUrl
              }
            }
          })
        });

        console.log(response);

        if (response.ok) {
          notify("Hoarded!");
        } 
      } catch (error) {
        notify("Failed to hoard! " + error);
        console.error('Failed to create bookmark:', error);
      }
    }
  }

  // Call createBookmark when popup opens
  // Update the createBookmark call to check the setting
  if (stored.hoarderUrl && stored.apiToken && stored.hoardOnOpen) {
    await createBookmark();
  }


  // Add import button handler
  const importButton = document.querySelector('.import-button');
  importButton.addEventListener('click', async () => {
    const stored = await browser.storage.local.get(['hoarderUrl', 'apiToken']);
    
    if (stored.hoarderUrl && stored.apiToken) {
      try {
        const bookmarks = await browser.bookmarks.getTree();
        const allBookmarks = extractBookmarks(bookmarks);
        
        importButton.textContent = `Importing ${allBookmarks.length} bookmarks...`;
        importButton.disabled = true;

        for (const bookmark of allBookmarks) {
          try {
            const sanitizedUrl = sanitizeUrl(stored.hoarderUrl);
            await fetch(`${sanitizedUrl}/api/trpc/bookmarks.createBookmark?batch=1`, {
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
          } catch (error) {
            notify("Failed to import bookmark: " + bookmark.url + " " + error);
            console.error('Failed to import bookmark:', bookmark.url);
          }
        }
        notify("Bookmarks imported!");
        setTimeout(() => {
          importButton.textContent = "Send All Bookmarks";
          importButton.disabled = false;
        }, 1500);
      } catch (error) {
        notify("Failed to import bookmarks! " + error);
        console.error('Failed to get bookmarks:', error);
      }
    }
  });

  function extractBookmarks(nodes) {
    let bookmarks = [];
    for (const node of nodes) {
      if (node.url) {
        bookmarks.push(node);
      }
      if (node.children) {
        bookmarks = bookmarks.concat(extractBookmarks(node.children));
      }
    }
    return bookmarks;
  }

});