/**
 * UltraBlock - Main World Anti-Adblock Defusal Script
 * Runs in the page's MAIN JavaScript world at document_start.
 * Safely mocks ad blocker probe properties so websites believe ads are running.
 */
(function () {
  'use strict';
  try {
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.adblock = false;
    window.isAdBlockerActive = false;
    window.google_ad_client = 'ca-pub-0000000000000000';

    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }
    window.adsbygoogle.loaded = true;
    window.adsbygoogle.push = function () {
      return 1;
    };

    try {
      Object.defineProperty(window, 'canRunAds', { value: true, writable: true, configurable: true });
      Object.defineProperty(window, 'isAdBlockActive', { value: false, writable: true, configurable: true });
      Object.defineProperty(window, 'adblock', { value: false, writable: true, configurable: true });
    } catch (e) {}
  } catch (e) {}
})();
