/**
 * UltraBlock - YouTube Sponsor Segment Detector & Auto-Skipper
 * Powered by SponsorBlock API + fallback chapter analysis with instant skip and undo toast.
 */

(function () {
  'use strict';

  let isEnabled = true;
  let enabledCategories = ['sponsor', 'selfpromo', 'interaction'];
  let currentVideoId = null;
  let activeSegments = [];
  let ignoredSegments = new Set();
  let toastElement = null;
  let toastTimer = null;

  // Retrieve settings
  chrome.storage.local.get(
    {
      masterEnabled: true,
      sponsorSkipEnabled: true,
      sponsorCategories: ['sponsor', 'selfpromo', 'interaction'],
      whitelistedDomains: []
    },
    (settings) => {
      const isWhitelisted = settings.whitelistedDomains.some(d => d.includes('youtube.com'));
      if (!settings.masterEnabled || !settings.sponsorSkipEnabled || isWhitelisted) {
        isEnabled = false;
        return;
      }
      isEnabled = true;
      enabledCategories = settings.sponsorCategories || ['sponsor', 'selfpromo'];
      initSponsorSkipper();
    }
  );

  /**
   * Extract video ID from URL
   */
  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('v')) {
      return urlParams.get('v');
    }
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'shorts' && pathParts[2]) {
      return pathParts[2];
    }
    return null;
  }

  /**
   * Fetch sponsored segments from SponsorBlock API
   */
  async function fetchSponsorSegments(videoId) {
    if (!videoId) return [];
    
    const categoriesParam = JSON.stringify(enabledCategories);
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=${encodeURIComponent(categoriesParam)}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const segments = [];
        data.forEach(item => {
          if (item.segment && item.segment.length === 2) {
            segments.push({
              start: item.segment[0],
              end: item.segment[1],
              category: item.category || 'sponsor',
              uuid: item.UUID || Math.random().toString()
            });
          }
        });
        return segments;
      }
    } catch (e) {
      console.warn('[UltraBlock] SponsorBlock API unavailable, falling back to chapter analysis');
    }

    // Fallback: parse video chapters for sponsored segments
    return parseChaptersForSponsors();
  }

  /**
   * Fallback chapter analyzer: scans chapters/description for sponsor keywords
   */
  function parseChaptersForSponsors() {
    const segments = [];
    try {
      const chapterMarkers = document.querySelectorAll('ytd-macro-markers-list-item-renderer');
      if (chapterMarkers && chapterMarkers.length > 0) {
        let prevTime = null;
        let prevIsSponsor = false;
        let prevTitle = '';

        chapterMarkers.forEach(marker => {
          const titleEl = marker.querySelector('#details #title, h4');
          const timeEl = marker.querySelector('#time');
          if (titleEl && timeEl) {
            const title = (titleEl.textContent || '').trim().toLowerCase();
            const timeSeconds = parseTimeString(timeEl.textContent.trim());

            if (prevIsSponsor && prevTime !== null && timeSeconds > prevTime) {
              segments.push({
                start: prevTime,
                end: timeSeconds,
                category: 'sponsor',
                title: prevTitle,
                uuid: 'chapter_' + prevTime
              });
              prevIsSponsor = false;
            }

            const isSponsor = /sponsor|sponsored|partner|our sponsor|promo|promo code/i.test(title);
            if (isSponsor) {
              prevIsSponsor = true;
              prevTime = timeSeconds;
              prevTitle = title;
            }
          }
        });
      }
    } catch (e) {}
    return segments;
  }

  function parseTimeString(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  /**
   * Displays an interactive toast notification when a sponsor is skipped
   */
  function showSkipToast(segment, video) {
    if (toastElement) {
      toastElement.remove();
    }
    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    const toast = document.createElement('div');
    toast.className = 'ultrablock-sponsor-toast';

    const label = segment.category ? segment.category.toUpperCase() : 'SPONSOR';
    const range = `${formatTime(segment.start)} - ${formatTime(segment.end)}`;

    toast.innerHTML = `
      <span class="ultrablock-sponsor-badge">⚡ ${label}</span>
      <span>Skipped (${range})</span>
      <button class="ultrablock-sponsor-undo">Undo</button>
    `;

    const undoBtn = toast.querySelector('.ultrablock-sponsor-undo');
    undoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Seek back to before the segment
      video.currentTime = segment.start;
      ignoredSegments.add(segment.uuid);
      toast.remove();
    });

    const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    if (player) {
      player.appendChild(toast);
    } else {
      document.body.appendChild(toast);
    }

    toastElement = toast;

    // Fade out after 4 seconds
    toastTimer = setTimeout(() => {
      toast.classList.add('fading');
      setTimeout(() => {
        if (toastElement === toast) {
          toast.remove();
          toastElement = null;
        }
      }, 300);
    }, 4000);
  }

  /**
   * Monitor video playback time and skip registered sponsor segments
   */
  function setupVideoTracker(video) {
    if (!video || video.__ultrablockTracked) return;
    video.__ultrablockTracked = true;

    video.addEventListener('timeupdate', () => {
      if (!isEnabled || activeSegments.length === 0) return;

      const currentTime = video.currentTime;

      for (let i = 0; i < activeSegments.length; i++) {
        const seg = activeSegments[i];
        if (ignoredSegments.has(seg.uuid)) continue;

        // Check if currently within segment range
        if (currentTime >= seg.start && currentTime < (seg.end - 0.5)) {
          // Perform clean jump
          video.currentTime = seg.end;
          showSkipToast(seg, video);

          // Report sponsor skip statistic
          try {
            chrome.runtime.sendMessage({
              action: 'incrementStats',
              type: 'sponsorsSkipped',
              count: 1
            });
          } catch (e) {}
          break;
        }
      }
    });
  }

  /**
   * Load segments for current video
   */
  async function loadVideoSegments() {
    const videoId = getVideoId();
    if (!videoId) return;

    if (videoId === currentVideoId && activeSegments.length > 0) return;

    currentVideoId = videoId;
    activeSegments = [];
    ignoredSegments.clear();

    const segments = await fetchSponsorSegments(videoId);
    activeSegments = segments;

    const video = document.querySelector('#movie_player video') || document.querySelector('video');
    if (video) {
      setupVideoTracker(video);
    }
  }

  /**
   * Initialize SponsorBlock detector
   */
  function initSponsorSkipper() {
    loadVideoSegments();

    // Check on navigation
    window.addEventListener('yt-navigate-finish', () => {
      loadVideoSegments();
    });

    // Check periodically for delayed video element attachment
    setInterval(() => {
      const video = document.querySelector('#movie_player video') || document.querySelector('video');
      if (video && !video.__ultrablockTracked) {
        setupVideoTracker(video);
      }
    }, 1000);
  }
})();
