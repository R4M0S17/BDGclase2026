# Design System Specification: The "Lucid Efficiency" Framework

## 1. Overview & Creative North Star
**Creative North Star: The Digital Curator**

This design system moves beyond the utility of a standard project management tool and into the realm of high-end editorial software. Inspired by the precision of Apple and the focused speed of tools like Linear, the "Digital Curator" philosophy treats every task, comment, and roadmap item as a piece of curated content. 

We break the "template" look of modern SaaS by embracing **Negative Space as a Feature**. We do not fill gaps; we celebrate them. Through intentional asymmetry—such as wide left-aligned gutters and offset headers—we guide the eye with intent. The layout is not a grid of boxes, but a composition of information that breathes, layering depth through tonal shifts rather than rigid outlines.

---

## 2. Colors & Surface Philosophy
The palette is a sophisticated range of soft, cool-toned grays punctuated by highly intentional, vibrant accents. 

### Surface Hierarchy & Nesting
To achieve a "signature" feel, we abandon the flat UI. We use **Surface Tiering** to create a physical sense of depth.
*   **The Canvas (`surface` #f9f9fb):** The infinite base layer.
*   **The Layout Layer (`surface_container_low` #f2f4f6):** Used for sidebar navigation or secondary utility panels.
*   **The Interaction Layer (`surface_container_lowest` #ffffff):** Reserved for the highest priority content, like the active task card or the main editor.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface_container_high` (#e4e9ee) list item should sit against a `surface` background without a stroke. The contrast in value provides the edge.

### Signature Textures & The "Glass" Rule
*   **Glassmorphism:** For floating command palettes (Raycast-style) or dropdowns, use `surface_container_lowest` at 80% opacity with a `24px` backdrop blur.
*   **Subtle Gradients:** CTAs should not be flat. Apply a subtle linear gradient from `primary` (#005bbf) to `primary_dim` (#0050a8) at a 145-degree angle to give the button a "milled" premium feel.

---

## 3. Typography
We utilize **Inter** not just for legibility, but as a structural element. 

*   **Display & Headline:** Use `display-md` (2.75rem) with a negative letter-spacing of `-0.02em` for project titles. This "tight" setting creates an authoritative, editorial look.
*   **The Power of Labels:** `label-sm` (0.6875rem) should be used in all-caps with `+0.05em` letter spacing for metadata (e.g., ISSUE-124). This creates a rhythmic contrast against the standard sentence-case body text.
*   **Body Text:** `body-md` (0.875rem) is our workhorse. Ensure a line-height of `1.6` to maintain the "Modern SaaS" breathing room.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, mimicking how light hits fine stationery or frosted glass.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section. This "white-on-gray" stack creates a soft, natural lift.
*   **Ambient Shadows:** For floating elements (Modals, Tooltips), use an "Air Shadow": `0px 12px 32px rgba(12, 14, 16, 0.04)`. Note the extremely low opacity (4%). It should be felt, not seen.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` (#acb3b8) at **15% opacity**. It must look like a faint indentation in the page, not a drawn line.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_dim`), `on_primary` text, `md` (0.375rem) corner radius.
*   **Secondary:** No background, `outline_variant` (at 20% opacity) "Ghost Border," `primary` text.
*   **Tertiary/Ghost:** No background or border. High-contrast `on_surface` text.

### Status Chips (Vibrant Accents)
Status badges should be high-chroma but balanced by their containers:
*   **Done:** `tertiary_container` (#69f6b8) background with `on_tertiary_fixed` (#00452d) text.
*   **Blocked:** `error_container` (#fe8983) background with `on_error_container` (#752121) text.
*   **In Progress:** `primary_container` (#d7e2ff) background with `on_primary_fixed` (#003d84) text.

### Cards & Lists
*   **Rule:** Forbid divider lines.
*   **Separation:** Use `1.5rem` of vertical white space or a transition from `surface_container_lowest` to `surface_container_low` on hover to define boundaries.

### Command Palette (Search/Action)
A central component for this system. Use a `xl` (0.75rem) radius, Glassmorphism (80% opacity), and a `surface_container_highest` (#dde3e9) subtle inner glow to simulate a physical lens.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical padding. Give the top and left of a container more breathing room than the bottom/right.
*   **Do** use "Optical Centering." Move icons 1-2px up to visually balance them within circular buttons.
*   **Do** lean into `surface_container` tiers for nesting. An inbox item should be `lowest`, its container `low`, and the app background `surface`.

### Don't
*   **Don't** use black (#000000). Use `inverse_surface` (#0c0e10) for pure darks to keep the palette organic.
*   **Don't** use standard "Drop Shadows." Always use the Ambient Shadow spec (low opacity, large spread).
*   **Don't** use borders to separate list items. If the content feels cluttered, increase the `gap` value in your flex layout rather than adding a line.

---

## Director's Closing Note
The goal of this system is to make the user feel like they are working inside a high-end physical workspace. Every interaction should feel dampened, quiet, and intentional. If a screen feels "busy," remove a border and add 8px of whitespace. If it feels "flat," check your surface nesting.