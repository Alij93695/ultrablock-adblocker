/**
 * UltraBlock - Service Worker (Manifest V3)
 * State management, declarativeNetRequest ruleset toggling, badge counters, and message hub.
 */

const DEFAULT_SETTINGS = {
  masterEnabled: true,
  youtubeAdblockEnabled: true,
  sponsorSkipEnabled: true,
  webAdblockEnabled: true,
  aggressiveMode: true,
  sponsorCategories: ['sponsor', 'selfpromo', 'interaction'],
  whitelistedDomains: [],
  stats: {
    totalBlocked: 0,
    youtubeBlocked: 0,
    sponsorsSkipped: 0,
    genericBlocked: 0
  }
};

// Initialize settings on install or startup
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  const initial = Object.assign({}, DEFAULT_SETTINGS, existing);
  await chrome.storage.local.set(initial);

  // Set extension badge styling
  chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
  updateBadge(initial.stats.totalBlocked);
});

// Update badge count
function updateBadge(count) {
  if (!count || count === 0) {
    chrome.action.setBadgeText({ text: '' });
  } else if (count > 9999) {
    chrome.action.setBadgeText({ text: '9.9k+' });
  } else if (count > 999) {
    chrome.action.setBadgeText({ text: (count / 1000).toFixed(1) + 'k' });
  } else {
    chrome.action.setBadgeText({ text: String(count) });
  }
}

// Handle declarativeNetRequest ruleset based on master settings
async function syncDeclarativeRules(masterEnabled, webAdblockEnabled) {
  const shouldEnableRules = masterEnabled && webAdblockEnabled;
  try {
    if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateEnabledRulesets) {
      if (shouldEnableRules) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: ['ruleset_1']
        });
      } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: ['ruleset_1']
        });
      }
    }
  } catch (e) {
    console.error('[UltraBlock] Error updating declarativeNetRequest ruleset:', e);
  }
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  if (message.action === 'incrementStats') {
    chrome.storage.local.get(['stats', 'masterEnabled'], (data) => {
      if (data.masterEnabled === false) return;

      const stats = data.stats || {
        totalBlocked: 0,
        youtubeBlocked: 0,
        sponsorsSkipped: 0,
        genericBlocked: 0
      };

      const increment = message.count || 1;
      stats.totalBlocked += increment;

      if (message.type === 'youtubeAds') {
        stats.youtubeBlocked += increment;
      } else if (message.type === 'sponsorsSkipped') {
        stats.sponsorsSkipped += increment;
      } else if (message.type === 'genericAds') {
        stats.genericBlocked += increment;
      }

      chrome.storage.local.set({ stats }, () => {
        updateBadge(stats.totalBlocked);
        sendResponse({ success: true, stats });
      });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'getStats') {
    chrome.storage.local.get(['stats'], (data) => {
      sendResponse(data.stats || DEFAULT_SETTINGS.stats);
    });
    return true;
  }

  if (message.action === 'toggleWhitelist') {
    const domain = message.domain;
    if (!domain) return;

    chrome.storage.local.get(['whitelistedDomains'], (data) => {
      let list = data.whitelistedDomains || [];
      const index = list.indexOf(domain);
      let isWhitelisted = false;

      if (index > -1) {
        list.splice(index, 1);
        isWhitelisted = false;
      } else {
        list.push(domain);
        isWhitelisted = true;
      }

      chrome.storage.local.set({ whitelistedDomains: list }, () => {
        sendResponse({ success: true, isWhitelisted, list });
      });
    });
    return true;
  }

  if (message.action === 'settingsChanged') {
    syncDeclarativeRules(message.settings.masterEnabled, message.settings.webAdblockEnabled);
    sendResponse({ success: true });
    return true;
  }
});
