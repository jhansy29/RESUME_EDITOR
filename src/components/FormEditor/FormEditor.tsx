import { useResumeStore } from '../../hooks/useResumeStore';
import { HeaderForm } from './HeaderForm';
import { EducationForm } from './EducationForm';
import { SkillsForm } from './SkillsForm';
import { ExperienceForm } from './ExperienceForm';
import { ProjectsForm } from './ProjectsForm';
import { SummaryForm } from './SummaryForm';
import { CustomSectionForm } from './CustomSectionForm';
import '../../styles/editor.css';

export function FormEditor() {
  const activeSection = useResumeStore((s) => s.activeSection);

  const customSectionId = activeSection?.startsWith('custom-')
    ? activeSection.slice('custom-'.length)
    : null;

  return (
    <div className="form-panel-inner">
      {activeSection === 'contact' && <HeaderForm />}
      {activeSection === 'education' && <EducationForm />}
      {activeSection === 'summary' && <SummaryForm />}
      {activeSection === 'skills' && <SkillsForm />}
      {activeSection === 'experience' && <ExperienceForm />}
      {activeSection === 'projects' && <ProjectsForm />}
      {customSectionId && <CustomSectionForm sectionId={customSectionId} />}
    </div>
  );
}
