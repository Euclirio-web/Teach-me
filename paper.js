"use strict";

/*
  ONE shared JavaScript file for all O/L examination pages.
  Each exam.html defines window.PAPER before loading this script.
  The root papers.html is the page students use to select another paper.
*/
(() => {
  const RESULTS_KEY = "olExamResults";
  const FINISHED_KEY = "olExamFinished";
  const PAPER_LIST_URL = new URL("papers.html", document.currentScript.src).href;
  const HOME_URL = new URL("index.html", document.currentScript.src).href;
  const paper = window.PAPER;
  if (!paper) {
    console.error("Missing window.PAPER configuration in exam.html");
    return;
  }

  const $ = id => document.getElementById(id);
  const student = JSON.parse(sessionStorage.getItem("olStudent") || "{}");
  const results = () => JSON.parse(sessionStorage.getItem(RESULTS_KEY) || "[]");
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  let pageIndex = 0;
  let submitted = false;

  if (!$('pages') || !$('answers') || !$('submit')) {
    console.error("Missing required exam.html elements: pages, answers, submit");
    return;
  }
  if ($('paper-title')) $('paper-title').textContent = `${paper.year} ${paper.subject} Examination`;
  if ($('student-name')) $('student-name').textContent = `Student: ${student.name || "Practice Examination"}`;

  // A new student profile should start a new session via index.html; a finished session stays closed.
  if (sessionStorage.getItem(FINISHED_KEY) === "yes") {
    $('submit').disabled = true;
    $('answers').innerHTML = "<p>ඔබගේ පෙර වාරය අවසන් වී ඇත. (Your previous session is finished.) මුල් පිටුවෙන් නැවත ආරම්භ කරන්න.</p>";
    if ($('result')) $('result').innerHTML = `<a href="${HOME_URL}">Return to homepage (මුල් පිටුවට යන්න)</a>`;
    return;
  }

  // All viewer styles are injected here: no changes to exam HTML files.
  const viewerStyle = document.createElement('style');
  viewerStyle.textContent = `
    #pages {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      padding: 4px !important;
    }
    #pages .pdf-sheet {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      margin: 0 auto 12px !important;
      background: white;
      box-shadow: 0 1px 6px rgba(0,0,0,.12);
    }
    #pages .pdf-canvas {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      box-shadow: none !important;
      background: white;
    }
    #pages .pdf-status { padding: 18px 12px; text-align: center; line-height: 1.6; color: #334155; }
  `;
  document.head.appendChild(viewerStyle);

  // An outer fixed-height/overflow-hidden exam container can crop the bottom.
  // Remove clipping only on the PDF viewer's own ancestor chain.
  function removeViewerClipping(viewer) {
    let element = viewer.parentElement;
    for (let depth = 0; element && depth < 6 && element !== document.body; depth++, element = element.parentElement) {
      const css = getComputedStyle(element);
      if (['hidden', 'clip'].includes(css.overflowY)) {
        element.style.setProperty('overflow-y', 'visible', 'important');
      }
      if (css.maxHeight !== 'none' && css.maxHeight !== '0px') {
        element.style.setProperty('max-height', 'none', 'important');
      }
      if (css.height !== 'auto' && (css.overflowY === 'hidden' || css.overflowY === 'clip')) {
        element.style.setProperty('height', 'auto', 'important');
      }
    }
  }

  // Render PDFs on a canvas instead of using a mobile-unfriendly iframe.
  // PDF.js is loaded only when the examination page needs it.
  const PDFJS_VERSION = '4.10.38';
  const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/`;
  let pdfjsPromise;
  let renderSequence = 0;
  const documentCache = new Map();

  function getPDFJS() {
    if (!pdfjsPromise) {
      pdfjsPromise = import(PDFJS_BASE + 'pdf.mjs').then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'pdf.worker.mjs';
        return pdfjs;
      });
    }
    return pdfjsPromise;
  }

  async function showPage(index) {
    if (!Array.isArray(paper.pages) || index < 0 || index >= paper.pages.length) return;
    pageIndex = index;
    const sequence = ++renderSequence;
    const viewer = $('pages');
    const status = document.createElement('p');
    status.className = 'pdf-status';
    status.textContent = 'Loading examination page…';
    viewer.replaceChildren(status);

    if ($('page-number')) $('page-number').textContent = `Page ${index + 1} of ${paper.pages.length} (පිටුව ${index + 1} / ${paper.pages.length})`;
    if ($('prev-page')) $('prev-page').disabled = index === 0;
    if ($('next-page')) $('next-page').disabled = index === paper.pages.length - 1;

    try {
      const sourceURL = new URL(paper.pages[index], window.location.href).href;
      const pdfjs = await getPDFJS();
      if (sequence !== renderSequence) return;

      if (!documentCache.has(sourceURL)) {
        const pending = pdfjs.getDocument({url: sourceURL}).promise;
        documentCache.set(sourceURL, pending);
        pending.catch(() => documentCache.delete(sourceURL));
      }
      const pdf = await documentCache.get(sourceURL);
      if (sequence !== renderSequence) return;

      // Render each PDF sheet in short vertical tiles. A single tall canvas can
      // silently lose its bottom half on some mobile GPUs/browsers.
      const fragment = document.createDocumentFragment();
      removeViewerClipping(viewer);
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        if (sequence !== renderSequence) return;
        const pdfPage = await pdf.getPage(pageNumber);
        const baseViewport = pdfPage.getViewport({scale: 1});
        const containerWidth = viewer.clientWidth || viewer.getBoundingClientRect().width || window.innerWidth;
        const availableWidth = Math.max(1, Math.min(containerWidth - 8, window.innerWidth - 16));
        const scale = availableWidth / baseViewport.width;
        const viewport = pdfPage.getViewport({scale});
        const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
        const tileHeight = Math.max(128, Math.min(900, Math.floor(3000000 / Math.max(1, viewport.width * ratio * ratio))));
        const sheet = document.createElement('div');
        sheet.className = 'pdf-sheet';
        sheet.setAttribute('role', 'img');
        sheet.setAttribute('aria-label', `Examination page ${index + 1}, PDF sheet ${pageNumber}`);
        sheet.style.width = `${viewport.width}px`;

        for (let top = 0; top < viewport.height; top += tileHeight) {
          if (sequence !== renderSequence) return;
          const height = Math.min(tileHeight, viewport.height - top);
          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-canvas';
          canvas.width = Math.max(1, Math.round(viewport.width * ratio));
          canvas.height = Math.max(1, Math.round(height * ratio));
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${height}px`;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas is unavailable in this browser');
          await pdfPage.render({
            canvasContext: context,
            viewport,
            transform: [ratio, 0, 0, ratio, 0, -top * ratio]
          }).promise;
          if (sequence !== renderSequence) return;
          sheet.appendChild(canvas);
        }
        fragment.appendChild(sheet);
      }
      if (sequence === renderSequence) viewer.replaceChildren(fragment);
    } catch (error) {
      if (sequence !== renderSequence) return;
      console.error('Unable to display PDF:', error, 'PDF URL:', paper.pages[index]);
      const detail = error instanceof Error ? error.message : String(error);
      status.textContent = 'Unable to display this PDF (PDF පෙන්විය නොහැක): ' + detail;
      // A retry button is useful for intermittent mobile connections.
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Retry PDF (නැවත උත්සාහ කරන්න)';
      retry.addEventListener('click', () => {
        documentCache.delete(new URL(paper.pages[index], window.location.href).href);
        pdfjsPromise = undefined;
        showPage(index);
      });
      viewer.replaceChildren(status, retry);
    }
  }

  $('prev-page')?.addEventListener('click', () => showPage(pageIndex - 1));
  $('next-page')?.addEventListener('click', () => showPage(pageIndex + 1));
  showPage(0);

  
for (let i = 1; i <= paper.questionCount; i++) {

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'question';

    const legend = document.createElement('legend');
    legend.textContent = `Question ${i} (ප්‍රශ්නය ${i})`;
    fieldset.append(legend);

    // Container for four horizontal options
    const options = document.createElement('div');
    options.className = 'options';

    for (let option = 1; option <= 4; option++) {

        const label = document.createElement('label');
        const input = document.createElement('input');

        input.type = 'radio';
        input.name = `q${i}`;
        input.value = String(option);

        label.append(input, ` ${option} `);
        options.append(label);
    }

    fieldset.append(options);
    $('answers').append(fieldset);
}

  function resultPanel(html) {
    const panel = $('result') || document.createElement('section');
    if (!panel.id) { panel.id = 'result'; $('submit').insertAdjacentElement('afterend', panel); }
    panel.innerHTML = html;
    panel.hidden = false;
    panel.scrollIntoView({behavior:'smooth', block:'start'});
    return panel;
  }

  function showNextChoice() {
    resultPanel(`
      <div class="exam-finish-card">
        <h2>Thank you for completing the examination! (සම්පූර්ණ කළ ඔබට ස්තුතියි!)</h2>
        <p>Your result has been saved for this session. You can complete more papers before sending your combined results. (ඔබගේ ප්‍රතිඵල සුරැකී ඇත. සියලු ප්‍රතිඵල යැවීමට පෙර තවත් ප්‍රශ්න පත්‍ර කළ හැක.)</p>
        <p><strong>Completed papers (සම්පූර්ණ කළ ප්‍රශ්න පත්‍ර): ${results().length}</strong></p>
        <div class="exam-finish-actions">
          <button type="button" id="do-another">Do Another Paper (තවත් ප්‍රශ්න පත්‍රයක් කරන්න)</button>
          <button type="button" id="im-done">I'm Done (අවසන් කරන්න)</button>
        </div>
      </div>`);
    $('do-another').addEventListener('click', () => {
    sessionStorage.removeItem("olExamFinished");
    window.location.replace(PAPER_LIST_URL);
});
    $('im-done').addEventListener('click', showSurvey);
  }


function showSurvey() {
  resultPanel(`
    <div class="exam-finish-card">
      <h2>Thank you! Just a few questions (ස්තුතියි! තවත් ප්‍රශ්න කිහිපයක්)</h2>

      <form id="finish-survey">

        <fieldset>
          <legend>Rate us (1–5) (අපව ඇගයීමට ලක් කරන්න)</legend>
          <div class="rating-options">
            ${[1,2,3,4,5].map(n =>
              `<label><input type="radio" name="rating" value="${n}" required> ${n} ★</label>`
            ).join(' ')}
          </div>
        </fieldset>

        

        <label for="al-stream">
          <strong>Which A/L stream will you follow? (ඔබ තෝරාගන්නා උසස් පෙළ විෂය ධාරාව කුමක්ද?)</strong>
        </label>
        <select id="al-stream" required>
          <option value="">Select your stream (විෂය ධාරාව තෝරන්න)</option>
          <option value="Maths">Maths</option>
          <option value="Bio">Bio</option>
          <option value="Maths with IT">Maths with IT</option>
          <option value="Bio with Agriculture">Bio with Agriculture</option>
          <option value="Commerce with IT">Commerce with IT</option>
          <option value="Commerce">Commerce</option>
          <option value="Arts">Arts</option>
        </select>

        <div id="arts-subjects-wrap" hidden>
          <label for="arts-subjects">
            <strong>Which Arts subjects are you doing? (ඔබ හදාරන කලා විෂයයන් මොනවාද?)</strong>
          </label>
          <textarea
            id="arts-subjects"
            rows="3"
            placeholder="Enter your A/L Arts subjects (උසස් පෙළ කලා විෂයයන් ඇතුළත් කරන්න)"
          ></textarea>
        </div>

        <label for="al-medium">
          <strong>A/L medium (උසස් පෙළ මාධ්‍යය)</strong>
        </label>
        <select id="al-medium" required>
          <option value="">Select your medium (මාධ්‍යය තෝරන්න)</option>
          <option value="Sinhala">Sinhala</option>
          <option value="Tamil">Tamil</option>
          <option value="English">English</option>
        </select>

        <label for="feedback-comment">
          <strong>Any comment? (Optional) (අදහස් තිබේද? අනිවාර්ය නොවේ)</strong>
        </label>
        <textarea
          id="feedback-comment"
          rows="3"
          placeholder="Suggestions or comments (යෝජනා හෝ අදහස්)"
        ></textarea>

        <label for="whatsapp-phone">
          <strong>WhatsApp number to send results to (ප්‍රතිඵල යැවිය යුතු WhatsApp අංකය)</strong>
        </label>
        <input
          id="whatsapp-phone"
          type="tel"
          inputmode="tel"
          placeholder="0771234567 or +94771234567"
          required
        >

        

        <p class="exam-note">
          WhatsApp will open with your combined results.
          You must press Send yourself.
          (ඔබගේ ප්‍රතිඵල සමඟ WhatsApp විවෘත වේ.
          පණිවිඩය යැවීමට Send ඔබන්න.)
        </p>

        <button type="submit" id="survey-submit">
          Continue to WhatsApp (WhatsApp වෙත යන්න)
        </button>

      </form>
    </div>
  `);

  $('al-stream').addEventListener('change', () => {
    const isArts = $('al-stream').value === 'Arts';

    $('arts-subjects-wrap').hidden = !isArts;
    $('arts-subjects').required = isArts;

    if (!isArts) {
      $('arts-subjects').value = '';
    }
  });

  $('finish-survey').addEventListener('submit', event => {
    event.preventDefault();

    const phone = normalizePhone($('whatsapp-phone').value);

    if (!phone) {
      alert(
        'Please enter a valid WhatsApp number. ' +
        '(වලංගු WhatsApp අංකයක් ඇතුළත් කරන්න.)'
      );
      return;
    }

    const rating = document.querySelector(
      'input[name="rating"]:checked'
    )?.value;

    if (!rating) {
      alert(
        'Please rate us from 1 to 5. ' +
        '(කරුණාකර 1 සිට 5 දක්වා ඇගයීමක් ලබා දෙන්න.)'
      );
      return;
    }

    const allResults = results();

    if (!allResults.length) {
      alert(
        'No completed papers found. ' +
        '(සම්පූර්ණ කළ ප්‍රශ්න පත්‍ර හමු නොවීය.)'
      );
      return;
    }

    const surveyData = {
      rating: Number(rating),
      stream: $('al-stream').value,
      medium: $('al-medium').value,
      artsSubjects: $('arts-subjects').value.trim(),
      comment: $('feedback-comment').value.trim(),
    };

    sessionStorage.setItem(
      'olExamSurvey',
      JSON.stringify(surveyData)
    );

    // ========================================
    // GOOGLE SHEETS SUBMISSION
    // ========================================

    const GOOGLE_SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbwjlSOaCLWBoa2-URRAtXXCbymhxw3_LSTgXwrgOTpQLgs_B56DyggLnr9HZ8euHHSlZQ/exec";

    const studentData = {
      name: student.name || "",
      district: student.district || "",
      whatsappNumber: phone,
      olMedium: student.olMedium || "",
      olYear: student.olYear || "",
      stream: surveyData.stream,
      medium: surveyData.medium,
      artsSubjects: surveyData.artsSubjects,
      rating: surveyData.rating,
      comment: surveyData.comment,
      results: allResults
    };

    if (
      GOOGLE_SCRIPT_URL !==
      "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"
    ) {
      fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(studentData)
      }).catch(error => {
        console.error(
          "Google Sheets submission failed:",
          error
        );
      });
    } else {
      console.warn(
        "Google Apps Script URL has not been configured."
      );
    }

    // ========================================
    // WHATSAPP EXAMINATION RESULTS
    // ========================================

    // Only examination results are included.
    // Student and survey details are excluded.

    const lines = [
      'O/L PRACTICE EXAMINATION RESULTS',
      ''
    ];

    allResults.forEach((r, i) => {
      if (i > 0) {
        lines.push('--------------------', '');
      }

      lines.push(
        `Subject (විෂය): ${r.subject}`,
        `Year (වර්ෂය): ${r.year}`,
        `Medium (මාධ්‍යය): ${r.medium}`,
        `Correct Answers (නිවැරදි පිළිතුරු): ${r.correct}`,
        `Wrong Answers (වැරදි පිළිතුරු): ${r.wrong}`
      );

      if (Array.isArray(r.wrongAnswers)) {
        r.wrongAnswers.forEach(item => {
          const accepted = Array.isArray(item.correctAnswers)
            ? item.correctAnswers
            : [item.correctAnswers];

          lines.push(
            `Question ${item.question}: Correct Answer ` +
            `(නිවැරදි පිළිතුර): ${accepted.join(' or ')}`
          );
        });
      } else if (r.wrong > 0) {
        lines.push(
          'Question details unavailable for this earlier result.'
        );
      }

      lines.push('');
    });

        lines.push(
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        ' Was Teach Me useful for you?',
        'Share this free O/L practice website with your friends!',
        '',
        'මෙම වෙබ් අඩවිය ඔබට ප්‍රයෝජනවත් වූවා නම්, ඔබේ මිතුරන් සමඟ බෙදා ගන්න!',
        '',
        ' ' + HOME_URL
    );

    const message = lines.join('\n');

    const url =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // ========================================
    // FINISH SESSION
    // ========================================

    sessionStorage.setItem(FINISHED_KEY, 'yes');

    resultPanel(`
      <div class="exam-finish-card">
        <h2>
          Your results are ready
          (ඔබගේ ප්‍රතිඵල සූදානම්)
        </h2>

        <p>
          WhatsApp should open. Please press
          <strong>Send</strong> to deliver the message.
          (WhatsApp විවෘත වූ පසු පණිවිඩය යැවීමට
          <strong>Send</strong> ඔබන්න.)
        </p>

        <p>
          <a href="${escapeHTML(url)}"
             target="_blank"
             rel="noopener">
            Open WhatsApp again
            (නැවත WhatsApp විවෘත කරන්න)
          </a>
        </p>

        <p>
          <a href="${HOME_URL}">
            Return to homepage
            (මුල් පිටුවට යන්න)
          </a>
        </p>
      </div>
    `);

    // A direct link is always available above if the browser blocks pop-ups.
    const whatsappWindow = window.open(url, '_blank');
    if (whatsappWindow) whatsappWindow.opener = null;
  });
}


  function normalizePhone(raw) {
    let n = raw.replace(/[^\d+]/g, '');
    if (n.startsWith('+')) n = n.slice(1);
    if (n.startsWith('00')) n = n.slice(2);
    if (/^0\d{9}$/.test(n)) n = '94' + n.slice(1);
    return /^[1-9]\d{7,14}$/.test(n) ? n : null;
  }

  $('submit').addEventListener('click', () => {
    if (submitted) return;
    if (!Array.isArray(paper.answerKey) || paper.answerKey.length !== paper.questionCount ||
        paper.answerKey.some(a =>
    Array.isArray(a)
        ? a.length === 0 ||
          a.some(option => ![1, 2, 3, 4].includes(option))
        : ![1, 2, 3, 4].includes(a))) 
    {

      alert('This paper does not have a complete verified answer key yet. (මෙම ප්‍රශ්න පත්‍රය සඳහා සම්පූර්ණ තහවුරු කළ පිළිතුරු ලැයිස්තුවක් තවම නොමැත.)');
      return;
    }
    if (!confirm('Submit this paper? You will not be able to change your answers afterward. (ප්‍රශ්න පත්‍රය භාර දෙන්නද? ඉන්පසු පිළිතුරු වෙනස් කළ නොහැක.)')) return;
    let correct = 0, wrong = 0, unanswered = 0;
    const wrongAnswers = [];
    for (let i = 1; i <= paper.questionCount; i++) {
      const chosen = document.querySelector(`input[name="q${i}"]:checked`);
      const accepted = Array.isArray(paper.answerKey[i - 1])
        ? paper.answerKey[i - 1]
        : [paper.answerKey[i - 1]];
      if (!chosen) {
        unanswered++;
      } else if (accepted.includes(Number(chosen.value))) {
        correct++;
      } else {
        wrong++;
        wrongAnswers.push({ question: i, correctAnswers: [...accepted] });
      }
    }
    const allResults = results();
    allResults.push({year:paper.year,subject:paper.subject,medium:paper.medium,
      correct,wrong,wrongAnswers,unanswered,total:paper.questionCount,
      percentage:(100 * correct / paper.questionCount).toFixed(1),
      completedAt:new Date().toISOString()});
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(allResults));
    submitted = true;
    $('submit').disabled = true;
    $('answers').querySelectorAll('input').forEach(input => input.disabled = true);
    showNextChoice();
  });
})();