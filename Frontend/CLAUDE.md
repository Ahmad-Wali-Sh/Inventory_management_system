# CLAUDE.md — Inventory System Frontend (students project)

Read this file at the start of every session that touches the frontend.
This project is for **teaching students**: keep code simple, clear and commented.

## Stack (JavaScript only, no TypeScript)
- React + Vite
- Tailwind CSS v4 (no `tailwind.config.js`; loaded in `src/index.css` and `vite.config.js`)
- react-router (import from `'react-router'`)
- zustand (global state; `persist` for things saved in localStorage)
- react-hook-form (all forms)
- axios (all HTTP calls go through `features/shared/api/axiosClient.js`)
- i18next (plain, **no react-i18next**; use our `useTranslation()` hook)

**Do not add any other dependency.** No icon library (use `shared/components/Icon.jsx`),
no toast library (use `shared/stores/toastStore.js`), no UI kit.

## Commands
```
npm install
npm run dev       # http://localhost:5173
npm run build
```
`.env` needs `VITE_API_URL=http://localhost:5000/api` (see `.env.example`).
The backend (Express) must be running for data pages.

## Folder structure (feature-based)
```
src/
  main.jsx                 entry: css + i18n init + <App />
  App.jsx                  syncs theme/language to <html>, renders router + toasts
  index.css                Tailwind import, theme colors (light/dark), .btn/.input/.card
  features/
    router/
      routes.config.jsx    ALL routes (one array). Flags: layout, protected, guestOnly, sidebar
      AppRouter.jsx        turns the array into <Routes>
      RouteGuards.jsx      ProtectedRoute, GuestRoute
      NotFoundPage.jsx
    layout/
      MainLayout.jsx       sidebar + header + <Outlet />
      Sidebar.jsx          links built from routes with `sidebar`
      Header.jsx           menu, language, theme, logout
      PageContainer.jsx    standard page title + content wrapper
      sidebarStore.js
    auth/
      LoginPage.jsx        fake login for now
    products/
      products.config.js   MasterComponent config (endpoint, columns, fields)
      ProductsPage.jsx
    shared/
      api/                 axiosClient.js, createCrudApi.js
      hooks/               useCrud.js
      i18n/                i18n.js, languageStore.js, useTranslation.js
      locales/             en.json, fa.json
      stores/              authStore.js, themeStore.js, toastStore.js
      components/
        MasterComponent/   MasterComponent.jsx, DataTable.jsx, MasterForm.jsx
        ConfirmModal.jsx, Icon.jsx, Toaster.jsx, PlaceholderPage.jsx
```
A new feature gets its own folder: `src/features/<name>/` (e.g. `sales/`).

## Backend contract
- Express CRUD factory, every resource has:
  `GET /x`, `GET /x/:id`, `POST /x`, `PUT /x/:id`, `DELETE /x/:id`.
- Responses are raw data (array or row). Errors are `{ message }` (+ `detail`).
- No paging/search on the server; lists are filtered on the client.
- NUMERIC columns come back as strings (`"12.50"`).
- `createCrudApi(endpoint)` is the frontend twin of `crudFactory`.

## Rules
### Routes
- Add pages ONLY in `routes.config.jsx`. `layout: true` = inside sidebar/header.
  `protected: true` = needs login. `sidebar: { icon }` = shows in sidebar.
- Placeholders (`PlaceholderPage`) mark pages students still have to build.

### CRUD pages
- Simple model (one table) → `MasterComponent` + a `<name>.config.js` (copy `products.config.js`).
- Field names in config must match the backend's allowed `columns`.
- Header + items documents (sales, purchases, returns) need their own page;
  they may reuse `useCrud`, `DataTable`, `ConfirmModal`, `PageContainer`.

### Theme (light / dark)
- Never use raw colors (`bg-white`, `text-gray-700`, `bg-blue-600`).
  Use the theme colors from `index.css`: `bg-bg`, `bg-surface`, `bg-muted`, `border-line`,
  `text-fg`, `text-fg-muted`, `bg-primary`, `text-primary-fg`, `text-danger`, `text-success`.
- Buttons: `btn btn-primary | btn-secondary | btn-danger`. Inputs: `input`. Boxes: `card`.
- Dark mode = class `dark` on `<html>` (set in App.jsx from `themeStore`).

### Language (English + Persian, RTL)
- No hard-coded UI text: always `t('key')` from `useTranslation()`.
- Add every new key to BOTH `locales/en.json` and `locales/fa.json`.
- Persian is RTL: use logical Tailwind classes only:
  `ms- me- ps- pe- start- end- text-start text-end border-s border-e`.
  Never `ml- mr- pl- pr- left- right- text-left text-right`.
  Use `rtl:` for special cases (e.g. flipping an arrow icon).

### State
- Server data: `useCrud` / component state. Global app state: zustand stores.
- Show feedback with `toast.success()` / `toast.error()`.
- Every list: loading, empty and error states. Every delete: `ConfirmModal`.

### Code style
- Function components, one component per file, PascalCase file names for components.
- Short comment at the top of each file saying what it is and how to use it.
- Prefer simple code over clever code; students must be able to read it.

## Not done yet (next steps)
- Real login (`POST /api/auth/login` + JWT): only `authStore.login` changes.
- Categories / units dropdowns in the product form (needs backend routes).
- Dashboard, sales, sales returns, purchases, purchase returns, stock, users pages.
