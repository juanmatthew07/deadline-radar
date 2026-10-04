# DESIGN.md

Goal: a polished, modern productivity app in the spirit of Linear or Todoist, made by a person. Cards, colour, and light icons are welcome. What makes an interface look machine-generated is listed under "Forbidden". Everything else is allowed when it is consistent and restrained.

## Layout
- Page background is --color-surface. Content sits on --color-surface-raised cards.
- The top bar spans the full width (raised surface, 1px bottom border). Its content and all page content live in a centred container: max width --container-max, horizontal padding --space-4 on mobile and --space-6 from 768px up. Content is never left-aligned in a narrow column on a wide screen.
- Mobile first, single column. Spacing uses the 4px token scale. Cards in a list are separated by --space-3.

## Colour
- One accent hue: teal (--color-accent), used for primary buttons, the focus ring, links, and selected states. Neutral cool grays for everything else.
- Urgency uses tinted badges. Each level has a foreground, a background, and a strip token: overdue is red, due today is amber, this week is teal, later is gray, done is green.
- Danger red is for destructive actions and errors only.
- No other hues. Text and control colours meet WCAG AA.

## Elevation and shape
- Cards: --color-surface-raised, 1px --color-border, --radius-md, --shadow-card. When a card is interactive, hover adds --shadow-card-hover and --color-border-strong.
- Controls (buttons, inputs, selects) use --radius-sm. Badges use --radius-pill. The dialog uses --radius-lg.
- Only three shadow tokens exist: --shadow-card, --shadow-card-hover, --shadow-overlay. --shadow-overlay is used only by the delete dialog. Shadows are neutral and soft, never coloured.

## Icons
- Library: lucide-react, used ONLY through src/components/Icon.jsx (a small wrapper) and src/components/icons.js (the explicit list of allowed icons). Never import from "lucide-react" anywhere else.
- Style: outline, strokeWidth 1.75, size 18 (16 inside metadata rows, 32 in empty and error states), colour currentColor, aria-hidden.
- Allowed icons: Plus, Search, Calendar, BookOpen, Pencil, Trash2, ArrowLeft, Check, TriangleAlert, ClipboardList, Download, Upload, X.
- Icons always sit next to a text label. The only exception is a control that has an aria-label.
- Icons are never placed inside coloured circles or squares, never used as feature-card headers, and one label gets at most one icon.

## Typography
- System font stack, no web fonts. Hierarchy comes from size and weight: headings semibold, task titles semibold, metadata small and muted. Tabular numbers for dates and counts. Sentence case.

## Components
- Buttons: primary (accent fill, white text, darker on hover), secondary (raised surface, 1px control border, normal text colour), danger (raised surface, 1px danger border, danger text). A filled danger button is allowed only for the confirm button inside the delete dialog. Minimum height 44px, icon and label separated by --space-2.
- Urgency badge: pill with the tint background, the foreground colour, and the text label (Terlambat, Hari ini, Minggu ini, Nanti, Selesai). Colour is never the only signal.
- Task card: 4px left strip in the urgency strip colour; first line has the title and the badge aligned right; a muted metadata line below (course with BookOpen, deadline with Calendar, status as a small outlined label). A done task has a muted title with line-through and shows no separate status label, because the badge already says Selesai.
- Summary strip (milestone M8): a row of five small stat tiles, each with a number and the urgency label, wrapping on narrow screens.
- Forms: card container, labels above fields, inputs with a 1px --color-border-control border and an accent focus ring. Invalid inputs get a --color-danger border and the message below. Two-column rows from 640px up, single column on mobile.
- Notice banner: small block with --color-accent-soft background, a 1px --color-accent-border border, a Check icon, and the message, with role status.
- States: loading uses static skeleton cards (muted blocks, no shimmer) plus the text "Memuat tugas..."; empty is a card with one muted ClipboardList icon, a title, one sentence, and one primary button; error is a card with TriangleAlert in the danger colour, the message, and a secondary "Coba lagi" button.
- Motion: only colour, border-color, and box-shadow transitions of at most 150ms. Respect prefers-reduced-motion.

## Forbidden
- Emoji anywhere (UI, copy, comments).
- Gradients of any kind, glassmorphism, blur effects, glow, coloured shadows.
- Purple, violet, pink, blue-to-purple schemes, or more than one accent hue.
- Icons inside coloured circles or squares, icon-led feature grids, decorative illustrations.
- Marketing hero sections, taglines, "Selamat datang" banners, exclamation marks in copy.
- Border radius above 14px (pill badges excepted), heavy shadows, shadows on anything other than cards, the delete dialog, and interactive hover states.
- Placeholder text such as lorem ipsum or "Task 1".
- Animation beyond the 150ms transitions above (no bounce, scale, pulse, or shimmer).
- Hard-coded colours, sizes, radii, or shadows outside tokens.css.

## Copy rules (Bahasa Indonesia)
- Short, direct, neutral. Say what happened and what to do next. Buttons are verbs. The delete confirmation names the task and states it cannot be undone.

## Accessibility
- Every input has a visible label and an inline message. Visible focus on all interactive elements. Touch targets at least 44px. Urgency and status are always conveyed in text. Contrast meets WCAG AA.
