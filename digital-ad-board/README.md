# Digital Ad Board

This folder is a self-contained GitHub Pages mini-app for a TV advert board.

- `display.html` is the full-screen slideshow page for the TV.
- `admin.html` is the password/login protected admin page for uploading and editing slides.
- `assets/js/supabase-config.example.js` is the file you copy to `supabase-config.js` and fill in with your Supabase project details.
- `supabase/schema.sql` contains the table, storage bucket, and security policies to run in Supabase.

## Quick Setup

1. Create a Supabase project.
2. In Supabase, open **SQL Editor** and run `supabase/schema.sql`.
3. In Supabase, enable email login under **Authentication**.
4. Create your admin user under **Authentication > Users**.
5. In Supabase, open **Project Settings > API** and copy:

   - Project URL
   - anon public key

6. Copy:

   ```text
   assets/js/supabase-config.example.js
   ```

   to:

   ```text
   assets/js/supabase-config.js
   ```

7. Paste your Supabase URL and anon key into `supabase-config.js`.
8. Upload this folder to GitHub.
9. Enable GitHub Pages for the repository.

## Pages

Replace `yourname` and `yourrepo` with your GitHub details:

```text
https://yourname.github.io/yourrepo/digital-ad-board/display.html
https://yourname.github.io/yourrepo/digital-ad-board/admin.html
```

Open `display.html` on the TV.

## Notes

The display page can read active slides without logging in. The admin page requires a Supabase user account to upload, edit, activate, deactivate, and delete slides.

The Storage bucket is public so the TV can load images easily. Only logged-in users can upload, update, or delete files.

If you already ran `supabase/schema.sql` before logos were added, run it again. It uses `if not exists` and policy replacement statements so it is safe to rerun.

## What The Admin Page Can Change

Each slide has:

- image
- header
- caption
- overlay style
- display duration
- active/hidden setting

The overlay style can be set to `Random Each Time`, which randomly changes how the header and caption sit over the image whenever that slide appears.

The display page also shuffles the active slides each time it loops through the list.

Images that do not match the TV shape are shown inside a branded matte/frame so they are not cropped. Images close to the TV shape still fill the screen.

## Logos

The admin page can upload one or more logos. The display page randomly picks from active logos and places the logo in a corner that avoids the current caption/header overlay.

For example:

- bottom caption overlays use a top logo position
- top-left caption overlays use a right-side logo position
- minimal bottom-right overlays use a top logo position

## Hidden Display Exit

On the TV display page:

- press `Escape` to open the admin page
- type `admin` to open the admin page

This gives you a hidden way out of the full-screen display without putting an obvious admin button on the advert board.

## Keeping This Separate From Other Webpages

Everything for this advert board is inside:

```text
digital-ad-board/
```

That means you can add other folders beside it later, for example:

```text
digital-ad-board/
business-homepage/
event-page/
menu-board/
```

The top-level `index.html` is only a simple project menu.
