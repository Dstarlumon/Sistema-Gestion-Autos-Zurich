# Design System Specification: BMG+ CRM

## 1. Overview & Creative North Star: "The Digital Architect"
The BMG+ CRM is not a static database; it is a high-performance engine for decision-making. Our Creative North Star is **"The Digital Architect."** This philosophy moves away from the "boxy" nature of traditional CRMs toward a layout that feels constructed from light, depth, and intentional hierarchy. 

We achieve a premium, custom feel by rejecting standard "card-on-gray" templates in favor of **Tonal Layering**. We use the interplay of glass-like surfaces and sophisticated typography to create an interface that feels both authoritative and breathable. The goal is "High-Tech Precision": every pixel serves a functional purpose, wrapped in an editorial aesthetic.

---

## 2. Color Theory & Surface Strategy

### The "No-Line" Rule
To achieve a modern, high-end feel, **1px solid borders are prohibited for sectioning.** Do not use lines to separate the sidebar from the main content or to divide dashboard widgets. Instead, boundaries are defined by shifting between `surface` tiers (e.g., a `surface-container-low` sidebar against a `surface` background).

### Surface Hierarchy & Nesting
We treat the UI as a series of physical layers. Use the following hierarchy to "nest" importance:
- **Base Level:** `surface` (#faf8ff) — The canvas of the application.
- **Sectioning:** `surface-container-low` (#f2f3ff) — Used for large structural areas like sidebars.
- **Primary Content:** `surface-container` (#eaedff) — The standard container for page content.
- **Elevated Interactive:** `surface-container-highest` (#dae2fd) — For active states or high-priority floating elements.

### The Glass & Gradient Rule
For floating elements (modals, dropdowns, hovering tooltips), use a **Glassmorphic effect**:
- **Background:** `surface-variant` (#dae2fd) at 70% opacity.
- **Backdrop-Blur:** 12px to 20px.
- **Accent:** A subtle linear gradient (Top-Left to Bottom-Right) from `primary` (#00288e) to `primary-container` (#1e40af) for high-impact CTAs to provide "visual soul."

### Campaign Accents (The Signature Palette)
Use these as functional markers (stripes, pips, or subtle glow effects) to categorize CRM leads:
- **Autos:** Blue (#3b82f6) | **Hogar:** Green (#059669) | **Pymes:** Amber (#d97706) | **DirecTV:** Red (#dc2626).

---

## 3. Typography: Editorial Authority
We use **Inter** not just for legibility, but as a brand anchor. By utilizing `tabular-nums`, we ensure data density feels organized and professional.

| Level | Token | Weight | Size | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-md` | 800 | 2.75rem | -0.02em | Hero analytics, high-level KPIs. |
| **Headline**| `headline-sm`| 700 | 1.5rem | -0.01em | Major section headers. |
| **Title**   | `title-md`   | 600 | 1.125rem | 0 | Card titles, modal headers. |
| **Body**    | `body-md`    | 400 | 0.875rem | 0 | Standard CRM data entries. |
| **Label**   | `label-sm`   | 500 | 0.6875rem | 0.05em | Form labels, uppercase metadata. |

*Note: Use `tabular-nums` for all financial data and phone numbers to maintain vertical alignment in lists.*

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved by stacking. A `surface-container-lowest` card (#ffffff) should sit on a `surface-container-low` background (#f2f3ff). This creates a soft, natural "lift" that feels more premium than a heavy shadow.

### Ambient Shadows
Traditional drop shadows are too "heavy" for this system. If a floating effect is required:
- **Shadow:** `0 20px 40px -12px`
- **Color:** `on-surface` (#131b2e) at **6% opacity**.
- **Result:** A whisper of light that suggests elevation without creating visual clutter.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-contrast needs), use the **Ghost Border**:
- **Color:** `outline-variant` (#c4c5d5) at **15% opacity**.
- **Rule:** Never use 100% opaque borders.

---

## 5. Components & Interaction

### Buttons
- **Primary:** Gradient from `primary` to `primary-container`. `Rounded-md` (0.75rem).
- **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
- **Tertiary:** Transparent background, `primary` text. Use for low-priority actions.

### Cards & Lists
- **Rule:** Forbid divider lines between list items.
- **Implementation:** Use `Spacing 4` (0.9rem) of vertical whitespace or a subtle background hover state (`brand-50`) to define row boundaries.
- **Radius:** `rounded-xl` (1.5rem) for main dashboard cards to soften the high-tech feel.

### Input Fields
- **Default:** `surface-container-lowest` background with a `Ghost Border`. `Rounded-DEFAULT` (0.5rem).
- **Focus:** Transition the border to `primary` (#00288e) at 40% opacity with a subtle 2px glow.

### Signature Component: The Lead Insight Chip
A custom component for the BMG+ CRM. A semi-transparent `surface-variant` chip that uses the **Campaign Accent** colors as a 2px left-border "glow" to indicate the lead source (e.g., Autos, Pymes).

---

## 6. Do’s and Don’ts

### Do
- **Do** use `surface-container` tiers to create hierarchy instead of lines.
- **Do** use `tabular-nums` for any numeric data to ensure the UI feels "advanced" and organized.
- **Do** allow for generous white space (Spacing 16/20) between major sections to let the "Digital Architect" aesthetic breathe.
- **Do** use Glassmorphism for all overlay elements (modals/tooltips).

### Don’t
- **Don’t** use pure black (#000000) for text. Always use `on-surface` (#131b2e).
- **Don’t** use standard 1px borders to separate content.
- **Don’t** use "off-the-shelf" Material shadows. Use our low-opacity Ambient Shadows.
- **Don’t** crowd the layout. If the data is dense, use `body-sm` typography rather than reducing spacing.