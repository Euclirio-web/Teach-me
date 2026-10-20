
"use strict";

// Examination papers
const PAPERS = [
  { year: 2025, subject: "Science", medium: "Sinhala", url: "O-Lpastpapers/2k25/sinhala/science/index.html" },
  { year: 2025, subject: "Buddhism", medium: "Sinhala", url: "O-Lpastpapers/2k25/sinhala/buddhism/index.html" },
  { year: 2025, subject: "History", medium: "Sinhala", url: "O-Lpastpapers/2k25/sinhala/history/index.html" },
  { year: 2025, subject: "Sinhala Language", medium: "Sinhala", url: "O-Lpastpapers/2k25/sinhala/sinhala language/index.html" },

  { year: 2025, subject: "Science", medium: "English", url: "O-Lpastpapers/2k25/english/science/index.html" },
  { year: 2025, subject: "History", medium: "English", url: "O-Lpastpapers/2k25/english/history/index.html" },
  { year: 2025, subject: "Sinhala Language", medium: "English", url: "O-Lpastpapers/2k25/english/sinhala language/index.html" },

  { year: 2025, subject: "Science", medium: "Tamil", url: "O-Lpastpapers/2k25/tamil/science/index.html" },

  { year: 2024, subject: "Science", medium: "Sinhala", url: "O-Lpastpapers/2k24/sinhala/science/index.html" },
  { year: 2024, subject: "Buddhism", medium: "Sinhala", url: "O-Lpastpapers/2k24/sinhala/buddhism/index.html" },
  { year: 2024, subject: "History", medium: "Sinhala", url: "O-Lpastpapers/2k24/sinhala/history/index.html" },
  { year: 2024, subject: "Sinhala Language", medium: "Sinhala", url: "O-Lpastpapers/2k24/sinhala/sinhala language/index.html" },
  { year: 2024, subject: "Health", medium: "Sinhala", url: "O-Lpastpapers/2k24/sinhala/health/index.html" },

  { year: 2024, subject: "Science", medium: "English", url: "O-Lpastpapers/2k24/english/science/index.html" },
  { year: 2024, subject: "Health", medium: "English", url: "O-Lpastpapers/2k24/english/health/index.html" },
  { year: 2024, subject: "Sinhala Language", medium: "English", url: "O-Lpastpapers/2k24/english/sinhala language/index.html" },
  { year: 2024, subject: "Buddhism", medium: "English", url: "O-Lpastpapers/2k24/english/budhism/index.html" },

  { year: 2024, subject: "Science", medium: "Tamil", url: "O-Lpastpapers/2k24/tamil/science/index.html" },
  { year: 2024, subject: "Buddhism", medium: "Tamil", url: "O-Lpastpapers/2k24/tamil/buddhism/index.html" }
];

const WHATSAPP_COMMUNITY_URL =
  "https://chat.whatsapp.com/BhtPfqDgfov8CyWTx2JJ8N";

const FACEBOOK_COMMUNITY_URL =
  "https://www.facebook.com/share/g/16GXpS2ohu9/";

// Read registered student
let student = null;

try {
  student = JSON.parse(
    sessionStorage.getItem("olStudent") || "null"
  );
} catch (error) {
  console.error("Could not read student data:", error);
}

if (student && student.olMedium) {
  student.olMedium = String(student.olMedium)
    .trim()
    .toLowerCase();
}

const validStudent = Boolean(
  student &&
  ["sinhala", "tamil", "english"].includes(student.olMedium)
);

const studentInfo = document.getElementById("student-info");
const list = document.getElementById("paper-list");
const yearFilter = document.getElementById("year-filter");

const publicDirectory =
  document.getElementById("public-directory");

const registeredDirectory =
  document.getElementById("registered-directory");

// Show the appropriate directory
if (validStudent) {
  if (publicDirectory) publicDirectory.hidden = true;
  if (registeredDirectory) registeredDirectory.hidden = false;

  if (studentInfo) {
    studentInfo.textContent =
      `${student.name || "Student"} · ${student.olMedium.toUpperCase()} medium`;
  }
} else {
  if (publicDirectory) publicDirectory.hidden = false;
  if (registeredDirectory) registeredDirectory.hidden = true;

  if (studentInfo) {
    studentInfo.textContent =
      "Browse available papers below. Register to start practicing.";
  }
}

// Render registered student's papers
function render() {
  if (!validStudent || !list) return;

  list.replaceChildren();

  const selectedYear = yearFilter
    ? yearFilter.value
    : "all";

  const filteredPapers = PAPERS.filter(paper =>
    paper.medium.toLowerCase() === student.olMedium &&
    (
      selectedYear === "all" ||
      String(paper.year) === selectedYear
    )
  );

  if (filteredPapers.length === 0) {
    const message = document.createElement("p");

    message.textContent =
      "No papers added for this medium and year yet. " +
      "(මෙම මාධ්‍යය සහ වර්ෂය සඳහා තවම ප්‍රශ්න පත්‍ර එක් කර නැත.)";

    list.append(message);
    return;
  }

  for (const paper of filteredPapers) {
    const link = document.createElement("a");

    link.className = "paper-link";
    link.href = paper.url;

    const title = document.createElement("strong");
    title.textContent = `${paper.year} — ${paper.subject}`;

    const subtitle = document.createElement("span");
    subtitle.textContent =
      "Open MCQ paper → (ප්‍රශ්න පත්‍රය විවෘත කරන්න)";

    link.append(title, subtitle);
    list.append(link);
  }
}

yearFilter?.addEventListener("change", render);
render();

// Community section
const communitySection = document.createElement("section");
communitySection.className = "community-section";

Object.assign(communitySection.style, {
  margin: "20px 0 28px",
  padding: "22px",
  textAlign: "center",
  background: "#f0f7ff",
  border: "1px solid #dbeafe",
  borderRadius: "14px"
});

const heading = document.createElement("h3");
heading.textContent =
  "Join Our Student Communities (අපගේ ශිෂ්‍ය ප්‍රජාවන්ට එක්වන්න)";
heading.style.margin = "0 0 10px";

const description = document.createElement("p");
description.textContent =
  "Can't find your examination paper? Join our communities " +
  "to request new O/L past papers. " +
  "(ඔබට අවශ්‍ය ප්‍රශ්න පත්‍රය සොයාගත නොහැකිද? " +
  "නව සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍ර ඉල්ලා සිටීමට අපගේ ප්‍රජාවන්ට එක්වන්න.)";

description.style.marginBottom = "18px";

const buttons = document.createElement("div");

Object.assign(buttons.style, {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "12px"
});

function communityButton(label, url, background) {
  const button = document.createElement("a");

  button.textContent = label;
  button.href = url;
  button.target = "_blank";
  button.rel = "noopener noreferrer";

  Object.assign(button.style, {
    display: "inline-block",
    background,
    color: "#fff",
    padding: "13px 20px",
    borderRadius: "9px",
    textDecoration: "none",
    fontWeight: "bold"
  });

  return button;
}

buttons.append(
  communityButton(
    "Join WhatsApp (WhatsApp සමූහයට එක්වන්න)",
    WHATSAPP_COMMUNITY_URL,
    "#25D366"
  ),
  communityButton(
    "Join Facebook (Facebook සමූහයට එක්වන්න)",
    FACEBOOK_COMMUNITY_URL,
    "#1877F2"
  )
);

communitySection.append(
  heading,
  description,
  buttons
);

// Keep community buttons beneath Choose Paper
if (validStudent && registeredDirectory) {
  const choosePaperHeading =
    registeredDirectory.querySelector("h2");

  if (choosePaperHeading) {
    choosePaperHeading.insertAdjacentElement(
      "afterend",
      communitySection
    );
  }
} else if (publicDirectory) {
  const publicHeading =
    publicDirectory.querySelector("h2");

  if (publicHeading) {
    publicHeading.insertAdjacentElement(
      "afterend",
      communitySection
    );
  }
}

