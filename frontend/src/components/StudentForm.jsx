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
      className="ui-panel-enter overflow-hidden rounded-[28px] border border-[#D1D1D6] bg-white shadow-[0_16px_42px_rgba(60,60,67,0.10)]"
    >
      <div className="flex flex-col gap-4 border-b border-[#E5E5EA] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#248A3D]">
            Student Management
          </p>

          <h2
            id="student-form-title"
            className="mt-1 text-2xl font-bold tracking-tight text-[#1C1C1E]"
          >
            {isEditing ? "Edit Student Details" : "Register Student"}
          </h2>

          <p className="mt-1 text-sm text-[#636366]">
            {isEditing
              ? "Update the student's identity, grade, section, and enrolled subjects."
              : "Add a student without leaving the dashboard."}
          </p>
        </div>

        <button
          type="button"
          onClick={closeForm}
          disabled={saving}
          className="rounded-full border border-[#E5E5EA] bg-white px-5 py-2.5 text-sm font-semibold text-[#3A3A3C] transition hover:border-[#007AFF] hover:bg-[#007AFF] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-[18px] bg-[#FF3B30]/10 p-4 text-[#D70015]"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[22px] border border-[#E5E5EA] bg-[#F2F2F7] py-16 text-center text-[#636366]"
          >
            Loading student form...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            aria-busy={saving}
            className="space-y-6"
          >
            <section className="rounded-[22px] bg-[#F2F2F7] p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007AFF] font-bold text-white">
                  1
                </span>

                <div>
                  <h3 className="font-bold text-[#1C1C1E]">Student Identity</h3>

                  <p className="text-sm text-[#636366]">
                    Enter the student&apos;s complete name.
                  </p>
                </div>
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

            <section className="rounded-[22px] bg-[#F2F2F7] p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759] font-bold text-white">
                  2
                </span>

                <div>
                  <h3 className="font-bold text-[#1C1C1E]">
                    Academic Information
                  </h3>

                  <p className="text-sm text-[#636366]">
                    Choose the grade, section, and enrolled subjects.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="student-grade"
                    className="mb-2 block text-sm font-semibold text-[#3A3A3C]"
                  >
                    Grade <span className="text-[#FF3B30]">*</span>
                  </label>

                  <input
                    id="student-grade"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.grade}
                    onChange={(event) =>
                      updateField("grade", event.target.value)
                    }
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="student-section"
                    className="mb-2 block text-sm font-semibold text-[#3A3A3C]"
                  >
                    Section <span className="text-[#FF3B30]">*</span>
                  </label>

                  <select
                    id="student-section"
                    value={formData.section}
                    onChange={(event) =>
                      updateField("section", event.target.value)
                    }
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
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

              <fieldset className="mt-5">
                <legend className="mb-3 block text-sm font-semibold text-[#3A3A3C]">
                  Subjects <span className="text-[#FF3B30]">*</span>
                </legend>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => {
                    const subjectId = String(subject.id);

                    const selected = formData.subject_ids
                      .map(String)
                      .includes(subjectId);

                    return (
                      <label
                        key={subjectId}
                        className={`flex cursor-pointer items-center gap-3 rounded-[16px] border-2 px-4 py-3 transition ${
                          selected
                            ? "border-transparent bg-[#34C759]/15 text-[#248A3D] shadow-sm"
                            : "border-transparent bg-white text-[#3A3A3C] hover:bg-[#34C759]/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSubject(subjectId)}
                          className="h-4 w-4 accent-[#34C759]"
                        />

                        <span className="font-medium">{subject.name}</span>
                      </label>
                    );
                  })}
                </div>

                {subjects.length === 0 && (
                  <p className="rounded-[16px] bg-[#FFCC00]/15 p-4 text-sm text-[#8A5A00]">
                    No subjects exist yet. Add a subject from the dashboard
                    first.
                  </p>
                )}
              </fieldset>
            </section>

            <div className="flex flex-col gap-3 border-t border-[#E5E5EA] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-full border border-[#E5E5EA] bg-white px-6 py-3 font-semibold text-[#3A3A3C] transition hover:bg-[#F2F2F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving || sections.length === 0 || subjects.length === 0
                }
                className="rounded-full bg-[#007AFF] px-7 py-3 font-semibold text-white transition hover:bg-[#0051D5] disabled:cursor-not-allowed disabled:bg-[#E5E5EA] disabled:text-[#8E8E93]"
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Student"
                    : "Save Student"}
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
      className="edulite-ios-corners form-canvas min-h-screen bg-[#F2F2F7] p-4 text-[#1C1C1E] sm:p-6 lg:p-8"
      style={{
        fontFamily: APPLE_FONT,
      }}
    >
      <style>{`
        .form-canvas {
          color-scheme: light;
          background:
            radial-gradient(circle at 90% 4%, rgba(0, 122, 255, 0.07), transparent 28rem),
            #f5f5f7;
        }

        .edulite-ios-corners [class*="rounded-["]:not(.rounded-full) {
          corner-shape: squircle;
        }

        .edulite-ios-corners button,
        .edulite-ios-corners input:not([type="checkbox"]):not([type="radio"]),
        .edulite-ios-corners select {
          min-height: 44px;
        }

        .edulite-ios-corners input,
        .edulite-ios-corners select {
          font-size: 16px;
        }

        .edulite-ios-corners :where(button, input, select):focus-visible {
          outline: 3px solid rgba(0, 122, 255, 0.5);
          outline-offset: 3px;
        }

        .edulite-ios-corners button {
          transition:
            transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 220ms ease,
            background-color 220ms ease,
            color 220ms ease,
            opacity 220ms ease,
            filter 220ms ease;
          will-change: transform;
        }

        .edulite-ios-corners button:not(:disabled):hover {
          transform: translateY(-1px) scale(1.01);
          filter: brightness(1.025);
        }

        .edulite-ios-corners button:not(:disabled):active {
          transform: translateY(0) scale(0.97);
          transition-duration: 90ms;
        }

        .edulite-ios-corners input,
        .edulite-ios-corners select {
          transition:
            border-color 220ms ease,
            box-shadow 220ms ease,
            background-color 220ms ease,
            transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .edulite-ios-corners input:focus,
        .edulite-ios-corners select:focus {
          transform: translateY(-1px);
        }

        .ui-panel-enter {
          animation: ios-panel-in 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        @keyframes ios-panel-in {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.99);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .edulite-ios-corners *,
          .edulite-ios-corners *::before,
          .edulite-ios-corners *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        @media (hover: none), (pointer: coarse) {
          .edulite-ios-corners button:not(:disabled):hover,
          .edulite-ios-corners input:focus,
          .edulite-ios-corners select:focus {
            transform: none;
          }
        }

        @media (prefers-contrast: more) {
          .edulite-ios-corners input,
          .edulite-ios-corners select,
          .edulite-ios-corners section {
            border-color: #636366;
          }
        }
      `}</style>

      <div className="mx-auto max-w-5xl">{formCard}</div>
    </div>
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
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-[#3A3A3C]"
      >
        {label} {required && <span className="text-[#FF3B30]">*</span>}
      </label>

      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
        required={required}
      />
    </div>
  );
}