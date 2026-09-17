/**
 * UltraBlock - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const masterToggle = document.getElementById('masterToggle');
  const youtubeToggle = document.getElementById('youtubeToggle');
  const sponsorToggle = document.getElementById('sponsorToggle');
  const webAdblockToggle = document.getElementById('webAdblockToggle');
  const aggressiveToggle = document.getElementById('aggressiveToggle');

  const catSponsor = document.getElementById('catSponsor');
  const catSelfPromo = document.getElementById('catSelfPromo');
  const catInteraction = document.getElementById('catInteraction');

  const totalBlockedCount = document.getElementById('totalBlockedCount');
  const youtubeBlockedCount = document.getElementById('youtubeBlockedCount');
  const sponsorsSkippedCount = document.getElementById('sponsorsSkippedCount');

  const statusLabel = document.getElementById('statusLabel');
  const currentDomainEl = document.getElementById('currentDomain');
  const siteStatusBadge = document.getElementById('siteStatusBadge');
  const whitelistBtn = document.getElementById('whitelistBtn');
  const whitelistBtnText = document.getElementById('whitelistBtnText');
  const resetStatsBtn = document.getElementById('resetStatsBtn');

  let currentDomain = '';
  let isCurrentSiteWhitelisted = false;

  // 1. Identify active tab domain
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      if (url.protocol.startsWith('http')) {
        currentDomain = url.hostname.replace(/^www\./, '');
        currentDomainEl.textContent = currentDomain;
      } else {
        currentDomain = 'Internal Page';
        currentDomainEl.textContent = 'Browser System';
        whitelistBtn.disabled = true;
        whitelistBtn.style.opacity = '0.5';
      }
    }
  } catch (e) {
    currentDomainEl.textContent = 'Active Page';
  }

  // 2. Load stored settings and stats
  chrome.storage.local.get(
    {
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
    },
    (settings) => {
      masterToggle.checked = settings.masterEnabled;
      youtubeToggle.checked = settings.youtubeAdblockEnabled;
      sponsorToggle.checked = settings.sponsorSkipEnabled;
      webAdblockToggle.checked = settings.webAdblockEnabled;
      aggressiveToggle.checked = settings.aggressiveMode;

      const cats = settings.sponsorCategories || [];
      catSponsor.checked = cats.includes('sponsor');
      catSelfPromo.checked = cats.includes('selfpromo');
      catInteraction.checked = cats.includes('interaction');

      updateStatsUI(settings.stats);

      const list = settings.whitelistedDomains || [];
      isCurrentSiteWhitelisted = list.includes(currentDomain);
      updateSiteStatusUI(settings.masterEnabled, isCurrentSiteWhitelisted);
    }
  );

  function updateStatsUI(stats) {
    totalBlockedCount.textContent = (stats.totalBlocked || 0).toLocaleString();
    youtubeBlockedCount.textContent = (stats.youtubeBlocked || 0).toLocaleString();
    sponsorsSkippedCount.textContent = (stats.sponsorsSkipped || 0).toLocaleString();
  }

  function updateSiteStatusUI(masterEnabled, whitelisted) {
    if (!masterEnabled) {
      statusLabel.textContent = 'PROTECTION DISABLED';
      statusLabel.style.color = '#ef4444';
      siteStatusBadge.textContent = 'Paused';
      siteStatusBadge.className = 'site-status whitelisted';
      whitelistBtnText.textContent = 'Protection is Off';
      return;
    }

    if (whitelisted) {
      statusLabel.textContent = 'SITE WHITELISTED';
      statusLabel.style.color = '#f59e0b';
      siteStatusBadge.textContent = 'Whitelisted';
      siteStatusBadge.className = 'site-status whitelisted';
      whitelistBtnText.textContent = 'Resume protection on this site';
    } else {
      statusLabel.textContent = 'PROTECTION ACTIVE';
      statusLabel.style.color = '#8b5cf6';
      siteStatusBadge.textContent = 'Protected';
      siteStatusBadge.className = 'site-status';
      whitelistBtnText.textContent = 'Pause on this website';
    }
  }

  function saveSettings() {
    const cats = [];
    if (catSponsor.checked) cats.push('sponsor');
    if (catSelfPromo.checked) cats.push('selfpromo');
    if (catInteraction.checked) cats.push('interaction');

    const newSettings = {
      masterEnabled: masterToggle.checked,
      youtubeAdblockEnabled: youtubeToggle.checked,
      sponsorSkipEnabled: sponsorToggle.checked,
      webAdblockEnabled: webAdblockToggle.checked,
      aggressiveMode: aggressiveToggle.checked,
      sponsorCategories: cats
    };

    chrome.storage.local.set(newSettings, () => {
      chrome.runtime.sendMessage({
        action: 'settingsChanged',
        settings: newSettings
      });
      updateSiteStatusUI(masterToggle.checked, isCurrentSiteWhitelisted);
    });
  }

  // Event Listeners
  [masterToggle, youtubeToggle, sponsorToggle, webAdblockToggle, aggressiveToggle,
   catSponsor, catSelfPromo, catInteraction].forEach(input => {
    input.addEventListener('change', saveSettings);
  });

  // Whitelist Toggle
  whitelistBtn.addEventListener('click', () => {
    if (!currentDomain || currentDomain === 'Internal Page') return;

    chrome.runtime.sendMessage(
      { action: 'toggleWhitelist', domain: currentDomain },
      (response) => {
        if (response && response.success) {
          isCurrentSiteWhitelisted = response.isWhitelisted;
          updateSiteStatusUI(masterToggle.checked, isCurrentSiteWhitelisted);
          // Reload active tab to apply change
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.reload(tabs[0].id);
            }
          });
        }
      }
    );
  });

  // Reset Stats
  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Reset all blocked ad and sponsor statistics?')) {
      const emptyStats = {
        totalBlocked: 0,
        youtubeBlocked: 0,
        sponsorsSkipped: 0,
        genericBlocked: 0
      };
      chrome.storage.local.set({ stats: emptyStats }, () => {
        updateStatsUI(emptyStats);
        chrome.action.setBadgeText({ text: '' });
      });
    }
  });
});
