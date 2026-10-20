1. Open index.html through a local web server (e.g. VS Code Live Server).
2. Enter student details; you will go to papers.html.
3. Sinhala medium currently has one DEMO LISTING: 2025 Science. Other mediums show no papers until added.
4. To activate the demo paper, put real page1.pdf, page2.pdf, etc. in its folder, edit the pages list in paper.js, and fill all 40 verified answers.
5. For a new paper: copy the science folder to your desired year/medium/subject path; edit its paper.js configuration; add its URL and metadata to the PAPERS array in root papers.js.
6. No database is used. Student details are kept only in sessionStorage.
7. The sample is an MCQ marker; certificate creation is not included in this simplified three-page architecture.
