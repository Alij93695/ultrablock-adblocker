/**
 * UltraBlock - YouTube Core Engine (MAIN World)
 * Strips adPlacements, playerAds, and adSlots before the YouTube player initializes.
 * Overrides JSON.parse, window.fetch, and ytInitialPlayerResponse.
 */
(function () {
  'use strict';

  function pruneAdData(data) {
    if (!data || typeof data !== 'object') return data;
    try {
      if (data.adPlacements) delete data.adPlacements;
      if (data.playerAds) delete data.playerAds;
      if (data.adSlots) delete data.adSlots;
      if (data.adBreakHeartbeatParams) delete data.adBreakHeartbeatParams;
      if (data.playerResponse && typeof data.playerResponse === 'object') {
        pruneAdData(data.playerResponse);
      }
    } catch (e) {}
    return data;
  }

  // 1. Intercept JSON.parse
  const originalJsonParse = JSON.parse;
  JSON.parse = function (...args) {
    const result = originalJsonParse.apply(this, args);
    if (result && typeof result === 'object') {
      pruneAdData(result);
    }
    return result;
  };

  // 2. Intercept window.ytInitialPlayerResponse
  let _ytInitialPlayerResponse = undefined;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      enumerable: true,
      get() {
        return _ytInitialPlayerResponse;
      },
      set(val) {
        _ytInitialPlayerResponse = pruneAdData(val);
      }
    });
  } catch (e) {
    if (window.ytInitialPlayerResponse) {
      pruneAdData(window.ytInitialPlayerResponse);
    }
  }

  // 3. Intercept fetch() for /youtubei/v1/player
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = (args[0] && typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url ? args[0].url : '');
      if (url && url.includes('/youtubei/v1/player')) {
        const originalJson = response.json.bind(response);
        response.json = async function () {
          const data = await originalJson();
          return pruneAdData(data);
        };
      }
    } catch (e) {}
    return response;
  };

  // 4. Intercept XMLHttpRequest for InnerTube player requests
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._ubUrl = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._ubUrl && typeof this._ubUrl === 'string' && this._ubUrl.includes('/youtubei/v1/player')) {
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const parsed = JSON.parse(this.responseText);
            pruneAdData(parsed);
            Object.defineProperty(this, 'responseText', {
              get() { return JSON.stringify(parsed); }
            });
            Object.defineProperty(this, 'response', {
              get() { return typeof parsed === 'string' ? parsed : JSON.stringify(parsed); }
            });
          } catch (e) {}
        }
      });
    }
    return originalSend.apply(this, args);
  };

  // 5. Native moviePlayer skipAd helper (MAIN World Direct Access)
  function tryNativeSkip() {
    try {
      const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      if (player) {
        if (typeof player.skipAd === 'function') {
          player.skipAd();
        }
        if (typeof player.stopVideo === 'function' && player.classList.contains('ad-showing')) {
          player.skipAd?.();
        }
      }
    } catch (e) {}
  }

  setInterval(tryNativeSkip, 200);
})();
