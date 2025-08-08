This folder now supports a build step to bundle and minify CSS.

- Edit modular files under base/, layout/, components/, pages/ normally.
- The entry file is main.css (kept for development organization).
- Run `npm run build:css` to generate `main.min.css` with all imports inlined and minified.
- Server prestart also builds CSS automatically.

Switch HTML `<link>` tags to `/css/main.min.css` for production.
