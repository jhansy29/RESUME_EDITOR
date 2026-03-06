import { DEFAULT_FORMAT, DEFAULT_SECTION_ORDER, DEFAULT_LAYOUT } from '../../types/resume';
import type { ResumeData } from '../../types/resume';
import { HeaderSection } from '../ResumePreview/HeaderSection';
import { EducationSection } from '../ResumePreview/EducationSection';
import { SkillsSection } from '../ResumePreview/SkillsSection';
import { ExperienceSection } from '../ResumePreview/ExperienceSection';
import { ProjectsSection } from '../ResumePreview/ProjectsSection';
import { SectionHeading } from '../ResumePreview/SectionHeading';
import '../../styles/resume.css';

interface Props {
  data: ResumeData;
  templateName: string;
  onClose: () => void;
  onUse: () => void;
}

export function TemplatePreviewModal({ data, templateName, onClose, onUse }: Props) {
  const fmt = data.format || DEFAULT_FORMAT;
  const lo = data.layout ?? DEFAULT_LAYOUT;
  const order = data.sectionOrder || DEFAULT_SECTION_ORDER;

  const pageStyle: React.CSSProperties = {
    fontFamily: fmt.fontFamily,
    fontSize: `${fmt.fontSize}pt`,
    lineHeight: fmt.lineHeight,
    padding: `${fmt.marginTop}in ${fmt.marginRight}in ${fmt.marginBottom}in ${fmt.marginLeft}in`,
    ['--bullet-gap' as string]: fmt.bulletSpacing > 0 ? `${fmt.bulletSpacing}pt` : '0',
  };

  const nameStyle: React.CSSProperties = { fontSize: `${fmt.nameFontSize}pt` };
  const contactStyle: React.CSSProperties = { fontSize: `${fmt.contactFontSize}pt` };
  const sectionStyle: React.CSSProperties = { marginTop: `${fmt.sectionSpacing}pt` };
  const headingStyle: React.CSSProperties = { fontSize: `${fmt.headingFontSize}pt` };

  const sectionRenderers: Record<string, () => React.ReactNode | null> = {
    header: () => (
      <HeaderSection key="header" contact={data.contact} nameStyle={nameStyle} contactStyle={contactStyle} layout={lo.header} />
    ),
    education: () => data.education.length > 0 ? (
      <div key="education" style={sectionStyle}>
        <SectionHeading title="Education" style={headingStyle} />
        <EducationSection entries={data.education} layout={lo.education} />
      </div>
    ) : null,
    summary: () => data.summary ? (
      <div key="summary" style={sectionStyle}>
        <SectionHeading title="Professional Summary" style={headingStyle} />
        <p className="resume-summary">{data.summary}</p>
      </div>
    ) : null,
    skills: () => data.skills.length > 0 ? (
      <div key="skills" style={sectionStyle}>
        <SectionHeading title="Skills Summary" style={headingStyle} />
        <SkillsSection rows={data.skills} layout={lo.skills} />
      </div>
    ) : null,
    experience: () => data.experience.length > 0 ? (
      <div key="experience" style={sectionStyle}>
        <SectionHeading title="Experience" style={headingStyle} />
        <ExperienceSection entries={data.experience} bulletStyle={{}} layout={lo.experience} />
      </div>
    ) : null,
    projects: () => data.projects.length > 0 ? (
      <div key="projects" style={sectionStyle}>
        <SectionHeading title="Projects" style={headingStyle} />
        <ProjectsSection entries={data.projects} bulletStyle={{}} layout={lo.projects} />
      </div>
    ) : null,
  };

  const sections: React.ReactNode[] = [];
  for (const key of order) {
    if (sectionRenderers[key]) {
      const block = sectionRenderers[key]();
      if (block) sections.push(block);
    }
  }

  return (
    <div className="template-modal-overlay" onClick={onClose}>
      <div className="template-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-modal-header">
          <span className="template-modal-title">{templateName}</span>
          <div className="template-modal-actions">
            <button className="create-btn" onClick={onUse}>Use Template</button>
            <button className="resume-action-btn" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="template-modal-body">
          {data.css && <style>{data.css}</style>}
          <div
            className="template-preview-wrapper"
            style={{ transform: 'scale(0.68)', transformOrigin: 'top center' }}
          >
            <div className="resume-page" style={pageStyle}>
              {sections}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
