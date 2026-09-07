import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import axios from "axios";

const API_URL = "http://localhost:3000";

const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

const SUFFIXES = new Set(["Jr.", "Sr.", "II", "III", "IV", "V"]);

const EMPTY_FORM = {
  firstName: "",
  middleName: "",
  surname: "",
  suffix: "",
  grade: "",
  section: "",
  subject_ids: [],
};

function splitStoredName(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  let suffix = "";

  if (parts.length && SUFFIXES.has(parts[parts.length - 1])) {
    suffix = parts.pop();
  }

  return {
    firstName: parts.shift() || "",

    surname: parts.pop() || "",

    middleName: parts.join(" "),

    suffix,
  };
}

export default function StudentForm({
  embedded = false,
  studentId = null,
  onCancel,
  onSaved,
} = {}) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [sections, setSections] = useState([]);

  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const params = useParams();

  const resolvedStudentId = studentId ?? params.id ?? null;

  const isEditing = Boolean(resolvedStudentId);

  useEffect(() => {
    const token = localStorage.getItem("eduliteToken");

    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/");
      return;
    }

    let cancelled = false;

    const loadForm = async () => {
      setLoading(true);
      setError("");
      setFormData(EMPTY_FORM);

      try {
        const requests = [
          axios.get(`${API_URL}/sections`),

          axios.get(`${API_URL}/subjects`),
        ];

        if (resolvedStudentId) {
          requests.push(axios.get(`${API_URL}/students/${resolvedStudentId}`));
        }

        const [sectionResponse, subjectResponse, studentResponse] =
          await Promise.all(requests);

        if (cancelled) {
          return;
        }

        const loadedSections = sectionResponse.data ?? [];

        const loadedSubjects = subjectResponse.data ?? [];

        setSections(loadedSections);

        setSubjects(loadedSubjects);

        if (studentResponse) {
          setFormData({
            ...splitStoredName(studentResponse.data.name),

            grade: String(studentResponse.data.grade ?? ""),

            section: studentResponse.data.section ?? "",

            subject_ids: studentResponse.data.subject_ids ?? [],
          });
        } else {
          setFormData({
            ...EMPTY_FORM,

            section: loadedSections[0]?.name ?? "",

            subject_ids: loadedSubjects[0]?.id
              ? [String(loadedSubjects[0].id)]
              : [],
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load the student form.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadForm();

    return () => {
      cancelled = true;
    };
  }, [resolvedStudentId, navigate]);

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleSubject = (subjectId) => {
    const normalizedId = String(subjectId);

    setFormData((current) => {
      const normalizedIds = current.subject_ids.map(String);

      const selected = normalizedIds.includes(normalizedId);

      return {
        ...current,

        subject_ids: selected
          ? normalizedIds.filter((idValue) => idValue !== normalizedId)
          : [...normalizedIds, normalizedId],
      };
    });
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    if (typeof onCancel === "function") {
      onCancel();
      return;
    }

    navigate("/dashboard");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.subject_ids.length === 0) {
      setError("Select at least one subject for the student.");

      return;
    }

    const grade = Number(formData.grade);

    if (!Number.isInteger(grade) || grade <= 0) {
      setError("Grade must be a positive whole number.");

      return;
    }

    if (!formData.section.trim()) {
      setError("Select a section for the student.");

      return;
    }

    const combinedName = [
      formData.firstName.trim(),
      formData.middleName.trim(),
      formData.surname.trim(),
      formData.suffix.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    if (!combinedName) {
      setError("Student name is required.");

      return;
    }

    const payload = {
      name: combinedName,
      grade,

      section: formData.section.trim(),

      subject_ids: formData.subject_ids.map(String),
    };

    setSaving(true);

    try {
      const response = isEditing
        ? await axios.put(`${API_URL}/students/${resolvedStudentId}`, payload)
        : await axios.post(`${API_URL}/students`, payload);

      if (typeof onSaved === "function") {
        await onSaved(response.data, {
          isEditing,

          studentId: resolvedStudentId,
        });
      } else {
        navigate("/dashboard");
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to save the student.",
      );
    } finally {
      setSaving(false);
    }
  };

  const formCard = (
    <section
      aria-labelledby="student-form-title"
      className="overflow-hidden rounded-[24px] border border-[#E3E9EE] bg-white"
    >
      <div className="border-b border-[#EEF2F5] px-6 py-6 sm:px-8 sm:py-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#36A9E1]">
          Student Details
        </p>
        <h2
          id="student-form-title"
          className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-[#36A9E1]"
        >
          {isEditing ? "Edit Student" : "Register Student"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71808D]">
          Enter the learner's identity and academic enrollment. Only fields used
          by EduLITE are shown.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-[16px] border border-[#F6CCCC] bg-[#FFF3F3] p-4 text-sm text-[#C53939]"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[18px] bg-[#F7F9FB] py-16 text-center text-sm text-[#8A98A5]"
          >
            Loading student form...
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={saving} className="space-y-8">
            <section>
              <div className="mb-5">
                <h3 className="text-xl font-bold text-[#25313C]">Identity</h3>
                <p className="mt-1 text-sm text-[#71808D]">
                  Enter the student's complete name.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField
                  id="student-first-name"
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => updateField("firstName", value)}
                  required
                  placeholder="e.g. Juan"
                  autoComplete="given-name"
                />

                <TextField
                  id="student-middle-name"
                  label="Middle Name"
                  value={formData.middleName}
                  onChange={(value) => updateField("middleName", value)}
                  placeholder="Optional"
                  autoComplete="additional-name"
                />

                <TextField
                  id="student-surname"
                  label="Surname"
                  value={formData.surname}
                  onChange={(value) => updateField("surname", value)}
                  required
                  placeholder="e.g. Dela Cruz"
                  autoComplete="family-name"
                />

                <TextField
                  id="student-suffix"
                  label="Suffix"
                  value={formData.suffix}
                  onChange={(value) => updateField("suffix", value)}
                  placeholder="e.g. Jr., III"
                />
              </div>
            </section>

            <div className="h-px bg-[#EEF2F5]" />

            <section>
              <div className="mb-5">
                <h3 className="text-xl font-bold text-[#25313C]">
                  Academic Information
                </h3>
                <p className="mt-1 text-sm text-[#71808D]">
                  Assign the student's grade, section, and enrolled subjects.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <FormLabel htmlFor="student-grade" label="Grade" required />
                  <input
                    id="student-grade"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.grade}
                    onChange={(event) => updateField("grade", event.target.value)}
                    className="w-full rounded-[13px] border border-[#D8E1E7] bg-white px-4 py-3 text-[#25313C] outline-none focus:border-[#36A9E1] focus:ring-4 focus:ring-[#36A9E1]/10"
                    required
                  />
                </div>

                <div>
                  <FormLabel htmlFor="student-section" label="Section" required />
                  <select
                    id="student-section"
                    value={formData.section}
                    onChange={(event) => updateField("section", event.target.value)}
                    className="w-full rounded-[13px] border border-[#D8E1E7] bg-white px-4 py-3 text-[#25313C] outline-none focus:border-[#36A9E1] focus:ring-4 focus:ring-[#36A9E1]/10"
                    required
                  >
                    <option value="">Select a section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.name}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <fieldset className="mt-6">
                <legend className="mb-3 text-sm font-semibold text-[#52616D]">
                  Subjects <span className="text-[#D94141]">*</span>
                </legend>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => {
                    const subjectId = String(subject.id);
                    const selected = formData.subject_ids.map(String).includes(subjectId);

                    return (
                      <label
                        key={subjectId}
                        className={`flex cursor-pointer items-center gap-3 rounded-[13px] border px-4 py-3 transition ${
                          selected
                            ? "border-[#A9DDF3] bg-[#EAF6FC] text-[#168CC8]"
                            : "border-[#E3E9EE] bg-white text-[#52616D] hover:bg-[#F8FAFB]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSubject(subjectId)}
                          className="h-4 w-4 accent-[#36A9E1]"
                        />
                        <span className="font-medium">{subject.name}</span>
                      </label>
                    );
                  })}
                </div>

                {subjects.length === 0 && (
                  <p className="rounded-[14px] bg-[#FFF8E6] p-4 text-sm text-[#8A6A12]">
                    No subjects exist yet. Add a subject from the dashboard first.
                  </p>
                )}
              </fieldset>
            </section>

            <div className="flex flex-col gap-2 border-t border-[#EEF2F5] pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-[12px] border border-[#D8E1E7] bg-white px-5 py-2.5 text-sm font-semibold text-[#52616D] hover:bg-[#F4F7FA] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || sections.length === 0 || subjects.length === 0}
                className="rounded-[12px] bg-[#36A9E1] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#168CC8] disabled:bg-[#C8D1D8]"
              >
                {saving ? "Saving..." : isEditing ? "Update Student" : "Save Student"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );

  if (embedded) {
    return formCard;
  }

  return (
    <div
      className="min-h-screen bg-[#F4F7FA] p-4 text-[#25313C] sm:p-8"
      style={{ fontFamily: APPLE_FONT }}
    >
      <div className="mx-auto max-w-5xl">{formCard}</div>
    </div>
  );
}

function FormLabel({ htmlFor, label, required = false }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-[#52616D]">
      {label} {required && <span className="text-[#D94141]">*</span>}
    </label>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder = "",
  autoComplete,
}) {
  return (
    <div>
      <FormLabel htmlFor={id} label={label} required={required} />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-[13px] border border-[#D8E1E7] bg-white px-4 py-3 text-[#25313C] placeholder-[#A0ABB4] outline-none focus:border-[#36A9E1] focus:ring-4 focus:ring-[#36A9E1]/10"
        required={required}
      />
    </div>
  );
}
