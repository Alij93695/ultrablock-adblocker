# 🛡️ UltraBlock - Aggressive YouTube Ad & Sponsor Blocker + Web AdBlocker

**UltraBlock** is a high-performance, ultra-fast browser extension built on the latest **Google Chrome Manifest V3** standard. It completely eliminates all forms of advertisements from YouTube videos, automatically skips sponsored segments, and purges ads across all websites with **zero video startup latency** and full **cross-platform support (macOS, Windows, Linux)**.

---

## ⚡ Key Features

### 1. 🎬 Zero-Latency YouTube Ad Elimination
- **AdBlock-Grade Main-World Interception**: Injected natively into YouTube's V8 JavaScript isolate (`world: "MAIN"`, `run_at: "document_start"`) with **zero CSP violations**. Strips ad slot parameters (`adSlots`, `playerAds`, `adPlacements`) from network responses before YouTube's frontend player code ever receives them. Video playback starts immediately from 0:00 as if YouTube Premium were active.
- **Ultra-Fast Startup Optimization**: Lightweight network filtering targets only player endpoints (`/youtubei/v1/player`, `/get_watch`, `/get_video_info`), completely bypassing heavy `/browse` and `/next` recommendation payloads. Features microsecond fast-bailout checks (`< 0.001ms`).
- **Zero-Reflow DOM Engine**: Uses instant classList checks (`.ad-showing`, `.ad-interrupting`) to eliminate forced synchronous reflows during video initialization.
- **Fail-Safe Video Accelerator & One-Shot Skip**: If any server-stitched ad slips through, UltraBlock instantly mutes audio, ramps playback speed to 16x, and executes a one-shot seek to clear the ad in milliseconds without MSE buffer stalls.
- **Human-Simulated Auto-Clicker**: Automatically dispatches synthetic pointer/mouse events to click modern YouTube skip buttons without user interaction.
- **Anti-Adblock Defuser**: Neutralizes YouTube's *"Ad blockers violate YouTube's Terms of Service"* modal, removes backdrop overlays, restores scrolling, and unpauses playback automatically.
- **Layout Cleaner**: Strips out masthead banners, sponsored tiles in search results and feeds, companion ads, and overlay widgets.

### 2. ⚡ SponsorBlock Auto-Skip & Chapter Analyzer
- **Community-Powered Precision**: Integrates with the open **SponsorBlock API** (`sponsor.ajay.app`) to instantly jump past sponsored segments, self-promotions, and interaction reminders.
- **Fallback Chapter Detection**: Automatically analyzes video chapters and description timestamps for sponsorship labels ("Sponsor", "Sponsored by", "Partner", "Promo") if community segments are not yet submitted.
- **In-Player Notification with Undo**: Displays a sleek glassmorphic badge whenever a segment is skipped (e.g. `⚡ SPONSOR Skipped (01:15 - 02:30)`) with an **Undo** button to jump back if you wish to watch.

### 3. 🌐 Web-Wide Aggressive Ad Filtering
- **Network Level Blocking (`declarativeNetRequest`)**: Pre-emptively drops network requests to over 50 major ad networks, tracking endpoints, and video ad servers (Google DoubleClick, AdSense, Taboola, Outbrain, Criteo, PopAds, Amazon Adsystem, Moatads, etc.).
- **Cosmetic Element Purger**: Employs high-specificity CSS and an optimized `MutationObserver` to collapse ad wrappers, floating sticky banners, and injected overlays without breaking page layout.
- **Anti-Adblock Bait Neutralizer**: Simulates dummy ad objects (`window.canRunAds = true`, `window.isAdBlockActive = false`, fake `adsbygoogle` arrays) in the page context to prevent anti-adblock detection walls.

### 4. 🎛️ Premium Control Dashboard
- **Live Block Counters**: Real-time stats for Total Ads Destroyed, YouTube Ads Blocked, and Sponsors Skipped.
- **Per-Site Whitelisting**: One-click button to pause/resume ad blocking on specific websites.
- **Granular Category Toggles**: Choose whether to skip Paid Sponsors, Self-Promotion, or Interaction Reminders.

---

## 🍏 How to Install on macOS / MacBooks

UltraBlock is fully compatible with macOS across all Chromium-based browsers (**Google Chrome**, **Brave**, **Arc Browser**, **Microsoft Edge**, **Opera**, **Vivaldi**):

### Google Chrome & Brave on macOS:
1. Open Chrome or Brave.
2. In the URL address bar, enter:
   ```
   chrome://extensions
   ```
   *(For Brave: `brave://extensions`)*
3. In the top-right corner, switch the **Developer mode** toggle to **ON**.
4. In the top-left toolbar, click **Load unpacked**.
5. In the Finder file dialog, select the `adblocker-extension` folder (or the extracted folder from `ultrablock-extension-v1.0.0.zip`).
6. UltraBlock will appear in your extensions list. Click the **Extensions** (puzzle piece) icon in your toolbar and click the **Pin** icon next to UltraBlock.

### Arc Browser on macOS:
1. Open Arc.
2. Press `Cmd + T` and type `arc://extensions`, then press Enter.
3. Turn on **Developer mode** in the top right.
4. Click **Load unpacked** and select the `adblocker-extension` folder.

### Microsoft Edge on macOS:
1. In the URL address bar, navigate to:
   ```
   edge://extensions
   ```
2. In the left sidebar, turn on **Developer mode**.
3. Click **Load unpacked** and select the `adblocker-extension` folder.

---

## 🪟 How to Install on Windows

### Google Chrome & Brave:
1. Open your browser and navigate to:
   ```
   chrome://extensions
   ```
   *(For Brave: `brave://extensions`)*
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. In the top-left corner, click **Load unpacked**.
4. Select the folder:
   ```
   adblocker-extension
   ```
5. UltraBlock will appear in your extensions list and pin its shield icon to your toolbar!

### Microsoft Edge:
1. Navigate to:
   ```
   edge://extensions
   ```
2. In the left sidebar, turn on **Developer mode**.
3. Click **Load unpacked** and select the `adblocker-extension` directory.

---

## 🧪 How to Test & Verify

1. **Test YouTube Video Ads & Instant Startup**:
   - Open [YouTube](https://www.youtube.com).
   - Click on any video.
   - Notice that video playback begins **instantly** from 0:00 without buffering pauses, pre-roll ads, or banner overlays.
   - Click the UltraBlock extension icon in your toolbar to watch the YouTube Ads blocked counter increase.
2. **Test Sponsor Segment Skipping**:
   - Open any video with an integrated sponsor (e.g. Linus Tech Tips, Marques Brownlee).
   - As the video reaches the sponsored pitch, UltraBlock seamlessly jumps past it and displays a sleek **"⚡ SPONSOR Skipped"** notification with an **Undo** button.
3. **Test Generic Websites**:
   - Visit any ad-heavy website (e.g., news or gaming sites).
   - Notice banner ads, floating video overlays, and Taboola/Outbrain recommendation grids are removed cleanly.

---

## 📂 File Structure

```
adblocker-extension/
├── manifest.json                  # Manifest V3 configuration & permission grants
├── rules/
│   ├── rules.json                 # 55 declarativeNetRequest network blocking rules
│   ├── ublock-filters.json        # Compiled network rules from uBlock Origin Lite
│   └── easylist.json              # Compiled network rules from EasyList
├── background/
│   └── service_worker.js          # Background service worker (badge counts & sync)
├── content/
│   ├── youtube_main_world.js      # MAIN-world network & player response interceptor (zero latency)
│   ├── youtube_adblock.js         # Zero-reflow ad detection, 16x speeder & anti-adblock defuser
│   ├── sponsor_skip.js            # SponsorBlock API & chapter detector with toast UI
│   ├── generic_adblock.js         # Web-wide cosmetic purger & anti-adblock bait injector
│   └── injected_styles.css        # High-specificity CSS for ad suppression
├── popup/
│   ├── popup.html                 # Dashboard layout
│   ├── popup.css                  # Dark glassmorphic styling
│   └── popup.js                   # Dashboard logic & settings sync
└── icons/
    ├── icon.svg                   # Vector shield icon
    ├── icon16.png                 # Toolbar icon
    ├── icon48.png                 # Extensions page icon
    └── icon128.png                # Web store & detail icon
```
