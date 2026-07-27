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
    if (!localStorage.getItem("user")) {
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
          requests.push(
            axios.get(`${API_URL}/students/${resolvedStudentId}`),
          );
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
              ? [loadedSubjects[0].id]
              : [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
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
    setFormData((current) => ({
      ...current,
      subject_ids: current.subject_ids.includes(subjectId)
        ? current.subject_ids.filter((idValue) => idValue !== subjectId)
        : [...current.subject_ids, subjectId],
    }));
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

    const payload = {
      name: combinedName,
      grade,
      section: formData.section.trim(),
      subject_ids: formData.subject_ids,
    };

    setSaving(true);

    try {
      const response = isEditing
        ? await axios.put(
            `${API_URL}/students/${resolvedStudentId}`,
            payload,
          )
        : await axios.post(`${API_URL}/students`, payload);

      if (typeof onSaved === "function") {
        await onSaved(response.data, {
          isEditing,
          studentId: resolvedStudentId,
        });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save the student.",
      );
    } finally {
      setSaving(false);
    }
  };

  const formCard = (
    <section className="ui-panel-enter overflow-hidden rounded-[28px] bg-white shadow-[0_18px_48px_rgba(60,60,67,0.12)]">
      <div className="flex flex-col gap-4 border-b border-[#E5E5EA] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#248A3D]">
            Student Management
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1C1C1E]">
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
          <div className="mb-6 rounded-[18px] bg-[#FF3B30]/10 p-4 text-[#D70015]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[22px] border border-[#E5E5EA] bg-[#F2F2F7] py-16 text-center text-[#636366]">
            Loading student form...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-[22px] bg-[#F2F2F7] p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#007AFF] font-bold text-white">
                  1
                </span>

                <div>
                  <h3 className="font-bold text-[#1C1C1E]">
                    Student Identity
                  </h3>

                  <p className="text-sm text-[#636366]">
                    Enter the student's complete name.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => updateField("firstName", value)}
                  required
                  placeholder="e.g. Juan"
                />

                <TextField
                  label="Middle Name"
                  value={formData.middleName}
                  onChange={(value) => updateField("middleName", value)}
                  placeholder="Optional"
                />

                <TextField
                  label="Surname"
                  value={formData.surname}
                  onChange={(value) => updateField("surname", value)}
                  required
                  placeholder="e.g. Dela Cruz"
                />

                <TextField
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
                  <label className="mb-2 block text-sm font-semibold text-[#3A3A3C]">
                    Grade <span className="text-[#FF3B30]">*</span>
                  </label>

                  <input
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
                  <label className="mb-2 block text-sm font-semibold text-[#3A3A3C]">
                    Section <span className="text-[#FF3B30]">*</span>
                  </label>

                  <select
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

              <div className="mt-5">
                <label className="mb-3 block text-sm font-semibold text-[#3A3A3C]">
                  Subjects <span className="text-[#FF3B30]">*</span>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => {
                    const selected = formData.subject_ids.includes(subject.id);

                    return (
                      <label
                        key={subject.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-[16px] border-2 px-4 py-3 transition ${
                          selected
                            ? "border-transparent bg-[#34C759]/15 text-[#248A3D] shadow-sm"
                            : "border-transparent bg-white text-[#3A3A3C] hover:bg-[#34C759]/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSubject(subject.id)}
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
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-[#E5E5EA] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-full border border-[#E5E5EA] bg-white px-6 py-3 font-semibold text-[#3A3A3C] transition hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50"
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
      className="edulite-ios-corners min-h-screen bg-[#F2F2F7] p-4 text-[#1C1C1E] sm:p-6 lg:p-8"
      style={{ fontFamily: APPLE_FONT }}
    >
      <style>{`
        .edulite-ios-corners [class*="rounded-["]:not(.rounded-full) {
          corner-shape: squircle;
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
      `}</style>
      <div className="mx-auto max-w-5xl">{formCard}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#3A3A3C]">
        {label} {required && <span className="text-[#FF3B30]">*</span>}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
        required={required}
      />
    </div>
  );
}