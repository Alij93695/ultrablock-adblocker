/**
 * UltraBlock - YouTube Core Engine (MAIN World)
 * Strips adPlacements, playerAds, adSlots, and tracking before YouTube player initializes.
 * Overrides JSON.parse, Response.prototype.json, window.fetch, XMLHttpRequest, and ytInitialPlayerResponse.
 */
(function () {
  'use strict';

  function pruneAdData(data) {
    if (!data || typeof data !== 'object') return data;
    try {
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          pruneAdData(data[i]);
        }
        return data;
      }
      if ('adPlacements' in data) delete data.adPlacements;
      if ('playerAds' in data) delete data.playerAds;
      if ('adSlots' in data) delete data.adSlots;
      if ('adBreakHeartbeatParams' in data) delete data.adBreakHeartbeatParams;
      if ('playbackTracking' in data && data.playbackTracking) {
        delete data.playbackTracking.videostatsPlaybackUrl;
        delete data.playbackTracking.videostatsDelayplayUrl;
        delete data.playbackTracking.videostatsWatchtimeUrl;
      }
      if (data.playerResponse && typeof data.playerResponse === 'object') {
        pruneAdData(data.playerResponse);
      }
      if (data.raw_player_response && typeof data.raw_player_response === 'object') {
        pruneAdData(data.raw_player_response);
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

  // 2. Intercept Response.prototype.json (Catches all modern fetch JSON payloads)
  if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
    const origResponseJson = Response.prototype.json;
    Response.prototype.json = async function () {
      const result = await origResponseJson.apply(this);
      if (result && typeof result === 'object') {
        pruneAdData(result);
      }
      return result;
    };
  }

  // 3. Intercept window.ytInitialPlayerResponse
  let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
  if (_ytInitialPlayerResponse) {
    pruneAdData(_ytInitialPlayerResponse);
  }
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

  // 4. Intercept window.ytplayer
  let _ytplayer = window.ytplayer;
  try {
    Object.defineProperty(window, 'ytplayer', {
      configurable: true,
      enumerable: true,
      get() {
        return _ytplayer;
      },
      set(val) {
        try {
          if (val && val.config && val.config.args) {
            if (typeof val.config.args.raw_player_response === 'string') {
              const parsed = JSON.parse(val.config.args.raw_player_response);
              pruneAdData(parsed);
              val.config.args.raw_player_response = JSON.stringify(parsed);
            } else if (typeof val.config.args.raw_player_response === 'object') {
              pruneAdData(val.config.args.raw_player_response);
            }
          }
        } catch (err) {}
        _ytplayer = val;
      }
    });
  } catch (e) {}

  // 5. Intercept fetch() for /youtubei/v1/player, /browse, /next
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = (args[0] && typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url ? args[0].url : '');
      if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/browse') || url.includes('/youtubei/v1/next'))) {
        const originalJson = response.json.bind(response);
        response.json = async function () {
          const data = await originalJson();
          return pruneAdData(data);
        };
      }
    } catch (e) {}
    return response;
  };

  // 6. Intercept XMLHttpRequest for InnerTube requests
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

  // 7. Native moviePlayer skipAd helper (MAIN World Direct Access)
  function tryNativeSkip() {
    try {
      const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      if (player) {
        if (typeof player.skipAd === 'function') {
          player.skipAd();
        }
        if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
          if (typeof player.cancelPlayback === 'function') player.cancelPlayback();
        }
      }
    } catch (e) {}
  }

  setInterval(tryNativeSkip, 200);
})();
