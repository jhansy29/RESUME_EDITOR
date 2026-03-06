import mongoose from 'mongoose';
import { Template } from './models/Template.js';
import { Resume } from './models/Resume.js';

const CSS = `/* ============================================
   RESUME LAYOUT — Jake's Resume / LaTeX Style
   Computer Modern font (loaded locally)
   ============================================ */

.resume-page {
  width: 8.5in;
  height: 11in;
  padding: 0.22in 0.42in 0.22in 0.42in;
  font-family: 'Computer Modern Serif', Cambria, 'Times New Roman', serif;
  font-size: 9.5pt;
  line-height: 1.18;
  color: #000;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* --- Name --- */
.resume-name {
  font-size: 24pt;
  font-weight: 700;
  text-align: center;
  margin: 0;
  line-height: 1.1;
}

/* --- Contact --- */
.resume-contact {
  text-align: center;
  font-size: 9pt;
  margin: 1pt 0 0 0;
  line-height: 1.2;
}
.resume-contact span + span::before {
  content: ' | ';
  margin: 0 1pt;
}

/* --- Section Headings --- */
.section-heading {
  font-size: 11pt;
  font-weight: 700;
  font-variant: small-caps;
  letter-spacing: 0.06em;
  text-transform: lowercase;
  border-bottom: 0.7pt solid #000;
  padding-bottom: 0;
  margin: 5pt 0 2pt 0;
  line-height: 1.35;
}

/* --- Education --- */
.edu-entry {
  display: flex;
  margin: 0;
  margin-top: var(--bullet-gap, 0);
}
.edu-entry:first-child {
  margin-top: 0;
}
.edu-bullet {
  flex-shrink: 0;
  width: 12pt;
  font-size: 8pt;
  line-height: 1.6;
}
.edu-content {
  flex: 1;
  min-width: 0;
}
.edu-header, .edu-degree-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  line-height: 1.2;
}
.edu-school { font-weight: 700; }
.edu-location { flex-shrink: 0; padding-left: 8pt; }
.edu-degree { font-style: italic; }
.edu-dates { font-style: italic; flex-shrink: 0; padding-left: 8pt; }
.edu-coursework {
  font-size: 8.5pt;
  line-height: 1.15;
  font-style: italic;
  margin: 0;
}

/* --- Skills --- */
.skills-section { margin: 0; }
.skill-row {
  display: flex;
  line-height: 1.25;
  margin: 0;
  margin-top: var(--bullet-gap, 0);
}
.skill-row:first-child {
  margin-top: 0;
}
.skill-row::before {
  content: '\\2022';
  margin-right: 5pt;
  flex-shrink: 0;
  font-weight: 700;
}
.skill-category {
  font-weight: 700;
  white-space: nowrap;
  margin-right: 3pt;
}
.skill-category::after { content: ':'; }
.skill-values { flex: 1; }

/* --- Experience --- */
.entry {
  display: flex;
  margin: 0;
  margin-top: var(--bullet-gap, 0);
}
.entry:first-child {
  margin-top: 0;
}
.entry-bullet {
  flex-shrink: 0;
  width: 12pt;
  font-size: 8pt;
  line-height: 1.6;
}
.entry-content {
  flex: 1;
  min-width: 0;
}
.entry-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  line-height: 1.25;
}
.entry-company { font-weight: 700; }
.entry-location { flex-shrink: 0; padding-left: 8pt; }
.entry-role { font-style: italic; }
.entry-dates { font-style: italic; flex-shrink: 0; padding-left: 8pt; }

/* --- Sub-bullets --- */
.bullet-list {
  list-style: none;
  padding-left: 12pt;
  margin: 0;
}
.bullet-list li {
  position: relative;
  line-height: 1.2;
  margin: 0;
  margin-top: var(--bullet-gap, 0);
}
.bullet-list li:first-child {
  margin-top: 0;
}
.bullet-list li::before {
  content: '\\25E6';
  position: absolute;
  left: -10pt;
  top: 0;
}
.bullet-list li strong { font-weight: 700; }

/* --- Projects --- */
.project-entry {
  display: flex;
  margin: 0;
  margin-top: var(--bullet-gap, 0);
}
.project-entry:first-child {
  margin-top: 0;
}
.project-bullet {
  flex-shrink: 0;
  width: 12pt;
  font-size: 8pt;
  line-height: 1.6;
  font-weight: 700;
}
.project-content {
  flex: 1;
  min-width: 0;
}
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  line-height: 1.2;
}
.project-title { font-weight: 700; }
.project-tech { font-weight: 700; }
.project-date { font-style: italic; flex-shrink: 0; padding-left: 8pt; }
.project-bullets {
  list-style: none;
  padding-left: 12pt;
  margin: 0;
}
.project-bullets li {
  position: relative;
  line-height: 1.2;
  margin: 0;
  margin-top: var(--bullet-gap, 0);
}
.project-bullets li:first-child {
  margin-top: 0;
}
.project-bullets li::before {
  content: '\\25E6';
  position: absolute;
  left: -10pt;
  top: 0;
}
.project-bullets li strong { font-weight: 700; }

/* --- Professional Summary --- */
.resume-summary {
  font-size: 9.5pt;
  line-height: 1.3;
  margin: 1pt 0 0 0;
}`;

const template = {
  name: "Jake's Resume / LaTeX Style",
  description: "Computer Modern serif font, small-caps section headings with bottom border, bullet/sub-bullet layout. Classic LaTeX academic resume style.",
  format: {
    fontFamily: "'Computer Modern Serif', Cambria, 'Times New Roman', serif",
    fontSize: 9.5,
    lineHeight: 1.18,
    marginTop: 0.22,
    marginBottom: 0.22,
    marginLeft: 0.42,
    marginRight: 0.42,
    nameFontSize: 24,
    contactFontSize: 9,
    headingFontSize: 11,
    sectionSpacing: 5,
    bulletSpacing: 0,
  },
  css: CSS,
  sectionOrder: ['header', 'education', 'summary', 'skills', 'experience', 'projects'],
};

async function seed() {
  await mongoose.connect('mongodb://127.0.0.1:27017/resume-editor');
  console.log('Connected to MongoDB');

  // Use Version 1's format for layout, Roshan's full CV data for content
  const version1 = await Resume.findOne({ name: 'Version 1' });
  if (!version1) {
    console.log('Warning: "Version 1" resume not found for format reference');
  }

  const roshanData = {
    contact: {
      name: 'Roshan Reddy Yedla',
      phone: '+16316159094',
      email: 'roshanreddyy.2000@gmail.com',
      linkedin: 'linkedin.com/in/roshan',
      github: 'github.com/YRosh',
      googleScholar: 'Google Scholar',
    },
    education: [
      {
        id: 'edu-1',
        school: 'Stony Brook University',
        location: 'Newyork, USA',
        degree: 'Master of Science (Data Science Specialization) - Computer Science, GPA: 3.9',
        dates: 'August 2022 - May 2024',
        coursework: 'Artificial Intelligence, Machine Learning, Analysis of Algorithms, Big Data Analytics, Theory of Database, Data Science Fundamentals',
      },
      {
        id: 'edu-2',
        school: 'Indian Institute of Information Technology, Sri City',
        location: 'Chittoor, India',
        degree: 'Bachelor of Technology with Honors - Computer Science; GPA: 8.53',
        dates: 'August 2017 - May 2021',
        coursework: 'Programming, Data Structures and Algorithms, Operating Systems, Software Engineering, Database Management Systems, Machine Learning, Artificial Intelligence, Computer Vision, Cloud Computing, Natural Language Processing, Advanced Statistical Methods',
      },
    ],
    skills: [
      { id: 'sk-1', category: 'Programming', skills: 'Python, JavaScript, Typescript, C, C++, Go, Dart, MySQL, MongoDB, PostgreSQL, MSSQL, DynamoDB, XML' },
      { id: 'sk-2', category: 'Software Development', skills: 'HTML/SCSS, Node.js, React.js, React Native, Angular.js, Three.js, Django, Flask, Redux, Flutter' },
      { id: 'sk-3', category: 'Frameworks', skills: 'Numpy, Pandas, SkLearn, PySpark, Hadoop, OpenCV, PyTorch, Tensorflow, REST, GraphQL, Tailwind, Firebase' },
      { id: 'sk-4', category: 'Others', skills: 'AWS, DockerHub, Gitlab CI/CD, Netlify, Bash, Linux, OOPS, AJAX, D3.js, Plotly.js, Three.js, jQuery, JSON, Webpack' },
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'Commvault',
        location: 'Remote',
        role: 'Engineering, Intern (Full-stack web development)',
        dates: 'May 2023 - Aug 2023',
        bullets: [
          { id: 'b-1', text: 'Lead migration of the command center from **Angular** to **React**, enhancing code maintainability, and **UI/UX** satisfaction by 20%' },
          { id: 'b-2', text: 'Updated instance create/edit functions, with **React, AJAX, Node.js** and **Javascript** reducing processing time by 1.5x.' },
          { id: 'b-3', text: 'Contributed to the **C++ backend** implementation for backup configuration feature, developing efficient **MSSQL stored procedures** for **ETL** and **REST APIs** to support **frontend** operations, resulting in 30% reduction in user query response time.' },
        ],
      },
      {
        id: 'exp-2',
        company: 'Toddle - Your teaching partner',
        location: 'Remote',
        role: 'Software Engineer (Full-stack web development)',
        dates: 'Jan 2021 - July 2022',
        bullets: [
          { id: 'b-4', text: 'Overhauled subject standards module, utilizing **React.js, Redux.js, Javascript** and **GraphQL**, boosting user engagement by 5x' },
          { id: 'b-5', text: 'Added Class Files module for teacher-student file-sharing via **AWS S3**, meeting tight deadlines. Worked with **React, GraphQL, Node.js** and **ETL** in **PostgreSQL**.' },
          { id: 'b-6', text: 'Improved admin portal with new features using **React** and **SCSS**, based on customer feedback. Increased user satisfaction by 40%' },
          { id: 'b-7', text: 'Developed automated school onboarding module with **React, Redux, Javascript**, reducing manual effort by 80% enhancing productivity. Added a dashboard using **GraphQL, Node**, and **PostgreSQL** to track progress in setting up new accounts.' },
          { id: 'b-8', text: 'Extended progress reports module to newly developed platform, with **React** and **Node**, making the components more reusable.' },
        ],
      },
      {
        id: 'exp-3',
        company: 'The Research Foundation for SUNY (Part-time)',
        location: 'Stony Brook, NY',
        role: 'Senior Research Project Assistant (Full-stack web development)',
        dates: 'Nov 2022 - May 2023',
        bullets: [
          { id: 'b-9', text: 'Created **React.js** and **Angular** web applications using **Typescript** and **AJAX** for clear research presentation, increasing user engagement by 25%. Implemented intuitive features for data querying and visualization using **Plotly.js**.' },
          { id: 'b-10', text: 'Developed **Flask** backend with **Python** and **MySQL**. Containerized the system with **Docker**. Performance boosted by 30%.' },
        ],
      },
      {
        id: 'exp-4',
        company: 'Lotpick Consulting Services',
        location: 'Remote',
        role: 'AI Intern (Full-stack mobile app development)',
        dates: 'June 2020 - Sep 2020',
        bullets: [
          { id: 'b-11', text: 'Engineered a farmer-oriented **chatbot** with **DialogFlow**, providing real-time farming insights via third-party **APIs** including daily supply prices, weather updates, and market trends. **Backend** powered by **Flask REST API**, **Python** and **Firebase**.' },
          { id: 'b-12', text: 'Integrated **chatbot** seamlessly into **Flutter mobile app** with **Dart**, enabling intuitive user interaction by talking to bot.' },
        ],
      },
      {
        id: 'exp-5',
        company: 'International Institute of Information Technology',
        location: 'Hyderabad, India',
        role: 'Research Intern',
        dates: 'May 2019 - July 2019',
        bullets: [
          { id: 'b-13', text: 'Created **socket-based** servers in **C++**. Assessed single and **multi-threaded** implementations to study performance. Analyzed performance using **AVX instructions** and **OpenMP** with different algorithms for optimization.' },
          { id: 'b-14', text: 'Developed **video analysis** model for **face recognition**, extracting frames of specific individuals, with **Python** and **OpenCV**.' },
        ],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        title: 'Prospectus Analysis (Broadridge)',
        techStack: 'Python, PyTorch, GPT, NLP, BERT',
        date: 'Dec 2023',
        bullets: [
          { id: 'pb-1', text: 'Crafted a pipeline to extract key data from prospectus documents. Used **LLMs** like **GPT** and **Llama** and researched **prompt engineering**. **BERT** models gave precise **word embeddings** for processing the extracted text.' },
        ],
      },
      {
        id: 'proj-2',
        title: 'Water Quality Analysis',
        techStack: 'Python, Tensorflow, PySpark, Hadoop',
        date: 'April 2023',
        bullets: [
          { id: 'pb-2', text: 'Conducted **big data analysis** of water quality and level by using diverse data sources. Utilized **Spark** to identify significant trends and patterns. Employed **LSTM models** to forecast water quality and level, achieving an **MAE of 1.45**.' },
        ],
      },
      {
        id: 'proj-3',
        title: 'House Price Prediction',
        techStack: 'AWS, Django, Python',
        date: 'May 2021',
        bullets: [
          { id: 'pb-3', text: 'Utilized **AWS cloud services** like **Sagemaker, EC2, EBS, Lambda, Lex, and API Gateway** to develop and deploy a **Django web-app**. Built a **Lex chatbot** to gather information and Sagemaker model to predict prices with **90%** accuracy.' },
        ],
      },
    ],
    summary: '',
  };

  template.resumeData = roshanData;
  // Use Version 1's format for layout if available
  if (version1 && version1.format) {
    template.format = version1.toObject().format;
  }
  console.log('Template uses Roshan CV data with Version 1 layout format');

  // Upsert: update if exists, create if not
  const doc = await Template.findOneAndUpdate(
    { name: template.name },
    template,
    { upsert: true, new: true, runValidators: true }
  );

  console.log(`Template saved: ${doc.name} (${doc._id})`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
