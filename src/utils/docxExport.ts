import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import type { ResumeData } from '../types/resume';
import { parseBoldSegments } from './boldParser';

const PAGE_WIDTH_TWIP = 12240; // US Letter width in twips
const MARGIN = convertInchesToTwip(0.5);
const CONTENT_WIDTH = PAGE_WIDTH_TWIP - MARGIN * 2;

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    },
    children: [
      new TextRun({
        text: title,
        bold: true,
        smallCaps: true,
        size: 21, // ~10.5pt
        font: 'Cambria',
      }),
    ],
  });
}

function twoColumnRow(left: TextRun[], right: TextRun[]): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
    spacing: { after: 0 },
    children: [
      ...left,
      new TextRun({ text: '\t', font: 'Cambria', size: 20 }),
      ...right,
    ],
  });
}

function bulletParagraph(text: string): Paragraph {
  const segments = parseBoldSegments(text);
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 20 },
    children: segments.map(
      (seg) =>
        new TextRun({
          text: seg.text,
          bold: seg.bold,
          size: 20,
          font: 'Cambria',
        })
    ),
  });
}

export async function exportDocx(data: ResumeData) {
  const children: Paragraph[] = [];

  // Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: data.contact.name,
          bold: true,
          size: 36, // 18pt
          font: 'Cambria',
        }),
      ],
    })
  );

  // Contact line
  const contactParts = [
    data.contact.phone,
    data.contact.email,
    data.contact.linkedin,
    data.contact.github,
    data.contact.portfolio,
    data.contact.googleScholar,
  ].filter(Boolean);

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: contactParts.join(' | '),
          size: 18, // 9pt
          font: 'Cambria',
        }),
      ],
    })
  );

  // Education
  if (data.education.length > 0) {
    children.push(sectionHeading('Education'));
    for (const edu of data.education) {
      children.push(
        twoColumnRow(
          [new TextRun({ text: edu.school, bold: true, size: 20, font: 'Cambria' })],
          [new TextRun({ text: edu.location, size: 20, font: 'Cambria' })]
        )
      );
      children.push(
        twoColumnRow(
          [new TextRun({ text: edu.degree, italics: true, size: 20, font: 'Cambria' })],
          [new TextRun({ text: edu.dates, italics: true, size: 20, font: 'Cambria' })]
        )
      );
      if (edu.coursework) {
        children.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: 'Courses: ', italics: true, size: 18, font: 'Cambria' }),
              new TextRun({ text: edu.coursework, size: 18, font: 'Cambria' }),
            ],
          })
        );
      }
    }
  }

  // Skills
  if (data.skills.length > 0) {
    children.push(sectionHeading('Skills Summary'));
    for (const row of data.skills) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 10 },
          children: [
            new TextRun({ text: `${row.category}: `, bold: true, size: 20, font: 'Cambria' }),
            new TextRun({ text: row.skills, size: 20, font: 'Cambria' }),
          ],
        })
      );
    }
  }

  // Experience
  if (data.experience.length > 0) {
    children.push(sectionHeading('Experience'));
    for (const exp of data.experience) {
      children.push(
        twoColumnRow(
          [new TextRun({ text: exp.company, bold: true, size: 20, font: 'Cambria' })],
          [new TextRun({ text: exp.location, size: 20, font: 'Cambria' })]
        )
      );
      children.push(
        twoColumnRow(
          [new TextRun({ text: exp.role, italics: true, size: 20, font: 'Cambria' })],
          [new TextRun({ text: exp.dates, italics: true, size: 20, font: 'Cambria' })]
        )
      );
      for (const b of exp.bullets) {
        children.push(bulletParagraph(b.text));
      }
    }
  }

  // Projects
  if (data.projects.length > 0) {
    children.push(sectionHeading('Projects'));
    for (const proj of data.projects) {
      const titleText = proj.techStack
        ? `${proj.title} (${proj.techStack})`
        : proj.title;
      children.push(
        twoColumnRow(
          [new TextRun({ text: titleText, bold: true, size: 20, font: 'Cambria' })],
          proj.date
            ? [new TextRun({ text: proj.date, italics: true, size: 20, font: 'Cambria' })]
            : []
        )
      );
      for (const b of proj.bullets) {
        children.push(bulletParagraph(b.text));
      }
    }
  }

  // Custom Sections
  if (data.customSections && data.customSections.length > 0) {
    for (const cs of data.customSections) {
      if (cs.items.length === 0) continue;
      children.push(sectionHeading(cs.title));
      for (const item of cs.items) {
        children.push(bulletParagraph(item.text));
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
            size: { width: PAGE_WIDTH_TWIP, height: 15840 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'resume.docx');
}
