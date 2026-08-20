import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import axios from "axios";

const API_URL =
  "http://localhost:3000";

const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

const TERM_OPTIONS = [
  1,
  2,
  3,
];

const CATEGORY_OPTIONS = [
  {
    value:
      "written_work",

    label:
      "Written / Oral Works",

    shortLabel:
      "WW",

    flexibleSequence:
      true,

    weightLabel:
      "20% of Initial Grade",

    helpText:
      "No fixed assessment count. Create as many Written Works as needed.",
  },

  {
    value:
      "performance_task",

    label:
      "Product / Performance Tasks",

    shortLabel:
      "PT",

    flexibleSequence:
      true,

    weightLabel:
      "50% of Initial Grade",

    helpText:
      "No fixed assessment count. Create as many Performance Tasks as needed.",
  },

  {
    value:
      "summative_test",

    label:
      "Summative Test",

    shortLabel:
      "ST",

    flexibleSequence:
      false,

    allowedSequences: [
      1,
      2,
    ],

    weightLabel:
      "ST1 and ST2 belong to the 30% Summative/Exam component.",

    helpText:
      "Summative Tests use the specific ST1 and ST2 slots.",
  },

  {
    value:
      "term_exam",

    label:
      "Term Examination",

    shortLabel:
      "TE",

    flexibleSequence:
      false,

    allowedSequences: [
      1,
    ],

    weightLabel:
      "40% inside the 30% Summative/Exam component.",

    helpText:
      "Each term has one Term Examination slot.",
  },
];

function todayAsInputValue() {
  const now =
    new Date();

  const timezoneOffset =
    now
      .getTimezoneOffset() *
    60_000;

  return new Date(
    now.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .slice(
      0,
      10,
    );
}

function emptyAssessmentForm() {
  return {
    name:
      "",

    term:
      "1",

    category:
      "written_work",

    sequence:
      "1",

    date:
      todayAsInputValue(),

    total_items:
      "",

    subject_id:
      "",
  };
}

function getCategoryOption(
  category,
) {
  return CATEGORY_OPTIONS.find(
    (
      option,
    ) =>
      option.value ===
      category,
  );
}

function getSlotLabel(
  category,
  sequence,
) {
  const option =
    getCategoryOption(
      category,
    );

  const numericSequence =
    Number(
      sequence,
    );

  if (
    !option ||
    !Number.isInteger(
      numericSequence,
    ) ||
    numericSequence <
      1
  ) {
    return "Unassigned";
  }

  if (
    category ===
    "term_exam"
  ) {
    return "Term Exam";
  }

  return `${option.shortLabel}${numericSequence}`;
}

export default function AssessmentForm({
  embedded = false,
  assessmentId = null,
  onCancel,
  onSaved,
} = {}) {
  const [
    formData,
    setFormData,
  ] =
    useState(
      emptyAssessmentForm,
    );

  const [
    subjects,
    setSubjects,
  ] =
    useState([]);

  const [
    students,
    setStudents,
  ] =
    useState([]);

  const [
    scores,
    setScores,
  ] =
    useState({});

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    loadingStudents,
    setLoadingStudents,
  ] =
    useState(
      false,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const navigate =
    useNavigate();

  const params =
    useParams();

  const resolvedAssessmentId =
    assessmentId ??
    params.id ??
    null;

  const isEditing =
    Boolean(
      resolvedAssessmentId,
    );

  const selectedCategory =
    useMemo(
      () =>
        getCategoryOption(
          formData.category,
        ),

      [
        formData.category,
      ],
    );

  const loadStudentsForSubject =
    async (
      subjectId,
      preserveScores = false,
    ) => {
      if (
        !subjectId
      ) {
        setStudents(
          [],
        );

        setScores(
          {},
        );

        return;
      }

      setLoadingStudents(
        true,
      );

      setError(
        "",
      );

      try {
        const response =
          await axios.get(
            `${API_URL}/students`,

            {
              params: {
                subject_id:
                  String(
                    subjectId,
                  ),
              },
            },
          );

        const loadedStudents =
          response.data ??
          [];

        setStudents(
          loadedStudents,
        );

        setScores(
          (
            currentScores,
          ) =>
            Object.fromEntries(
              loadedStudents.map(
                (
                  student,
                ) => [
                  student.id,

                  preserveScores
                    ? (
                        currentScores[
                          student.id
                        ] ??
                        ""
                      )
                    : "",
                ],
              ),
            ),
        );
      } catch (
        requestError
      ) {
        setError(
          requestError
            .response
            ?.data
            ?.message ||
            "Unable to load students for the subject.",
        );
      } finally {
        setLoadingStudents(
          false,
        );
      }
    };

  useEffect(
    () => {
      const token =
        localStorage.getItem(
          "eduliteToken",
        );

      const storedUser =
        localStorage.getItem(
          "user",
        );

      if (
        !token ||
        !storedUser
      ) {
        navigate(
          "/",
        );

        return;
      }

      let cancelled =
        false;

      const loadPage =
        async () => {
          setLoading(
            true,
          );

          setError(
            "",
          );

          setFormData(
            emptyAssessmentForm(),
          );

          setStudents(
            [],
          );

          setScores(
            {},
          );

          try {
            const subjectResponse =
              await axios.get(
                `${API_URL}/subjects`,
              );

            if (
              cancelled
            ) {
              return;
            }

            const loadedSubjects =
              subjectResponse.data ??
              [];

            setSubjects(
              loadedSubjects,
            );

            if (
              isEditing
            ) {
              const assessmentResponse =
                await axios.get(
                  `${API_URL}/assessments/${resolvedAssessmentId}`,
                );

              if (
                cancelled
              ) {
                return;
              }

              const assessment =
                assessmentResponse.data;

              const assessmentStudents =
                assessment.students ??
                [];

              setFormData({
                name:
                  assessment.name ??
                  "",

                term:
                  assessment.term ===
                    null ||
                  assessment.term ===
                    undefined
                    ? ""
                    : String(
                        assessment.term,
                      ),

                category:
                  assessment.category ??
                  "",

                sequence:
                  assessment.sequence ===
                    null ||
                  assessment.sequence ===
                    undefined
                    ? ""
                    : String(
                        assessment.sequence,
                      ),

                date:
                  assessment.date ??
                  todayAsInputValue(),

                total_items:
                  String(
                    assessment.total_items ??
                    "",
                  ),

                subject_id:
                  String(
                    assessment.subject_id ??
                    "",
                  ),
              });

              setStudents(
                assessmentStudents,
              );

              setScores(
                Object.fromEntries(
                  assessmentStudents.map(
                    (
                      student,
                    ) => [
                      student.id,

                      student.score ??
                      "",
                    ],
                  ),
                ),
              );
            } else {
              const firstSubjectId =
                loadedSubjects[
                  0
                ]?.id;

              setFormData(
                (
                  current,
                ) => ({
                  ...current,

                  subject_id:
                    firstSubjectId
                      ? String(
                          firstSubjectId,
                        )
                      : "",
                }),
              );

              if (
                firstSubjectId
              ) {
                await loadStudentsForSubject(
                  String(
                    firstSubjectId,
                  ),
                );
              }
            }
          } catch (
            requestError
          ) {
            if (
              !cancelled
            ) {
              setError(
                requestError
                  .response
                  ?.data
                  ?.message ||
                  "Unable to load the assessment form.",
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setLoading(
                false,
              );
            }
          }
        };

      loadPage();

      return () => {
        cancelled =
          true;
      };
    },

    [
      resolvedAssessmentId,
      isEditing,
      navigate,
    ],
  );

  const handleSubjectChange =
    async (
      value,
    ) => {
      setFormData(
        (
          current,
        ) => ({
          ...current,

          subject_id:
            value,
        }),
      );

      await loadStudentsForSubject(
        value,
      );
    };

  const handleCategoryChange =
    (
      value,
    ) => {
      setFormData(
        (
          current,
        ) => ({
          ...current,

          category:
            value,

          sequence:
            "1",
        }),
      );
    };

  const totalItems =
    Number(
      formData.total_items,
    );

  const enteredCount =
    useMemo(
      () =>
        Object.values(
          scores,
        ).filter(
          (
            score,
          ) =>
            score !==
            "",
        ).length,

      [
        scores,
      ],
    );

  const handleScoreChange =
    (
      studentId,
      value,
    ) => {
      if (
        value !==
          "" &&
        !/^\d+$/.test(
          value,
        )
      ) {
        return;
      }

      setScores(
        (
          current,
        ) => ({
          ...current,

          [studentId]:
            value,
        }),
      );
    };

  const closeForm =
    () => {
      if (
        saving
      ) {
        return;
      }

      if (
        typeof onCancel ===
        "function"
      ) {
        onCancel();

        return;
      }

      navigate(
        "/dashboard",
      );
    };

  const handleSubmit =
    async (
      event,
    ) => {
      event.preventDefault();

      setError(
        "",
      );

      if (
        !formData
          .name
          .trim()
      ) {
        setError(
          "Enter an assessment name.",
        );

        return;
      }

      if (
        !formData.subject_id
      ) {
        setError(
          "Select a subject for the assessment.",
        );

        return;
      }

      const term =
        Number(
          formData.term,
        );

      if (
        ![
          1,
          2,
          3,
        ].includes(
          term,
        )
      ) {
        setError(
          "Select Term 1, Term 2, or Term 3.",
        );

        return;
      }

      if (
        !selectedCategory
      ) {
        setError(
          "Select an ECR grading category.",
        );

        return;
      }

      const sequence =
        Number(
          formData.sequence,
        );

      if (
        !Number.isInteger(
          sequence,
        ) ||
        sequence <
          1
      ) {
        setError(
          "Assessment sequence must be a positive whole number.",
        );

        return;
      }

      if (
        formData.category ===
          "summative_test" &&
        ![
          1,
          2,
        ].includes(
          sequence,
        )
      ) {
        setError(
          "Summative Test must be ST1 or ST2.",
        );

        return;
      }

      if (
        formData.category ===
          "term_exam" &&
        sequence !==
          1
      ) {
        setError(
          "Term Examination uses the single Term Exam slot.",
        );

        return;
      }

      if (
        !Number.isInteger(
          totalItems,
        ) ||
        totalItems <=
          0
      ) {
        setError(
          "Highest Possible Score must be a positive whole number.",
        );

        return;
      }

      for (
        const [
          studentId,
          value,
        ]
        of Object.entries(
          scores,
        )
      ) {
        if (
          value ===
          ""
        ) {
          continue;
        }

        const score =
          Number(
            value,
          );

        if (
          !Number.isInteger(
            score,
          ) ||
          score <
            0 ||
          score >
            totalItems
        ) {
          const student =
            students.find(
              (
                item,
              ) =>
                String(
                  item.id,
                ) ===
                String(
                  studentId,
                ),
            );

          setError(
            `${student?.name || "A student"}'s score must be from 0 to ${totalItems}.`,
          );

          return;
        }
      }

      const payload = {
        name:
          formData
            .name
            .trim(),

        term,

        category:
          formData.category,

        sequence,

        date:
          formData.date,

        total_items:
          totalItems,

        subject_id:
          String(
            formData.subject_id,
          ),

        scores:
          students.map(
            (
              student,
            ) => ({
              student_id:
                String(
                  student.id,
                ),

              score:
                scores[
                  student.id
                ] ===
                  "" ||
                scores[
                  student.id
                ] ===
                  undefined
                  ? null
                  : Number(
                      scores[
                        student.id
                      ],
                    ),
            }),
          ),
      };

      setSaving(
        true,
      );

      try {
        const response =
          isEditing
            ? await axios.put(
                `${API_URL}/assessments/${resolvedAssessmentId}`,

                payload,
              )
            : await axios.post(
                `${API_URL}/assessments`,

                payload,
              );

        if (
          typeof onSaved ===
          "function"
        ) {
          await onSaved(
            response.data,

            {
              isEditing,

              assessmentId:
                resolvedAssessmentId,
            },
          );
        } else {
          navigate(
            "/dashboard",
          );
        }
      } catch (
        requestError
      ) {
        setError(
          requestError
            .response
            ?.data
            ?.message ||
            "Unable to save the assessment.",
        );
      } finally {
        setSaving(
          false,
        );
      }
    };

  const formCard = (
    <section
      aria-labelledby="assessment-form-title"
      className="ui-panel-enter overflow-hidden rounded-[28px] border border-[#D1D1D6] bg-white shadow-[0_16px_42px_rgba(60,60,67,0.10)]"
    >
      <div className="flex flex-col gap-4 border-b border-[#E5E5EA] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0051D5]">
            Three-Term ECR
          </p>

          <h2
            id="assessment-form-title"
            className="mt-1 text-2xl font-bold tracking-tight text-[#1C1C1E]"
          >
            {isEditing
              ? "Edit Assessment"
              : "Add Assessment"}
          </h2>

          <p className="mt-1 text-sm text-[#636366]">
            Only assessments you create are included in grade
            computation. Written Works and Performance Tasks have
            no fixed assessment count.
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
            Loading assessment form...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            aria-busy={saving}
            className="space-y-6"
          >
            <section className="rounded-[22px] bg-[#F2F2F7] p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFCC00] font-bold text-[#1C1C1E]">
                  1
                </span>

                <div>
                  <h3 className="font-bold text-[#1C1C1E]">
                    ECR Assessment Details
                  </h3>

                  <p className="text-sm text-[#636366]">
                    Choose the term, component, and assessment
                    sequence.
                  </p>
                </div>
              </div>

              {isEditing &&
                (
                  !formData.term ||
                  !formData.category ||
                  !formData.sequence
                ) && (
                  <div className="mb-5 rounded-[16px] border border-[#FFCC00] bg-[#FFF9DB] p-4 text-sm text-[#8A5A00]">
                    This is a legacy assessment. Classify it into a
                    Term and ECR component before saving it.
                  </div>
                )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FormLabel
                    htmlFor="assessment-name"
                    label="Assessment Name"
                    required
                  />

                  <input
                    id="assessment-name"
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData(
                        (
                          current,
                        ) => ({
                          ...current,

                          name:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="e.g. Reading Comprehension"
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                    required
                  />
                </div>

                <div>
                  <FormLabel
                    htmlFor="assessment-subject"
                    label="Subject"
                    required
                  />

                  <select
                    id="assessment-subject"
                    value={formData.subject_id}
                    onChange={(event) =>
                      handleSubjectChange(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                    required
                  >
                    <option value="">
                      Select a subject
                    </option>

                    {subjects.map(
                      (
                        subject,
                      ) => (
                        <option
                          key={subject.id}
                          value={subject.id}
                        >
                          {subject.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <FormLabel
                    htmlFor="assessment-term"
                    label="Grading Term"
                    required
                  />

                  <select
                    id="assessment-term"
                    value={formData.term}
                    onChange={(event) =>
                      setFormData(
                        (
                          current,
                        ) => ({
                          ...current,

                          term:
                            event.target.value,
                        }),
                      )
                    }
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                    required
                  >
                    <option value="">
                      Select a term
                    </option>

                    {TERM_OPTIONS.map(
                      (
                        term,
                      ) => (
                        <option
                          key={term}
                          value={term}
                        >
                          Term {term}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <FormLabel
                    htmlFor="assessment-category"
                    label="ECR Component"
                    required
                  />

                  <select
                    id="assessment-category"
                    value={formData.category}
                    onChange={(event) =>
                      handleCategoryChange(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                    required
                  >
                    <option value="">
                      Select a component
                    </option>

                    {CATEGORY_OPTIONS.map(
                      (
                        option,
                      ) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedCategory && (
                    <>
                      <p className="mt-2 text-xs font-semibold text-[#3A3A3C]">
                        {selectedCategory.weightLabel}
                      </p>

                      <p className="mt-1 text-xs text-[#636366]">
                        {selectedCategory.helpText}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <FormLabel
                    htmlFor="assessment-sequence"
                    label="Assessment Sequence"
                    required
                  />

                  {selectedCategory?.flexibleSequence ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="rounded-[12px] bg-[#E5E5EA] px-4 py-3 font-bold text-[#3A3A3C]">
                          {selectedCategory.shortLabel}
                        </span>

                        <input
                          id="assessment-sequence"
                          type="number"
                          min="1"
                          step="1"
                          value={formData.sequence}
                          onChange={(event) =>
                            setFormData(
                              (
                                current,
                              ) => ({
                                ...current,

                                sequence:
                                  event.target.value,
                              }),
                            )
                          }
                          className="min-w-0 flex-1 rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                          required
                        />
                      </div>

                      <p className="mt-2 text-xs text-[#636366]">
                        No maximum. For example:{" "}
                        {selectedCategory.shortLabel}1,{" "}
                        {selectedCategory.shortLabel}2,{" "}
                        {selectedCategory.shortLabel}3,{" "}
                        {selectedCategory.shortLabel}4, ...
                      </p>
                    </>
                  ) : (
                    <select
                      id="assessment-sequence"
                      value={formData.sequence}
                      onChange={(event) =>
                        setFormData(
                          (
                            current,
                          ) => ({
                            ...current,

                            sequence:
                              event.target.value,
                          }),
                        )
                      }
                      disabled={!selectedCategory}
                      className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20 disabled:bg-[#E5E5EA]"
                      required
                    >
                      <option value="">
                        Select a slot
                      </option>

                      {(
                        selectedCategory
                          ?.allowedSequences ??
                        []
                      ).map(
                        (
                          sequence,
                        ) => (
                          <option
                            key={sequence}
                            value={sequence}
                          >
                            {getSlotLabel(
                              formData.category,
                              sequence,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  )}
                </div>

                <div>
                  <FormLabel
                    htmlFor="assessment-date"
                    label="Date"
                    required
                  />

                  <input
                    id="assessment-date"
                    type="date"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData(
                        (
                          current,
                        ) => ({
                          ...current,

                          date:
                            event.target.value,
                        }),
                      )
                    }
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                    required
                  />
                </div>

                <div>
                  <FormLabel
                    htmlFor="assessment-total-items"
                    label="Highest Possible Score (HPS)"
                    required
                  />

                  <input
                    id="assessment-total-items"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.total_items}
                    onChange={(event) =>
                      setFormData(
                        (
                          current,
                        ) => ({
                          ...current,

                          total_items:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="e.g. 20"
                    className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                    required
                  />
                </div>
              </div>

              <div className="mt-5 rounded-[16px] border border-[#D1D1D6] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#636366]">
                  Selected ECR position
                </p>

                <p className="mt-1 font-bold text-[#1C1C1E]">
                  {formData.term
                    ? `Term ${formData.term}`
                    : "No term"}

                  {" · "}

                  {selectedCategory?.label ??
                    "No component"}

                  {" · "}

                  {getSlotLabel(
                    formData.category,
                    formData.sequence,
                  )}
                </p>
              </div>

              {(formData.category ===
                "written_work" ||
                formData.category ===
                  "performance_task") && (
                <div className="mt-4 rounded-[16px] bg-[#34C759]/10 p-4 text-sm text-[#248A3D]">
                  This component has no required assessment count.
                  EduLITE will calculate the grade using only the
                  assessments that have actually been created for
                  this term.
                </div>
              )}
            </section>

            <section className="rounded-[22px] bg-[#F2F2F7] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34C759] font-bold text-white">
                    2
                  </span>

                  <div>
                    <h3 className="font-bold text-[#1C1C1E]">
                      Student Raw Scores
                    </h3>

                    <p className="text-sm text-[#636366]">
                      A blank score means no score has been encoded
                      for that learner yet.
                    </p>
                  </div>
                </div>

                <span
                  role="status"
                  aria-live="polite"
                  className="w-fit rounded-full bg-[#007AFF] px-3 py-1.5 text-sm font-semibold text-white"
                >
                  {enteredCount} of {students.length} scores entered
                </span>
              </div>

              {loadingStudents ? (
                <div
                  role="status"
                  className="rounded-[18px] border border-[#E5E5EA] bg-white py-10 text-center text-[#636366]"
                >
                  Loading enrolled students...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[18px] bg-white shadow-sm">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="border-b border-[#E5E5EA] bg-[#F2F2F7] text-xs uppercase tracking-wide text-[#636366]">
                      <tr>
                        <th className="px-4 py-3">
                          Student
                        </th>

                        <th className="px-4 py-3">
                          Grade
                        </th>

                        <th className="px-4 py-3">
                          Section
                        </th>

                        <th className="w-48 px-4 py-3">
                          Raw Score
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#E5E5EA]">
                      {students.map(
                        (
                          student,
                        ) => (
                          <tr
                            key={student.id}
                            className="hover:bg-[#F2F2F7]"
                          >
                            <td className="px-4 py-3 font-semibold text-[#1C1C1E]">
                              {student.name}
                            </td>

                            <td className="px-4 py-3 text-[#636366]">
                              {student.grade}
                            </td>

                            <td className="px-4 py-3 text-[#636366]">
                              {student.section}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  aria-label={`Score for ${student.name}`}
                                  type="number"
                                  min="0"
                                  max={
                                    totalItems >
                                    0
                                      ? totalItems
                                      : undefined
                                  }
                                  step="1"
                                  value={
                                    scores[
                                      student.id
                                    ] ??
                                    ""
                                  }
                                  onChange={(event) =>
                                    handleScoreChange(
                                      student.id,
                                      event.target.value,
                                    )
                                  }
                                  className="w-24 rounded-[12px] border border-[#E5E5EA] bg-white px-3 py-2 text-[#1C1C1E] outline-none transition focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/20"
                                  placeholder="—"
                                />

                                <span className="text-[#636366]">
                                  /{" "}
                                  {totalItems >
                                  0
                                    ? totalItems
                                    : "?"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ),
                      )}

                      {students.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-4 py-10 text-center text-[#636366]"
                          >
                            No students are enrolled in this
                            subject yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3 border-t border-[#E5E5EA] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-full border border-[#E5E5EA] bg-white px-6 py-3 font-semibold text-[#3A3A3C] transition hover:bg-[#F2F2F7] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  subjects.length ===
                    0
                }
                className="rounded-full bg-[#007AFF] px-7 py-3 font-semibold text-white transition hover:bg-[#0051D5] disabled:cursor-not-allowed disabled:bg-[#E5E5EA] disabled:text-[#8E8E93]"
              >
                {saving
                  ? "Saving..."
                  : isEditing
                    ? "Update Assessment"
                    : "Save Assessment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );

  if (
    embedded
  ) {
    return formCard;
  }

  return (
    <div
      className="edulite-ios-corners form-canvas min-h-screen bg-[#F2F2F7] p-4 text-[#1C1C1E] sm:p-6 lg:p-8"
      style={{
        fontFamily:
          APPLE_FONT,
      }}
    >
      <style>{`
        .form-canvas {
          color-scheme: light;
          background:
            radial-gradient(circle at 90% 4%, rgba(52, 199, 89, 0.07), transparent 28rem),
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

      <div className="mx-auto max-w-6xl">
        {formCard}
      </div>
    </div>
  );
}

function FormLabel({
  htmlFor,
  label,
  required = false,
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-semibold text-[#3A3A3C]"
    >
      {label}

      {required && (
        <span className="text-[#FF3B30]">
          {" "}
          *
        </span>
      )}
    </label>
  );
}