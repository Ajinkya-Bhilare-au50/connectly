# Connectly --- UI Design System

> **Document:** DDEsign.md\
> **Product:** Connectly --- social networking web application\
> **Design direction:** Clean, modern, friendly, accessible,
> blue-and-white interface\
> **Reference:** User-provided social networking dashboard image and
> generated UI concept

------------------------------------------------------------------------

## 1. Design vision

Connectly is a social networking platform for sharing updates, photos,
videos, interests, and conversations. The interface should feel familiar
and approachable while remaining polished and consistent.

### Core principles

-   **Clarity:** Make navigation, content, and actions easy to
    understand.
-   **Consistency:** Reuse spacing, typography, colors, and component
    patterns.
-   **Hierarchy:** Give posts and primary actions the strongest visual
    emphasis.
-   **Accessibility:** Support keyboard navigation, readable contrast,
    and clear focus states.
-   **Responsiveness:** Adapt the desktop three-column layout to tablets
    and mobile screens.
-   **Feedback:** Show clear loading, success, error, empty, and
    disabled states.

## 2. Visual direction

-   Light, neutral page background.
-   White surfaces for cards, panels, and navigation.
-   Blue as the primary action and selection color.
-   Subtle borders and soft shadows; avoid heavy outlines.
-   Rounded corners, consistent iconography, and generous whitespace.
-   Use gradients sparingly for decorative authentication artwork and
    selected highlights.
-   Keep content density comfortable; do not crowd the feed.

## 3. Color system

Use semantic tokens rather than hard-coded colors throughout components.

  Token                Suggested value Usage
  ------------------ ----------------- -----------------------------------------
  `primary-50`               `#EFF6FF` Selected backgrounds, subtle highlights
  `primary-100`              `#DBEAFE` Hover backgrounds
  `primary-500`              `#3B82F6` Secondary blue accents
  `primary-600`              `#2563EB` Primary buttons and links
  `primary-700`              `#1D4ED8` Pressed states
  `text-primary`             `#111827` Main headings and body text
  `text-secondary`           `#6B7280` Metadata and supporting text
  `text-muted`               `#9CA3AF` Placeholders and low-emphasis labels
  `surface`                  `#FFFFFF` Cards, panels, menus
  `page`                     `#F8FAFC` Application background
  `border`                   `#E5E7EB` Dividers, input borders
  `success`                  `#16A34A` Successful actions
  `warning`                  `#D97706` Warnings
  `danger`                   `#DC2626` Destructive actions and errors

### Color usage rules

-   Use `primary-600` for the main call to action.
-   Use blue-tinted backgrounds for active navigation and selected
    controls.
-   Use neutral text for most content; reserve accent colors for
    meaningful actions.
-   Ensure text and interactive controls meet WCAG AA contrast targets.
-   Never communicate status through color alone; include text or an
    icon.

## 4. Typography

**Recommended font:** Inter. Use a system sans-serif fallback.

  Style            Size   Weight   Line height Usage
  ------------- ------- -------- ------------- -------------------------
  Display         36 px      700          1.15 Authentication headline
  H1              30 px      700           1.2 Page title
  H2              24 px      650           1.3 Section title
  H3              18 px      600          1.35 Card or panel title
  Body            14 px      400           1.5 Main interface text
  Body strong     14 px      600           1.5 Names and emphasis
  Small           12 px      400          1.45 Timestamps and metadata
  Button          14 px      600             1 Button labels

### Typography rules

-   Use sentence case for labels and navigation.
-   Keep paragraph line lengths comfortable.
-   Use medium or semibold weights for names and section headings.
-   Use muted text for timestamps, handles, and secondary metadata.
-   Avoid using many font sizes within one card.

## 5. Spacing system

Use an 8-point spacing system, with 4 px available for fine adjustments.

  Token          Value Typical use
  ------------ ------- ---------------------------------------
  `space-1`       4 px Icon-to-label micro gap
  `space-2`       8 px Compact internal spacing
  `space-3`      12 px Input and metadata gaps
  `space-4`      16 px Standard component padding
  `space-6`      24 px Card padding and section gaps
  `space-8`      32 px Major section separation
  `space-10`     40 px Large layout separation
  `space-12`     48 px Authentication and page-level spacing
  `space-16`     64 px Large decorative or hero spacing

### Spacing rules

-   Standard card padding: 20--24 px.
-   Standard form field gap: 16 px.
-   Label-to-input gap: 6--8 px.
-   Feed post vertical gap: 12--16 px.
-   Major page section gap: 24--32 px.
-   Keep spacing values tokenized; avoid arbitrary one-off values.

## 6. Layout and grid

### Desktop application shell

Use a centered application container with a maximum width of
approximately 1280 px.

  Region              Width guidance Behavior
  ----------------- ---------------- --------------------------------------
  Left navigation        220--240 px Fixed or sticky within the app shell
  Main feed              640--720 px Flexible; primary content
  Right sidebar          300--320 px Suggestions and trends
  Column gap               16--24 px Consistent separation

The three-column layout should shrink gracefully. The feed is the
priority and should retain a usable minimum width.

### Responsive breakpoints

  ------------------------------------------------------------------------
  Breakpoint                                   Width Layout behavior
  --------------------- ---------------------------- ---------------------
  Mobile                                Below 640 px Single-column feed;
                                                     compact bottom
                                                     navigation

  Tablet                                640--1023 px Feed plus
                                                     compact/collapsible
                                                     navigation; hide
                                                     right sidebar

  Desktop                              1024--1279 px Navigation and feed;
                                                     right panel may be
                                                     hidden based on
                                                     available width

  Wide desktop                     1280 px and above Full three-column
                                                     layout
  ------------------------------------------------------------------------

### Responsive rules

-   Prevent horizontal page scrolling.
-   On mobile, use a compact top bar and/or bottom navigation.
-   Hide nonessential right-sidebar modules on smaller screens.
-   Keep touch targets at least 44 × 44 px where practical.
-   Make dialogs and forms fit within the viewport.
-   Use fluid widths and sensible max-widths rather than fixed page
    widths.

## 7. Authentication screens

Authentication pages should use a split layout on desktop and a
single-column layout on mobile.

### 7.1 Sign-in screen

**Purpose:** Allow an existing member to access their account.

#### Structure

1.  Brand mark and Connectly wordmark.
2.  Welcome heading and short supporting text.
3.  Email or username field.
4.  Password field with show/hide control.
5.  Remember-me checkbox.
6.  Forgot-password link.
7.  Primary Sign In button.
8.  Optional social sign-in divider and provider buttons.
9.  Link to the Sign Up page.
10. Optional illustration panel with a short brand message.

#### Field behavior

-   Email/username: required; trim leading and trailing whitespace.
-   Password: required; masked by default.
-   Show/hide password control must have an accessible label.
-   Remember me: optional checkbox.
-   Forgot password: opens the password recovery flow.
-   Sign In: disabled while submitting; show progress feedback.
-   Invalid credentials: show a concise, non-revealing error message.

#### Suggested copy

-   Heading: **Welcome Back**
-   Supporting text: **Sign in to continue to Connectly.**
-   Primary action: **Sign In**
-   Footer: **Don't have an account? Sign Up**

### 7.2 Sign-up screen

**Purpose:** Create a new Connectly account.

#### Structure

1.  Brand mark and wordmark.
2.  Create-account heading and supporting text.
3.  Full name field.
4.  Email field.
5.  Username field.
6.  Password field.
7.  Confirm password field, if required by the chosen authentication
    flow.
8.  Terms of Service and Privacy Policy acceptance.
9.  Primary Sign Up button.
10. Optional social sign-up providers.
11. Link to the Sign In page.
12. Optional illustration panel.

#### Validation guidance

-   Full name: required; apply reasonable length limits.
-   Email: required; validate email format and verify ownership through
    the selected account flow.
-   Username: required; enforce uniqueness and an agreed character
    policy.
-   Password: required; enforce the application's documented password
    policy.
-   Confirm password: must match the password.
-   Terms acceptance: required before account creation.
-   Display validation next to the relevant field.
-   Preserve safe form values after a validation error; never repopulate
    password fields unnecessarily.

### 7.3 Password recovery

-   Ask for the account email address.
-   Show a neutral confirmation that explains the next step without
    revealing whether an account exists.
-   Provide clear success, error, and resend states.
-   Password-reset links or codes must expire and be single-use.

### Authentication layout guidance

-   Desktop: form panel and illustration panel side by side.
-   Mobile: show the form first; remove or simplify decorative artwork.
-   Suggested form max-width: 420 px.
-   Suggested panel padding: 32--48 px on desktop and 20--24 px on
    mobile.
-   Inputs and buttons should use the same dimensions across sign-in and
    sign-up.

## 8. Main home dashboard

### 8.1 Application header

Include:

-   Connectly logo.
-   Current page title or breadcrumb.
-   Search field.
-   Theme control if dark mode is supported.
-   Notifications shortcut.
-   Current-user avatar and account menu.

Header height guidance: 64--72 px.

### 8.2 Left navigation

Recommended items:

-   Home
-   Explore
-   Notifications
-   Messages
-   Bookmarks
-   Lists
-   Profile
-   More
-   Create Post

Navigation rules:

-   Use a consistent icon set and 20--22 px icon size.
-   Active item uses a light primary background and primary-colored
    icon/text.
-   Keep labels visible on desktop.
-   Provide clear hover, focus, and active states.
-   On smaller screens, collapse navigation or move key destinations to
    a bottom bar.

### 8.3 Main feed

The feed is the primary content area.

#### Composer card

Include:

-   Current user's avatar.
-   Text prompt: "What's on your mind?"
-   Text entry area.
-   Optional actions: Photo, Video, Poll, Event.
-   Primary Post button.

Behavior:

-   Validate that the post contains supported content.
-   Show upload progress for media.
-   Allow the user to cancel an upload before publishing.
-   Disable duplicate submission while a post is being created.
-   Show success or error feedback.

#### Post card

Recommended hierarchy:

1.  Author avatar.
2.  Display name and username.
3.  Timestamp.
4.  More-actions menu.
5.  Post text.
6.  Optional image, video, poll, or link preview.
7.  Engagement row: comment, repost/share, like, bookmark.

Post card rules:

-   Use a white surface with subtle border.
-   Separate posts with 12--16 px vertical spacing.
-   Keep media within the card width and preserve its aspect ratio.
-   Avoid stretching images.
-   Use consistent icon sizes and hit areas.
-   Show counts next to engagement icons where useful.
-   Make like, comment, share, and bookmark states visually clear.
-   Provide a menu for actions such as edit, delete, report, or copy
    link, according to permissions.

### 8.4 Right sidebar

Recommended modules:

**Who to follow** - Suggested member avatar. - Display name and
username. - Follow/Following action. - Show more link.

**Trends for you** - Topic or hashtag. - Category or context. - Post
count, when available. - Show more link.

**Sidebar rules** - Use separate cards for each module. - Keep the
visual hierarchy quieter than the main feed. - Avoid excessive content;
show a small useful preview. - On tablet and mobile, hide or relocate
these modules.

## 9. Account menu and sign-out

Open the account menu from the user's avatar.

Recommended menu items:

-   Profile
-   Settings
-   Switch account, if supported
-   Help & Support
-   Sign Out

### Sign-out behavior

-   Sign Out should be visually distinct from ordinary navigation items.
-   End the authenticated session securely.
-   Redirect to the sign-in screen or public landing page.
-   Clear client-side authenticated state and protected cached data as
    appropriate.
-   If the sign-out action fails, show an error and allow retry.
-   Do not show a confirmation dialog for every sign-out unless the
    product requires it.

## 10. Component specifications

  -----------------------------------------------------------------------
  Component               Recommended dimensions  Styling
  ----------------------- ----------------------- -----------------------
  Primary button          44 px height            Primary blue, white
                                                  text, 10--12 px radius

  Secondary button        40--44 px height        White surface, neutral
                                                  border

  Text input              44--48 px height        1 px border, 10--12 px
                                                  radius

  Search input            40--44 px height        Neutral background,
                                                  pill or 20 px radius

  Standard card           Content-driven          20--24 px padding,
                                                  12--16 px radius

  Avatar                  32 / 40 / 48 px         Circular crop

  Navigation icon         20--22 px               Consistent stroke
                                                  weight

  Dialog                  420--560 px max width   White surface, 16 px
                                                  radius

  Dropdown menu           Content-driven          8--12 px radius, subtle
                                                  shadow

  Badge                   20--24 px height        Small text, pill shape
  -----------------------------------------------------------------------

### Button variants

-   **Primary:** Main action such as Sign In, Sign Up, Post, or Create
    Post.
-   **Secondary:** Supporting action such as Cancel.
-   **Outline:** Follow or other lower-emphasis action.
-   **Ghost:** Icon buttons and low-emphasis menu actions.
-   **Danger:** Delete or destructive actions.

All buttons need default, hover, focus-visible, active, disabled, and
loading states.

### Input states

-   Default
-   Hover
-   Focus
-   Filled
-   Error
-   Disabled
-   Read-only

Use visible labels; placeholders must not replace labels.

## 11. Borders, radii, and elevation

### Radius scale

  Token               Value Usage
  --------------- --------- ---------------------------
  `radius-sm`          6 px Small controls
  `radius-md`         10 px Inputs and buttons
  `radius-lg`         12 px Cards
  `radius-xl`         16 px Large panels and dialogs
  `radius-full`     9999 px Avatars and pill controls

### Elevation

-   Default cards: subtle border; minimal shadow.
-   Menus and popovers: slightly stronger shadow.
-   Dialogs: clear separation from the page background.
-   Avoid stacking multiple heavy shadows.

Suggested shadow tokens:

``` css
--shadow-card: 0 1px 3px rgba(15, 23, 42, 0.06);
--shadow-menu: 0 8px 24px rgba(15, 23, 42, 0.12);
--shadow-dialog: 0 20px 48px rgba(15, 23, 42, 0.18);
```

## 12. Interaction and motion

-   Use short transitions, generally 150--200 ms.
-   Prefer subtle color, opacity, and shadow transitions.
-   Avoid unnecessary movement or large animated effects.
-   Respect `prefers-reduced-motion`.
-   Show clear focus rings for keyboard users.
-   Use tooltips for icon-only actions where the meaning is not obvious.
-   Confirm destructive actions when recovery is difficult.
-   Provide optimistic UI only when failure can be reconciled safely.

## 13. Accessibility requirements

Target WCAG 2.2 AA.

-   Use semantic landmarks and headings.
-   Associate every form field with a visible label.
-   Ensure full keyboard operation.
-   Keep focus order logical.
-   Make focus indicators visible.
-   Give icon-only buttons accessible names.
-   Provide alt text for meaningful images.
-   Use empty alt text for decorative images.
-   Announce important asynchronous feedback to assistive technology.
-   Do not rely on color alone to communicate state.
-   Maintain readable text contrast and usable zoom behavior.
-   Provide captions or equivalent alternatives for video content where
    applicable.

## 14. Content and empty states

Design explicit states for:

-   Empty feed.
-   No search results.
-   No notifications.
-   No messages.
-   No bookmarks.
-   No suggested members.
-   Failed media upload.
-   Offline or network error.
-   Loading feed and profile data.

Each empty state should include a concise explanation and, when useful,
one clear next action. Use skeletons for content loading rather than
large layout shifts.

## 15. Dark mode readiness

The initial visual direction is light mode. If dark mode is implemented:

-   Use semantic color tokens so themes can be swapped centrally.
-   Use dark neutral surfaces rather than pure black everywhere.
-   Recheck contrast for text, borders, icons, and focus rings.
-   Preserve the same spacing, component geometry, and hierarchy.
-   Do not simply invert all colors.

## 16. Suggested CSS design tokens

``` css
:root {
  --color-primary: #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-soft: #EFF6FF;

  --color-page: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #111827;
  --color-text-secondary: #6B7280;
  --color-border: #E5E7EB;

  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  --header-height: 68px;
  --sidebar-width: 240px;
  --right-panel-width: 320px;
  --app-max-width: 1280px;

  --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-menu: 0 8px 24px rgba(15, 23, 42, 0.12);
}
```

## 17. Recommended implementation conventions

-   Build reusable components for buttons, inputs, avatars, cards,
    dropdowns, dialogs, and navigation.
-   Keep design tokens in one central theme file.
-   Use consistent icon libraries and avoid mixing icon styles.
-   Separate layout components from data-fetching and business logic.
-   Use shared validation schemas for client and server where
    appropriate.
-   Ensure protected routes check authentication on the server as well
    as the client.
-   Use responsive utility classes or clearly named layout variants.
-   Keep loading, error, empty, and success states in each feature
    specification.
-   Test the interface at mobile, tablet, laptop, and wide desktop
    sizes.

## 18. Acceptance checklist

### Authentication

-   [ ] Sign-in screen matches the visual system.
-   [ ] Sign-up screen includes all required fields and validation.
-   [ ] Password visibility control works accessibly.
-   [ ] Forgot-password flow has success and error states.
-   [ ] Authentication forms work on mobile and desktop.

### Home dashboard

-   [ ] Desktop layout has navigation, feed, and right sidebar.
-   [ ] Mobile layout does not overflow horizontally.
-   [ ] Active navigation is clearly indicated.
-   [ ] Composer supports text and configured media types.
-   [ ] Post cards support the available engagement actions.
-   [ ] Sidebar modules collapse appropriately on smaller screens.

### Account and usability

-   [ ] Account menu opens and closes predictably.
-   [ ] Sign-out ends the session and redirects correctly.
-   [ ] All controls have hover, focus, active, and disabled states.
-   [ ] Loading, empty, and error states are implemented.
-   [ ] Keyboard navigation and contrast are verified.

------------------------------------------------------------------------

**Design baseline:** Build the interface around the 8-point spacing
scale, a 1280 px desktop container, a 240 px left navigation, a 640--720
px feed, and a 320 px right panel. Treat these as starting design
constraints and adapt them responsively rather than forcing fixed widths
on smaller screens.
