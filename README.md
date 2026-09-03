# Northstar — Landing Page CMS

A Next.js visual CMS for agencies that sell branded landing pages. Each client gets their own page, theme, and slug. You compose the layout from built-in sections and Shadcn/ui elements, then publish.

## What you can do

- Create a landing page per client from the studio dashboard
- Add built-in sections: navbar, hero, split hero, logos, features, about, stats, services, testimonials, pricing, FAQ, gallery, team, CTA, contact, footer, and a custom block
- Drop Shadcn elements into a section: heading, paragraph, button, input, textarea, dropdown, checkbox, badge, image, card, separator
- Drag sections and nested elements to reorder the page
- Edit the brand theme: colors, heading/body fonts, corner radius, and logo
- Save a section as a reusable component and insert it on other pages
- Preview desktop / tablet / mobile in the editor
- Publish to a live URL at `/p/[slug]`

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Product homepage |
| `/admin` | Client page dashboard |
| `/admin/editor/[id]` | Visual CMS editor |
| `/p/[slug]` | Published landing page |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then go to **Open studio**. The first visit seeds a published demo page at `/p/northstar`.

Pages are stored as JSON files under `data/pages`. Saved components live in `data/components.json`.
