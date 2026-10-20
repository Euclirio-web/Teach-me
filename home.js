"use strict";

const districts = [
  'Ampara', 'Anuradhapura', 'Badulla',
  'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna',
  'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya'
];

const districtSelect = document.getElementById('district');

if (districtSelect) {
  const existing = new Set(
    Array.from(districtSelect.options, option => option.value)
  );

  for (const district of districts) {
    if (!existing.has(district)) {
      districtSelect.add(new Option(district, district));
    }
  }
}

const form = document.getElementById('student-form');

if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();

    const error = document.getElementById('form-error');

    if (error) error.hidden = true;

    if (!form.reportValidity()) return;

    const data = new FormData(form);

    const year = String(data.get('olYear') || '');

    if (!['2026', '2027'].includes(year)) {
      if (error) {
        error.textContent = 'Please select your O/L year.';
        error.hidden = false;
      }
      return;
    }

    const agreement = document.getElementById('agree-terms');

    if (!agreement || !agreement.checked) {
      if (error) {
        error.textContent =
          'Please agree to the Terms and Privacy Policy.';
        error.hidden = false;
      }
      return;
    }

    const student = {
      name: String(data.get('studentName') || '').trim(),
      district: String(data.get('district') || ''),
      olYear: year,
      olMedium: String(data.get('olMedium') || ''),
      alMedium: String(data.get('alMedium') || ''),
      agreedToTerms: true,
      consentDate: new Date().toISOString()
    };

    if (!student.name) {
      if (error) {
        error.textContent = 'Enter your full name.';
        error.hidden = false;
      }
      return;
    }

    sessionStorage.setItem(
      'olStudent',
      JSON.stringify(student)
    );

    window.location.href = 'papers.html';
  });
}

// Share website with friends
const shareButton = document.getElementById('share-friends');

if (shareButton) {
  shareButton.addEventListener('click', () => {

    const websiteURL =
      'https://teach-me.koembrace-euclirio.workers.dev/';

    const message = [
      ' Prepare for your O/L Exams!',
      '',
      'Practise past papers online and check your MCQ answers automatically.',
      '',
      ' සාමාන්‍ය පෙළ විභාගයට සූදානම් වන්න!',
      '',
      'පසුගිය විභාග ප්‍රශ්න පත්‍ර මාර්ගගතව පුහුණු වී,',
      'ඔබගේ බහුවරණ පිළිතුරු ස්වයංක්‍රීයව පරීක්ෂා කරගන්න.',
      '',
      ' Try this free website:',
      'නොමිලේ මෙම වෙබ් අඩවිය භාවිත කරන්න:',
      websiteURL
    ].join('\n');

    const whatsappURL =
      'https://wa.me/?text=' + encodeURIComponent(message);

    window.open(
      whatsappURL,
      '_blank',
      'noopener,noreferrer'
    );
  });
}