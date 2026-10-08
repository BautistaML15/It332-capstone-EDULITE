import ExcelJS from "exceljs";
import { validateInput } from "../../shared/inputValidation.mjs";

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const IMPORT_HEADERS = ["Grade Level", "Section", "Student Name"];

export class StudentImportError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.issues = issues;
    this.status = 422;
  }
}

export function normalizeImportText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cellValue(cell) {
  const value = cell.value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    // Formula results, dates, errors and hyperlinks are not student input.
    throw new Error("Use plain text or numbers, not formulas, dates, or links.");
  }
  return value;
}

export function studentImportKey({ grade, section, name }) {
  return JSON.stringify([grade, section.toLowerCase(), name.toLowerCase()]);
}

export async function parseStudentWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new StudentImportError("Unable to read this Excel file. Upload a valid, unprotected .xlsx file.");
  }
  const sheet = workbook.getWorksheet("Students");
  if (!sheet) {
    throw new StudentImportError('The file must contain a worksheet named "Students". Download the template first.');
  }
  const columns = new Map();
  try {
    sheet.getRow(1).eachCell((cell, column) => {
      const header = normalizeImportText(cellValue(cell)).toLowerCase();
      if (columns.has(header)) throw new Error("Duplicate column headers.");
      columns.set(header, column);
    });
  } catch {
    throw new StudentImportError("Keep the template column headers as plain, unique text in row 1.");
  }
  if (IMPORT_HEADERS.some((header) => !columns.has(header.toLowerCase()))) {
    throw new StudentImportError(`Row 1 must contain: ${IMPORT_HEADERS.join(", ")}.`);
  }
  const students = [];
  const issues = [];
  const skipped = [];
  const seen = new Set();
  let populatedRows = 0;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = IMPORT_HEADERS.map((header) => row.getCell(columns.get(header.toLowerCase())));
    if (cells.every((cell) => cell.value == null || cell.value === "" ||
      (typeof cell.value === "string" && !cell.value.trim()))) return;
    populatedRows += 1;
    if (populatedRows > MAX_IMPORT_ROWS) return;
    try {
      const [rawGrade, rawSection, rawName] = cells.map(cellValue);
      const gradeText = typeof rawGrade === "number" ? String(rawGrade) : normalizeImportText(rawGrade);
      const grade = /^\d+$/.test(gradeText) ? Number(gradeText) : NaN;
      const section = typeof rawSection === "number" ? String(rawSection) : normalizeImportText(rawSection);
      const name = normalizeImportText(rawName);
      const errors = [];
      if (!Number.isSafeInteger(grade) || grade < 1) errors.push("Grade Level must be a positive whole number (for example, 7).");
      if (!section) errors.push("Section is required.");
      if (!name) errors.push("Student Name is required as text.");
      if (section) {
        const sectionError = validateInput(typeof rawSection === "number" ? String(rawSection) : rawSection, { kind: "section", label: "Section" });
        if (sectionError) errors.push(sectionError);
      }
      if (name) {
        const nameError = validateInput(rawName, { kind: "personName", label: "Student Name" });
        if (nameError) errors.push(nameError);
      }
      if (errors.length) {
        issues.push({ row: rowNumber, message: errors.join(" ") });
        return;
      }
      const student = { row: rowNumber, grade, section, name };
      const key = studentImportKey(student);
      if (seen.has(key)) {
        skipped.push({ row: rowNumber, name, message: "Duplicate name, grade and section in this file." });
      } else {
        seen.add(key);
        students.push(student);
      }
    } catch (error) {
      issues.push({ row: rowNumber, message: error.message });
    }
  });
  if (populatedRows > MAX_IMPORT_ROWS) {
    throw new StudentImportError(`Upload at most ${MAX_IMPORT_ROWS} students at a time.`);
  }
  if (!populatedRows) throw new StudentImportError("The Students worksheet is empty. Paste your students below the headers.");
  if (issues.length) throw new StudentImportError("Fix the listed rows and upload again. No students were imported.", issues);
  return { students, skipped };
}
