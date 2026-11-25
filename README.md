# IKAN GO

A React, TypeScript, Vite and Tailwind application for ordering fresh fish in Banda Aceh. Buyer and seller accounts share browser storage; payment confirmation records the order and deducts product stock immediately.

## Run locally

```sh
npm install
npm run dev
```

The map uses OpenStreetMap tiles. The seller has a fixed operating point in Peunayong. Buyers can search an address, follow their GPS in real time, or change the destination inside the cart, then confirm the delivery location before checkout. GPS requires browser permission and a secure context such as `localhost`; live tracking pauses while checkout is open so the confirmed destination stays fixed. Address lookup uses the public Nominatim service.

Users sign in by choosing the Pembeli (buyer) or Penjual (seller) role. The selected role determines which dashboard opens, and the session is kept in browser storage until the user signs out.

## Supabase image storage

Supabase is used only for product images. App state and orders stay in browser `localStorage`; no application database tables are used.

1. Create a Supabase project and a public Storage bucket named `fish-images`. Set the bucket's allowed file types to images and set an upload size limit.
2. In Storage policies, allow public `SELECT` for `fish-images` and `INSERT` for current browser uploads. Restrict anonymous uploads and add upload validation, authentication, and abuse protection before deploying to production.
3. Copy `.env.example` to `.env.local`, fill in the project's URL and anon key, then restart Vite.

Without those values, uploaded photos are previewed with `URL.createObjectURL()` and stored as image data in local browser storage instead.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
```
