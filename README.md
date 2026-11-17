# Dice Throne Playtest 0.13.2

This release adds Treant to the installable playtest. For an existing installation, replace the files on the same publishing branch, let GitHub Pages finish deploying, then reopen the app online and check that it shows Playtest 0.13.2.

For browser uploads, extract the ZIP and include all nine artwork scripts alongside the updated index and service worker in the same commit.

## Publish on GitHub Pages

1. Extract this archive into the root of a dedicated repository so the layout includes `docs/index.html`.
2. Commit the files and push them to your publishing branch.
3. In the repository, open **Settings → Pages**. Choose **Deploy from a branch**, select your branch and **/docs**, then save.
4. Once the deployment completes, open the HTTPS URL shown by GitHub Pages.

The site contains the board and card images used by the playtest. Standard GitHub Pages publication makes those assets accessible at the site URL. See [GitHub’s publishing source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Install and verify

1. Open the Pages URL in Chrome on Android or Edge or Chrome on Windows 11.
2. Wait for **Ready for offline play**. Choose **Install app** if shown or use the browser’s installation menu.
3. Open the installed app, start a match and make a move. Close the app, disable networking and launch it again from the home screen or Start menu.
4. Check that the same match and last move are still there.

Earlier downloaded HTML files use separate browser storage. The new HTTPS address starts its own local autosave, and each device saves its own match. Keep the same URL and browser profile for later updates. Reopen while online to fetch a new version.
