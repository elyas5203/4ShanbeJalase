## 2026-07-03 - [Keyboard Accessibility for Custom Components]
**Learning:** This application uses many custom elements (divs and spans) with click listeners instead of native buttons. These are not focusable by default and cannot be activated via keyboard, which is a major accessibility barrier.
**Action:** Always ensure custom interactive elements have `role="button"` and `tabindex="0"`, and implement a global keyboard listener for `Enter` and `Space` keys to bridge the gap when native buttons are not used.

## 2026-07-03 - [Early Theme Application]
**Learning:** Applying dark mode via JavaScript after the full DOM load causes a visible "light mode flash" (FOUC).
**Action:** Place a small inline script immediately after the `<body>` tag to check `localStorage` and apply the theme class before the rest of the page renders.
