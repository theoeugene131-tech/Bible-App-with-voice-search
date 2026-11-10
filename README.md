# Bible App with Voice Search

A mobile-friendly starter web app for searching and listening to the King James Version (KJV).

## Current features
- Search by Bible reference or a small set of remembered phrases/topics
- Voice input where browser speech recognition is supported
- Read passages aloud using available device speech voices
- Choose a female- or male-sounding device voice when available
- Save verses locally in the browser

## Run locally
Open `index.html` in a modern browser, or serve this folder with any static web server.

## Deploy on Vercel
Import this GitHub repository into Vercel. Select **Other** as the framework preset and leave the build command and output directory empty (static site).

## Important limitations
This is an initial prototype, not yet a full semantic AI Bible search. Voice recognition and speech voices depend on browser/device support. The passage lookup currently uses the public Bible API at bible-api.com with the KJV translation and requires internet access. Verify that API's terms, reliability, and attribution requirements before public/commercial launch. The app does not bundle a complete offline Bible database.
