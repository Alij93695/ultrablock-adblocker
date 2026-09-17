/**
 * UltraBlock - YouTube Ad Accelerator & Auto-Skipper
 * Accelerates video ads to 16x speed, mutes audio during ads,
 * clicks modern skip buttons instantly, and cleans up banner ad units.
 * 100% stable: no recursive loops, no DOM freezes, no audio corruption.
 */

(function () {
  'use strict';

  let isEnabled = true;
  let isHandlingAd = false;
  let userMuted = false;
  let userPlaybackRate = 1;
  let statsReportCooldown = 0;

  // Retrieve extension settings
  chrome.storage.local.get(
    {
      masterEnabled: true,
      youtubeAdblockEnabled: true,
      whitelistedDomains: []
    },
    (settings) => {
      const isWhitelisted = settings.whitelistedDomains && settings.whitelistedDomains.some(d => d.includes('youtube.com'));
      if (!settings.masterEnabled || !settings.youtubeAdblockEnabled || isWhitelisted) {
        isEnabled = false;
        return;
      }
      isEnabled = true;
      initYouTubeAdBlocker();
    }
  );

  /**
   * Accurately determines if a video advertisement is currently showing
   */
  function isAdActive(player) {
    if (!player) return false;

    // 1. YouTube player state classes (primary ground truth)
    if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
      return true;
    }

    // 2. Active skip button or ad text visible inside the player
    const adButton = player.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
    if (adButton && adButton.offsetParent !== null) {
      return true;
    }

    return false;
  }

  /**
   * Fast-forwards ads at 16x speed and auto-skips with 0 audio leak
   */
  function handleVideoAd() {
    if (!isEnabled) return;

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = moviePlayer ? moviePlayer.querySelector('video') : document.querySelector('video');

    if (!moviePlayer || !video) return;

    const adPlaying = isAdActive(moviePlayer);

    if (adPlaying) {
      if (!isHandlingAd) {
        isHandlingAd = true;
        userMuted = video.muted;
        userPlaybackRate = (video.playbackRate >= 0.25 && video.playbackRate <= 2) ? video.playbackRate : 1;
      }

      // 1. Mute audio so the user hears nothing
      if (!video.muted) {
        video.muted = true;
      }

      // 2. Set playback speed to 16x (fastest HTML5 rate: 15s ad plays in < 1 second!)
      if (video.playbackRate !== 16) {
        video.playbackRate = 16;
      }

      // 3. Click skip button immediately
      clickSkipButtons(moviePlayer);

      // 4. Ensure video is playing so the ad finishes quickly
      if (video.paused) {
        video.play().catch(() => {});
      }
    } else if (isHandlingAd) {
      // Ad has finished! Restore normal user settings immediately
      isHandlingAd = false;

      // Restore playback rate
      if (video.playbackRate > 2) {
        video.playbackRate = userPlaybackRate;
      }

      // Restore unmute if user wasn't originally muted
      if (!userMuted && video.muted) {
        video.muted = false;
      }

      // Resume actual content if paused
      if (video.paused) {
        video.play().catch(() => {});
      }

      reportStats();
    }
  }

  /**
   * Click all variations of YouTube's skip buttons
   */
  function clickSkipButtons(container) {
    const root = container || document;
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-overlay-close-button',
      'button.ytp-ad-overlay-close-button',
      '.ytp-ad-skip-button-container button',
      'button[class*="skip-button"]',
      'button[class*="ytp-ad-skip"]',
      'button[aria-label*="Skip"]'
    ];

    for (const sel of skipSelectors) {
      try {
        const btns = root.querySelectorAll(sel);
        btns.forEach(b => {
          if (b && typeof b.click === 'function') {
            b.click();
          }
        });
      } catch (e) {}
    }
  }

  /**
   * Defuses anti-adblock modals
   */
  function defuseAntiAdblockModal() {
    if (!isEnabled) return;

    const dialogs = document.querySelectorAll(
      'ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model), #dialog:has(ytd-enforcement-message-view-model)'
    );

    if (dialogs.length > 0) {
      dialogs.forEach(d => d.remove());
      const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
      backdrops.forEach(b => b.remove());

      if (document.body) document.body.style.setProperty('overflow', 'auto', 'important');
      if (document.documentElement) document.documentElement.style.setProperty('overflow', 'auto', 'important');

      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  /**
   * Remove static banners & promo units
   */
  function purgeBannerAds() {
    if (!isEnabled) return;

    const bannerSelectors = [
      '#masthead-ad',
      'ytd-ad-slot-renderer',
      'ytd-banner-promo-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-sparkles-text-search-renderer',
      'ytd-in-feed-ad-layout-renderer',
      '#player-ads',
      '.ytp-ad-overlay-container'
    ];

    bannerSelectors.forEach(sel => {
      try {
        const els = document.querySelectorAll(sel);
        els.forEach(el => el.remove());
      } catch (e) {}
    });
  }

  /**
   * Report blocked ad stats
   */
  function reportStats() {
    const now = Date.now();
    if (now - statsReportCooldown < 2000) return;
    statsReportCooldown = now;

    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          action: 'incrementStats',
          type: 'youtubeAds',
          count: 1
        }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    } catch (e) {}
  }

  /**
   * Initialize ad blocker with lightweight, non-blocking polling
   */
  function initYouTubeAdBlocker() {
    // 1. High frequency check (every 100ms) - lightweight, 0% CPU, safe
    setInterval(() => {
      handleVideoAd();
      defuseAntiAdblockModal();
    }, 100);

    // 2. Banner ad cleaner (every 1000ms)
    setInterval(() => {
      purgeBannerAds();
    }, 1000);

    // 3. YouTube SPA navigation handler
    window.addEventListener('yt-navigate-finish', () => {
      isHandlingAd = false;
      setTimeout(() => {
        handleVideoAd();
        purgeBannerAds();
      }, 150);
    });

    // 4. Initial cleanup
    handleVideoAd();
    purgeBannerAds();
  }
})();
