# Deok-Sun's Recipe Book

Mobile-first recipe book built with React, TypeScript, and Vite.

## Features

- Searchable recipe list with image, name, and description
- Add recipe flow with image upload, description, ingredients, and instructions
- Edit recipe flow that matches the add form layout
- Recipe detail view with ingredients and step-by-step instructions
- Delete recipe action with confirmation
- Local persistence using `localStorage`
- Seeded sample recipes for first load

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start the development server
- `npm run build` — create the production build
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build locally

## Notes

- The app is styled for narrow mobile screens and centers the experience in a phone-sized layout.
- Uploaded images are stored as data URLs in browser storage.
- Recipe data persists per browser through `localStorage`.
