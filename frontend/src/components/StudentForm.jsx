import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import axios from "axios";

const API_URL =
  "http://localhost:3000";

const SUFFIXES = new Set([
  "Jr.",
  "Sr.",
  "II",
  "III",
  "IV",
  "V",
]);

function splitStoredName(
  name = "",
) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let suffix = "";

  if (
    parts.length &&
    SUFFIXES.has(
      parts[parts.length - 1],
    )
  ) {
    suffix = parts.pop();
  }

  return {
    firstName:
      parts.shift() || "",

    surname:
      parts.pop() || "",

    middleName:
      parts.join(" "),

    suffix,
  };
}

export default function StudentForm() {
  const [
    formData,
    setFormData,
  ] = useState({
    firstName: "",
    middleName: "",
    surname: "",
    suffix: "",
    grade: "",
    section: "",
    subject_ids: [],
  });

  const [
    sections,
    setSections,
  ] = useState([]);

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const navigate =
    useNavigate();

  const { id } =
    useParams();

  useEffect(() => {
    if (
      !localStorage.getItem(
        "user",
      )
    ) {
      navigate("/");
      return;
    }

    const loadForm = async () => {
      setLoading(true);
      setError("");

      try {
        const requests = [
          axios.get(
            `${API_URL}/sections`,
          ),

          axios.get(
            `${API_URL}/subjects`,
          ),
        ];

        if (id) {
          requests.push(
            axios.get(
              `${API_URL}/students/${id}`,
            ),
          );
        }

        const [
          sectionResponse,
          subjectResponse,
          studentResponse,
        ] = await Promise.all(
          requests,
        );

        setSections(
          sectionResponse.data,
        );

        setSubjects(
          subjectResponse.data,
        );

        if (studentResponse) {
          setFormData({
            ...splitStoredName(
              studentResponse.data.name,
            ),

            grade: String(
              studentResponse.data.grade,
            ),

            section:
              studentResponse.data
                .section,

            subject_ids:
              studentResponse.data
                .subject_ids ?? [],
          });
        } else {
          setFormData(
            (current) => ({
              ...current,

              section:
                sectionResponse.data[0]
                  ?.name ?? "",

              subject_ids:
                subjectResponse.data[0]
                  ?.id
                  ? [
                      subjectResponse
                        .data[0].id,
                    ]
                  : [],
            }),
          );
        }
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to load the student form.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [
    id,
    navigate,
  ]);

  const updateField = (
    field,
    value,
  ) => {
    setFormData(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  };

  const toggleSubject = (
    subjectId,
  ) => {
    setFormData(
      (current) => ({
        ...current,

        subject_ids:
          current.subject_ids.includes(
            subjectId,
          )
            ? current.subject_ids.filter(
                (idValue) =>
                  idValue !==
                  subjectId,
              )
            : [
                ...current.subject_ids,
                subjectId,
              ],
      }),
    );
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();
    setError("");

    if (
      formData.subject_ids
        .length === 0
    ) {
      setError(
        "Select at least one subject for the student.",
      );

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

      grade: Number(
        formData.grade,
      ),

      section:
        formData.section.trim(),

      subject_ids:
        formData.subject_ids,
    };

    setSaving(true);

    try {
      if (id) {
        await axios.put(
          `${API_URL}/students/${id}`,
          payload,
        );
      } else {
        await axios.post(
          `${API_URL}/students`,
          payload,
        );
      }

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data
          ?.message ||
          "Unable to save the student.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      <video className="fixed inset-0 h-full w-full object-cover" autoPlay loop muted playsInline aria-hidden="true">
        <source
          src="/background.mp4"
          type="video/mp4"
        />
      </video>

      <div className="fixed inset-0 bg-black/55" />

      <div className="relative z-10 w-full max-w-3xl bg-slate-950/40 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl my-8">
        <h1 className="text-2xl font-semibold text-white mb-6 border-b border-white/10 pb-4 tracking-wider text-center">
          {id
            ? "Edit Student Details"
            : "Register New Student"}
        </h1>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-400/60 text-red-100 p-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-white/70">
            Loading student
            form...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
              <h2 className="text-white/80 font-medium tracking-widest text-sm uppercase">
                Student Identity
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="First Name"
                  value={
                    formData.firstName
                  }
                  onChange={(value) =>
                    updateField(
                      "firstName",
                      value,
                    )
                  }
                  required
                  placeholder="e.g. Juan"
                />

                <TextField
                  label="Middle Name"
                  value={
                    formData.middleName
                  }
                  onChange={(value) =>
                    updateField(
                      "middleName",
                      value,
                    )
                  }
                  placeholder="Optional"
                />

                <TextField
                  label="Surname"
                  value={
                    formData.surname
                  }
                  onChange={(value) =>
                    updateField(
                      "surname",
                      value,
                    )
                  }
                  required
                  placeholder="e.g. Dela Cruz"
                />

                <TextField
                  label="Suffix"
                  value={
                    formData.suffix
                  }
                  onChange={(value) =>
                    updateField(
                      "suffix",
                      value,
                    )
                  }
                  placeholder="e.g. Jr., III"
                />
              </div>
            </section>

            <section className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-5">
              <div>
                <h2 className="text-white/80 font-medium tracking-widest text-sm uppercase">
                  Academic Information
                </h2>

                <p className="text-white/45 text-sm mt-1">
                  Choose the section
                  and every subject
                  in which this
                  student is enrolled.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
                    Grade{" "}
                    <span className="text-red-400">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      formData.grade
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "grade",
                        event.target
                          .value,
                      )
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
                    Section{" "}
                    <span className="text-red-400">
                      *
                    </span>
                  </label>

                  <select
                    value={
                      formData.section
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "section",
                        event.target
                          .value,
                      )
                    }
                    className="w-full bg-slate-900 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400 transition"
                    required
                  >
                    <option value="">
                      Select a section
                    </option>

                    {sections.map(
                      (section) => (
                        <option
                          key={
                            section.id
                          }
                          value={
                            section.name
                          }
                        >
                          {
                            section.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-3 tracking-wider">
                  Subjects{" "}
                  <span className="text-red-400">
                    *
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjects.map(
                    (subject) => (
                      <label
                        key={
                          subject.id
                        }
                        className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-lg px-4 py-3 cursor-pointer hover:bg-white/10 transition"
                      >
                        <input
                          type="checkbox"
                          checked={formData.subject_ids.includes(
                            subject.id,
                          )}
                          onChange={() =>
                            toggleSubject(
                              subject.id,
                            )
                          }
                          className="h-4 w-4 accent-blue-500"
                        />

                        <span className="text-white">
                          {
                            subject.name
                          }
                        </span>
                      </label>
                    ),
                  )}
                </div>

                {subjects.length ===
                  0 && (
                  <p className="text-amber-200 text-sm">
                    No subjects exist
                    yet. Add a subject
                    from the dashboard
                    first.
                  </p>
                )}
              </div>
            </section>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  sections.length ===
                    0 ||
                  subjects.length ===
                    0
                }
                className="flex-1 bg-blue-600/90 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-4 rounded-lg shadow-lg transition tracking-widest"
              >
                {saving
                  ? "Saving..."
                  : id
                    ? "Update Student"
                    : "Save Student"}
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/dashboard",
                  )
                }
                className="flex-1 bg-slate-600/90 hover:bg-slate-500 text-white font-semibold py-4 rounded-lg shadow-lg transition tracking-widest"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
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
      <label className="block text-white/90 text-sm font-medium mb-2 tracking-wider">
        {label}{" "}
        {required && (
          <span className="text-red-400">
            *
          </span>
        )}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition"
        required={required}
      />
    </div>
  );
}