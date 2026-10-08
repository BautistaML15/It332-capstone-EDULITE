# Input validation

Forms and API requests share rules in `shared/inputValidation.mjs`. `ValidatedInput` displays inline errors, rejects invalid typing and pasted content, and uses browser form validity to block submission. Required fields and final ranges are checked again by the API before numeric conversion or database writes. Search inputs accept unrestricted search terms.

| Field | Accepted values |
| --- | --- |
| Student first, middle and last names | Unicode letters, spaces and name punctuation such as apostrophes, hyphens and periods. No digits. First and last names are required; middle name is optional. Each part is at most 100 characters and the combined name is at most 200. |
| Name suffix | Optional selection from Jr., Sr., and Roman numerals II through X. |
| Grade | A positive whole number. No decimals, signs, exponents or letters. |
| Section | Letters or numbers with spaces and common punctuation, up to 100 characters. Numeric identifiers such as 101 are valid. |
| Subject | A name containing letters, with optional numbers, spaces and common punctuation, up to 100 characters. Science 7 is valid; 123 alone is not. |
| Assessment name | Text containing letters, with optional numbers, spaces and common punctuation, up to 200 characters. Quiz 2 is valid. |
| Term and ECR slot | The existing dropdown choices, with matching API range and category checks. |
| Highest Possible Score | A positive whole number. |
| Student score | A whole number from zero through the assessment's Highest Possible Score. Blank clears a score; zero records an actual score. |
| Assessment date | A real calendar date in YYYY-MM-DD format, including leap-year checks. |
| Username | Letters, numbers, spaces, periods, apostrophes, @, underscores and hyphens, up to 100 characters. |
| Password | Any normal password characters, including numbers and symbols. Registration requires at least six characters. Passwords cannot be blank or contain control characters and are limited to 72 UTF-8 bytes to prevent bcrypt truncation. |
| Subject/student/assessment selections | Valid MongoDB IDs from the teacher's own available records, checked by the API. |
| Excel upload | One valid .xlsx workbook, at most 5 MB and 1,000 student rows. Imported names and sections follow the same rules as manual registration. |

The API rejects booleans, arrays and objects where text or numbers are required. It returns HTTP 400 with a readable `message` and a `fields` map. Workbook errors include Excel row numbers. Invalid score batches are validated completely before any score is saved or cleared.

Run `npm test` from `backend` for shared-rule, HTTP validation, score-batch and Excel import tests. Run `npm test` from `frontend` for DOM tests covering invalid typing and paste, inline errors, required fields, range changes and blocked form submission. Deploy the shared module alongside both applications.
