fetchCourses();

const mutationObserver = new MutationObserver(fetchCourses);
const observerConfig = {
  childList: true,
  subtree: true
};
mutationObserver.observe(document, observerConfig);

const i18n = loadTranslations();
const lang = getLang(document.documentElement.lang);

function fetchCourses() {
  listenForArchiveToggle();
  const courseContainers = document.querySelectorAll('[class^="enrolled-course-card--container--"]:not(.details-done)');
  if (courseContainers.length == 0) return;
  [...courseContainers].forEach((courseContainer) => {

    const isPartialRefresh = courseContainer.classList.contains('partial-refresh');

    const courseId = courseContainer.querySelector('h3[data-purpose="course-title-url"]>a').href.replace('https://www.udemy.com/course-dashboard-redirect/?course_id=', '');

    const courseCustomDiv = document.createElement('div');
    courseCustomDiv.classList.add('improved-course-card--additional-details', 'js-removepartial');

    const innerContainer = courseContainer.querySelector('div[data-purpose="container"]')
    innerContainer.appendChild(courseCustomDiv);

    courseContainer.classList.add('details-done');
    courseContainer.classList.add('improved-course-card--container');    
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
    courseLinkLi.classList.add('js-removepartial');

    const allDropdowns = courseContainer.parentElement.querySelectorAll('.udlite-block-list');
    if (allDropdowns[1]) {
      allDropdowns[1].appendChild(courseLinkLi);;
    }

// Find existing elements in DOM
const imageWrapper = courseContainer.querySelector('div[class^="course-card--image-wrapper--"]');
imageWrapper.classList.add('improved-course-card--image-wrapper')

const mainContent = courseContainer.querySelector('div[class^="course-card--main-content--"]');
mainContent.classList.add('improved-course-card--main-content')

const courseTitle = courseContainer.querySelector('h3[data-purpose="course-title-url"]');
courseTitle.classList.add('improved-course-card--course-title');

const progressBar = courseContainer.querySelector('div[class^="enrolled-course-card--meter--"]');
progressBar?.classList.add('improved-course-card--meter')

const progressAndRating = courseContainer.querySelector('div[class*="enrolled-course-card--progress-and-rating--"]');
progressAndRating?.classList.add('improved-course-card--progress-and-rating')

const progressText = progressAndRating.firstChild;
const progressMade = /%/.test(progressText.textContent);

if (!progressMade) progressAndRating.parentNode.removeChild(progressAndRating);

    // If progress made
    if (progressMade) {
      // Add progress bar below thumbnail
      const progressBarSpan = document.createElement('span');
      progressBarSpan.classList.add('impr__progress-bar', 'js-removepartial');
      progressBarSpan.innerHTML = progressBar.innerHTML;
      imageWrapper.appendChild(progressBarSpan);
      // Add progress percentage to thumbnail bottom right
      const progressTextSpan = document.createElement('span');
      progressTextSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-show', 'js-removepartial');
      progressTextSpan.textContent = progressText.textContent;
      imageWrapper.appendChild(progressTextSpan);
      // Remove existing progress percentage
      progressText.parentNode.removeChild(progressText);
    }

    // Remove existing progress bar
    if (!isPartialRefresh) {
      progressBar.parentNode.removeChild(progressBar);
    }

    // If course page has draft status, do not even to fetch its data via API
    if (courseContainer.querySelector('[data-purpose="course-title-url"] a').href.includes('/draft/')) {
      // if (!isPartialRefresh) {
      //   mainContent.parentNode.removeChild(mainContent);
      // }
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
        const reviewButton = courseContainer.querySelector('[data-purpose="review-button"]');

        // Now let's handle own ratings

        // Set up empty html
        let myRatingHtml = '';
        let ratingButton;
        let ratingOwn = 0;

        // If ratings stars ARE visible, proceed to build own rating stars
        if (reviewButton != null) {

          // Find the rating-button, and remove its css class
          ratingButton = reviewButton;

          // If I have voted, count the stars and tell me how I voted
          ratingOwn = getRatingFromSvg(ratingButton.querySelector('svg')); // between 0 and 5

          // Remove the old stars from ratingButton
          ratingButton.removeChild(ratingButton.querySelector('span'));

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

        if (reviewButton != null) {
          const reviewButtonContainer = courseCustomDiv.querySelector('.review-button');
          ratingButton.style.display = 'inline';
          reviewButtonContainer.appendChild(ratingButton);
        }

        // if (!isPartialRefresh) {
        //   mainContent.parentNode.removeChild(mainContent);
        // }

        // Hide language badge if language is English
        if (localeCode.slice(0, 2) !== 'en') {
          const localeSpan = document.createElement('span');
          localeSpan.classList.add('card__thumb-overlay', 'card__course-locale', 'hover-hide', 'js-removepartial');
          localeSpan.innerHTML = `<span style="margin-right: 3px;vertical-align: bottom;font-size: 14px;line-height: 13px;">${getFlagEmoji(localeCode.slice(-2))}</span>${locale}`;
          imageWrapper.appendChild(localeSpan);
        }

        // Add course runtime from API to thumbnail bottom right
        const runtimeSpan = document.createElement('span');
        runtimeSpan.classList.add('card__thumb-overlay', 'card__course-runtime', 'hover-hide', 'js-removepartial');
        runtimeSpan.innerHTML = parseRuntime(runtime, lang);
        imageWrapper.appendChild(runtimeSpan);
      })
      .catch(error => {
        courseCustomDiv.classList.add('card__nodata');
        courseCustomDiv.innerHTML += `<div><b>${error}</b><br>${i18n[lang].notavailable}</div>`;
        // if (mainContent != null) {
        //   mainContent.parentNode.removeChild(mainContent);
        // }
      });
  });
}

function listenForArchiveToggle() {

  document.querySelectorAll('[data-purpose="toggle-archived"]').forEach(item => {
    item.addEventListener('click', event => {

      // super super dirty quickfix for broken archiving. I am sorry
      setTimeout(() => {
        location.reload();
      }, 500)


      // mutationObserver.disconnect();
      // let thisCourse = item.closest('.details-done');
      // if (thisCourse != null) {
      //   thisCourse.classList.add('partial-refresh');

      //   while (thisCourse.nextElementSibling != null) {
      //     thisCourse.nextElementSibling.classList.add('partial-refresh');
      //     thisCourse = thisCourse.nextElementSibling;
      //   }
      // }

      // const brokenContainers = document.querySelectorAll('.partial-refresh');
      // [...brokenContainers].forEach((brokenContainer) => {
      //   brokenContainer.classList.remove('details-done');
      //   let removeElements = brokenContainer.getElementsByClassName('js-removepartial');
      //   while (removeElements[0]) {
      //     removeElements[0].parentNode.removeChild(removeElements[0]);
      //   }
      // });

      // mutationObserver.observe(document, observerConfig);
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

function getRatingFromSvg(svgElement) {
  let percentage = svgElement.querySelector('mask rect').getAttribute('width');
  let rating = parseFloat(percentage) / 100 * 5;
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
    },
    'ja-jp': {
      'overview': 'コースの概要',
      'enrolled': '受講生',
      'updated': '最終更新日 ',
      'notavailable': 'コースの情報はありません。',
      'separator': ',',
      'decimal': '.',
      'hours': '時間',
      'mins': '分'
    }
  };
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}