# DESIGN.md

The interface must look like a calm, purpose-built productivity tool made by a person, not like generic AI-generated output. Every rule here is checkable.

## Visual direction

Information-first and dense but readable. The task list is the main screen. No hero section, no landing page, no onboarding detour.

- **Tokens, not literals.** Plain CSS only. All values live as custom properties in one tokens file, `src/styles/tokens.css`, grouped as colors, spacing, type scale, radii, and border widths. Components reference `var(--...)` only. A hard-coded hex, pixel value, or duration inside a component is a defect. The starter tokens in `src/index.css` are replaced, not extended.
- **Spacing** is a 4px scale: 4, 8, 12, 16, 24, 32, 48. Nothing else.
- **Palette.** Neutral surfaces: off-white page, white or near-white raised surface, one or two grays for borders and secondary text. Near-black text. Exactly ONE accent color, used sparingly: primary action button, focus ring, active filter. Urgency colors are muted and appear only as small markers or text, never as large fills.
- **Typography.** System font stack, no web font imports. Hierarchy through size and weight only. Tabular numbers (`font-variant-numeric: tabular-nums`) for dates and counts so columns align. Sentence case everywhere, including titles.
- **Shape.** Border radius 4px, 6px maximum. 1px borders instead of shadows. At most one subtle shadow in the whole app, on the delete confirmation dialog, because it is an overlay.
- **Layout.** Mobile-first, single column, max content width around 720px. Top bar with the app name, search, and the add button. Then a summary strip. Then a filter row. Then the task list as rows: title, course, deadline, urgency label, status. Detail and edit open as a panel or page, never as a modal stack.

## Forbidden

- Emoji anywhere: UI, code comments, commit text, copy, or docs.
- Gradients, glassmorphism, glow effects, blurred blobs, decorative illustrations, stock imagery.
- Purple-to-blue colour schemes.
- Icons inside coloured circles, icon-led feature cards, or any icon library. Use plain text labels. Inline SVG only when a control truly needs a symbol, kept simple.
- Centred hero sections, marketing copy, taglines, "Selamat datang" banners, or exclamation marks in copy.
- Uniform grids of identical rounded cards with shadows.
- Placeholder text such as lorem ipsum, "Task 1", or "Tugas 1".
- Animations beyond short, under 150ms, opacity or colour transitions. Respect `prefers-reduced-motion`.

## Copy rules (Bahasa Indonesia)

Short, direct, neutral. Say what happened, then what to do next. No filler, no enthusiasm.

- Empty: "Belum ada tugas. Tambah tugas pertamamu."
- No search results: "Tidak ada tugas yang cocok."
- Failure: "Gagal menyimpan. Coba lagi."
- Success, inline: "Tugas disimpan."
- Buttons are verbs: "Simpan", "Hapus", "Tambah tugas", "Batal", "Ulangi".
- Delete confirmation names the task and states it cannot be undone: "Hapus tugas 'Esai Fisika'? Tindakan ini tidak dapat dibatalkan."
- Urgency labels: "Terlambat", "Hari ini", "Minggu ini", "Nanti", "Selesai".
- Status labels: "Belum", "Dikerjakan", "Selesai".
- Validation messages sit under the field and say how to fix it: "Judul wajib diisi."

## States and accessibility

- Loading: simple text or skeleton rows. Never a spinner alone.
- Empty: state the reason and offer one action.
- Error: state the problem and offer retry.
- Success: short inline message. No celebratory toast, no confetti, no "Berhasil!".
- Urgency is never colour alone. Always a text label next to any colour marker.
- Every input has a visible label, not a placeholder as a substitute, and an inline validation message linked to the field.
- Visible focus style on every interactive element: 2px accent outline with offset.
- Touch targets at least 44px high.
- Text contrast meets WCAG AA. Check muted greys and muted urgency colours, not only pure black on white.