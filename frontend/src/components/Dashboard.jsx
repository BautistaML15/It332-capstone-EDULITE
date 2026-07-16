import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import axios from "axios";

const API_URL =
  "http://localhost:3000";

const PASSING_PERCENTAGE = 75;

const HIGH_POTENTIAL_PERCENTAGE =
  90;

const PAGE_DETAILS = {
  dashboard: {
    title: "Dashboard",

    description:
      "Student performance analytics, learning insights, and subject assessments.",
  },

  records: {
    title:
      "Student Assessment Records",

    description:
      "Review, edit, and manage student scores for every enrolled subject.",
  },

  sections: {
    title: "Add Section",

    description:
      "Create and manage the sections used when registering students.",
  },

  subjects: {
    title:
      "Subject Management",

    description:
      "Create subjects and select the students enrolled in each subject.",
  },
};

export default function Dashboard() {
  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    sections,
    setSections,
  ] = useState([]);

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    assessments,
    setAssessments,
  ] = useState([]);

  const [
    assessmentRecords,
    setAssessmentRecords,
  ] = useState([]);

  const [
    selectedSection,
    setSelectedSection,
  ] = useState("ALL");

  const [
    selectedSubject,
    setSelectedSubject,
  ] = useState("ALL");

  const [
    newSection,
    setNewSection,
  ] = useState("");

  const [
    newSubject,
    setNewSubject,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    addingSection,
    setAddingSection,
  ] = useState(false);

  const [
    addingSubject,
    setAddingSubject,
  ] = useState(false);

  const [
    showSubjectStudentPrompt,
    setShowSubjectStudentPrompt,
  ] = useState(false);

  const [
    selectedSubjectStudentIds,
    setSelectedSubjectStudentIds,
  ] = useState([]);

  const [
    subjectStudentSearch,
    setSubjectStudentSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    editingStudentId,
    setEditingStudentId,
  ] = useState(null);

  const [
    editedScores,
    setEditedScores,
  ] = useState({});

  const [
    savingScores,
    setSavingScores,
  ] = useState(false);

  const [
    activeView,
    setActiveView,
  ] = useState("dashboard");

  const [
    addMenuOpen,
    setAddMenuOpen,
  ] = useState(true);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    aiRecommendation,
    setAiRecommendation,
  ] = useState(null);

  const [
    aiRecommendationError,
    setAiRecommendationError,
  ] = useState("");

  const [
    generatingRecommendationKey,
    setGeneratingRecommendationKey,
  ] = useState("");

  const [
    expandedStudentId,
    setExpandedStudentId,
  ] = useState(null);

  const [
    studentInsightsById,
    setStudentInsightsById,
  ] = useState({});

  const [
    loadingStudentInsightsId,
    setLoadingStudentInsightsId,
  ] = useState(null);

  const [
    studentInsightErrors,
    setStudentInsightErrors,
  ] = useState({});

  const navigate = useNavigate();

  const pageDetails =
    PAGE_DETAILS[activeView] ??
    PAGE_DETAILS.dashboard;

  useEffect(() => {
    if (
      !localStorage.getItem(
        "user",
      )
    ) {
      navigate("/");
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData =
    async () => {
      setLoading(true);
      setError("");

      try {
        const [
          studentResponse,
          sectionResponse,
          subjectResponse,
          assessmentResponse,
          recordResponse,
        ] = await Promise.all([
          axios.get(
            `${API_URL}/students`,
          ),

          axios.get(
            `${API_URL}/sections`,
          ),

          axios.get(
            `${API_URL}/subjects`,
          ),

          axios.get(
            `${API_URL}/assessments`,
          ),

          axios.get(
            `${API_URL}/assessment-records`,
          ),
        ]);

        setStudents(
          studentResponse.data,
        );

        setSections(
          sectionResponse.data,
        );

        setSubjects(
          subjectResponse.data,
        );

        setAssessments(
          assessmentResponse.data,
        );

        setAssessmentRecords(
          recordResponse.data,
        );

        if (
          selectedSection !==
            "ALL" &&
          !sectionResponse.data.some(
            (section) =>
              section.name ===
              selectedSection,
          )
        ) {
          setSelectedSection(
            "ALL",
          );
        }

        if (
          selectedSubject !==
            "ALL" &&
          !subjectResponse.data.some(
            (subject) =>
              String(subject.id) ===
              String(
                selectedSubject,
              ),
          )
        ) {
          setSelectedSubject(
            "ALL",
          );
        }
      } catch (err) {
        console.error(
          "Error loading dashboard:",
          err,
        );

        setError(
          err.response?.data
            ?.message ||
            "Unable to load the dashboard.",
        );
      } finally {
        setLoading(false);
      }
    };

  const openView = (view) => {
    setActiveView(view);
    setSidebarOpen(false);
    setError("");
    setSuccess("");
  };

  const handleAddSection =
    async (event) => {
      event.preventDefault();

      const sectionName =
        newSection.trim();

      if (!sectionName) {
        return;
      }

      setAddingSection(true);
      setError("");
      setSuccess("");

      try {
        await axios.post(
          `${API_URL}/sections`,
          {
            name: sectionName,
          },
        );

        setNewSection("");

        await fetchDashboardData();

        setSuccess(
          "Section added successfully.",
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to add the section.",
        );
      } finally {
        setAddingSection(false);
      }
    };

  const handleRemoveSection =
    async (section) => {
      if (
        !window.confirm(
          `Remove section "${section.name}"?`,
        )
      ) {
        return;
      }

      setError("");
      setSuccess("");

      try {
        await axios.delete(
          `${API_URL}/sections/${section.id}`,
        );

        if (
          selectedSection ===
          section.name
        ) {
          setSelectedSection(
            "ALL",
          );
        }

        await fetchDashboardData();

        setSuccess(
          "Section removed successfully.",
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to remove the section.",
        );
      }
    };

  const openSubjectStudentPrompt = (
    event,
  ) => {
    event.preventDefault();

    if (!newSubject.trim()) {
      return;
    }

    setSelectedSubjectStudentIds(
      [],
    );

    setSubjectStudentSearch("");
    setError("");
    setSuccess("");

    setShowSubjectStudentPrompt(
      true,
    );
  };

  const closeSubjectStudentPrompt =
    () => {
      if (addingSubject) {
        return;
      }

      setShowSubjectStudentPrompt(
        false,
      );

      setSelectedSubjectStudentIds(
        [],
      );

      setSubjectStudentSearch("");
    };

  const toggleNewSubjectStudent = (
    studentId,
  ) => {
    setSelectedSubjectStudentIds(
      (currentIds) =>
        currentIds.includes(
          studentId,
        )
          ? currentIds.filter(
              (id) =>
                id !== studentId,
            )
          : [
              ...currentIds,
              studentId,
            ],
    );
  };

  const handleAddSubject =
    async () => {
      const subjectName =
        newSubject.trim();

      if (!subjectName) {
        return;
      }

      setAddingSubject(true);
      setError("");
      setSuccess("");

      try {
        const response =
          await axios.post(
            `${API_URL}/subjects`,
            {
              name: subjectName,

              student_ids:
                selectedSubjectStudentIds,
            },
          );

        const enrolledCount =
          response.data
            ?.student_count ??
          selectedSubjectStudentIds.length;

        setNewSubject("");

        setShowSubjectStudentPrompt(
          false,
        );

        setSelectedSubjectStudentIds(
          [],
        );

        setSubjectStudentSearch(
          "",
        );

        await fetchDashboardData();

        setSuccess(
          `${
            response.data?.message ||
            "Subject added successfully."
          } ${enrolledCount} student${
            enrolledCount === 1
              ? ""
              : "s"
          } enrolled.`,
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to add the subject.",
        );
      } finally {
        setAddingSubject(false);
      }
    };

  const handleRenameSubject =
    async (subject) => {
      const nextName =
        window
          .prompt(
            "Enter the new subject name:",
            subject.name,
          )
          ?.trim();

      if (
        !nextName ||
        nextName === subject.name
      ) {
        return;
      }

      setError("");
      setSuccess("");

      try {
        await axios.put(
          `${API_URL}/subjects/${subject.id}`,
          {
            name: nextName,
          },
        );

        await fetchDashboardData();

        setSuccess(
          "Subject updated successfully.",
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to update the subject.",
        );
      }
    };

  const handleRemoveSubject =
    async (subject) => {
      if (
        !window.confirm(
          `Remove subject "${subject.name}"?`,
        )
      ) {
        return;
      }

      setError("");
      setSuccess("");

      try {
        await axios.delete(
          `${API_URL}/subjects/${subject.id}`,
        );

        if (
          String(
            selectedSubject,
          ) ===
          String(subject.id)
        ) {
          setSelectedSubject(
            "ALL",
          );
        }

        await fetchDashboardData();

        setSuccess(
          "Subject removed successfully.",
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to remove the subject.",
        );
      }
    };

  const handleDeleteStudent =
    async (studentId) => {
      if (
        !window.confirm(
          "Remove this student, their subject enrollments, and assessment scores?",
        )
      ) {
        return;
      }

      setError("");
      setSuccess("");

      try {
        await axios.delete(
          `${API_URL}/students/${studentId}`,
        );

        await fetchDashboardData();

        setSuccess(
          "Student deleted successfully.",
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to delete the student.",
        );
      }
    };

  const handleDeleteAssessment =
    async (assessmentId) => {
      if (
        !window.confirm(
          "Delete this assessment and all recorded scores?",
        )
      ) {
        return;
      }

      setError("");
      setSuccess("");

      try {
        await axios.delete(
          `${API_URL}/assessments/${assessmentId}`,
        );

        await fetchDashboardData();

        setSuccess(
          "Assessment deleted successfully.",
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to delete the assessment.",
        );
      }
    };

  const handleRegisterStudent =
    () => {
      setSidebarOpen(false);

      if (sections.length === 0) {
        setError(
          "Add at least one section before registering a student.",
        );

        setActiveView(
          "sections",
        );

        return;
      }

      if (subjects.length === 0) {
        setError(
          "Add at least one subject before registering a student.",
        );

        setActiveView(
          "subjects",
        );

        return;
      }

      navigate(
        "/student-form",
      );
    };

  const handleAddAssessment =
    () => {
      setSidebarOpen(false);

      if (subjects.length === 0) {
        setError(
          "Add at least one subject before creating an assessment.",
        );

        setActiveView(
          "subjects",
        );

        return;
      }

      navigate(
        "/assessment-form",
      );
    };

  const handleLogout = () => {
    localStorage.removeItem(
      "user",
    );

    navigate("/");
  };

  const selectedSubjectId =
    selectedSubject === "ALL"
      ? null
      : Number(selectedSubject);

  const generateStudentRecommendation =
    async (
      student,
      supportType,
    ) => {
      const requestKey =
        `${supportType}-${student.id}`;

      if (
        generatingRecommendationKey
      ) {
        return;
      }

      setGeneratingRecommendationKey(
        requestKey,
      );

      setAiRecommendationError(
        "",
      );

      setAiRecommendation(null);

      try {
        const response =
          await axios.post(
            `${API_URL}/api/gemini/student-support/${student.id}`,
            {
              support_type:
                supportType,

              focus_subject_id:
                selectedSubjectId,
            },
          );

        const {
          savedInsight,
          ...result
        } = response.data;

        setAiRecommendation({
          ...result,
          savedInsight,
        });

        if (savedInsight) {
          setStudentInsightsById(
            (current) => {
              if (
                !Object.prototype.hasOwnProperty.call(
                  current,
                  student.id,
                )
              ) {
                return current;
              }

              return {
                ...current,

                [student.id]: [
                  {
                    ...savedInsight,
                    result,
                  },

                  ...current[
                    student.id
                  ].filter(
                    (insight) =>
                      insight.id !==
                      savedInsight.id,
                  ),
                ],
              };
            },
          );
        }
      } catch (err) {
        console.error(
          "Unable to generate Gemini recommendation:",
          err,
        );

        setAiRecommendationError(
          err.response?.data
            ?.message ||
            "Unable to generate the learning-support recommendation.",
        );
      } finally {
        setGeneratingRecommendationKey(
          "",
        );
      }
    };

  const closeAiRecommendation =
    () => {
      if (
        generatingRecommendationKey
      ) {
        return;
      }

      setAiRecommendation(null);

      setAiRecommendationError(
        "",
      );
    };

  const openSavedInsight = (
    insight,
  ) => {
    if (!insight?.result) {
      setAiRecommendation(null);

      setAiRecommendationError(
        "The saved insight data could not be opened.",
      );

      return;
    }

    setAiRecommendationError(
      "",
    );

    setAiRecommendation({
      ...insight.result,

      savedInsight: {
        id: insight.id,

        studentId:
          insight.studentId,

        supportType:
          insight.supportType,

        classification:
          insight.classification,

        focusSubjectId:
          insight.focusSubjectId,

        focusLabel:
          insight.focusLabel,

        model: insight.model,
        title: insight.title,

        createdAt:
          insight.createdAt,

        pdfUrl:
          insight.pdfUrl,
      },
    });
  };

  const loadStudentInsights =
    async (
      studentId,
      force = false,
    ) => {
      if (
        !force &&
        Object.prototype.hasOwnProperty.call(
          studentInsightsById,
          studentId,
        )
      ) {
        return;
      }

      setLoadingStudentInsightsId(
        studentId,
      );

      setStudentInsightErrors(
        (current) => ({
          ...current,
          [studentId]: "",
        }),
      );

      try {
        const response =
          await axios.get(
            `${API_URL}/api/students/${studentId}/insights`,
          );

        setStudentInsightsById(
          (current) => ({
            ...current,

            [studentId]:
              response.data,
          }),
        );
      } catch (err) {
        setStudentInsightErrors(
          (current) => ({
            ...current,

            [studentId]:
              err.response?.data
                ?.message ||
              "Unable to load the student's saved learning insights.",
          }),
        );
      } finally {
        setLoadingStudentInsightsId(
          (currentId) =>
            currentId ===
            studentId
              ? null
              : currentId,
        );
      }
    };

  const toggleStudentProfile =
    async (student) => {
      if (
        expandedStudentId ===
        student.id
      ) {
        setExpandedStudentId(
          null,
        );

        return;
      }

      setExpandedStudentId(
        student.id,
      );

      await loadStudentInsights(
        student.id,
      );
    };

  const subjectPromptStudents =
    useMemo(() => {
      const searchValue =
        subjectStudentSearch
          .trim()
          .toLowerCase();

      if (!searchValue) {
        return students;
      }

      return students.filter(
        (student) =>
          `${student.name} ${student.grade} ${student.section}`
            .toLowerCase()
            .includes(
              searchValue,
            ),
      );
    }, [
      students,
      subjectStudentSearch,
    ]);

  const displayedAssessments =
    useMemo(() => {
      if (
        selectedSubjectId === null
      ) {
        return assessments;
      }

      return assessments.filter(
        (assessment) =>
          assessment.subject_id ===
          selectedSubjectId,
      );
    }, [
      assessments,
      selectedSubjectId,
    ]);

  const displayedStudents =
    useMemo(() => {
      return students.filter(
        (student) => {
          const matchesSection =
            selectedSection ===
              "ALL" ||
            student.section ===
              selectedSection;

          const matchesSubject =
            selectedSubjectId ===
              null ||
            student.subject_ids?.includes(
              selectedSubjectId,
            );

          return (
            matchesSection &&
            matchesSubject
          );
        },
      );
    }, [
      students,
      selectedSection,
      selectedSubjectId,
    ]);

  const scoreMap = useMemo(
    () => {
      const map = {};

      for (
        const record
        of assessmentRecords
      ) {
        if (
          !map[
            record.student_id
          ]
        ) {
          map[
            record.student_id
          ] = {};
        }

        map[
          record.student_id
        ][record.assessment_id] =
          record.score;
      }

      return map;
    },

    [assessmentRecords],
  );

  const getStudentAssessments = (
    student,
  ) =>
    displayedAssessments.filter(
      (assessment) =>
        student.subject_ids?.includes(
          assessment.subject_id,
        ),
    );

  const startEditingScores = (
    student,
  ) => {
    const currentScores = {};

    for (
      const assessment
      of getStudentAssessments(
        student,
      )
    ) {
      const currentScore =
        scoreMap[student.id]?.[
          assessment.id
        ];

      currentScores[
        assessment.id
      ] =
        currentScore ===
          undefined ||
        currentScore === null
          ? ""
          : String(
              currentScore,
            );
    }

    setEditedScores(
      currentScores,
    );

    setEditingStudentId(
      student.id,
    );

    setError("");
    setSuccess("");
  };

  const cancelEditingScores =
    () => {
      if (savingScores) {
        return;
      }

      setEditingStudentId(null);
      setEditedScores({});
      setError("");
    };

  const handleEditedScoreChange =
    (
      assessmentId,
      value,
    ) => {
      if (
        value !== "" &&
        !/^\d+$/.test(value)
      ) {
        return;
      }

      setEditedScores(
        (currentScores) => ({
          ...currentScores,

          [assessmentId]:
            value,
        }),
      );
    };

  const saveStudentScores =
    async (student) => {
      if (savingScores) {
        return;
      }

      setError("");
      setSuccess("");

      const scoreList = [];

      for (
        const assessment
        of getStudentAssessments(
          student,
        )
      ) {
        const enteredValue =
          editedScores[
            assessment.id
          ];

        const isBlank =
          enteredValue === "" ||
          enteredValue === null ||
          enteredValue ===
            undefined;

        if (!isBlank) {
          const numericScore =
            Number(
              enteredValue,
            );

          if (
            !Number.isInteger(
              numericScore,
            ) ||
            numericScore < 0 ||
            numericScore >
              Number(
                assessment.total_items,
              )
          ) {
            setError(
              `${student.name}'s score for "${assessment.name}" must be between 0 and ${assessment.total_items}.`,
            );

            return;
          }
        }

        scoreList.push({
          assessment_id:
            assessment.id,

          score: isBlank
            ? null
            : Number(
                enteredValue,
              ),
        });
      }

      setSavingScores(true);

      try {
        const response =
          await axios.put(
            `${API_URL}/students/${student.id}/assessment-scores`,
            {
              scores:
                scoreList,
            },
          );

        setEditingStudentId(
          null,
        );

        setEditedScores({});

        await fetchDashboardData();

        setSuccess(
          response.data?.message ||
            "Scores updated successfully.",
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
            "Unable to update the student scores.",
        );
      } finally {
        setSavingScores(false);
      }
    };

  const relevantAssessmentIds =
    useMemo(
      () =>
        new Set(
          displayedAssessments.map(
            (assessment) =>
              assessment.id,
          ),
        ),

      [displayedAssessments],
    );

  const studentAnalytics =
    useMemo(() => {
      return displayedStudents.map(
        (student) => {
          const enrolledAssessmentIds =
            new Set(
              displayedAssessments
                .filter(
                  (assessment) =>
                    student.subject_ids?.includes(
                      assessment.subject_id,
                    ),
                )
                .map(
                  (assessment) =>
                    assessment.id,
                ),
            );

          const percentages =
            assessmentRecords
              .filter(
                (record) =>
                  record.student_id ===
                    student.id &&
                  relevantAssessmentIds.has(
                    record.assessment_id,
                  ) &&
                  enrolledAssessmentIds.has(
                    record.assessment_id,
                  ) &&
                  Number(
                    record.total_items,
                  ) > 0,
              )
              .map(
                (record) =>
                  (Number(
                    record.score,
                  ) /
                    Number(
                      record.total_items,
                    )) *
                  100,
              );

          const averagePercentage =
            percentages.length > 0
              ? percentages.reduce(
                  (
                    total,
                    percentage,
                  ) =>
                    total +
                    percentage,

                  0,
                ) /
                percentages.length
              : null;

          return {
            ...student,

            averagePercentage,

            assessmentCount:
              percentages.length,
          };
        },
      );
    }, [
      displayedStudents,
      displayedAssessments,
      assessmentRecords,
      relevantAssessmentIds,
    ]);

  const assessedStudents =
    studentAnalytics.filter(
      (student) =>
        student.averagePercentage !==
        null,
    );

  const classAverage =
    assessedStudents.length > 0
      ? assessedStudents.reduce(
          (
            total,
            student,
          ) =>
            total +
            student.averagePercentage,

          0,
        ) /
        assessedStudents.length
      : 0;

  const excellentStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >=
        90,
    );

  const verySatisfactoryStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >=
          85 &&
        student.averagePercentage <
          90,
    );

  const satisfactoryStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >=
          75 &&
        student.averagePercentage <
          85,
    );

  const atRiskStudents =
    assessedStudents
      .filter(
        (student) =>
          student.averagePercentage <
          PASSING_PERCENTAGE,
      )
      .sort(
        (
          firstStudent,
          secondStudent,
        ) =>
          firstStudent.averagePercentage -
          secondStudent.averagePercentage,
      );

  const highPotentialStudents =
    assessedStudents
      .filter(
        (student) =>
          student.averagePercentage >=
          HIGH_POTENTIAL_PERCENTAGE,
      )
      .sort(
        (
          firstStudent,
          secondStudent,
        ) =>
          secondStudent.averagePercentage -
          firstStudent.averagePercentage,
      );

  const passingStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >=
        PASSING_PERCENTAGE,
    );

  const passingRate =
    assessedStudents.length > 0
      ? (passingStudents.length /
          assessedStudents.length) *
        100
      : 0;

  const currentSectionLabel =
    selectedSection === "ALL"
      ? "All Sections"
      : selectedSection;

  const currentSubject =
    subjects.find(
      (subject) =>
        String(subject.id) ===
        String(selectedSubject),
    );

  const currentSubjectLabel =
    selectedSubject === "ALL"
      ? "All Subjects"
      : currentSubject?.name ||
        "Selected Subject";

  const getPercentage = (
    count,
  ) =>
    assessedStudents.length ===
    0
      ? 0
      : (count /
          assessedStudents.length) *
        100;

  const getPerformanceStatus = (
    averagePercentage,
  ) => {
    if (
      averagePercentage === null
    ) {
      return {
        label: "Not Assessed",

        className:
          "bg-slate-100 text-slate-600 border-slate-200",
      };
    }

    if (
      averagePercentage >= 90
    ) {
      return {
        label: "Excellent",

        className:
          "bg-green-100 text-green-700 border-green-200",
      };
    }

    if (
      averagePercentage >= 85
    ) {
      return {
        label:
          "Very Satisfactory",

        className:
          "bg-blue-100 text-blue-700 border-blue-200",
      };
    }

    if (
      averagePercentage >= 75
    ) {
      return {
        label:
          "Satisfactory",

        className:
          "bg-amber-100 text-amber-700 border-amber-200",
      };
    }

    return {
      label: "At Risk",

      className:
        "bg-red-100 text-red-700 border-red-200",
    };
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <video
        className="fixed inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source
          src="/background.mp4"
          type="video/mp4"
        />
      </video>

      <div className="fixed inset-0 bg-slate-100/90" />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() =>
            setSidebarOpen(
              false,
            )
          }
          className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div>
            <p className="text-xl font-bold tracking-tight">
              EduLITE
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Teacher Workspace
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(
                false,
              )
            }
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Menu
          </p>

          <div className="mt-3 space-y-1.5">
            <SidebarButton
              active={
                activeView ===
                "dashboard"
              }
              label="Dashboard"
              badge="D"
              onClick={() =>
                openView(
                  "dashboard",
                )
              }
            />

            <SidebarButton
              active={
                activeView ===
                "records"
              }
              label="Records"
              badge="R"
              onClick={() =>
                openView(
                  "records",
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                setAddMenuOpen(
                  (current) =>
                    !current,
                )
              }
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                activeView ===
                  "sections" ||
                activeView ===
                  "subjects"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg font-bold">
                +
              </span>

              <span className="flex-1">
                Add
              </span>

              <span
                className={`text-xs transition-transform ${
                  addMenuOpen
                    ? "rotate-180"
                    : ""
                }`}
              >
                ⌄
              </span>
            </button>

            {addMenuOpen && (
              <div className="ml-5 space-y-1 border-l border-slate-700 pl-4 pt-1">
                <SubmenuButton
                  label="Register Student"
                  onClick={
                    handleRegisterStudent
                  }
                />

                <SubmenuButton
                  label="Add Assessment"
                  onClick={
                    handleAddAssessment
                  }
                />

                <SubmenuButton
                  label="Add Section"
                  active={
                    activeView ===
                    "sections"
                  }
                  onClick={() =>
                    openView(
                      "sections",
                    )
                  }
                />

                <SubmenuButton
                  label="Subject Management"
                  active={
                    activeView ===
                    "subjects"
                  }
                  onClick={() =>
                    openView(
                      "subjects",
                    )
                  }
                />
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
              ↪
            </span>

            Logout
          </button>
        </div>
      </aside>

      <div className="relative z-10 min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(
                  true,
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm lg:hidden"
            >
              ☰
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-slate-900">
                {
                  pageDetails.title
                }
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {
                  pageDetails.description
                }
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 shadow-sm">
              {success}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
              Loading EduLITE
              data...
            </div>
          ) : (
            <>
              {activeView ===
                "dashboard" && (
                <DashboardView
                  students={
                    students
                  }
                  sections={
                    sections
                  }
                  subjects={
                    subjects
                  }
                  assessments={
                    assessments
                  }
                  displayedAssessments={
                    displayedAssessments
                  }
                  selectedSection={
                    selectedSection
                  }
                  selectedSubject={
                    selectedSubject
                  }
                  setSelectedSection={
                    setSelectedSection
                  }
                  setSelectedSubject={
                    setSelectedSubject
                  }
                  currentSectionLabel={
                    currentSectionLabel
                  }
                  currentSubjectLabel={
                    currentSubjectLabel
                  }
                  classAverage={
                    classAverage
                  }
                  assessedStudents={
                    assessedStudents
                  }
                  displayedStudents={
                    displayedStudents
                  }
                  passingRate={
                    passingRate
                  }
                  passingStudents={
                    passingStudents
                  }
                  atRiskStudents={
                    atRiskStudents
                  }
                  excellentStudents={
                    excellentStudents
                  }
                  verySatisfactoryStudents={
                    verySatisfactoryStudents
                  }
                  satisfactoryStudents={
                    satisfactoryStudents
                  }
                  highPotentialStudents={
                    highPotentialStudents
                  }
                  getPercentage={
                    getPercentage
                  }
                  navigate={
                    navigate
                  }
                  handleDeleteAssessment={
                    handleDeleteAssessment
                  }
                  generateStudentRecommendation={
                    generateStudentRecommendation
                  }
                  generatingRecommendationKey={
                    generatingRecommendationKey
                  }
                />
              )}

              {activeView ===
                "records" && (
                <RecordsView
                  students={
                    students
                  }
                  sections={
                    sections
                  }
                  subjects={
                    subjects
                  }
                  assessments={
                    assessments
                  }
                  displayedAssessments={
                    displayedAssessments
                  }
                  studentAnalytics={
                    studentAnalytics
                  }
                  selectedSection={
                    selectedSection
                  }
                  selectedSubject={
                    selectedSubject
                  }
                  setSelectedSection={
                    setSelectedSection
                  }
                  setSelectedSubject={
                    setSelectedSubject
                  }
                  currentSectionLabel={
                    currentSectionLabel
                  }
                  currentSubjectLabel={
                    currentSubjectLabel
                  }
                  scoreMap={
                    scoreMap
                  }
                  editingStudentId={
                    editingStudentId
                  }
                  editedScores={
                    editedScores
                  }
                  savingScores={
                    savingScores
                  }
                  getPerformanceStatus={
                    getPerformanceStatus
                  }
                  handleEditedScoreChange={
                    handleEditedScoreChange
                  }
                  startEditingScores={
                    startEditingScores
                  }
                  cancelEditingScores={
                    cancelEditingScores
                  }
                  saveStudentScores={
                    saveStudentScores
                  }
                  getStudentAssessments={
                    getStudentAssessments
                  }
                  navigate={
                    navigate
                  }
                  handleDeleteStudent={
                    handleDeleteStudent
                  }
                  assessmentRecords={
                    assessmentRecords
                  }
                  expandedStudentId={
                    expandedStudentId
                  }
                  toggleStudentProfile={
                    toggleStudentProfile
                  }
                  studentInsightsById={
                    studentInsightsById
                  }
                  loadingStudentInsightsId={
                    loadingStudentInsightsId
                  }
                  studentInsightErrors={
                    studentInsightErrors
                  }
                  openSavedInsight={
                    openSavedInsight
                  }
                  reloadStudentInsights={
                    loadStudentInsights
                  }
                />
              )}

              {activeView ===
                "sections" && (
                <SectionManagementView
                  sections={
                    sections
                  }
                  newSection={
                    newSection
                  }
                  setNewSection={
                    setNewSection
                  }
                  addingSection={
                    addingSection
                  }
                  handleAddSection={
                    handleAddSection
                  }
                  handleRemoveSection={
                    handleRemoveSection
                  }
                  openDashboardForSection={(
                    sectionName,
                  ) => {
                    setSelectedSection(
                      sectionName,
                    );

                    openView(
                      "dashboard",
                    );
                  }}
                />
              )}

              {activeView ===
                "subjects" && (
                <SubjectManagementView
                  subjects={
                    subjects
                  }
                  newSubject={
                    newSubject
                  }
                  setNewSubject={
                    setNewSubject
                  }
                  addingSubject={
                    addingSubject
                  }
                  openSubjectStudentPrompt={
                    openSubjectStudentPrompt
                  }
                  handleRenameSubject={
                    handleRenameSubject
                  }
                  handleRemoveSubject={
                    handleRemoveSubject
                  }
                  openDashboardForSubject={(
                    subjectId,
                  ) => {
                    setSelectedSubject(
                      String(
                        subjectId,
                      ),
                    );

                    openView(
                      "dashboard",
                    );
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {showSubjectStudentPrompt && (
        <SubjectEnrollmentModal
          subjectName={
            newSubject.trim()
          }
          students={
            students
          }
          filteredStudents={
            subjectPromptStudents
          }
          searchValue={
            subjectStudentSearch
          }
          setSearchValue={
            setSubjectStudentSearch
          }
          selectedIds={
            selectedSubjectStudentIds
          }
          setSelectedIds={
            setSelectedSubjectStudentIds
          }
          toggleStudent={
            toggleNewSubjectStudent
          }
          addingSubject={
            addingSubject
          }
          closeModal={
            closeSubjectStudentPrompt
          }
          createSubject={
            handleAddSubject
          }
        />
      )}

      {(aiRecommendation ||
        aiRecommendationError) && (
        <AiRecommendationModal
          recommendation={
            aiRecommendation
          }
          error={
            aiRecommendationError
          }
          closeModal={
            closeAiRecommendation
          }
        />
      )}
    </div>
  );
}

function DashboardView({
  students,
  sections,
  subjects,
  assessments,
  displayedAssessments,
  selectedSection,
  selectedSubject,
  setSelectedSection,
  setSelectedSubject,
  currentSectionLabel,
  currentSubjectLabel,
  classAverage,
  assessedStudents,
  displayedStudents,
  passingRate,
  passingStudents,
  atRiskStudents,
  excellentStudents,
  verySatisfactoryStudents,
  satisfactoryStudents,
  highPotentialStudents,
  getPercentage,
  navigate,
  handleDeleteAssessment,
  generateStudentRecommendation,
  generatingRecommendationKey,
}) {
  return (
    <>
      <DashboardFilters
        title="Dashboard Filters"
        description="All analytics and assessments update using the selected section and subject."
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={
          selectedSection
        }
        selectedSubject={
          selectedSubject
        }
        setSelectedSection={
          setSelectedSection
        }
        setSelectedSubject={
          setSelectedSubject
        }
      />

      <section>
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Performance Analytics
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {
              currentSubjectLabel
            }{" "}
            ·{" "}
            {
              currentSectionLabel
            }
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsCard
            title="Class Average"
            value={`${classAverage.toFixed(
              1,
            )}%`}
            description="Average from relevant recorded assessments"
            accentClass="border-t-blue-500"
          />

          <AnalyticsCard
            title="Students Assessed"
            value={
              assessedStudents.length
            }
            description={`${displayedStudents.length} students match the filters`}
            accentClass="border-t-purple-500"
          />

          <AnalyticsCard
            title="Passing Rate"
            value={`${passingRate.toFixed(
              1,
            )}%`}
            description={`${passingStudents.length} students have passing averages`}
            accentClass="border-t-green-500"
          />

          <AnalyticsCard
            title="Students at Risk"
            value={
              atRiskStudents.length
            }
            description="Average percentage below 75"
            accentClass="border-t-red-500"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900">
            Class Performance
            Summary
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Distribution of
            assessed students
            across performance
            levels.
          </p>
        </div>

        <div className="space-y-5">
          <PerformanceBar
            label="Excellent"
            range="90–100%"
            count={
              excellentStudents.length
            }
            percentage={getPercentage(
              excellentStudents.length,
            )}
            barClass="bg-green-500"
          />

          <PerformanceBar
            label="Very Satisfactory"
            range="85–89%"
            count={
              verySatisfactoryStudents.length
            }
            percentage={getPercentage(
              verySatisfactoryStudents.length,
            )}
            barClass="bg-blue-500"
          />

          <PerformanceBar
            label="Satisfactory"
            range="75–84%"
            count={
              satisfactoryStudents.length
            }
            percentage={getPercentage(
              satisfactoryStudents.length,
            )}
            barClass="bg-amber-500"
          />

          <PerformanceBar
            label="Needs Support"
            range="Below 75%"
            count={
              atRiskStudents.length
            }
            percentage={getPercentage(
              atRiskStudents.length,
            )}
            barClass="bg-red-500"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900">
            Learning Insights
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Students who may need
            support and students
            demonstrating high
            potential.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <InsightList
            title="Students at Risk"
            students={
              atRiskStudents
            }
            type="risk"
            onGenerateRecommendation={
              generateStudentRecommendation
            }
            generatingRecommendationKey={
              generatingRecommendationKey
            }
          />

          <InsightList
            title="High Potential"
            students={
              highPotentialStudents
            }
            type="potential"
            onGenerateRecommendation={
              generateStudentRecommendation
            }
            generatingRecommendationKey={
              generatingRecommendationKey
            }
          />
        </div>
      </section>

      <AssessmentList
        displayedAssessments={
          displayedAssessments
        }
        currentSubjectLabel={
          currentSubjectLabel
        }
        navigate={navigate}
        handleDeleteAssessment={
          handleDeleteAssessment
        }
      />
    </>
  );
}

function RecordsView({
  students,
  sections,
  subjects,
  assessments,
  displayedAssessments,
  studentAnalytics,
  selectedSection,
  selectedSubject,
  setSelectedSection,
  setSelectedSubject,
  currentSectionLabel,
  currentSubjectLabel,
  scoreMap,
  editingStudentId,
  editedScores,
  savingScores,
  getPerformanceStatus,
  handleEditedScoreChange,
  startEditingScores,
  cancelEditingScores,
  saveStudentScores,
  getStudentAssessments,
  navigate,
  handleDeleteStudent,
  assessmentRecords,
  expandedStudentId,
  toggleStudentProfile,
  studentInsightsById,
  loadingStudentInsightsId,
  studentInsightErrors,
  openSavedInsight,
  reloadStudentInsights,
}) {
  const totalColumns =
    displayedAssessments.length +
    7;

  return (
    <>
      <DashboardFilters
        title="Record Filters"
        description="Choose a section and subject to narrow the student assessment records."
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={
          selectedSection
        }
        selectedSubject={
          selectedSubject
        }
        setSelectedSection={
          setSelectedSection
        }
        setSelectedSubject={
          setSelectedSubject
        }
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">
            Student Assessment
            Records -{" "}
            {
              currentSubjectLabel
            }{" "}
            -{" "}
            {
              currentSectionLabel
            }
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Click a student's name
            to expand their complete
            profile, assessment
            history, and saved
            Gemini learning
            insights.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHeading>
                  Student
                </TableHeading>

                <TableHeading>
                  Grade
                </TableHeading>

                <TableHeading>
                  Section
                </TableHeading>

                <TableHeading>
                  Subjects
                </TableHeading>

                {displayedAssessments.map(
                  (assessment) => (
                    <th
                      key={
                        assessment.id
                      }
                      className="min-w-[175px] px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      <div>
                        {
                          assessment.name
                        }
                      </div>

                      <div className="mt-1 font-normal normal-case text-slate-400">
                        {
                          assessment.subject_name
                        }{" "}
                        -{" "}
                        {
                          assessment.type
                        }{" "}
                        -{" "}
                        {
                          assessment.total_items
                        }{" "}
                        items
                      </div>
                    </th>
                  ),
                )}

                <TableHeading>
                  Average
                </TableHeading>

                <TableHeading>
                  Performance
                </TableHeading>

                <TableHeading align="right">
                  Actions
                </TableHeading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {studentAnalytics.map(
                (student) => {
                  const status =
                    getPerformanceStatus(
                      student.averagePercentage,
                    );

                  const isEditing =
                    editingStudentId ===
                    student.id;

                  const isExpanded =
                    expandedStudentId ===
                    student.id;

                  const studentRecords =
                    assessments
                      .filter(
                        (assessment) =>
                          student.subject_ids?.includes(
                            assessment.subject_id,
                          ),
                      )
                      .map(
                        (assessment) => {
                          const record =
                            assessmentRecords.find(
                              (item) =>
                                item.student_id ===
                                  student.id &&
                                item.assessment_id ===
                                  assessment.id,
                            );

                          return {
                            id:
                              record?.id ??
                              `missing-${student.id}-${assessment.id}`,

                            student_id:
                              student.id,

                            assessment_id:
                              assessment.id,

                            assessment_name:
                              assessment.name,

                            subject_id:
                              assessment.subject_id,

                            subject_name:
                              assessment.subject_name,

                            type:
                              assessment.type,

                            date:
                              assessment.date,

                            total_items:
                              assessment.total_items,

                            score:
                              record?.score ??
                              null,
                          };
                        },
                      )
                      .sort(
                        (
                          first,
                          second,
                        ) => {
                          const dateComparison =
                            String(
                              second.date,
                            ).localeCompare(
                              String(
                                first.date,
                              ),
                            );

                          return (
                            dateComparison ||
                            String(
                              first.assessment_name,
                            ).localeCompare(
                              String(
                                second.assessment_name,
                              ),
                            )
                          );
                        },
                      );

                  const savedInsights =
                    studentInsightsById[
                      student.id
                    ] ?? [];

                  const isLoadingInsights =
                    loadingStudentInsightsId ===
                    student.id;

                  const insightError =
                    studentInsightErrors[
                      student.id
                    ] || "";

                  return (
                    <Fragment
                      key={
                        student.id
                      }
                    >
                      <tr
                        className={
                          isEditing
                            ? "bg-blue-50/50"
                            : isExpanded
                              ? "bg-slate-50"
                              : "hover:bg-slate-50"
                        }
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          <button
                            type="button"
                            onClick={() =>
                              toggleStudentProfile(
                                student,
                              )
                            }
                            className="group text-left"
                            aria-expanded={
                              isExpanded
                            }
                          >
                            <span className="block font-semibold text-blue-700 group-hover:text-blue-900 group-hover:underline">
                              {
                                student.name
                              }
                            </span>

                            <span className="mt-1 block text-xs font-normal text-slate-500">
                              {isExpanded
                                ? "Hide profile"
                                : "View profile and saved insights"}
                            </span>
                          </button>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {
                            student.grade
                          }
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {
                            student.section
                          }
                        </td>

                        <td className="min-w-[220px] px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {student.subjects?.map(
                              (
                                subject,
                              ) => (
                                <span
                                  key={
                                    subject.id
                                  }
                                  className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                                >
                                  {
                                    subject.name
                                  }
                                </span>
                              ),
                            )}
                          </div>
                        </td>

                        {displayedAssessments.map(
                          (
                            assessment,
                          ) => {
                            const isEnrolled =
                              student.subject_ids?.includes(
                                assessment.subject_id,
                              );

                            const score =
                              scoreMap[
                                student.id
                              ]?.[
                                assessment
                                  .id
                              ];

                            const hasScore =
                              score !==
                                undefined &&
                              score !==
                                null;

                            const percentage =
                              hasScore &&
                              Number(
                                assessment.total_items,
                              ) > 0
                                ? (Number(
                                    score,
                                  ) /
                                    Number(
                                      assessment.total_items,
                                    )) *
                                  100
                                : null;

                            return (
                              <td
                                key={
                                  assessment.id
                                }
                                className="px-5 py-4 text-center"
                              >
                                {!isEnrolled ? (
                                  <span className="text-xs text-slate-400">
                                    Not
                                    enrolled
                                  </span>
                                ) : isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        assessment.total_items
                                      }
                                      step="1"
                                      value={
                                        editedScores[
                                          assessment
                                            .id
                                        ] ??
                                        ""
                                      }
                                      onChange={(
                                        event,
                                      ) =>
                                        handleEditedScoreChange(
                                          assessment.id,

                                          event
                                            .target
                                            .value,
                                        )
                                      }
                                      placeholder="-"
                                      disabled={
                                        savingScores
                                      }
                                      className="w-20 rounded-lg border border-blue-300 bg-white px-2 py-2 text-center text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                                    />

                                    <span className="text-sm text-slate-500">
                                      /{" "}
                                      {
                                        assessment.total_items
                                      }
                                    </span>
                                  </div>
                                ) : hasScore ? (
                                  <>
                                    <div className="font-semibold text-slate-900">
                                      {
                                        score
                                      }{" "}
                                      /{" "}
                                      {
                                        assessment.total_items
                                      }
                                    </div>

                                    <div className="mt-1 text-xs text-slate-500">
                                      {percentage.toFixed(
                                        1,
                                      )}
                                      %
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-400">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          },
                        )}

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {student.averagePercentage ===
                          null
                            ? "-"
                            : `${student.averagePercentage.toFixed(
                                1,
                              )}%`}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {
                              status.label
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  saveStudentScores(
                                    student,
                                  )
                                }
                                disabled={
                                  savingScores
                                }
                                className="mr-2 rounded-lg bg-green-600 px-3 py-1.5 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                              >
                                {savingScores
                                  ? "Saving..."
                                  : "Save Scores"}
                              </button>

                              <button
                                type="button"
                                onClick={
                                  cancelEditingScores
                                }
                                disabled={
                                  savingScores
                                }
                                className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/student-form/${student.id}`,
                                  )
                                }
                                className="mr-2 rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-100"
                              >
                                Edit Info
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  startEditingScores(
                                    student,
                                  )
                                }
                                disabled={
                                  getStudentAssessments(
                                    student,
                                  )
                                    .length ===
                                  0
                                }
                                className="mr-2 rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                Edit Scores
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteStudent(
                                    student.id,
                                  )
                                }
                                className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={
                              totalColumns
                            }
                            className="bg-slate-100/70 px-4 py-5 sm:px-6"
                          >
                            <StudentExpandedProfile
                              student={
                                student
                              }
                              status={
                                status
                              }
                              assessmentRecords={
                                studentRecords
                              }
                              savedInsights={
                                savedInsights
                              }
                              loadingInsights={
                                isLoadingInsights
                              }
                              insightError={
                                insightError
                              }
                              openSavedInsight={
                                openSavedInsight
                              }
                              reloadInsights={() =>
                                reloadStudentInsights(
                                  student.id,
                                  true,
                                )
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                },
              )}

              {studentAnalytics.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      totalColumns
                    }
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No students found
                    for{" "}
                    {
                      currentSubjectLabel
                    }{" "}
                    and{" "}
                    {
                      currentSectionLabel
                    }
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function StudentExpandedProfile({
  student,
  status,
  assessmentRecords,
  savedInsights,
  loadingInsights,
  insightError,
  openSavedInsight,
  reloadInsights,
}) {
  const scoredRecords =
    assessmentRecords.filter(
      (record) =>
        record.score !== null &&
        record.score !==
          undefined &&
        Number(
          record.total_items,
        ) > 0,
    );

  const overallAverage =
    scoredRecords.length > 0
      ? scoredRecords.reduce(
          (
            total,
            record,
          ) =>
            total +
            (Number(
              record.score,
            ) /
              Number(
                record.total_items,
              )) *
              100,

          0,
        ) /
        scoredRecords.length
      : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Student Profile
          </p>

          <h3 className="mt-1 text-2xl font-bold text-slate-900">
            {student.name}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Grade{" "}
            {student.grade} -{" "}
            {student.section}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileMetric
          label="Subjects"
          value={
            student.subject_names
              ?.length ?? 0
          }
        />

        <ProfileMetric
          label="Recorded assessments"
          value={
            scoredRecords.length
          }
        />

        <ProfileMetric
          label="Overall average"
          value={
            overallAverage === null
              ? "Not assessed"
              : `${overallAverage.toFixed(
                  1,
                )}%`
          }
        />

        <ProfileMetric
          label="Saved AI insights"
          value={
            savedInsights.length
          }
        />
      </div>

      <div className="mt-6">
        <h4 className="text-base font-bold text-slate-900">
          Enrolled Subjects
        </h4>

        <div className="mt-3 flex flex-wrap gap-2">
          {student.subject_names?.map(
            (subjectName) => (
              <span
                key={
                  subjectName
                }
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
              >
                {subjectName}
              </span>
            ),
          )}

          {!student.subject_names
            ?.length && (
            <span className="text-sm text-slate-500">
              No enrolled subjects
              found.
            </span>
          )}
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-3">
          <h4 className="text-base font-bold text-slate-900">
            Complete Assessment
            History
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            All saved scores for
            this student,
            regardless of the
            current record filters.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50">
              <tr>
                <TableHeading>
                  Assessment
                </TableHeading>

                <TableHeading>
                  Subject
                </TableHeading>

                <TableHeading>
                  Type
                </TableHeading>

                <TableHeading>
                  Date
                </TableHeading>

                <TableHeading>
                  Score
                </TableHeading>

                <TableHeading>
                  Percentage
                </TableHeading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {assessmentRecords.map(
                (record) => {
                  const hasScore =
                    record.score !==
                      null &&
                    record.score !==
                      undefined;

                  const percentage =
                    hasScore &&
                    Number(
                      record.total_items,
                    ) > 0
                      ? (Number(
                          record.score,
                        ) /
                          Number(
                            record.total_items,
                          )) *
                        100
                      : null;

                  return (
                    <tr
                      key={`${record.assessment_id}-${record.id}`}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {
                          record.assessment_name
                        }
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {
                          record.subject_name
                        }
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {
                          record.type
                        }
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {
                          record.date
                        }
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {hasScore
                          ? `${record.score} / ${record.total_items}`
                          : "Missing"}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {percentage ===
                        null
                          ? "-"
                          : `${percentage.toFixed(
                              1,
                            )}%`}
                      </td>
                    </tr>
                  );
                },
              )}

              {assessmentRecords.length ===
                0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No assessment
                    records have
                    been saved for
                    this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Saved Gemini
              Learning Insights
            </h4>

            <p className="mt-1 text-sm text-slate-500">
              Every generated
              intervention or
              enrichment plan is
              stored in the
              database with a
              downloadable PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={
              reloadInsights
            }
            disabled={
              loadingInsights
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingInsights
              ? "Refreshing..."
              : "Refresh insights"}
          </button>
        </div>

        {insightError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {insightError}
          </div>
        )}

        {loadingInsights &&
        savedInsights.length ===
          0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading saved
            insights...
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {savedInsights.map(
              (insight) => (
                <article
                  key={
                    insight.id
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          insight.supportType ===
                          "intervention"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {insight.supportType ===
                        "intervention"
                          ? "Intervention"
                          : "Enrichment"}
                      </span>

                      <h5 className="mt-2 font-bold text-slate-900">
                        {
                          insight.title
                        }
                      </h5>
                    </div>

                    <span className="text-xs text-slate-400">
                      #
                      {
                        insight.id
                      }
                    </span>
                  </div>

                  <dl className="mt-3 space-y-1 text-sm text-slate-600">
                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        Focus:{" "}
                      </dt>

                      <dd className="inline">
                        {
                          insight.focusLabel
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        Classification:{" "}
                      </dt>

                      <dd className="inline">
                        {
                          insight.classification
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="inline font-semibold text-slate-700">
                        Saved:{" "}
                      </dt>

                      <dd className="inline">
                        {formatSavedDate(
                          insight.createdAt,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openSavedInsight(
                          insight,
                        )
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      View insight
                    </button>

                    <a
                      href={`${API_URL}${insight.pdfUrl}`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Download PDF
                    </a>
                  </div>
                </article>
              ),
            )}

            {savedInsights.length ===
              0 &&
              !insightError && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 xl:col-span-2">
                  No Gemini
                  insights have
                  been generated
                  for this student
                  yet.
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function SectionManagementView({
  sections,
  newSection,
  setNewSection,
  addingSection,
  handleAddSection,
  handleRemoveSection,
  openDashboardForSection,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Section Management
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Add sections before
          registering students,
          then manage existing
          section records below.
        </p>
      </div>

      <div className="p-6">
        <form
          onSubmit={
            handleAddSection
          }
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={newSection}
            onChange={(event) =>
              setNewSection(
                event.target.value,
              )
            }
            placeholder="Enter section name"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <button
            type="submit"
            disabled={
              addingSection ||
              !newSection.trim()
            }
            className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {addingSection
              ? "Adding..."
              : "+ Add Section"}
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>
              Section
            </span>

            <span>
              Students
            </span>

            <span>
              Action
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {sections.map(
              (section) => (
                <div
                  key={
                    section.id
                  }
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      openDashboardForSection(
                        section.name,
                      )
                    }
                    className="text-left font-semibold text-slate-900 hover:text-blue-600"
                  >
                    {
                      section.name
                    }
                  </button>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                    {
                      section.student_count
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveSection(
                        section,
                      )
                    }
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              ),
            )}

            {sections.length ===
              0 && (
              <div className="px-6 py-12 text-center text-slate-500">
                No sections have
                been added.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubjectManagementView({
  subjects,
  newSubject,
  setNewSubject,
  addingSubject,
  openSubjectStudentPrompt,
  handleRenameSubject,
  handleRemoveSubject,
  openDashboardForSubject,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Subject Management
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create a subject, choose
          its enrolled students,
          and manage existing
          subjects.
        </p>
      </div>

      <div className="p-6">
        <form
          onSubmit={
            openSubjectStudentPrompt
          }
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={newSubject}
            onChange={(event) =>
              setNewSubject(
                event.target.value,
              )
            }
            placeholder="Enter subject name"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={
              addingSubject ||
              !newSubject.trim()
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Choose Students
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {subjects.map(
            (subject) => (
              <div
                key={subject.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() =>
                    openDashboardForSubject(
                      subject.id,
                    )
                  }
                  className="text-left"
                >
                  <span className="block font-semibold text-slate-900 hover:text-blue-600">
                    {
                      subject.name
                    }
                  </span>

                  <span className="mt-1 block text-sm text-slate-500">
                    {
                      subject.student_count
                    }{" "}
                    students ·{" "}
                    {
                      subject.assessment_count
                    }{" "}
                    assessments
                  </span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleRenameSubject(
                        subject,
                      )
                    }
                    className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-700 hover:bg-amber-100"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveSubject(
                        subject,
                      )
                    }
                    className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ),
          )}

          {subjects.length ===
            0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
              No subjects have
              been added.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardFilters({
  title,
  description,
  students,
  sections,
  subjects,
  assessments,
  selectedSection,
  selectedSubject,
  setSelectedSection,
  setSelectedSubject,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <h2 className="text-xs font-medium text-slate-600">
          {title}
        </h2>

        <p className="sr-only">
          {description}
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-medium text-slate-500">
            Section
          </p>

          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={
                selectedSection ===
                "ALL"
              }
              label="All"
              title={`${students.length} students`}
              onClick={() =>
                setSelectedSection(
                  "ALL",
                )
              }
            />

            {sections.map(
              (section) => (
                <FilterPill
                  key={
                    section.id
                  }
                  active={
                    selectedSection ===
                    section.name
                  }
                  label={
                    section.name
                  }
                  title={`${section.student_count} students`}
                  onClick={() =>
                    setSelectedSection(
                      section.name,
                    )
                  }
                />
              ),
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-medium text-slate-500">
            Subject
          </p>

          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              active={
                selectedSubject ===
                "ALL"
              }
              label="All"
              title={`${assessments.length} assessments`}
              onClick={() =>
                setSelectedSubject(
                  "ALL",
                )
              }
            />

            {subjects.map(
              (subject) => (
                <FilterPill
                  key={
                    subject.id
                  }
                  active={
                    String(
                      selectedSubject,
                    ) ===
                    String(
                      subject.id,
                    )
                  }
                  label={
                    subject.name
                  }
                  title={`${subject.student_count} students, ${subject.assessment_count} assessments`}
                  onClick={() =>
                    setSelectedSubject(
                      String(
                        subject.id,
                      ),
                    )
                  }
                />
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterPill({
  active,
  label,
  title,
  onClick,
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${
        active
          ? "border-slate-300 bg-white text-slate-900 shadow-md shadow-slate-200/70"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
    >
      {active && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[9px] font-bold text-white">
          ✓
        </span>
      )}

      <span className="whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

function AssessmentList({
  displayedAssessments,
  currentSubjectLabel,
  navigate,
  handleDeleteAssessment,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Assessments —{" "}
          {
            currentSubjectLabel
          }
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {
            displayedAssessments.length
          }{" "}
          assessment
          {displayedAssessments.length ===
          1
            ? ""
            : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <TableHeading>
                Assessment
              </TableHeading>

              <TableHeading>
                Subject
              </TableHeading>

              <TableHeading>
                Type
              </TableHeading>

              <TableHeading>
                Date
              </TableHeading>

              <TableHeading>
                Total Items
              </TableHeading>

              <TableHeading align="right">
                Actions
              </TableHeading>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {displayedAssessments.map(
              (assessment) => (
                <tr
                  key={
                    assessment.id
                  }
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {
                      assessment.name
                    }
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {
                      assessment.subject_name
                    }
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {
                      assessment.type
                    }
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {
                      assessment.date
                    }
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {
                      assessment.total_items
                    }
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/assessment-form/${assessment.id}`,
                        )
                      }
                      className="mr-2 rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteAssessment(
                          assessment.id,
                        )
                      }
                      className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}

            {displayedAssessments.length ===
              0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No assessments
                  have been added
                  for this subject.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubjectEnrollmentModal({
  subjectName,
  students,
  filteredStudents,
  searchValue,
  setSearchValue,
  selectedIds,
  setSelectedIds,
  toggleStudent,
  addingSubject,
  closeModal,
  createSubject,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              New Subject
              Enrollment
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {subjectName}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select every student
              who is enrolled in
              this subject.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={
              addingSubject
            }
            className="text-2xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 border-b border-slate-200 px-6 py-4">
          <input
            type="text"
            value={searchValue}
            onChange={(event) =>
              setSearchValue(
                event.target.value,
              )
            }
            placeholder="Search students by name, grade, or section"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {
                selectedIds.length
              }{" "}
              of{" "}
              {students.length}{" "}
              students selected
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    students.map(
                      (student) =>
                        student.id,
                    ),
                  )
                }
                disabled={
                  students.length ===
                    0 ||
                  addingSubject
                }
                className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    [],
                  )
                }
                disabled={
                  selectedIds.length ===
                    0 ||
                  addingSubject
                }
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {filteredStudents.map(
              (student) => (
                <label
                  key={
                    student.id
                  }
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(
                      student.id,
                    )}
                    onChange={() =>
                      toggleStudent(
                        student.id,
                      )
                    }
                    disabled={
                      addingSubject
                    }
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />

                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-900">
                      {
                        student.name
                      }
                    </span>

                    <span className="mt-0.5 block text-sm text-slate-500">
                      Grade{" "}
                      {
                        student.grade
                      }{" "}
                      ·{" "}
                      {
                        student.section
                      }
                    </span>

                    {student.subject_names
                      ?.length >
                      0 && (
                      <span className="mt-1 block text-xs text-slate-400">
                        Current
                        subjects:{" "}
                        {student.subject_names.join(
                          ", ",
                        )}
                      </span>
                    )}
                  </span>
                </label>
              ),
            )}

            {filteredStudents.length ===
              0 && (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
                {students.length ===
                0
                  ? "No students are registered yet. You can still create the subject with no enrolled students."
                  : "No students match the search."}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            disabled={
              addingSubject
            }
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              createSubject
            }
            disabled={
              addingSubject
            }
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {addingSubject
              ? "Creating Subject..."
              : `Create Subject (${selectedIds.length} Students)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({
  active,
  label,
  badge,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
        {badge}
      </span>

      {label}
    </button>
  );
}

function SubmenuButton({
  label,
  active = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-blue-500/20 font-semibold text-blue-200"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active
            ? "bg-blue-400"
            : "bg-slate-600"
        }`}
      />

      {label}
    </button>
  );
}

function AnalyticsCard({
  title,
  value,
  description,
  accentClass,
}) {
  return (
    <div
      className={`rounded-2xl border border-t-4 border-slate-200 bg-white p-5 shadow-sm ${accentClass}`}
    >
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function PerformanceBar({
  label,
  range,
  count,
  percentage,
  barClass,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <span className="font-medium text-slate-800">
            {label}
          </span>

          <span className="ml-2 text-sm text-slate-400">
            {range}
          </span>
        </div>

        <span className="text-sm text-slate-500">
          {count} student
          {count === 1
            ? ""
            : "s"}{" "}
          ·{" "}
          {percentage.toFixed(
            1,
          )}
          %
        </span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function InsightList({
  title,
  students,
  type,
  onGenerateRecommendation,
  generatingRecommendationKey,
}) {
  const isRisk =
    type === "risk";

  const supportType = isRisk
    ? "intervention"
    : "enrichment";

  return (
    <div
      className={`rounded-xl border p-4 ${
        isRisk
          ? "border-red-200 bg-red-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      <h4 className="font-bold text-slate-900">
        {title}
      </h4>

      <p className="mb-4 mt-1 text-sm text-slate-500">
        {students.length} student
        {students.length === 1
          ? ""
          : "s"}
      </p>

      <div className="space-y-2">
        {students.map(
          (student) => {
            const requestKey =
              `${supportType}-${student.id}`;

            const isGenerating =
              generatingRecommendationKey ===
              requestKey;

            const anotherRequestIsRunning =
              Boolean(
                generatingRecommendationKey,
              ) &&
              !isGenerating;

            return (
              <div
                key={
                  student.id
                }
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-slate-900">
                    {
                      student.name
                    }
                  </span>

                  <span
                    className={
                      isRisk
                        ? "font-bold text-red-600"
                        : "font-bold text-green-600"
                    }
                  >
                    {student.averagePercentage.toFixed(
                      1,
                    )}
                    %
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    student.section
                  }{" "}
                  ·{" "}
                  {
                    student.assessmentCount
                  }{" "}
                  assessment
                  {student.assessmentCount ===
                  1
                    ? ""
                    : "s"}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    onGenerateRecommendation(
                      student,
                      supportType,
                    )
                  }
                  disabled={Boolean(
                    generatingRecommendationKey,
                  )}
                  className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isRisk
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isGenerating
                    ? "Generating with Gemini..."
                    : anotherRequestIsRunning
                      ? "Gemini is processing another student..."
                      : isRisk
                        ? "Generate Targeted Intervention"
                        : "Generate Enrichment Activities"}
                </button>
              </div>
            );
          },
        )}

        {students.length ===
          0 && (
          <p className="text-sm text-slate-500">
            No students
            identified.
          </p>
        )}
      </div>
    </div>
  );
}

function AiRecommendationModal({
  recommendation,
  error,
  closeModal,
}) {
  const plan =
    recommendation?.plan;

  const isIntervention =
    recommendation?.supportType ===
    "intervention";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p
              className={`text-sm font-semibold uppercase tracking-wider ${
                isIntervention
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              Gemini Learning
              Support
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {plan?.title ||
                "Learning-Support Recommendation"}
            </h2>

            {recommendation?.student && (
              <p className="mt-1 text-sm text-slate-500">
                {
                  recommendation
                    .student.name
                }{" "}
                · Grade{" "}
                {
                  recommendation
                    .student.grade
                }{" "}
                ·{" "}
                {
                  recommendation
                    .student.section
                }{" "}
                ·{" "}
                {
                  recommendation.focusLabel
                }
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {recommendation
              ?.savedInsight
              ?.pdfUrl && (
              <a
                href={`${API_URL}${recommendation.savedInsight.pdfUrl}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Download PDF
              </a>
            )}

            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg p-2 text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close recommendation"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-92px)] overflow-y-auto px-6 py-6">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
              <h3 className="font-bold">
                Recommendation could
                not be generated
              </h3>

              <p className="mt-2 text-sm">
                {error}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {recommendation?.savedInsight && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  This insight was
                  saved automatically
                  on{" "}
                  {formatSavedDate(
                    recommendation
                      .savedInsight
                      .createdAt,
                  )}
                  . Use the Download
                  PDF button to save
                  a copy outside
                  EduLITE.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <RecommendationMetric
                  label="Classification"
                  value={
                    recommendation
                      ?.classification ||
                    "—"
                  }
                />

                <RecommendationMetric
                  label="Focus Average"
                  value={formatPercentage(
                    recommendation
                      ?.analytics
                      ?.focusAveragePercentage,
                  )}
                />

                <RecommendationMetric
                  label="Section Average"
                  value={formatPercentage(
                    recommendation
                      ?.analytics
                      ?.sectionComparison
                      ?.sectionAveragePercentage,
                  )}
                />

                <RecommendationMetric
                  label="Recent Trend"
                  value={
                    recommendation
                      ?.analytics
                      ?.recentTrend
                      ?.label ||
                    "—"
                  }
                />
              </div>

              {plan?.overview && (
                <RecommendationSection title="Overview">
                  <p className="leading-7 text-slate-700">
                    {
                      plan.overview
                    }
                  </p>
                </RecommendationSection>
              )}

              {plan?.evidence
                ?.length >
                0 && (
                <RecommendationSection title="Evidence Used">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plan.evidence.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={`${item.observation}-${index}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="font-semibold text-slate-900">
                            {
                              item.observation
                            }
                          </p>

                          <p className="mt-2 text-sm text-slate-600">
                            {
                              item.dataPoint
                            }
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </RecommendationSection>
              )}

              {plan
                ?.targetedInterventions
                ?.length >
                0 && (
                <RecommendationSection title="Suggested Targeted Interventions">
                  <div className="space-y-4">
                    {plan.targetedInterventions.map(
                      (
                        intervention,
                        index,
                      ) => (
                        <div
                          key={`${intervention.title}-${index}`}
                          className="rounded-xl border border-red-100 bg-red-50/50 p-5"
                        >
                          <h4 className="text-lg font-bold text-slate-900">
                            {index +
                              1}
                            .{" "}
                            {
                              intervention.title
                            }
                          </h4>

                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {
                              intervention.rationale
                            }
                          </p>

                          {intervention
                            .actions
                            ?.length >
                            0 && (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                              {intervention.actions.map(
                                (
                                  action,
                                  actionIndex,
                                ) => (
                                  <li
                                    key={`${action}-${actionIndex}`}
                                  >
                                    {
                                      action
                                    }
                                  </li>
                                ),
                              )}
                            </ul>
                          )}

                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <PlanDetail
                              label="Suggested schedule"
                              value={
                                intervention.schedule
                              }
                            />

                            <PlanDetail
                              label="Success indicator"
                              value={
                                intervention.successIndicator
                              }
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </RecommendationSection>
              )}

              {plan
                ?.enrichmentActivities
                ?.length >
                0 && (
                <RecommendationSection title="Recommended Enrichment Activities">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {plan.enrichmentActivities.map(
                      (
                        activity,
                        index,
                      ) => (
                        <div
                          key={`${activity.title}-${index}`}
                          className="rounded-xl border border-green-100 bg-green-50/50 p-5"
                        >
                          <h4 className="text-lg font-bold text-slate-900">
                            {index +
                              1}
                            .{" "}
                            {
                              activity.title
                            }
                          </h4>

                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {
                              activity.description
                            }
                          </p>

                          <div className="mt-4 space-y-3">
                            <PlanDetail
                              label="Implementation"
                              value={
                                activity.implementation
                              }
                            />

                            <PlanDetail
                              label="Expected outcome"
                              value={
                                activity.expectedOutcome
                              }
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </RecommendationSection>
              )}

              {plan
                ?.monitoringPlan
                ?.length >
                0 && (
                <RecommendationSection title="Progress Monitoring">
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <TableHeading>
                            Metric
                          </TableHeading>

                          <TableHeading>
                            Frequency
                          </TableHeading>

                          <TableHeading>
                            Target
                          </TableHeading>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        {plan.monitoringPlan.map(
                          (
                            item,
                            index,
                          ) => (
                            <tr
                              key={`${item.metric}-${index}`}
                            >
                              <td className="px-6 py-4 text-slate-700">
                                {
                                  item.metric
                                }
                              </td>

                              <td className="px-6 py-4 text-slate-700">
                                {
                                  item.frequency
                                }
                              </td>

                              <td className="px-6 py-4 text-slate-700">
                                {
                                  item.target
                                }
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </RecommendationSection>
              )}

              {plan
                ?.teacherNotes
                ?.length >
                0 && (
                <RecommendationSection title="Teacher Notes">
                  <ul className="list-disc space-y-2 pl-5 text-slate-700">
                    {plan.teacherNotes.map(
                      (
                        note,
                        index,
                      ) => (
                        <li
                          key={`${note}-${index}`}
                        >
                          {note}
                        </li>
                      ),
                    )}
                  </ul>
                </RecommendationSection>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Gemini
                recommendations are
                generated from
                recorded academic
                data only. Review
                them using your
                professional
                judgment and
                knowledge of the
                learner before
                applying them.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function RecommendationSection({
  title,
  children,
}) {
  return (
    <section>
      <h3 className="mb-3 text-xl font-bold text-slate-900">
        {title}
      </h3>

      {children}
    </section>
  );
}

function PlanDetail({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm leading-6 text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

function formatPercentage(value) {
  return (
    value === null ||
    value === undefined
      ? "—"
      : `${Number(
          value,
        ).toFixed(1)}%`
  );
}

function formatSavedDate(value) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return (
      value ||
      "Unknown date"
    );
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function TableHeading({
  children,
  align = "left",
}) {
  return (
    <th
      className={`px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-600 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}