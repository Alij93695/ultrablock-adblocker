/**
 * UltraBlock - YouTube Main World Interceptor
 * Injected in the MAIN world at document_start.
 * Directly sanitizes network payloads and player configurations before YouTube can schedule ads.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__ultrablock_main_injected) return;
  window.__ultrablock_main_injected = true;

  const YOUTUBE_PLAYER_ENDPOINTS = [
    '/youtubei/v1/player',
    '/get_watch',
    '/get_video_info'
  ];

  /**
   * Recursively sanitizes any ad fields from YouTube's player response JSON
   */
  function sanitizePlayerResponse(data) {
    if (!data || typeof data !== 'object') return false;

    // Microsecond fast-bailout: if no ad keys exist, exit immediately
    if (!('adSlots' in data) && !('playerAds' in data) && !('adPlacements' in data) && !('adBreakHeartbeatParams' in data) && !data.playerResponse && !data.playerConfig && !data.messages) {
      return false;
    }

    let modified = false;

    // Prune top-level ad definitions
    if ('adSlots' in data) {
      delete data.adSlots;
      modified = true;
    }
    if ('playerAds' in data) {
      delete data.playerAds;
      modified = true;
    }
    if ('adPlacements' in data) {
      delete data.adPlacements;
      modified = true;
    }
    if ('adBreakHeartbeatParams' in data) {
      delete data.adBreakHeartbeatParams;
      modified = true;
    }

    // Remove muteOnStart if YouTube set it for an ad
    if (data.playerConfig && data.playerConfig.audioConfig && data.playerConfig.audioConfig.muteOnStart) {
      delete data.playerConfig.audioConfig.muteOnStart;
      modified = true;
    }

    // Remove "Are you still there?" dialog blockers
    if (data.messages && Array.isArray(data.messages)) {
      data.messages.forEach(msg => {
        if (msg && msg.youThereRenderer) {
          delete msg.youThereRenderer;
          modified = true;
        }
      });
    }

    // If wrapped in playerResponse (e.g. initial desktop watch response)
    if (data.playerResponse && typeof data.playerResponse === 'object') {
      if (sanitizePlayerResponse(data.playerResponse)) {
        modified = true;
      }
    }

    return modified;
  }

  /**
   * 1. Intercept window.ytInitialPlayerResponse
   */
  let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get() {
        return _ytInitialPlayerResponse;
      },
      set(val) {
        if (val && typeof val === 'object') {
          sanitizePlayerResponse(val);
        }
        _ytInitialPlayerResponse = val;
      },
      configurable: true,
      enumerable: true
    });
  } catch (_) {}

  // If already set on page
  if (window.ytInitialPlayerResponse) {
    sanitizePlayerResponse(window.ytInitialPlayerResponse);
  }

  /**
   * 2. Intercept window.fetch
   */
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = async function (...args) {
      const resource = args[0];
      const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');

      const isPlayerEndpoint = YOUTUBE_PLAYER_ENDPOINTS.some(endpoint => url.includes(endpoint));

      const response = await originalFetch.apply(this, args);

      if (!isPlayerEndpoint) {
        return response;
      }

      try {
        const cloned = response.clone();
        const text = await cloned.text();
        if (!text || text.length === 0) return response;

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (_) {
          return response;
        }

        sanitizePlayerResponse(parsed);

        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (item && item.playerResponse) {
              sanitizePlayerResponse(item.playerResponse);
            }
          });
        }

        const sanitizedText = JSON.stringify(parsed);

        return new Response(sanitizedText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } catch (err) {
        return response;
      }
    };
  }

  /**
   * 3. Intercept XMLHttpRequest
   */
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const xhrUrlMap = new WeakMap();

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (typeof url === 'string') {
      xhrUrlMap.set(this, url);
    }
    return originalXHROpen.call(this, method, url, ...rest);
  };

  const originalResponseDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
  const originalResponseTextDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');

  if (originalResponseTextDesc && originalResponseTextDesc.get) {
    try {
      Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
        get() {
          const raw = originalResponseTextDesc.get.call(this);
          const url = xhrUrlMap.get(this) || '';
          const isPlayerEndpoint = YOUTUBE_PLAYER_ENDPOINTS.some(endpoint => url.includes(endpoint));

          if (!isPlayerEndpoint || typeof raw !== 'string' || !raw) {
            return raw;
          }

          try {
            const parsed = JSON.parse(raw);
            if (sanitizePlayerResponse(parsed)) {
              return JSON.stringify(parsed);
            }
          } catch (_) {}
          return raw;
        },
        configurable: true,
        enumerable: true
      });
    } catch (_) {}
  }

  if (originalResponseDesc && originalResponseDesc.get) {
    try {
      Object.defineProperty(XMLHttpRequest.prototype, 'response', {
        get() {
          const raw = originalResponseDesc.get.call(this);
          const url = xhrUrlMap.get(this) || '';
          const isPlayerEndpoint = YOUTUBE_PLAYER_ENDPOINTS.some(endpoint => url.includes(endpoint));

          if (!isPlayerEndpoint || !raw) {
            return raw;
          }

          if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              if (sanitizePlayerResponse(parsed)) {
                return JSON.stringify(parsed);
              }
            } catch (_) {}
          } else if (typeof raw === 'object') {
            sanitizePlayerResponse(raw);
          }
          return raw;
        },
        configurable: true,
        enumerable: true
      });
    } catch (_) {}
  }

  /**
   * 4. Intercept JSON.parse for inline player and protobuf objects
   */
  const originalJSONParse = JSON.parse;
  JSON.parse = function (...args) {
    const result = originalJSONParse.apply(this, args);
    if (result && typeof result === 'object') {
      if (result.playabilityStatus || result.responseContext || result.playerResponse || ('adSlots' in result) || ('playerAds' in result)) {
        sanitizePlayerResponse(result);
      }
    }
    return result;
  };

  /**
   * 5. Intercept Map.prototype.set to neutralize YouTube Ad Placements Map
   */
  const originalMapSet = Map.prototype.set;
  Map.prototype.set = function (key, value) {
    if (typeof key === 'string' && key.includes('AD_PLACEMENT_KIND_')) {
      return this;
    }
    if (value && typeof value === 'object' && typeof value.kind === 'string' && value.kind.includes('AD_PLACEMENT_KIND_')) {
      return this;
    }
    return originalMapSet.apply(this, arguments);
  };

  /**
   * 6. Promise.prototype.then for internal YouTube jspbResponseCtor
   */
  const originalPromiseThen = Promise.prototype.then;
  Promise.prototype.then = function (onFulfilled, onRejected) {
    if (typeof onFulfilled === 'function') {
      const fnStr = onFulfilled.toString();
      if (fnStr.includes('jspbResponseCtor') || fnStr.includes('playerResponse')) {
        const wrappedFulfilled = function (value) {
          if (value && typeof value === 'object') {
            sanitizePlayerResponse(value);
          }
          return onFulfilled.apply(this, arguments);
        };
        return originalPromiseThen.call(this, wrappedFulfilled, onRejected);
      }
    }
    return originalPromiseThen.call(this, onFulfilled, onRejected);
  };

})();
