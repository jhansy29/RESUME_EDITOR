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
import { DEFAULT_FORMAT } from '../types/resume';
import { parseBoldSegments } from './boldParser';

const PAGE_WIDTH_TWIP = 12240; // US Letter width in twips
const MARGIN = convertInchesToTwip(0.5);
const CONTENT_WIDTH = PAGE_WIDTH_TWIP - MARGIN * 2;

/** Extract the primary font name from a CSS font-family stack */
function extractFontName(fontFamily: string): string {
  const first = fontFamily.split(',')[0].trim();
  // Strip surrounding quotes
  return first.replace(/^['"]|['"]$/g, '');
}

/** Convert pt to half-points (docx size unit) */
function pt(points: number): number {
  return Math.round(points * 2);
}

function sectionHeading(title: string, font: string, size: number): Paragraph {
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
        size: pt(size),
        font,
      }),
    ],
  });
}

function twoColumnRow(left: TextRun[], right: TextRun[], font: string, bodySize: number): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
    spacing: { after: 0 },
    children: [
      ...left,
      new TextRun({ text: '\t', font, size: pt(bodySize) }),
      ...right,
    ],
  });
}

function bulletParagraph(text: string, font: string, bodySize: number): Paragraph {
  const segments = parseBoldSegments(text);
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 20 },
    children: segments.map(
      (seg) =>
        new TextRun({
          text: seg.text,
          bold: seg.bold,
          size: pt(bodySize),
          font,
        })
    ),
  });
}

export async function exportDocx(data: ResumeData) {
  const fmt = data.format ?? DEFAULT_FORMAT;
  const font = extractFontName(fmt.fontFamily);
  const bodySize = fmt.fontSize;
  const nameSize = fmt.nameFontSize;
  const contactSize = fmt.contactFontSize;
  const headingSize = fmt.headingFontSize;

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
          size: pt(nameSize),
          font,
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
          size: pt(contactSize),
          font,
        }),
      ],
    })
  );

  // Education
  if (data.education.length > 0) {
    children.push(sectionHeading('Education', font, headingSize));
    for (const edu of data.education) {
      children.push(
        twoColumnRow(
          [new TextRun({ text: edu.school, bold: true, size: pt(bodySize), font })],
          [new TextRun({ text: edu.location, size: pt(bodySize), font })],
          font, bodySize
        )
      );
      children.push(
        twoColumnRow(
          [new TextRun({ text: edu.degree, italics: true, size: pt(bodySize), font })],
          [new TextRun({ text: edu.dates, italics: true, size: pt(bodySize), font })],
          font, bodySize
        )
      );
      if (edu.coursework) {
        children.push(
          new Paragraph({
            spacing: { after: 20 },
            children: [
              new TextRun({ text: 'Courses: ', italics: true, size: pt(contactSize), font }),
              new TextRun({ text: edu.coursework, size: pt(contactSize), font }),
            ],
          })
        );
      }
    }
  }

  // Skills
  if (data.skills.length > 0) {
    children.push(sectionHeading('Skills Summary', font, headingSize));
    for (const row of data.skills) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 10 },
          children: [
            new TextRun({ text: `${row.category}: `, bold: true, size: pt(bodySize), font }),
            new TextRun({ text: row.skills, size: pt(bodySize), font }),
          ],
        })
      );
    }
  }

  // Experience
  if (data.experience.length > 0) {
    children.push(sectionHeading('Experience', font, headingSize));
    for (const exp of data.experience) {
      children.push(
        twoColumnRow(
          [new TextRun({ text: exp.company, bold: true, size: pt(bodySize), font })],
          [new TextRun({ text: exp.location, size: pt(bodySize), font })],
          font, bodySize
        )
      );
      children.push(
        twoColumnRow(
          [new TextRun({ text: exp.role, italics: true, size: pt(bodySize), font })],
          [new TextRun({ text: exp.dates, italics: true, size: pt(bodySize), font })],
          font, bodySize
        )
      );
      for (const b of exp.bullets) {
        children.push(bulletParagraph(b.text, font, bodySize));
      }
    }
  }

  // Projects
  if (data.projects.length > 0) {
    children.push(sectionHeading('Projects', font, headingSize));
    for (const proj of data.projects) {
      const titleText = proj.techStack
        ? `${proj.title} (${proj.techStack})`
        : proj.title;
      children.push(
        twoColumnRow(
          [new TextRun({ text: titleText, bold: true, size: pt(bodySize), font })],
          proj.date
            ? [new TextRun({ text: proj.date, italics: true, size: pt(bodySize), font })]
            : [],
          font, bodySize
        )
      );
      for (const b of proj.bullets) {
        children.push(bulletParagraph(b.text, font, bodySize));
      }
    }
  }

  // Custom Sections
  if (data.customSections && data.customSections.length > 0) {
    for (const cs of data.customSections) {
      if (cs.items.length === 0) continue;
      children.push(sectionHeading(cs.title, font, headingSize));
      for (const item of cs.items) {
        children.push(bulletParagraph(item.text, font, bodySize));
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
