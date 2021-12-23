// ==UserScript==
// @name         Udemy - Improved Course Library
// @namespace    https://github.com/TadWohlrapp
// @description  Adds current ratings, and other detailed data to all courses in your Udemy library
// @icon         https://github.com/TadWohlrapp/Udemy-Improved-Library-Userscript/raw/main/icon.png
// @icon64       https://github.com/TadWohlrapp/Udemy-Improved-Library-Userscript/raw/main/icon64.png
// @author       Tad Wohlrapp (https://github.com/TadWohlrapp)
// @homepageURL  https://github.com/TadWohlrapp/Udemy-Improved-Library-Userscript
// @version      1.0.1
// @updateURL    https://github.com/TadWohlrapp/Udemy-Improved-Library-Userscript/raw/main/udemy-improved-course-library.meta.js
// @downloadURL  https://github.com/TadWohlrapp/Udemy-Improved-Library-Userscript/raw/main/udemy-improved-course-library.user.js
// @supportURL   https://github.com/TadWohlrapp/Udemy-Improved-Library-Userscript/issues
// @match        https://www.udemy.com/home/my-courses/*
// @compatible   chrome Tested with Tampermonkey v4.13 and Violentmonkey v2.13.0
// @compatible   firefox Tested with Greasemonkey v4.11
// @license      MIT
// ==/UserScript==

// ==OpenUserJS==
// @author Taddiboy
// ==/OpenUserJS==

(function () {
  'use strict';
  const i18n = loadTranslations();
  const lang = getLang(document.documentElement.lang);

  function fetchCourses() {
    listenForArchiveToggle();
    const courseContainers = document.querySelectorAll('[data-purpose="enrolled-course-card"]:not(.details-done)');
    if (courseContainers.length == 0) { return; }
    [...courseContainers].forEach((courseContainer) => {

      const isPartialRefresh = courseContainer.classList.contains('partial-refresh');

      const courseId = courseContainer.querySelector('.card--learning__image').href.replace('https://www.udemy.com/course-dashboard-redirect/?course_id=', '');

      const courseCustomDiv = document.createElement('div');
      courseCustomDiv.classList.add('card__custom', 'js-removepartial');

      courseContainer.appendChild(courseCustomDiv);
      courseContainer.classList.add('details-done');
      courseContainer.classList.remove('partial-refresh');

      // Add Link to course overview to options dropdown
      const courseLinkLi = document.createElement('li');
      courseLinkLi.innerHTML = `
        <a class="udlite-btn udlite-btn-large udlite-btn-ghost udlite-text-sm udlite-block-list-item udlite-block-list-item-small udlite-block-list-item-neutral" role="menuitem" tabindex="-1" href="https://www.udemy.com/course/${courseId}/" target="_blank" rel="noopener">
          <span class="udi-small udi udi-explore udlite-block-list-item-icon"></span>
          <div class="udlite-block-list-item-content card__course-link">${i18n[lang].overview}
            <svg fill="#686f7a" width="12" height="16" viewBox="0 0 24 24" style="vertical-align: bottom; margin-left: 5px;" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7z"></path>
            </svg>
          </div>
        </a>
      `;

      const allDropdowns = courseContainer.querySelectorAll('.udlite-block-list');
      if (allDropdowns[1]) {
        allDropdowns[1].appendChild(courseLinkLi);;
      }

      // Find existing elements in DOM
      const thumbnailDiv = courseContainer.querySelector('.card__image');
      const detailsName = courseContainer.querySelector('.details__name');
      const detailsInstructor = courseContainer.querySelector('.details__instructor');
      const progressText = courseContainer.querySelector('.progress__text');
      const progressBar = courseContainer.querySelector('.details__progress');
      const startCourseText = courseContainer.querySelector('.details__start-course');
      const detailsBottom = courseContainer.querySelector('.details__bottom');

      // If progress made
      if (progressText != null) {
        // Add progress bar below thumbnail
        const progressBarSpan = document.createElement('span');
        progressBarSpan.classList.add('impr__progress-bar', 'js-removepartial');
        progressBarSpan.innerHTML = progressBar.innerHTML;
        thumbnailDiv.appendChild(progressBarSpan);
        // Add progress percentage to thumbnail bottom right
        const progressTextSpan = document.createElement('span');
        progressTextSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-show', 'js-removepartial');
        progressTextSpan.innerHTML = progressText.innerHTML;
        thumbnailDiv.appendChild(progressTextSpan);
        // Remove existing progress percentage
        progressText.parentNode.removeChild(progressText);
      }

      // Remove existing progress bar
      if (!isPartialRefresh) {
        progressBar.parentNode.removeChild(progressBar);
      }

      // If "START COURSE" exists, remove it. It's clutter
      if (startCourseText != null) {
        startCourseText.parentNode.removeChild(startCourseText);
      }

      if (!isPartialRefresh) {
        // If instructor title exists, remove it as well
        const instructorTitle = detailsInstructor.querySelector('span');
        if (instructorTitle != null) {
          instructorTitle.parentNode.removeChild(instructorTitle);
        }

        // Switch classes on course name and instructor
        detailsName.classList.add('impr__name');
        detailsName.classList.remove('details__name');
        detailsInstructor.classList.add('impr__instructor');
        detailsInstructor.classList.remove('details__instructor');
      }

      // If course page has draft status, do not even to fetch its data via API
      if (courseContainer.querySelector('.card--learning__details').href.includes('/draft/')) {
        if (!isPartialRefresh) {
          detailsBottom.parentNode.removeChild(detailsBottom);
        }
        courseContainer.querySelector('.card__course-link').style.textDecoration = "line-through";
        courseCustomDiv.classList.add('card__nodata');
        courseCustomDiv.innerHTML += i18n[lang].notavailable;
        // We're done with this course
        return;
      }

      const fetchUrl = 'https://www.udemy.com/api-2.0/courses/' + courseId + '?fields[course]=rating,num_reviews,num_subscribers,content_length_video,last_update_date,locale,has_closed_caption,caption_languages,num_published_lectures';
      fetch(fetchUrl)
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error(response.status);
          }
        })
        .then(json => {
          if (typeof json === 'undefined') { return; }

          // Get everything from JSON and put it in variables
          const rating = json.rating.toFixed(1);
          const reviews = json.num_reviews;
          const enrolled = json.num_subscribers;
          const runtime = json.content_length_video;
          const updateDate = json.last_update_date;
          const locale = json.locale.title;
          const localeCode = json.locale.locale;
          const hasCaptions = json.has_closed_caption;
          const captionsLangs = json.caption_languages;

          // Format "Last updated" Date
          let updateDateShort = '';
          let updateDateLong = '';
          if (updateDate) {
            updateDateShort = updateDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2\/$1');
            updateDateLong = new Date(updateDate).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
          }

          // Small helper for rating strip color
          const getColor = v => `hsl(${(Math.round((1 - v) * 120))},100%,45%)`;
          const colorValue = r => Math.min(Math.max((5 - r) / 2, 0), 1);

          // If captions are available, create the tag for it. We'll add it in template string later
          let captionsTag = '';
          if (hasCaptions) {
            const captionsString = captionsLangs.join('&#013;&#010;');
            captionsTag = `
              <div class="impr__tooltip" data-tooltip="${captionsString}">
                <i class="udi udi-closed-caption"></i>
              </div>
            `;
          }

          // Returns true or false depending if stars are visible
          const isShowingStars = courseContainer.querySelector('.details__bottom--review');

          // Now let's handle own ratings

          // Set up empty html
          let myRatingHtml = '';
          let ratingButton;
          let ratingOwn = 0;

          // If ratings stars ARE visible, proceed to build own rating stars
          if (isShowingStars != null) {

            // If I have voted, count the stars and tell me how I voted
            ratingOwn = countAllWidths(isShowingStars.querySelectorAll('[style]')); // between 0 and 5

            // Find the rating-button, and remove its css class
            ratingButton = isShowingStars.querySelector('[role="button"]');

            // Remove the old stars from ratingButton
            ratingButton.removeChild(ratingButton.querySelector('.star-rating-shell'));

            // Build the html
            myRatingHtml = `
              <span class="impr__stars-ct">
                <span class="impr__stars">
                  ${buildStars(ratingOwn)}
                </span>
                <span class="impr__review">
                  <span class="impr__review-stat">${setDecimal(ratingOwn, lang)}</span>
                  <span class="impr__review-count">(<span class="review-button"></span>)</span>
                </span>
              </span>
            `;
          }

          const ratingStripColor = ratingOwn > 0 ? ratingOwn : rating;

          let updateDateInfo = '';
          if (updateDateShort !== '' && updateDateLong !== '') {
            updateDateInfo = `
              <div class="impr__tooltip" data-tooltip="${i18n[lang].updated}${updateDateLong}">
                <i class="udi udi-resend"></i><span>${updateDateShort}</span>
              </div>
            `;
          }

          courseCustomDiv.innerHTML = `
            <div class="impr__rating">
              <span class="impr__stars-ct">
                <span class="impr__stars">
                  ${buildStars(rating)}
                </span>
                <span class="impr__review">
                  <span class="impr__review-stat">${setDecimal(rating, lang)}</span>
                  <span class="impr__review-count">(${setSeparator(reviews, lang)})</span>
                </span>
              </span>
              ${myRatingHtml}
            </div>
            <div class="impr__rating-strip" style="background-color:${getColor(colorValue(ratingStripColor))}"></div>
            <div class="impr__stats">
              <div class="impr__tooltip" data-tooltip="${setSeparator(enrolled, lang)} ${i18n[lang].enrolled}">
                <i class="udi udi-users"></i><span>${setSeparator(enrolled, lang)}</span>
              </div>
              ${updateDateInfo}
              ${captionsTag}
            </div>
          `;

          if (isShowingStars != null) {
            const reviewButtonContainer = courseCustomDiv.querySelector('.review-button');
            ratingButton.style.display = 'inline';
            reviewButtonContainer.appendChild(ratingButton);
          }

          if (!isPartialRefresh) {
            detailsBottom.parentNode.removeChild(detailsBottom);
          }

          // Hide language badge if language is English
          if (localeCode.slice(0, 2) !== 'en') {
            const localeSpan = document.createElement('span');
            localeSpan.classList.add('card__thumb-overlay', 'card__course-locale', 'hover-hide', 'js-removepartial');
            localeSpan.innerHTML = `<img src="https://www.countryflags.io/${localeCode.slice(-2).toLowerCase()}/flat/24.png" style="width: 14px;margin-right: 2px;vertical-align: bottom;">${locale}`;
            thumbnailDiv.appendChild(localeSpan);
          } else {
          }

          // Add course runtime from API to thumbnail bottom right
          const runtimeSpan = document.createElement('span');
          runtimeSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-hide', 'js-removepartial');
          runtimeSpan.innerHTML = parseRuntime(runtime, lang);
          thumbnailDiv.appendChild(runtimeSpan);
        })
        .catch(error => {
          courseCustomDiv.classList.add('card__nodata');
          courseCustomDiv.innerHTML += `<div><b>${error}</b><br>${i18n[lang].notavailable}</div>`;
          if (detailsBottom != null) {
            detailsBottom.parentNode.removeChild(detailsBottom);
          }
        });
    });
  }

  // start here
  fetchCourses();

  const mutationObserver = new MutationObserver(fetchCourses);
  const targetNode = document.querySelector('div[data-module-id="my-courses-v3"]');
  const observerConfig = {
    childList: true,
    subtree: true
  };
  mutationObserver.observe(targetNode, observerConfig);

  function listenForArchiveToggle() {
    document.querySelectorAll('[data-purpose="toggle-archived"]').forEach(item => {
      item.addEventListener('click', event => {
        mutationObserver.disconnect();
        let thisCourse = item.closest('.details-done');
        if (thisCourse != null) {
          thisCourse.classList.add('partial-refresh');

          while (thisCourse.nextElementSibling != null) {
            thisCourse.nextElementSibling.classList.add('partial-refresh');
            thisCourse = thisCourse.nextElementSibling;
          }
        }

        const brokenContainers = document.querySelectorAll('.partial-refresh');
        [...brokenContainers].forEach((brokenContainer) => {
          brokenContainer.classList.remove('details-done');
          let removeElements = brokenContainer.getElementsByClassName('js-removepartial');
          while (removeElements[0]) {
            removeElements[0].parentNode.removeChild(removeElements[0]);
          }
        });

        mutationObserver.observe(targetNode, observerConfig);
      });
    });
  }

  function setSeparator(int, lang) {
    return int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, i18n[lang].separator);
  }

  function setDecimal(rating, lang) {
    return rating.toString().replace('.', i18n[lang].decimal);
  }

  function getLang(lang) {
    return i18n.hasOwnProperty(lang) ? lang : 'en-us';
  }

  function buildStars(rating) {
    let starTemplate = '';
    let remainder = 0;
    for (let i = 0; i < 5; i++) {
      let percent = 0;
      if (Math.floor(rating) > i) {
        percent = 100;
      } else if (remainder == 0) {
        remainder = rating % 1;
        percent = Math.round(remainder * 10) * 10
      }
      starTemplate += `
        <div>
          <span class="impr__star impr__star--unfilled"></span>
          <span class="impr__star impr__star--filled" style="width: ${percent.toString()}%;"></span>
        </div>
      `;
    }
    return starTemplate;
  }

  function addGlobalStyle(css) {
    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);
  }

  function parseRuntime(seconds, lang) {
    if (seconds % 60 > 29) { seconds += 30; }
    let hours = Math.floor(seconds / 60 / 60);
    let minutes = Math.floor(seconds / 60) - (hours * 60);
    let hoursFormatted = hours > 0 ? hours.toString() + i18n[lang].hours : '';
    let minutesFormatted = minutes > 0 ? ' ' + minutes.toString() + i18n[lang].mins : '';
    return hoursFormatted + minutesFormatted;
  }

  function countAllWidths(elements) {
    let rating = 0;
    for (let i = 0; i < elements.length; i++) {
      if (!elements[i].hasAttribute('style')) return false;
      if (elements[i].getAttribute('style') === 'width: 100%;') { rating += 1; }
      if (elements[i].getAttribute('style') === 'width: 50%;') { rating += 0.5; }
    }
    return rating;
  }

  function loadTranslations() {
    return {
      'en-us': {
        'overview': 'Course overview',
        'enrolled': 'students',
        'updated': 'Last updated ',
        'notavailable': 'Course info not available',
        'separator': ',',
        'decimal': '.',
        'hours': 'h',
        'mins': 'm'
      },
      'de-de': {
        'overview': 'Kursübersicht',
        'enrolled': 'Teilnehmer',
        'updated': 'Zuletzt aktualisiert ',
        'notavailable': 'Kursinfo nicht verfügbar',
        'separator': '.',
        'decimal': ',',
        'hours': ' Std',
        'mins': ' Min'
      },
      'es-es': {
        'overview': 'Descripción del curso',
        'enrolled': 'estudiantes',
        'updated': 'Última actualización ',
        'notavailable': 'La información del curso no está disponible',
        'separator': '.',
        'decimal': ',',
        'hours': ' h',
        'mins': ' m'
      },
      'fr-fr': {
        'overview': 'Aperçu du cours',
        'enrolled': 'participants',
        'updated': 'Dernière mise à jour : ',
        'notavailable': 'Informations sur les cours non disponibles',
        'separator': ' ',
        'decimal': ',',
        'hours': ' h',
        'mins': ' min'
      },
      'it-it': {
        'overview': 'Panoramica del corso',
        'enrolled': 'studenti',
        'updated': 'Ultimo aggiornamento ',
        'notavailable': 'Informazioni sul corso non disponibili',
        'separator': '.',
        'decimal': ',',
        'hours': ' h',
        'mins': ' min'
      }
    };
  }

  addGlobalStyle(`
    .card--learning {
      box-shadow: 0 0 1px 1px rgba(20, 23, 28, 0.1), 0 3px 1px 0 rgba(20, 23, 28, 0.1);
      transition: all 100ms linear;
    }

    .card--learning:hover {
      box-shadow: 0 2px 8px 2px rgba(20, 23, 28, 0.15);
    }

    .card--learning:before {
      content: none;
    }

    .card--learning:after {
      content: none;
    }

    .card__image {
      overflow: inherit;
    }

    .card__image .course-image {
      transition: opacity linear 100ms;
      box-shadow: 0 1px 0 0 rgba(232, 233, 235, 0.5);
      -webkit-filter: sepia(0.1) grayscale(0.1) saturate(0.8);
      filter: sepia(0.1) grayscale(0.1) saturate(0.8);
    }

    a:hover .card__image .course-image {
      opacity: 0.8;
    }

    .card--learning__details {
      border-top: 1px solid #e8e9eb;
    }

    .card__details {
      padding: 12px;
      height: 66px;
    }

    .impr__name {
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.2px;
      font-size: 14px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .impr__instructor {
      color: #73726c;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 4px;
      font-size: 12px;
    }

    span[class^="leave-rating--helper-text"] {
      font-size: 10px;
      white-space: nowrap;
    }

    .card__thumb-overlay {
      position: absolute;
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      margin: 4px;
      padding: 2px 4px;
      border-radius: 2px;
      transition: opacity linear 100ms;
    }

    .card__course-link {
      font-size: 1.4rem;
    }

    .card__course-runtime {
      bottom: 0;
      right: 0;
      background-color: rgba(20, 30, 46, 0.75);
      color: #ffffff;
    }

    .impr__progress-bar~.card__course-runtime {
      bottom: 4px;
    }

    .card__course-locale {
      top: 0;
      left: 0;
      background-color: rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 1px 1px rgba(20, 23, 28, 0.1);
      color: #29303b;
      font-weight: 600;
    }

    .play-button-trigger .hover-hide {
      opacity: 1;
    }

    .play-button-trigger .hover-show {
      opacity: 0;
    }

    .play-button-trigger:hover .hover-hide {
      opacity: 0;
    }

    .play-button-trigger:hover .hover-show {
      opacity: 1;
    }

    .impr__progress-bar {
      display: block;
      position: absolute;
      bottom: 0;
      right: 0;
      left: 0;
      height: 5px;
      background: rgba(20, 30, 46, 0.75);
    }

    .impr__progress-bar .progress__bar {
      background: #69c1d0 !important;
    }

    .card__custom {
      font-size: 12px;
      color: #686f7a;
      height: 85px;
    }

    .impr__rating {
      padding: 0 12px;
      height: 48px;
    }

    .impr__rating-strip {
      height: 5px;
    }

    .impr__stats {
      font-weight: 500;
      padding: 5px 12px;
      line-height: 1.7;
      display: flex;
    }

    .impr__stats>div {
      display: inline-block;
      background: #f7f8fa;
      padding: 0 5px;
      margin-right: 5px;
      border-radius: 2px;
      border: 1px solid #e7e7e8;
      cursor: default;
    }

    .impr__stats .udi {
      opacity: 0.75;
      vertical-align: middle;
    }

    .impr__stats .udi:not(:last-child) {
      margin-right: 4px;
    }

    .impr__star-own {
      font-size: 16px;
      margin-right: 2px;
    }

    .card__stars {
      display: inline-block;
      width: 7rem;
      height: 1.6rem;
      vertical-align: text-bottom;
    }

    .card__star--bordered {
      stroke: #eb8a2f;
    }

    .card__star--filled {
      fill: #eb8a2f;
    }

    .card__rating-text {
      font-weight: 700;
      color: #505763;
      margin-left: 2px;
      margin-right: 6px;
      font-size: 14px;
    }

    .impr__icon {
      width: 12px;
      height: 15px;
      fill: currentColor;
      vertical-align: text-top;
      margin-right: 4px;
      opacity: 0.75;
    }

    .card__nodata {
      font-size: 13px;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      height: 75px;
      margin-top: 10px;
      padding: 12px;
      background: #fbf4f4;
      color: #521822;
    }

    .impr__rating-all {
      height: 20px;
    }

    .impr__rating-btn {
      position: relative;
      height: 20px;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-end;
    }

    .impr__rating-btn>.impr__rating-own {
      position: absolute;
    }

    .impr__rating-btn.is-rated>span {
      opacity: 0;
    }

    .impr__rating-btn.is-rated:hover>span {
      opacity: 1;
    }

    .impr__rating-btn.is-rated:hover>.impr__rating-own {
      opacity: 0;
    }

    .impr__tooltip {
      display: inline;
      position: relative;
    }

    .impr__tooltip:hover:after {
      display: flex;
      justify-content: center;
      background: #4f5662;
      border-radius: 3px;
      color: #fff;
      content: attr(data-tooltip);
      margin: 4px 0 0 -50%;
      font-size: 11px;
      padding: 2px 6px;
      position: absolute;
      z-index: 10;
      white-space: pre;
    }

    .impr__tooltip:hover:before {
      border: solid;
      border-color: #4f5662 transparent;
      border-width: 0px 4px 6px 4px;
      content: "";
      left: 50%;
      margin-left: -4px;
      bottom: -4px;
      position: absolute;
    }

    .impr__stars-ct {
      margin: 0;
      padding: 4px 0 0;
      display: flex;
    }

    .impr__stars {
      font-size: 13px;
      display: inline-block;
      white-space: nowrap;
    }

    .impr__stars div {
      display: inline-block;
      position: relative;
    }

    .impr__star {
      top: 0;
      left: 0;
    }

    .impr__star:before {
      font-family: udemyicons;
      display: inline-block;
      position: relative;
      line-height: 1;
    }

    .impr__star--unfilled {
      position: relative;
    }

    .impr__star--unfilled:before {
      z-index: 0;
      content: "\\F005";
      color: #dedfe0;
    }

    .impr__star--filled {
      position: absolute;
      overflow: hidden;
    }

    .impr__star--filled:before {
      z-index: 1;
      content: "\\F005";
      color: #f4c150;
    }

    .impr__review {
      margin-left: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .impr__review-stat {
      font-weight: 700;
      font-size: 13px;
      color: #505763;
    }

    .impr__review-count {
      font-weight: 400;
      color: #686f7a;
      margin-left: 2px;
    }
  `);
})();