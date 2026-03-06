import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/resume-editor');
const db = mongoose.connection.db;

const resume = await db.collection('resumes').findOne({ _id: new mongoose.Types.ObjectId('69aa676ab259eddcba2643c8') });

// Fix CSS: strip space-between
let css = (resume.css || '').replace(/justify-content:\s*space-between\s*;?/g, '');

// Fix layout: add spacers
const layout = resume.layout || {};
if (layout.education) {
  layout.education.rows = [
    [{ type: 'field', value: 'school', className: 'edu-school' }, { type: 'spacer', value: '' }, { type: 'field', value: 'location', className: 'edu-location' }],
    [{ type: 'field', value: 'degree', className: 'edu-degree' }, { type: 'field', value: 'gpa', className: 'edu-gpa' }, { type: 'spacer', value: '' }, { type: 'field', value: 'dates', className: 'edu-dates' }],
    [{ type: 'field', value: 'coursework', className: 'edu-coursework' }],
  ];
}
if (layout.experience) {
  layout.experience.rows = [
    [{ type: 'field', value: 'company', className: 'entry-company' }, { type: 'spacer', value: '' }, { type: 'field', value: 'location', className: 'entry-location' }],
    [{ type: 'field', value: 'role', className: 'entry-role' }, { type: 'spacer', value: '' }, { type: 'field', value: 'dates', className: 'entry-dates' }],
  ];
}
if (layout.projects) {
  layout.projects.rows = [
    [{ type: 'field', value: 'title', className: 'project-title' }, { type: 'field', value: 'techStack', className: 'project-tech' }, { type: 'spacer', value: '' }, { type: 'field', value: 'date', className: 'project-date' }],
  ];
}

await db.collection('resumes').updateOne(
  { _id: resume._id },
  { $set: { css, layout } }
);

console.log('Patched resume:', resume.name);
console.log('  space-between removed from CSS');
console.log('  spacers added to layout rows');
process.exit(0);
