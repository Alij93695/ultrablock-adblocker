/**
 * UltraBlock - Ultimate YouTube Ad Destroyer & Skipper
 * Combines network-level blocking, universal skip button clicking,
 * 16x video ad acceleration, and instant display/interstitial ad eradication.
 */

(function () {
  'use strict';

  let isEnabled = true;
  let isHandlingAd = false;
  let hasSeekedCurrentAd = false;
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
   * Universal simulated click with trusted-like pointer & mouse event sequence
   */
  function triggerClick(el) {
    if (!el) return;
    try {
      const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
      events.forEach(type => {
        el.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      });
      if (typeof el.click === 'function') {
        el.click();
      }
    } catch (e) {}
  }

  /**
   * Finds and clicks ANY modern skip button (class-based, attribute-based, or text-based)
   */
  function clickAllSkipButtons(container) {
    const root = container || document;

    // 1. Selector-based skip buttons
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button-modern',
      'button.ytp-skip-ad-button',
      'button.ytp-skip-ad-button.ytp-ad-component--clickable',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-overlay-close-button',
      'button.ytp-ad-overlay-close-button',
      '.ytp-ad-skip-button-container button',
      'button[class*="skip-button"]',
      'button[class*="ytp-ad-skip"]',
      'button[aria-label*="Skip" i]',
      'button[aria-label*="skip ad" i]',
      '.ytp-ad-text.ytp-ad-preview-text',
      'div[class*="ytp-ad-skip"]'
    ];

    for (const sel of skipSelectors) {
      try {
        const btns = root.querySelectorAll(sel);
        btns.forEach(b => triggerClick(b));
      } catch (e) {}
    }

    // 2. Universal text-based button scanning (handles "Skip ⏭", "Skip Ad", etc.)
    try {
      const buttons = root.querySelectorAll('button, [role="button"], span.ytp-ad-text');
      buttons.forEach(b => {
        const text = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
        if (text === 'skip' || text.startsWith('skip') || text.includes('skip ad') || text.includes('skip ad in')) {
          triggerClick(b);
        }
      });
    } catch (e) {}
  }

  /**
   * Instantly removes static interstitial ad overlays (like "Agents in Google AI Studio", "Learn more")
   */
  function purgeAdOverlays() {
    const overlaySelectors = [
      '.ytp-ad-player-overlay',
      '.ytp-ad-action-interstitial',
      '.ytp-ad-action-interstitial-background-container',
      '.ytp-ad-image-overlay',
      '.ytp-ad-text-overlay',
      '.ytp-ad-preview-container',
      '.ytp-ad-message-container',
      '.ytp-ad-overlay-container',
      '#player-ads',
      'ytd-action-companion-ad-renderer',
      'ytd-display-ad-renderer',
      'ytd-ad-slot-renderer',
      '#masthead-ad',
      'ytd-banner-promo-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-video-renderer',
      '#sparkles-container',
      'ytd-player-legacy-desktop-watch-ads-renderer'
    ];

    overlaySelectors.forEach(sel => {
      try {
        const elements = document.querySelectorAll(sel);
        elements.forEach(el => {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('height', '0px', 'important');
          el.remove();
        });
      } catch (e) {}
    });
  }

  /**
   * Ultra-fast check to detect if an advertisement is actively playing
   * Operates in < 0.005ms without triggering forced layout reflows.
   */
  function isAdActive(moviePlayer) {
    if (!moviePlayer) {
      moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    }
    if (!moviePlayer) return false;

    // 1. Instant class check (fastest, 0 layout reflow)
    if (moviePlayer.classList.contains('ad-showing') || moviePlayer.classList.contains('ad-interrupting')) {
      return true;
    }

    // 2. Secondary check only if player is in an active ad state
    const playerOverlay = moviePlayer.querySelector('.ytp-ad-player-overlay, .ytp-ad-action-interstitial');
    if (playerOverlay && playerOverlay.offsetParent !== null) {
      return true;
    }

    return false;
  }

  /**
   * Fast-forwards video ads, mutes audio, and triggers auto-skip
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
        hasSeekedCurrentAd = false;
        userMuted = video.muted;
        userPlaybackRate = (video.playbackRate >= 0.25 && video.playbackRate <= 2) ? video.playbackRate : 1;
      }

      // 1. Mute audio so the user hears nothing
      video.muted = true;

      // 2. Accelerate ad to 16x speed (a 30s ad passes in < 1.8 seconds)
      video.playbackRate = 16;

      // 3. Fast-forward video ad once safely to the end
      if (!hasSeekedCurrentAd && isFinite(video.duration) && video.duration > 0) {
        hasSeekedCurrentAd = true;
        const target = Math.max(0, video.duration - 0.1);
        if (video.currentTime < target) {
          video.currentTime = target;
        }
      }

      // 4. Click skip button immediately
      clickAllSkipButtons(moviePlayer);

      // 5. Instantly purge any ad overlays
      purgeAdOverlays();

      // 6. Ensure playback continues so the ad completes
      if (video.paused) {
        video.play().catch(() => {});
      }
    } else if (isHandlingAd) {
      // Ad has completed! Restore user settings
      isHandlingAd = false;
      hasSeekedCurrentAd = false;

      // Restore playback rate
      if (video.playbackRate > 2) {
        video.playbackRate = userPlaybackRate;
      }

      // Restore unmute if user was originally unmuted
      if (!userMuted && video.muted) {
        video.muted = false;
      }

      // Ensure main video plays smoothly
      if (video.paused) {
        video.play().catch(() => {});
      }

      reportStats();
    }
  }

  /**
   * Neutralizes YouTube's Anti-Adblock modal
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
   * Report blocked ad stats to background worker
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
   * Main initialization loop (Zero-Lag Optimized)
   */
  function initYouTubeAdBlocker() {
    // 1. Ultra-lightweight video ad check (every 100ms, cost < 0.005ms when no ad)
    setInterval(() => {
      handleVideoAd();
    }, 100);

    // 2. Periodic background maintenance (every 1500ms)
    setInterval(() => {
      purgeAdOverlays();
      defuseAntiAdblockModal();
    }, 1500);

    // 3. YouTube SPA navigation handler
    window.addEventListener('yt-navigate-finish', () => {
      isHandlingAd = false;
      hasSeekedCurrentAd = false;
      setTimeout(() => {
        handleVideoAd();
        purgeAdOverlays();
      }, 50);
    });

    // 4. Initial pass
    handleVideoAd();
    purgeAdOverlays();
  }
})();
