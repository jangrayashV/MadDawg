# mad dawg

Save good links, keep them with their source, and find them again when you return. A lightweight desktop extension for Chrome and Brave, with search, source groups, and unread reminders.

No account, backend, or build step. Users do not need Node.js or npm.

## Install from GitHub

1. On this repository's GitHub page, choose **Code → Download ZIP**.
2. Extract the ZIP into a permanent folder on your computer. Keep that folder after installation; the browser loads the extension from it.
3. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
4. Turn on **Developer mode**.
5. Click **Load unpacked**, then select the **extension** folder inside the extracted project. This is the folder that contains `manifest.json`.
6. Open the browser's extensions menu (the puzzle-piece icon) and pin **mad dawg**.
7. Refresh any article or YouTube tabs that were already open.

Click the purple mad dawg icon to open your stash. Do not open `popup.html` directly: it needs the browser extension environment.

This is a manual installation. Downloading the GitHub repository does not automatically install the extension or enable automatic updates. These steps follow Chrome's [unpacked-extension installation guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

## Save your first link

1. Visit a page you want to keep.
2. Click the mad dawg icon, then **＋ Add**.
3. Leave the destination as **Ungrouped**, or choose an existing source group.
4. Click **Save page ↗**.

Your page appears in the dark gray stash card. Search, filters, saving, and link-management controls are in the purple card above it.

## Ways to save

| What you want to save | What to do |
| --- | --- |
| The page you are viewing | **＋ Add → Save page ↗**. |
| A link inside an article or video description | Right-click the link and choose **Save resource to mad dawg**. It is saved with the page you found it on as its source. |
| A URL you have copied | **＋ Add → Paste a link**. Enter the URL, optionally add a title and one-line description, and click **Save link ↗**. |
| Something mentioned in a video | On the video, choose **＋ Add → Group from this page**. Open the mentioned resource, choose that video in the destination selector, and click **Save page ↗**. |

Opening the popup on a saved source page selects its group as the save destination. Check the destination before saving somewhere else. Saving the same URL to the same group again does not create another copy.

Descriptions come from existing page/link text, not AI-generated summaries. If a description is missing or unhelpful, you can add or edit it.

## Find and manage links

| Control | What it does |
| --- | --- |
| Search | Searches titles, descriptions, source titles, and URLs. Press `/` in the popup to focus search. |
| **All / Unread / Read** | Filters links by reading status. |
| **All groups** dropdown | Filters by a source group or **Ungrouped**. Works together with search and reading-status filters. |
| Group heading | Expands or collapses that group's links. |
| **↗** beside a group | Opens its source page. |
| Saved link title | Opens that link in a new tab. Opening a link does not automatically mark it read. |
| **⋯** in the purple header | Opens link management. Choose a link from the dropdown to **Mark read / Mark unread**, **Edit line / Add a line**, **Move**, or **Remove** it. |
| `Escape` | Closes the current editor or panel, then clears search when no panel is open. |

The toolbar badge shows the total number of unread links, with white text on a dark background. It disappears when there are none and shows **99+** above 99 unread links. Source groups stay available even when empty.

## Reminders

When you revisit a source page, mad dawg shows a dismissible reminder containing its unread resources. Switching back to an already-open source tab checks again too. Marking those links read updates the reminder; a source with no unread resources shows no reminder.

YouTube timestamps and playlists do not create separate source groups for the same video. Navigation between videos within YouTube is also supported.

## Update an installed copy

1. Download and extract the latest repository ZIP.
2. Replace the files **inside your existing installed extension folder** with the new extension files. Keep the same folder location.
3. Open `chrome://extensions` or `brave://extensions` and click **Reload** on mad dawg.
4. Refresh existing webpage tabs.

Do not uninstall the extension to update it. Uninstalling removes its locally saved library. Manual installations do not receive updates automatically.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| “Manifest file is missing” when loading | Extract the ZIP first, then select the inner **extension** folder containing `manifest.json`, not the repository's top-level folder. |
| The icon is not visible | Find mad dawg in the browser's extensions menu and pin it. |
| Changes or reminders do not appear | Reload the extension and refresh the webpage. Check that the extension is enabled and allowed to run on that site. |
| Nothing appears in the stash | Clear search, select **All**, and set the group filter to **All groups**. |
| A page cannot be saved | Only HTTP and HTTPS links are supported. Browser settings pages and local files cannot be saved. |
| Descriptions or reminders are unavailable | Browser internal pages, extension stores, and some embedded viewers restrict content scripts. Try a normal webpage. |
| Links are missing in another browser | The library belongs to the browser profile where it was saved. There is no cross-browser or account sync. |

If reporting a problem, include your browser/version, mad dawg version from the extensions page, the steps to reproduce it, and any visible error message.

## Data and permissions

All saved data stays in `chrome.storage.local` in the current browser profile. There is no account, analytics, external service, sync, or built-in export/import. Uninstalling the extension removes its local data.

- **Storage:** stores resources, groups, and reading status.
- **Context menus:** adds the right-click save action.
- **Active tab:** saves the current page when you open the popup and choose to save it.
- **Content scripts on HTTP/HTTPS pages:** capture the link you choose and show reminders on source pages. This is why the browser requests site access. The extension does not keep a browsing-history log.

Fonts and icons are bundled locally. Saving a link does not fetch its destination page.

## Repository contents

Push these files and folders to GitHub:

```text
.gitignore
README.md
package.json
extension/
  manifest.json
  background.js
  content.js
  model.js
  popup.html
  popup.css
  popup.js
  assets/
  fonts/          # Include Roboto files and OFL.txt
  icons/
tests/
```

The complete `extension/` folder is the installable extension. `README.md`, `package.json`, and `tests/` document and validate the project. Keep the bundled font license in `extension/fonts/OFL.txt`.

Local editor/agent folders, dependencies, environment files, logs, and generated archives are excluded by `.gitignore`. Saved user links are held in browser storage, not this repository.

To prepare a commit from the project root:

```sh
git add .gitignore README.md package.json extension tests
git diff --cached --stat
git commit -m "Add mad dawg link-saving extension"
```

Push that commit to your chosen GitHub repository and branch. A source upload is separate from publishing to an extension store.

For an optional downloadable release ZIP, package the contents of `extension/` with `manifest.json` at the ZIP root. Users must extract it before choosing **Load unpacked**. Increment the manifest version when publishing a new version.

## Development / checks

Requires Node.js 22+ for tests. Run `npm test`. No dependency installation or build is needed; reload the extension from the extensions page after edits.

Manual browser acceptance check:

1. Open a YouTube video with an external resource link; save it from the context menu.
2. Check the badge, source title, resource title and description in the popup.
3. Save it again: confirm no duplicate or badge increment.
4. Revisit the video with a different timestamp: confirm a reminder appears.
5. Navigate to another video without reloading: confirm the old reminder disappears.
6. Edit the description, mark read, refresh the source: confirm it is no longer reminded.
7. Restart the browser and confirm the resource persists; repeat in the other browser.
8. Create a group from a video with no saved resources. Open a separately discovered article, select the video group, and save it. Switch back to the video tab: confirm its unread reminder includes the article.
9. Paste another URL into that group. Move a standalone saved resource into the group. Mark every grouped resource read: confirm the reminder disappears and the source group remains.


API references: [Chrome context menus](https://developer.chrome.com/docs/extensions/develop/ui/context-menu), [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage), [Brave extension support](https://support.brave.app/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave).
