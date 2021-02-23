# Udemy - Improved Course Library (Chrome extension)
[![Install](https://img.shields.io/badge/-Install-green?style=flat&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAAb0lEQVR4Ae3UgQUAMRBE0SvnykhnW0JKSmn/AANikbiB+SxgeWCelBwBA6jmxp+goq8CCiiggE4D3s3oLfrW5vc9RU3uNR9lRwnjRwljQDUYM0oYP0oYA6rBmFHC+FHC2FHCqJSA4n4VUAsyllL6AHMEW1GSXWKaAAAAAElFTkSuQmCC)](https://chrome.google.com/webstore/detail/udemy-improved-course-lib/dmlfcanjgejpgjajoiepgfglmjcnhhlh "Click to install") [![Report Issue](https://img.shields.io/badge/-Report%20issue-red?style=flat&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAAsklEQVR4Ae3UEQzEQBCF4YVzd66nrvWs0+JBPeNUdzzPYT11Onen/3TwLbyl+ZPBSb5sstOq1VXAAEKc7sZczPf2Y3woPyajfBg/yo/JKDfmTr/qVlHOl4m0F+hpKGAAGEG5roBiISgKVKACGQ6jFyRUoAc4gA78HKCTufa025lrKKAX8EFvS7sHeleTmkd9gQ3YgWcWY0ClDBgvKmEMKCNGR/kxflTCuFAnEOKMVlWL+wNsSof8wQFurAAAAABJRU5ErkJggg==)](https://github.com/TadWohlrapp/Udemy-Improved-Library-Chrome-Extension/issues "Click to report issue")

## What it does

### This browser extension adds additional course info to the courses in your Udemy course library.

It employs the Udemy API to grab more info about the courses in your library and appends under each course:

- The total runtime of the course
- The rating of the course
- The number of ratings
- The number of students enrolled
- The date of the last update
- Available Subtitles

Additionally it displays a thin colored strip at the bottom of the course card, from red (3.5 stars and below) to green (5 stars).

This should provide you with a good overview which course is worth its salt, and which course you might want to archive instead.

Note: If a course has stopped enrollment and isn't visible publicly anymore, no stats are available for that course.

![screenshot](https://user-images.githubusercontent.com/2788192/108864945-f94c6180-75f2-11eb-82d7-dd7b091c514d.png)

## How to use

Just head over to the [Chrome Web Store](https://chrome.google.com/webstore/detail/udemy-improved-course-lib/dmlfcanjgejpgjajoiepgfglmjcnhhlh) and install the extension from there. Alternatively clone this repository, visit your extensions overview in the Chrome settings ([chrome://extensions/](chrome://extensions/)), enable "Developer Mode" in the top right corner, and import the cloned "src/" folder.

Afterwards just visit your Udemy course library 😃

This browser extension is also available as a user script for [Violentmonkey](https://violentmonkey.github.io/), [Tampermonkey](https://tampermonkey.net/) etc. You can find the repo [here](https://github.com/TadWohlrapp/Udemy-Improved-Library-Userscript).