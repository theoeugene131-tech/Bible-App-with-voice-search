# Bible App with Voice Search

A mobile-friendly Bible reader built around the King James Version (KJV).

## Features in this build
- Browse all 66 books of the Bible and navigate chapter by chapter.
- Search by Bible reference, such as John 3:16 or Psalm 23.
- Search verse text by words or phrases.
- Use the microphone for spoken references and spoken keyword searches where browser speech recognition is supported.
- Read an entire chapter aloud using available device speech voices.
- Choose a female- or male-sounding voice when the device provides a matching voice. This is best-effort and depends on the phone/browser.
- Bookmark chapters or individual verses; bookmarks are stored on the device.
- Daily verse display and quick topic searches.

## Bible text source
The app loads the 66 KJV book files from the public repository:
https://github.com/midvash/bible-data

The KJV 1769 text is identified by that source as public domain. The app currently loads Scripture over the internet; the complete text is not bundled for offline use.

## Search limitations
Voice recognition converts speech to text. Reference searches are resolved directly; other searches match words in Bible verses. This build does not yet use an AI model for semantic interpretation, so a description such as "the story about the man who built an ark" may not find the intended passage unless matching words are used.

## Run locally
Open `index.html` through a local web server or deploy the repository as a static site.

## Deploy
Import this repository into Vercel. Choose the Other framework preset and leave build command and output directory empty. Every push to the connected main branch should trigger a new deployment.

## Browser notes
- Chrome on Android is recommended for voice input.
- Allow microphone permission when prompted.
- Speech recognition and speech synthesis availability varies by browser and device.
- Bookmarks are stored in local browser storage and do not automatically sync between devices.
