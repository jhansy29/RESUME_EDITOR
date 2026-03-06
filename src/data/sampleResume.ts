import type { ResumeData } from '../types/resume';

export const sampleResume: ResumeData = {
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
};
