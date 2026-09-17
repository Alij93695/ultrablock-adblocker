# 🛡️ UltraBlock - Aggressive YouTube Ad & Sponsor Blocker + Web AdBlocker

**UltraBlock** is a high-performance, aggressive browser extension built on the latest **Google Chrome Manifest V3** standard. It completely eliminates all forms of advertisements from YouTube videos, automatically skips sponsored segments, and purges ads across all websites.

---

## ⚡ Key Features

### 1. 🎬 Extreme YouTube Ad Destroyer
- **0ms Video Ad Elimination**: Automatically detects pre-roll, mid-roll, and post-roll video ads, mutes audio, boosts playback speed to 16x, and instantly jumps to the end of the ad.
- **Auto-Clicker**: Automatically clicks modern YouTube skip buttons (`.ytp-ad-skip-button`, `.ytp-skip-ad-button-modern`, etc.) without requiring user input.
- **Anti-Adblock Defuser**: Neutralizes YouTube's *"Ad blockers violate YouTube's Terms of Service"* modal, removes backdrop overlays, restores scrolling, and unpauses the video automatically.
- **Layout Cleaner**: Strips out masthead banners, sponsored tiles in search results and feeds, companion ads, and overlay widgets.

### 2. ⚡ SponsorBlock Auto-Skip & Chapter Analyzer
- **Community-Powered Precision**: Integrates with the open **SponsorBlock API** (`sponsor.ajay.app`) to instantly jump past sponsored segments, self-promotions, and interaction reminders.
- **Fallback Chapter Detection**: Automatically analyzes video chapters and description timestamps for sponsorship labels ("Sponsor", "Sponsored by", "Partner", "Promo") if community segments are not yet submitted.
- **In-Player Notification with Undo**: Displays a sleek glassmorphic badge whenever a segment is skipped (e.g. `⚡ SPONSOR Skipped (01:15 - 02:30)`) with an **Undo** button to jump back if you wish to watch.

### 3. 🌐 Web-Wide Aggressive Ad Filtering
- **Network Level Blocking (`declarativeNetRequest`)**: Pre-emptively drops network requests to over 50 major ad networks, tracking endpoints, and video ad servers (Google DoubleClick, AdSense, Taboola, Outbrain, Criteo, PopAds, Amazon Adsystem, Moatads, etc.).
- **Cosmetic Element Purger**: Employs high-specificity CSS and a high-frequency `MutationObserver` to collapse ad wrappers, floating sticky banners, and injected overlays without breaking page layout.
- **Anti-Adblock Bait Neutralizer**: Simulates dummy ad objects (`window.canRunAds = true`, `window.isAdBlockActive = false`, fake `adsbygoogle` arrays) in the page context to prevent anti-adblock detection walls.

### 4. 🎛️ Premium Control Dashboard
- **Live Block Counters**: Real-time stats for Total Ads Destroyed, YouTube Ads Blocked, and Sponsors Skipped.
- **Per-Site Whitelisting**: One-click button to pause/resume ad blocking on specific websites.
- **Granular Category Toggles**: Choose whether to skip Paid Sponsors, Self-Promotion, or Interaction Reminders.

---

## 🚀 How to Install (Load Unpacked)

The extension is ready to load directly into any Chromium-based browser (**Google Chrome**, **Brave**, **Microsoft Edge**, **Opera**, **Vivaldi**):

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
   c:\Users\alij9\OneDrive\Desktop\Personal Dev\Game part\adblocker-extension
   ```
5. **UltraBlock** will appear in your extensions list and pin its shield icon to your toolbar!

### Microsoft Edge:
1. Navigate to:
   ```
   edge://extensions
   ```
2. In the left sidebar, turn on **Developer mode**.
3. Click **Load unpacked** and select the `adblocker-extension` directory.

---

## 🧪 How to Test & Verify

1. **Test YouTube Video Ads**:
   - Open [YouTube](https://www.youtube.com).
   - Play ad-heavy videos or music playlists.
   - Notice that video ads are either blocked at the network level or skipped in under 50 milliseconds without sound.
   - Watch the YouTube Ads counter in the popup increase.
2. **Test Sponsor Segment Skipping**:
   - Open any popular tech or gaming YouTube video that features an integrated sponsor (e.g. Linus Tech Tips, Marques Brownlee, etc.).
   - As the video reaches the sponsored pitch, UltraBlock will seamlessly jump past it and display a sleek **"⚡ SPONSOR Skipped"** notification in the corner of the player with an **Undo** button.
3. **Test Generic Websites**:
   - Visit any ad-heavy website (e.g. news or gaming sites).
   - Notice banner ads, floating bottom video players, and Taboola/Outbrain recommendation grids are removed.
   - Click the UltraBlock extension icon in your browser toolbar to check the live counter.

---

## 📂 File Structure

```
adblocker-extension/
├── manifest.json                  # Manifest V3 configuration & permission grants
├── rules/
│   └── rules.json                 # 55 declarativeNetRequest network blocking rules
├── background/
│   └── service_worker.js          # Background service worker (badge counts & sync)
├── content/
│   ├── youtube_adblock.js         # YouTube video ad speeder/skipper & anti-adblock defuser
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
