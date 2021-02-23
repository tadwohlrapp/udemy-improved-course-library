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
      courseLinkLi.setAttribute('role', 'presentation');
      courseLinkLi.classList.add('custom-course-link', 'js-removepartial');
      courseLinkLi.innerHTML = `
        <a role="menuitem" tabindex="-1" href="https://www.udemy.com/course/${courseId}/" target="_blank" rel="noopener">
          <span class="udi-small udi udi-explore"></span>
          <span class="card__course-link">${i18n[lang].overview}</span>
          <svg fill="#686f7a" width="12" height="16" viewBox="0 0 24 24" style="vertical-align: bottom;" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7z"></path>
          </svg>
        </a>
      `;
      const dropdownUl = courseContainer.querySelector('.dropdown-menu');
      dropdownUl.appendChild(courseLinkLi);

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
})();