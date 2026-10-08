# Importing students

Open **Students → Download template**. In the `Students` worksheet, paste one student per row below these headers:

| Grade Level | Section | Student Name |
| --- | --- | --- |
| 7 | Rose | Maria Santos |
| 7 | Rose | Jose Dela Cruz |

The downloadable template is blank so sample names cannot be imported accidentally. Its instructions sit outside the three import columns.

Fill all three fields for each student. Grade Level must be a positive whole number, such as `7`. Keep the worksheet name and headers unchanged. Blank rows are ignored. Save as `.xlsx`; `.xls` and CSV are not supported. Each upload accepts at most 1,000 students and 5 MB.

Choose **Upload Excel file**, select the file and at least one subject, then click **Import students**. The same selected subjects apply to every new student in the file. Existing registration requires subjects, so they are selected on the upload screen rather than added as another spreadsheet column.

The import creates missing sections in the signed-in teacher's account. It validates the complete file before writing student data. Invalid rows are listed by their Excel row numbers; correct them and upload again. Matching name, grade, and section combinations are skipped, ignoring case and repeated spaces. Existing student records and enrollments are preserved. Two distinct students who share all three values need individual registration.

The API returns counts of imported, skipped, and failed rows. A database failure can leave some rows saved; reload the directory and retry. Already registered rows are skipped. Imports for one teacher are serialized within one API process; multiple API replicas would require a database uniqueness constraint or shared lock to provide the same concurrency protection.

## API

`POST /students/import`, authenticated with the existing Bearer token:

- `file`: one `.xlsx` file in multipart form data.
- `subject_ids`: a JSON array of subject IDs belonging to the current teacher.

Responses: `200` for a completed import, `207` for known partial write failures, `422` for workbook validation errors, `400` for invalid upload/subjects, and `413` for oversized files. Responses include `message` and, where applicable, `imported_count`, `skipped_count`, `failed_count`, `skipped`, and `issues`.

Run `npm test` from `backend` for workbook and HTTP import tests. These tests use real Excel files and a simulated database; they do not change live student records.
