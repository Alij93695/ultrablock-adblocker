/**
 * UltraBlock - Generic Web Ad Blocker
 * Aggressive cosmetic filtering, dynamic DOM purger, and anti-adblock defusal.
 */

(function () {
  'use strict';

  // Do not run generic purger on YouTube (handled by specialized youtube_adblock.js)
  if (location.hostname.includes('youtube.com')) {
    return;
  }

  let isEnabled = true;
  let isAggressive = true;
  let blockedCount = 0;
  let hasReported = 0;

  // Load configuration from local storage
  chrome.storage.local.get(
    {
      masterEnabled: true,
      webAdblockEnabled: true,
      aggressiveMode: true,
      whitelistedDomains: []
    },
    (settings) => {
      const currentHost = location.hostname.toLowerCase();
      const isWhitelisted = settings.whitelistedDomains.some(domain =>
        currentHost === domain.toLowerCase() || currentHost.endsWith('.' + domain.toLowerCase())
      );

      if (!settings.masterEnabled || !settings.webAdblockEnabled || isWhitelisted) {
        return;
      }

      isEnabled = true;
      isAggressive = settings.aggressiveMode;
      initAdBlocker();
    }
  );

  /**
   * Anti-adblock defusal is cleanly executed via MAIN world script (defusal_main.js).
   */
  function injectDefusalBait() {
    // Handled natively by Manifest V3 MAIN world content script
  }


  const AD_SELECTORS = [
    'ins.adsbygoogle',
    '[id^="google_ads_"]',
    '[id^="div-gpt-ad"]',
    '[id^="dfp-ad-"]',
    '[class*="google-ad"]',
    '[class*="adsbygoogle"]',
    '[data-ad-unit]',
    '[data-ad-slot]',
    '[data-ad-zone]',
    '[data-ad-name]',
    '[data-adunit]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="adnxs.com"]',
    'iframe[src*="criteo."]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="taboola.com"]',
    'iframe[src*="outbrain.com"]',
    'div[class*="floating-ad"]',
    'div[class*="sticky-ad"]',
    'div[id*="sticky-ad"]',
    'div[class*="ad-container"]',
    'div[class*="ad-wrapper"]',
    'div[class*="ad_wrapper"]',
    'div[class*="ad-banner"]',
    'div[id*="ad_banner"]',
    'div[id*="ad-wrapper"]',
    'div[class*="sponsored-post"]',
    'div[class*="sponsored-content"]',
    'div[class*="promoted-item"]',
    '.trc_related_container',
    '.OUTBRAIN',
    '.taboola-placeholder',
    'div[id^="taboola-"]',
    'div[id^="outbrain_"]'
  ];

  const SELECTOR_QUERY = AD_SELECTORS.join(', ');

  /**
   * Purge matching ad elements from the DOM
   */
  function purgeAdElements(root = document) {
    if (!isEnabled || !root.querySelectorAll) return;

    try {
      const candidates = root.querySelectorAll(SELECTOR_QUERY);
      if (!candidates || candidates.length === 0) return;

      let found = 0;
      candidates.forEach((el) => {
        // Avoid collapsing critical layout containers like main, body, nav
        const tag = el.tagName.toLowerCase();
        if (tag === 'body' || tag === 'html' || tag === 'main' || tag === 'nav') return;

        if (el.style.display !== 'none') {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('height', '0px', 'important');
          el.style.setProperty('width', '0px', 'important');
          el.style.setProperty('min-height', '0px', 'important');
          el.style.setProperty('margin', '0px', 'important');
          el.style.setProperty('padding', '0px', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.setAttribute('data-ultrablock-hidden', 'true');
          found++;
        }
      });

      if (found > 0) {
        blockedCount += found;
        reportStats();
      }
    } catch (e) {
      // In case of selector error or restricted cross-origin node
    }
  }

  /**
   * Aggressive overlay / popup blocker
   */
  function blockIntrusiveModals() {
    if (!isAggressive) return;

    // Check for high z-index sticky overlay ads with bait keywords
    const overlays = document.querySelectorAll('div[style*="z-index"][style*="fixed"], div[style*="z-index"][style*="absolute"]');
    overlays.forEach((el) => {
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex, 10);
      if (zIndex > 9999) {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        const html = el.innerHTML.toLowerCase();
        if (
          html.includes('adsystem') ||
          html.includes('doubleclick') ||
          html.includes('pagead') ||
          text.includes('disable adblock') ||
          text.includes('turn off your ad blocker')
        ) {
          el.style.setProperty('display', 'none', 'important');
          blockedCount++;
          // Restore body scrolling if disabled by anti-adblock modal
          if (document.body) {
            document.body.style.setProperty('overflow', 'auto', 'important');
            document.documentElement.style.setProperty('overflow', 'auto', 'important');
          }
        }
      }
    });
  }

  /**
   * Report blocked count to background service worker
   */
  let reportTimeout = null;
  function reportStats() {
    if (blockedCount === hasReported) return;
    if (reportTimeout) clearTimeout(reportTimeout);

    reportTimeout = setTimeout(() => {
      const delta = blockedCount - hasReported;
      if (delta > 0) {
        hasReported = blockedCount;
        try {
          chrome.runtime.sendMessage({
            action: 'incrementStats',
            type: 'genericAds',
            count: delta
          });
        } catch (e) {}
      }
    }, 500);
  }

  /**
   * Initialize observer and listeners
   */
  function initAdBlocker() {
    injectDefusalBait();
    purgeAdElements(document);

    // Dynamic DOM observer
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (mutation.addedNodes.length > 0) {
          for (let j = 0; j < mutation.addedNodes.length; j++) {
            const node = mutation.addedNodes[j];
            if (node.nodeType === Node.ELEMENT_NODE) {
              purgeAdElements(node);
            }
          }
        }
      }
      blockIntrusiveModals();
    });

    observer.observe(document.documentElement || document, {
      childList: true,
      subtree: true
    });

    // Also run on DOMContentLoaded and Load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        purgeAdElements(document);
        blockIntrusiveModals();
      });
    }

    window.addEventListener('load', () => {
      purgeAdElements(document);
      blockIntrusiveModals();
    });
  }
})();
