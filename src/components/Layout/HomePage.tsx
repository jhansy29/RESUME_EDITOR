import type { AppView } from './AppShell';
import './HomePage.css';

interface Props {
  onNavigate: (view: AppView) => void;
}

const cards: { view: AppView; title: string; desc: string; icon: string }[] = [
  {
    view: 'editor',
    title: 'Resume Editor',
    desc: 'Create, edit, and export polished resumes with live preview and DOCX/PDF export.',
    icon: '\u270F\uFE0F',
  },
  {
    view: 'vault',
    title: 'Vault',
    desc: 'Your master source of truth — all experience, bullets, and projects in one place.',
    icon: '\uD83D\uDD12',
  },
  {
    view: 'jd-analyzer',
    title: 'JD Analyzer',
    desc: 'Analyze job descriptions, score your resume, and get AI-powered tailoring suggestions.',
    icon: '\uD83C\uDFAF',
  },
  {
    view: 'tracker',
    title: 'Application Tracker',
    desc: 'Track job applications, statuses, contacts, and deadlines in one place.',
    icon: '\uD83D\uDCCB',
  },
];

export function HomePage({ onNavigate }: Props) {
  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="home-title">Resume Studio</h1>
        <p className="home-subtitle">Build, manage, and tailor your resume</p>
      </div>
      <div className="home-cards">
        {cards.map((c) => (
          <button
            key={c.view}
            className="home-card"
            onClick={() => onNavigate(c.view)}
          >
            <span className="home-card-icon">{c.icon}</span>
            <span className="home-card-title">{c.title}</span>
            <span className="home-card-desc">{c.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
