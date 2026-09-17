/**
 * UltraBlock - Aggressive YouTube Ad Destroyer
 * Eliminates pre-roll & mid-roll video ads, auto-skips, clears banner layouts,
 * and neutralizes anti-adblock enforcement dialogs.
 */

(function () {
  'use strict';

  let isEnabled = true;
  let blockedAdsCount = 0;
  let lastAdSkippedTime = 0;
  let originalMutedState = false;
  let originalPlaybackRate = 1;
  let isHandlingAd = false;

  // Retrieve extension settings
  chrome.storage.local.get(
    {
      masterEnabled: true,
      youtubeAdblockEnabled: true,
      whitelistedDomains: []
    },
    (settings) => {
      const isWhitelisted = settings.whitelistedDomains.some(d => d.includes('youtube.com'));
      if (!settings.masterEnabled || !settings.youtubeAdblockEnabled || isWhitelisted) {
        isEnabled = false;
        return;
      }
      isEnabled = true;
      initYouTubeAdBlocker();
    }
  );

  /**
   * Fast-forwards and skips video ads instantly
   */
  function obliterateVideoAd() {
    if (!isEnabled) return;

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = document.querySelector('#movie_player video') || document.querySelector('video');

    if (!moviePlayer || !video) return;

    const isAdShowing = moviePlayer.classList.contains('ad-showing') ||
                        moviePlayer.classList.contains('ad-interrupting') ||
                        Boolean(document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, .ytp-ad-preview-text'));

    if (isAdShowing) {
      if (!isHandlingAd) {
        isHandlingAd = true;
        originalMutedState = video.muted;
        originalPlaybackRate = video.playbackRate || 1;
      }

      // Mute audio during ad destruction
      video.muted = true;
      
      // Speed up video to 16x (maximum browser supported rate)
      video.playbackRate = 16;

      // Jump to the end of the ad video segment
      if (isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration - 0.05;
      }

      // Click any skip button that exists
      clickSkipButtons();

      const now = Date.now();
      if (now - lastAdSkippedTime > 1500) {
        lastAdSkippedTime = now;
        blockedAdsCount++;
        reportStats();
      }
    } else if (isHandlingAd) {
      // Ad is finished, restore video state
      isHandlingAd = false;
      if (video.playbackRate > 2) {
        video.playbackRate = (originalPlaybackRate >= 0.25 && originalPlaybackRate <= 2) ? originalPlaybackRate : 1;
      }
      if (!originalMutedState && video.muted) {
        video.muted = false;
      }
    }
  }

  /**
   * Click all variations of YouTube's skip buttons
   */
  function clickSkipButtons() {
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-overlay-close-button',
      'button.ytp-ad-overlay-close-button',
      '.ytp-ad-skip-button-container button'
    ];

    for (let i = 0; i < skipSelectors.length; i++) {
      const btn = document.querySelector(skipSelectors[i]);
      if (btn && typeof btn.click === 'function') {
        try {
          btn.click();
        } catch (e) {}
      }
    }
  }

  /**
   * Neutralizes YouTube's Anti-Adblock "Ad blockers violate YouTube's Terms of Service" modal
   */
  function defuseAntiAdblockModal() {
    if (!isEnabled) return;

    const modalSelectors = [
      'ytd-enforcement-message-view-model',
      'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)',
      '#dialog:has(ytd-enforcement-message-view-model)',
      '.ytd-popup-container:has(ytd-enforcement-message-view-model)'
    ];

    let foundModal = false;
    modalSelectors.forEach(sel => {
      const dialog = document.querySelector(sel);
      if (dialog) {
        dialog.remove();
        foundModal = true;
      }
    });

    if (foundModal) {
      // Remove any backdrop darkening overlay
      const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());

      // Restore scrollability
      if (document.body) {
        document.body.style.setProperty('overflow', 'auto', 'important');
      }
      if (document.documentElement) {
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
      }

      // Resume video playback if stopped
      const video = document.querySelector('video');
      const moviePlayer = document.getElementById('movie_player');
      if (moviePlayer && typeof moviePlayer.playVideo === 'function') {
        moviePlayer.playVideo();
      } else if (video && video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  /**
   * Remove page-level ad components (banners, mastheads, sponsored tiles)
   */
  function purgeLayoutAds() {
    if (!isEnabled) return;

    const layoutSelectors = [
      '#masthead-ad',
      'ytd-ad-slot-renderer',
      'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
      'ytd-rich-item-renderer:has(ytd-display-ad-renderer)',
      'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
      'ytd-banner-promo-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-sparkles-text-search-renderer',
      'ytd-promoted-video-renderer',
      'ytd-compact-promoted-video-renderer',
      'ytd-in-feed-ad-layout-renderer',
      '#player-ads',
      '.ytp-ad-overlay-container'
    ];

    layoutSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.remove();
        });
      } catch (e) {}
    });
  }

  /**
   * Report blocked ad stats to background worker
   */
  function reportStats() {
    try {
      if (!chrome.runtime || !chrome.runtime.id) return;
      chrome.runtime.sendMessage({
        action: 'incrementStats',
        type: 'youtubeAds',
        count: 1
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (e) {}
  }


  /**
   * Main initialization loop
   */
  function initYouTubeAdBlocker() {
    // 1. High frequency loop for video ads (every 50ms)
    setInterval(() => {
      obliterateVideoAd();
      defuseAntiAdblockModal();
    }, 50);

    // 2. Periodic layout ad cleaner (every 500ms)
    setInterval(() => {
      purgeLayoutAds();
    }, 500);

    // 3. MutationObserver for instant DOM updates
    const observer = new MutationObserver(() => {
      obliterateVideoAd();
      defuseAntiAdblockModal();
      clickSkipButtons();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // 4. Handle YouTube SPA navigation
    window.addEventListener('yt-navigate-finish', () => {
      isHandlingAd = false;
      obliterateVideoAd();
      purgeLayoutAds();
    });

    // 5. Initial cleanup
    purgeLayoutAds();
    obliterateVideoAd();
  }
})();
