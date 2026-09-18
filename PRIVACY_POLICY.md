# Privacy Policy for UltraBlock

**Last updated: September 18, 2026**

This Privacy Policy describes how **UltraBlock** ("we", "us", or "our") handles user information when you use the UltraBlock browser extension ("the Extension").

---

## 1. Zero Data Collection
UltraBlock is built on the fundamental principle of user privacy. **We do not collect, store, track, sell, or transmit any personal data.**
- We do not require any user account or registration.
- We do not log your browsing history, visited URLs, or search queries.
- We do not collect device identifiers, IP addresses, or telemetry.
- We do not use third-party analytics or tracking SDKs.

---

## 2. Local-Only Execution
All ad blocking, cosmetic filtering, and content processing are performed **strictly locally on your device**:
- **Declarative Net Request (`declarativeNetRequest`)**: Network filtering rules are evaluated directly by the browser engine without routing traffic through proxy servers.
- **Local Storage (`storage`)**: Your configuration settings (such as custom whitelisted domains, category preferences, and block counters) are stored exclusively in your browser's local sandbox and are never uploaded to any remote server.
- **Active Tab Inspection (`tabs`)**: Used solely to determine the hostname of the current page so that you can toggle per-site whitelisting via the popup dashboard.
- **Host Permissions (`<all_urls>`)**: Required solely to inject cosmetic stylesheets and content filters that hide visual advertisement wrappers across web pages.

---

## 3. Third-Party Services
- **SponsorBlock API**: When you play a video, the extension queries the open, community-driven SponsorBlock database (`sponsor.ajay.app`) using an anonymized SHA-256 hash prefix of the public video ID. No cookies, authentication tokens, or personal identifiers are ever sent.

---

## 4. Compliance with Google Developer Program Policies
In strict compliance with Google Chrome Web Store Developer Program Policies:
1. We do not sell or transfer user data to third parties.
2. We do not use user data for purposes unrelated to the extension's single purpose.
3. We do not use user data to determine creditworthiness or for lending purposes.

---

## 5. Changes to This Policy
If this Privacy Policy is updated, the revised version will be published directly to this repository.

---

## 6. Contact
If you have any questions about this Privacy Policy, you may contact the developer at:
- **Email**: `alij93695@gmail.com`
- **GitHub**: [https://github.com/Alij93695/ultrablock-adblocker](https://github.com/Alij93695/ultrablock-adblocker)
