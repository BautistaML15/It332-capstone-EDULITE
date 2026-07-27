import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentForm from "./StudentForm";
import AssessmentForm from "./AssessmentForm";

const API_URL = "http://localhost:3000";
const PASSING_PERCENTAGE = 75;
const HIGH_POTENTIAL_PERCENTAGE = 90;

const PAGE_DETAILS = {
  dashboard: {
    title: "Dashboard",
    description:
      "Student performance analytics, learning insights, and subject assessments.",
  },
  records: {
    title: "Student Assessment Records",
    description:
      "Review, edit, and manage student scores for every enrolled subject.",
  },
  sections: {
    title: "Sections",
    description:
      "Create and manage the sections used when registering students.",
  },
  subjects: {
    title: "Subjects",
    description:
      "Create subjects and select the students enrolled in each subject.",
  },
  students: {
    title: "Students",
    description:
      "Register students, manage enrollment, and open individual records.",
  },
  studentForm: {
    title: "Register Student",
    description: "Add or update a student without leaving the dashboard.",
  },
  assessments: {
    title: "Assessments",
    description:
      "Create, review, edit, and manage subject assessments and scores.",
  },
  assessmentForm: {
    title: "Create Assessment",
    description:
      "Create or update an assessment and record scores inside the dashboard.",
  },
  aiInsights: {
    title: "AI Insights",
    description:
      "Generate evidence-based interventions and enrichment activities.",
  },
};

export default function Dashboard() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [assessmentRecords, setAssessmentRecords] = useState([]);
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [newSection, setNewSection] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingSection, setAddingSection] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [showSubjectStudentPrompt, setShowSubjectStudentPrompt] =
    useState(false);
  const [selectedSubjectStudentIds, setSelectedSubjectStudentIds] = useState(
    [],
  );
  const [subjectStudentSearch, setSubjectStudentSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editedScores, setEditedScores] = useState({});
  const [savingScores, setSavingScores] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [studentFormId, setStudentFormId] = useState(null);
  const [assessmentFormId, setAssessmentFormId] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("eduliteSidebarCollapsed") === "true";
  });

  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [aiRecommendationError, setAiRecommendationError] = useState("");
  const [generatingRecommendationKey, setGeneratingRecommendationKey] =
    useState("");
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [studentInsightsById, setStudentInsightsById] = useState({});
  const [loadingStudentInsightsId, setLoadingStudentInsightsId] =
    useState(null);
  const [studentInsightErrors, setStudentInsightErrors] = useState({});

  const navigate = useNavigate();

  const pageDetails =
    activeView === "studentForm" && studentFormId
      ? {
          title: "Edit Student",
          description:
            "Update the student's information without leaving the dashboard.",
        }
      : activeView === "assessmentForm" && assessmentFormId
        ? {
            title: "Edit Assessment",
            description:
              "Update the assessment and student scores without leaving the dashboard.",
          }
        : (PAGE_DETAILS[activeView] ?? PAGE_DETAILS.dashboard);

  useEffect(() => {
    localStorage.setItem("eduliteSidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const stylesheets = [
      {
        id: "edulite-material-symbols",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL@0..1&icon_names=assignment,auto_awesome,category,dashboard,groups,logout,menu_book,table_view&display=block",
      },
    ];

    stylesheets.forEach(({ id, href }) => {
      if (document.getElementById(id)) {
        return;
      }

      const stylesheet = document.createElement("link");
      stylesheet.id = id;
      stylesheet.rel = "stylesheet";
      stylesheet.href = href;
      document.head.appendChild(stylesheet);
    });
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/");
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
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
        axios.get(`${API_URL}/students`),
        axios.get(`${API_URL}/sections`),
        axios.get(`${API_URL}/subjects`),
        axios.get(`${API_URL}/assessments`),
        axios.get(`${API_URL}/assessment-records`),
      ]);

      setStudents(studentResponse.data);
      setSections(sectionResponse.data);
      setSubjects(subjectResponse.data);
      setAssessments(assessmentResponse.data);
      setAssessmentRecords(recordResponse.data);

      if (
        selectedSection !== "ALL" &&
        !sectionResponse.data.some(
          (section) => section.name === selectedSection,
        )
      ) {
        setSelectedSection("ALL");
      }

      if (
        selectedSubject !== "ALL" &&
        !subjectResponse.data.some(
          (subject) => String(subject.id) === String(selectedSubject),
        )
      ) {
        setSelectedSubject("ALL");
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);

      setError(err.response?.data?.message || "Unable to load the dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const openView = (view) => {
    if (view !== "studentForm") {
      setStudentFormId(null);
    }

    if (view !== "assessmentForm") {
      setAssessmentFormId(null);
    }

    setActiveView(view);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddSection = async (event) => {
    event.preventDefault();

    const sectionName = newSection.trim();

    if (!sectionName) {
      return;
    }

    setAddingSection(true);
    setError("");
    setSuccess("");

    try {
      await axios.post(`${API_URL}/sections`, {
        name: sectionName,
      });

      setNewSection("");

      await fetchDashboardData();

      setSuccess("Section added successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add the section.");
    } finally {
      setAddingSection(false);
    }
  };

  const handleRemoveSection = async (section) => {
    if (!window.confirm(`Remove section "${section.name}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API_URL}/sections/${section.id}`);

      if (selectedSection === section.name) {
        setSelectedSection("ALL");
      }

      await fetchDashboardData();

      setSuccess("Section removed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove the section.");
    }
  };

  const openSubjectStudentPrompt = (event) => {
    event.preventDefault();

    if (!newSubject.trim()) {
      return;
    }

    setSelectedSubjectStudentIds([]);
    setSubjectStudentSearch("");
    setError("");
    setSuccess("");
    setShowSubjectStudentPrompt(true);
  };

  const closeSubjectStudentPrompt = () => {
    if (addingSubject) {
      return;
    }

    setShowSubjectStudentPrompt(false);
    setSelectedSubjectStudentIds([]);
    setSubjectStudentSearch("");
  };

  const toggleNewSubjectStudent = (studentId) => {
    setSelectedSubjectStudentIds((currentIds) =>
      currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId],
    );
  };

  const handleAddSubject = async () => {
    const subjectName = newSubject.trim();

    if (!subjectName) {
      return;
    }

    setAddingSubject(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_URL}/subjects`, {
        name: subjectName,
        student_ids: selectedSubjectStudentIds,
      });

      const enrolledCount =
        response.data?.student_count ?? selectedSubjectStudentIds.length;

      setNewSubject("");
      setShowSubjectStudentPrompt(false);
      setSelectedSubjectStudentIds([]);
      setSubjectStudentSearch("");

      await fetchDashboardData();

      setSuccess(
        `${
          response.data?.message || "Subject added successfully."
        } ${enrolledCount} student${enrolledCount === 1 ? "" : "s"} enrolled.`,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add the subject.");
    } finally {
      setAddingSubject(false);
    }
  };

  const handleRenameSubject = async (subject) => {
    const nextName = window
      .prompt("Enter the new subject name:", subject.name)
      ?.trim();

    if (!nextName || nextName === subject.name) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.put(`${API_URL}/subjects/${subject.id}`, {
        name: nextName,
      });

      await fetchDashboardData();

      setSuccess("Subject updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update the subject.");
    }
  };

  const handleRemoveSubject = async (subject) => {
    if (!window.confirm(`Remove subject "${subject.name}"?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API_URL}/subjects/${subject.id}`);

      if (String(selectedSubject) === String(subject.id)) {
        setSelectedSubject("ALL");
      }

      await fetchDashboardData();

      setSuccess("Subject removed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove the subject.");
    }
  };

  const handleDeleteStudent = async (studentId) => {
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
      await axios.delete(`${API_URL}/students/${studentId}`);

      await fetchDashboardData();

      setSuccess("Student deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete the student.");
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm("Delete this assessment and all recorded scores?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API_URL}/assessments/${assessmentId}`);

      await fetchDashboardData();

      setSuccess("Assessment deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to delete the assessment.",
      );
    }
  };

  const handleRegisterStudent = () => {
    if (sections.length === 0) {
      setError("Add at least one section before registering a student.");
      setActiveView("sections");
      return;
    }

    if (subjects.length === 0) {
      setError("Add at least one subject before registering a student.");
      setActiveView("subjects");
      return;
    }

    setStudentFormId(null);
    openView("studentForm");
  };

  const handleEditStudent = (studentId) => {
    setStudentFormId(studentId);
    setActiveView("studentForm");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStudentFormCancel = () => {
    const returnView = "students";
    setStudentFormId(null);
    openView(returnView);
  };

  const handleStudentFormSaved = async (_result, details) => {
    await fetchDashboardData();
    setStudentFormId(null);
    setActiveView("students");
    setError("");
    setSuccess(
      details?.isEditing
        ? "Student updated successfully."
        : "Student registered successfully.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddAssessment = () => {
    if (subjects.length === 0) {
      setError("Add at least one subject before creating an assessment.");
      setActiveView("subjects");
      return;
    }

    setAssessmentFormId(null);
    openView("assessmentForm");
  };

  const handleEditAssessment = (assessmentId) => {
    setAssessmentFormId(assessmentId);
    setActiveView("assessmentForm");
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAssessmentFormCancel = () => {
    setAssessmentFormId(null);
    openView("assessments");
  };

  const handleAssessmentFormSaved = async (_result, details) => {
    await fetchDashboardData();
    setAssessmentFormId(null);
    setActiveView("assessments");
    setError("");
    setSuccess(
      details?.isEditing
        ? "Assessment updated successfully."
        : "Assessment added successfully.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const selectedSubjectId =
    selectedSubject === "ALL" ? null : Number(selectedSubject);

  const generateStudentRecommendation = async (student, supportType) => {
    const requestKey = `${supportType}-${student.id}`;

    if (generatingRecommendationKey) {
      return;
    }

    setGeneratingRecommendationKey(requestKey);
    setAiRecommendationError("");
    setAiRecommendation(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/gemini/student-support/${student.id}`,
        {
          support_type: supportType,
          focus_subject_id: selectedSubjectId,
        },
      );

      const { savedInsight, ...result } = response.data;

      setAiRecommendation({
        ...result,
        savedInsight,
      });

      if (savedInsight) {
        setStudentInsightsById((current) => {
          if (!Object.prototype.hasOwnProperty.call(current, student.id)) {
            return current;
          }

          return {
            ...current,
            [student.id]: [
              {
                ...savedInsight,
                result,
              },
              ...current[student.id].filter(
                (insight) => insight.id !== savedInsight.id,
              ),
            ],
          };
        });
      }
    } catch (err) {
      console.error("Unable to generate Gemini recommendation:", err);

      setAiRecommendationError(
        err.response?.data?.message ||
          "Unable to generate the learning-support recommendation.",
      );
    } finally {
      setGeneratingRecommendationKey("");
    }
  };

  const closeAiRecommendation = () => {
    if (generatingRecommendationKey) {
      return;
    }

    setAiRecommendation(null);
    setAiRecommendationError("");
  };

  const openSavedInsight = (insight) => {
    if (!insight?.result) {
      setAiRecommendation(null);
      setAiRecommendationError("The saved insight data could not be opened.");
      return;
    }

    setAiRecommendationError("");

    setAiRecommendation({
      ...insight.result,
      savedInsight: {
        id: insight.id,
        studentId: insight.studentId,
        supportType: insight.supportType,
        classification: insight.classification,
        focusSubjectId: insight.focusSubjectId,
        focusLabel: insight.focusLabel,
        model: insight.model,
        title: insight.title,
        createdAt: insight.createdAt,
        pdfUrl: insight.pdfUrl,
      },
    });
  };

  const loadStudentInsights = async (studentId, force = false) => {
    if (
      !force &&
      Object.prototype.hasOwnProperty.call(studentInsightsById, studentId)
    ) {
      return;
    }

    setLoadingStudentInsightsId(studentId);

    setStudentInsightErrors((current) => ({
      ...current,
      [studentId]: "",
    }));

    try {
      const response = await axios.get(
        `${API_URL}/api/students/${studentId}/insights`,
      );

      setStudentInsightsById((current) => ({
        ...current,
        [studentId]: response.data,
      }));
    } catch (err) {
      setStudentInsightErrors((current) => ({
        ...current,
        [studentId]:
          err.response?.data?.message ||
          "Unable to load the student's saved learning insights.",
      }));
    } finally {
      setLoadingStudentInsightsId((currentId) =>
        currentId === studentId ? null : currentId,
      );
    }
  };

  const toggleStudentProfile = async (student) => {
    if (expandedStudentId === student.id) {
      setExpandedStudentId(null);
      return;
    }

    setExpandedStudentId(student.id);
    await loadStudentInsights(student.id);
  };

  const subjectPromptStudents = useMemo(() => {
    const searchValue = subjectStudentSearch.trim().toLowerCase();

    if (!searchValue) {
      return students;
    }

    return students.filter((student) =>
      `${student.name} ${student.grade} ${student.section}`
        .toLowerCase()
        .includes(searchValue),
    );
  }, [students, subjectStudentSearch]);

  const displayedAssessments = useMemo(() => {
    if (selectedSubjectId === null) {
      return assessments;
    }

    return assessments.filter(
      (assessment) => assessment.subject_id === selectedSubjectId,
    );
  }, [assessments, selectedSubjectId]);

  const displayedStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSection =
        selectedSection === "ALL" || student.section === selectedSection;

      const matchesSubject =
        selectedSubjectId === null ||
        student.subject_ids?.includes(selectedSubjectId);

      return matchesSection && matchesSubject;
    });
  }, [students, selectedSection, selectedSubjectId]);

  const scoreMap = useMemo(() => {
    const map = {};

    for (const record of assessmentRecords) {
      if (!map[record.student_id]) {
        map[record.student_id] = {};
      }

      map[record.student_id][record.assessment_id] = record.score;
    }

    return map;
  }, [assessmentRecords]);

  const getStudentAssessments = (student) =>
    displayedAssessments.filter((assessment) =>
      student.subject_ids?.includes(assessment.subject_id),
    );

  const startEditingScores = (student) => {
    const currentScores = {};

    for (const assessment of getStudentAssessments(student)) {
      const currentScore = scoreMap[student.id]?.[assessment.id];

      currentScores[assessment.id] =
        currentScore === undefined || currentScore === null
          ? ""
          : String(currentScore);
    }

    setEditedScores(currentScores);
    setEditingStudentId(student.id);
    setError("");
    setSuccess("");
  };

  const cancelEditingScores = () => {
    if (savingScores) {
      return;
    }

    setEditingStudentId(null);
    setEditedScores({});
    setError("");
  };

  const handleEditedScoreChange = (assessmentId, value) => {
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setEditedScores((currentScores) => ({
      ...currentScores,
      [assessmentId]: value,
    }));
  };

  const saveStudentScores = async (student) => {
    if (savingScores) {
      return;
    }

    setError("");
    setSuccess("");

    const scoreList = [];

    for (const assessment of getStudentAssessments(student)) {
      const enteredValue = editedScores[assessment.id];

      const isBlank =
        enteredValue === "" ||
        enteredValue === null ||
        enteredValue === undefined;

      if (!isBlank) {
        const numericScore = Number(enteredValue);

        if (
          !Number.isInteger(numericScore) ||
          numericScore < 0 ||
          numericScore > Number(assessment.total_items)
        ) {
          setError(
            `${student.name}'s score for "${assessment.name}" must be between 0 and ${assessment.total_items}.`,
          );
          return;
        }
      }

      scoreList.push({
        assessment_id: assessment.id,
        score: isBlank ? null : Number(enteredValue),
      });
    }

    setSavingScores(true);

    try {
      const response = await axios.put(
        `${API_URL}/students/${student.id}/assessment-scores`,
        {
          scores: scoreList,
        },
      );

      setEditingStudentId(null);
      setEditedScores({});

      await fetchDashboardData();

      setSuccess(response.data?.message || "Scores updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update the student scores.",
      );
    } finally {
      setSavingScores(false);
    }
  };

  const relevantAssessmentIds = useMemo(
    () => new Set(displayedAssessments.map((assessment) => assessment.id)),
    [displayedAssessments],
  );

  const studentAnalytics = useMemo(() => {
    return displayedStudents.map((student) => {
      const enrolledAssessmentIds = new Set(
        displayedAssessments
          .filter((assessment) =>
            student.subject_ids?.includes(assessment.subject_id),
          )
          .map((assessment) => assessment.id),
      );

      const percentages = assessmentRecords
        .filter(
          (record) =>
            record.student_id === student.id &&
            relevantAssessmentIds.has(record.assessment_id) &&
            enrolledAssessmentIds.has(record.assessment_id) &&
            Number(record.total_items) > 0,
        )
        .map(
          (record) => (Number(record.score) / Number(record.total_items)) * 100,
        );

      const averagePercentage =
        percentages.length > 0
          ? percentages.reduce((total, percentage) => total + percentage, 0) /
            percentages.length
          : null;

      return {
        ...student,
        averagePercentage,
        assessmentCount: percentages.length,
      };
    });
  }, [
    displayedStudents,
    displayedAssessments,
    assessmentRecords,
    relevantAssessmentIds,
  ]);

  const assessedStudents = studentAnalytics.filter(
    (student) => student.averagePercentage !== null,
  );

  const classAverage =
    assessedStudents.length > 0
      ? assessedStudents.reduce(
          (total, student) => total + student.averagePercentage,
          0,
        ) / assessedStudents.length
      : 0;

  const excellentStudents = assessedStudents.filter(
    (student) => student.averagePercentage >= 90,
  );

  const verySatisfactoryStudents = assessedStudents.filter(
    (student) =>
      student.averagePercentage >= 85 && student.averagePercentage < 90,
  );

  const satisfactoryStudents = assessedStudents.filter(
    (student) =>
      student.averagePercentage >= 75 && student.averagePercentage < 85,
  );

  const atRiskStudents = assessedStudents
    .filter((student) => student.averagePercentage < PASSING_PERCENTAGE)
    .sort(
      (firstStudent, secondStudent) =>
        firstStudent.averagePercentage - secondStudent.averagePercentage,
    );

  const highPotentialStudents = assessedStudents
    .filter((student) => student.averagePercentage >= HIGH_POTENTIAL_PERCENTAGE)
    .sort(
      (firstStudent, secondStudent) =>
        secondStudent.averagePercentage - firstStudent.averagePercentage,
    );

  const passingStudents = assessedStudents.filter(
    (student) => student.averagePercentage >= PASSING_PERCENTAGE,
  );

  const passingRate =
    assessedStudents.length > 0
      ? (passingStudents.length / assessedStudents.length) * 100
      : 0;

  const currentSectionLabel =
    selectedSection === "ALL" ? "All Sections" : selectedSection;

  const currentSubject = subjects.find(
    (subject) => String(subject.id) === String(selectedSubject),
  );

  const currentSubjectLabel =
    selectedSubject === "ALL"
      ? "All Subjects"
      : currentSubject?.name || "Selected Subject";

  const getPercentage = (count) =>
    assessedStudents.length === 0 ? 0 : (count / assessedStudents.length) * 100;

  const getPerformanceStatus = (averagePercentage) => {
    if (averagePercentage === null) {
      return {
        label: "Not Assessed",
        className: "border-[#8E8E93] bg-[#8E8E93] text-white",
      };
    }

    if (averagePercentage >= 90) {
      return {
        label: "Excellent",
        className: "border-[#34C759] bg-[#34C759] text-white",
      };
    }

    if (averagePercentage >= 85) {
      return {
        label: "Very Satisfactory",
        className: "border-[#007AFF] bg-[#007AFF] text-white",
      };
    }

    if (averagePercentage >= 75) {
      return {
        label: "Satisfactory",
        className: "border-[#FFCC00] bg-[#FFCC00] text-[#1C1C1E]",
      };
    }

    return {
      label: "At Risk",
      className: "border-[#FF3B30] bg-[#FF3B30] text-white",
    };
  };

  return (
    <div
      className="edulite-ios-corners min-h-screen bg-[#F2F2F7] text-[#1C1C1E]"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <style>{`
        .edulite-ios-corners [class*="rounded-["]:not(.rounded-full),
        .edulite-ios-corners .rounded-lg {
          corner-shape: squircle;
        }

        .edulite-ios-corners button,
        .edulite-ios-corners [role="button"] {
          transition:
            transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 220ms ease,
            background-color 220ms ease,
            color 220ms ease,
            opacity 220ms ease,
            filter 220ms ease;
          will-change: transform;
        }

        .edulite-ios-corners button:not(.sidebar-nav-button):not(:disabled):hover,
        .edulite-ios-corners [role="button"]:hover {
          transform: translateY(-1px) scale(1.01);
          filter: brightness(1.025);
        }

        .edulite-ios-corners button:not(.sidebar-nav-button):not(:disabled):active,
        .edulite-ios-corners [role="button"]:active {
          transform: translateY(0) scale(0.97);
          transition-duration: 90ms;
        }

        .sidebar-nav-button {
          transform: none !important;
          transition:
            background-color 180ms ease,
            color 180ms ease,
            box-shadow 180ms ease !important;
        }

        .sidebar-nav-button:active {
          background-color: rgba(255, 255, 255, 0.9);
        }

        .sidebar-nav-button .sidebar-nav-icon {
          transition:
            transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
            color 180ms ease;
        }

        .sidebar-nav-button:hover .sidebar-nav-icon {
          transform: scale(1.08);
        }

        .edulite-ios-corners input,
        .edulite-ios-corners select,
        .edulite-ios-corners textarea {
          transition:
            border-color 220ms ease,
            box-shadow 220ms ease,
            background-color 220ms ease,
            transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .edulite-ios-corners input:focus,
        .edulite-ios-corners select:focus,
        .edulite-ios-corners textarea:focus {
          transform: translateY(-1px);
        }

        .edulite-ios-corners article {
          transition:
            transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 280ms ease,
            filter 280ms ease;
        }

        .edulite-ios-corners article:hover {
          transform: translateY(-2px);
          filter: brightness(1.015);
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
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .liquid-glass-sidebar {
          isolation: isolate;
          background:
            radial-gradient(
              circle at 15% 8%,
              rgba(0, 122, 255, 0.16),
              transparent 34%
            ),
            radial-gradient(
              circle at 92% 88%,
              rgba(52, 199, 89, 0.12),
              transparent 38%
            ),
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.34),
              rgba(255, 255, 255, 0.08)
            );
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          backdrop-filter: blur(32px) saturate(180%);
          box-shadow:
            12px 0 36px rgba(60, 60, 67, 0.12),
            2px 0 8px rgba(60, 60, 67, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.38),
            inset 0 -1px 0 rgba(255, 255, 255, 0.08);
        }

        .liquid-glass-sidebar::before {
          position: absolute;
          inset: 0;
          z-index: 0;
          border-radius: inherit;
          background:
            linear-gradient(
              110deg,
              rgba(255, 255, 255, 0.14),
              transparent 34%,
              rgba(255, 255, 255, 0.03) 66%,
              rgba(255, 255, 255, 0.1)
            );
          content: "";
          pointer-events: none;
        }

        .liquid-glass-sidebar::after {
          position: absolute;
          inset: 1px;
          z-index: 0;
          border-radius: inherit;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.05),
            transparent 22%,
            transparent 78%,
            rgba(255, 255, 255, 0.03)
          );
          content: "";
          pointer-events: none;
        }

        .liquid-glass-sidebar > * {
          position: relative;
          z-index: 1;
        }

        @supports (corner-shape: squircle) {
          .edulite-ios-corners [class*="rounded-["]:not(.rounded-full),
          .edulite-ios-corners .rounded-lg {
            corner-shape: squircle;
          }
        }

        .bento-select option {
          background: #ffffff;
          color: #1C1C1E;
        }

        .edulite-dark {
          color-scheme: dark;
        }

        .edulite-dark [class~="bg-white"] {
          background-color: #171a17 !important;
        }

        .edulite-dark [class~="bg-[#F2F2F7]"] {
          background-color: #0f120f !important;
        }

        .edulite-dark [class~="bg-[#E5E5EA]"],
        .edulite-dark [class~="bg-[#E5E5EA]"],
        .edulite-dark [class~="bg-[#D1D1D6]"] {
          background-color: #232723 !important;
        }

        .edulite-dark [class~="bg-white/65"],
        .edulite-dark [class~="bg-white/70"],
        .edulite-dark [class~="bg-white/75"],
        .edulite-dark [class~="bg-white/80"],
        .edulite-dark [class~="bg-white/85"] {
          background-color: rgba(30, 34, 30, 0.82) !important;
        }

        .edulite-dark [class~="text-[#1C1C1E]"],
        .edulite-dark [class~="text-[#3A3A3C]"],
        .edulite-dark [class~="text-[#1d1d1f]"] {
          color: #f5f7f2 !important;
        }

        .edulite-dark [class~="text-[#636366]"],
        .edulite-dark [class~="text-[#8E8E93]"] {
          color: #aeb5ac !important;
        }

        .edulite-dark [class~="text-[#0051D5]"] {
          color: #8ab4f8 !important;
        }

        .edulite-dark [class~="text-[#248A3D]"] {
          color: #81c995 !important;
        }

        .edulite-dark [class~="text-[#D70015]"] {
          color: #ff8a80 !important;
        }

        .edulite-dark [class~="text-[#8A5A00]"] {
          color: #fdd663 !important;
        }

        .edulite-dark [class~="border-[#D1D1D6]"],
        .edulite-dark [class~="border-[#E5E5EA]"] {
          border-color: #343a34 !important;
        }

        .edulite-dark [class~="border-[#1A2CA3]"],
        .edulite-dark [class~="border-[#007AFF]"],
        .edulite-dark [class~="border-[#34C759]"],
        .edulite-dark [class~="border-[#FF3B30]"],
        .edulite-dark [class~="border-[#FFCC00]"] {
          border-color: transparent !important;
        }

        .edulite-dark input,
        .edulite-dark select,
        .edulite-dark textarea {
          caret-color: #f5f7f2;
        }

        .edulite-dark .dashboard-bento,
        .edulite-dark .dashboard-bento [class~="text-[#1C1C1E]"] {
          color: #f5f7f2 !important;
        }

        .edulite-dark .dashboard-bento [class~="text-[#636366]/75"],
        .edulite-dark .dashboard-bento [class~="text-[#636366]/70"] {
          color: rgba(245, 247, 242, 0.72) !important;
        }
      `}</style>

      <aside
        className={`liquid-glass-sidebar fixed inset-y-0 left-0 z-50 flex flex-col overflow-visible transition-[width] duration-300 ${
          sidebarCollapsed ? "w-14" : "w-52"
        }`}
      >
        <div
          className={`relative flex h-16 items-center ${
            sidebarCollapsed ? "justify-center px-1.5" : "px-3"
          }`}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex min-w-0 items-center ${
              sidebarCollapsed ? "justify-center" : "gap-2.5"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="EduLITE logo"
                className="h-7 w-7 object-contain"
              />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-tight text-[#1C1C1E]">
                  EduLITE
                </p>

                <p className="truncate text-[10px] text-[#6e6e73]">
                  Teacher Workspace
                </p>
              </div>
            )}
          </button>

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="absolute right-2 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs font-bold text-[#6e6e73] shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-[#007AFF]"
            >
              ‹
            </button>
          )}
        </div>

        <nav
          aria-label="Main navigation"
          className={`flex-1 overflow-x-hidden overflow-y-auto py-3 ${
            sidebarCollapsed ? "px-1.5" : "px-2.5"
          }`}
        >
          {!sidebarCollapsed && (
            <p className="px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8e8e93]">
              Menu
            </p>
          )}

            <div className={`${sidebarCollapsed ? "" : "mt-2"} space-y-1`}>
              <SidebarButton
                active={activeView === "dashboard"}
                label="Dashboard"
                icon="dashboard"
                tone="yellow"
                collapsed={sidebarCollapsed}
                onClick={() => openView("dashboard")}
              />

              <SidebarButton
                active={
                  activeView === "students" || activeView === "studentForm"
                }
                label="Students"
                icon="groups"
                tone="blue"
                collapsed={sidebarCollapsed}
                onClick={() => openView("students")}
              />

              <SidebarButton
                active={activeView === "sections"}
                label="Sections"
                icon="category"
                tone="red"
                collapsed={sidebarCollapsed}
                onClick={() => openView("sections")}
              />

              <SidebarButton
                active={activeView === "subjects"}
                label="Subjects"
                icon="menu_book"
                tone="yellow"
                collapsed={sidebarCollapsed}
                onClick={() => openView("subjects")}
              />

              <SidebarButton
                active={
                  activeView === "assessments" ||
                  activeView === "assessmentForm"
                }
                label="Assessments"
                icon="assignment"
                tone="green"
                collapsed={sidebarCollapsed}
                onClick={() => openView("assessments")}
              />

              <SidebarButton
                active={activeView === "records"}
                label="Records"
                icon="table_view"
                tone="red"
                collapsed={sidebarCollapsed}
                onClick={() => openView("records")}
              />

              <SidebarButton
                active={activeView === "aiInsights"}
                label="AI Insights"
                icon="auto_awesome"
                tone="blue"
                collapsed={sidebarCollapsed}
                onClick={() => openView("aiInsights")}
              />
            </div>
          </nav>

          <div
            className={`py-3 ${
              sidebarCollapsed ? "px-1.5" : "px-2.5"
            }`}
          >
            <SidebarButton
              label="Logout"
              icon="logout"
              tone="red"
              collapsed={sidebarCollapsed}
              onClick={handleLogout}
            />
          </div>
      </aside>

      <div
        className="min-h-screen pl-14"
      >
        <header
          className={`z-30 px-4 pt-4 sm:px-6 lg:px-8 ${
            activeView === "dashboard"
              ? "relative"
              : "sticky top-0 bg-[#F2F2F7]"
          }`}
        >
          {activeView === "dashboard" ? (
            <div className="ui-panel-enter relative h-56 overflow-hidden rounded-[28px] bg-[#1C1C1E] shadow-[0_16px_40px_rgba(60,60,67,0.16)] sm:h-64 lg:h-72">
              <img
                src="/hero.jpg"
                alt="Dashboard header"
                className="absolute inset-0 h-full w-full object-cover object-center"
                draggable="false"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/18 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

              <div className="absolute bottom-0 left-0 max-w-2xl p-6 text-white sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  EduLITE Teacher Workspace
                </p>

                <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Dashboard
                </h1>

                <p className="mt-2 text-sm leading-6 text-white/80 sm:text-base">
                  Student performance analytics, learning insights, and subject
                  assessments.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                className="absolute right-5 top-5 hidden rounded-full bg-white/24 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-xl transition hover:bg-white/34 sm:inline-flex"
              >
                {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </button>
            </div>
          ) : (
            <div className="ui-panel-enter flex min-h-20 items-center justify-between gap-4 rounded-[28px] border border-[#D1D1D6] bg-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-[#1C1C1E]">
                  {pageDetails.title}
                </h1>

                <p className="mt-1 truncate text-sm text-[#636366]">
                  {pageDetails.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                className="hidden rounded-full border border-[#D1D1D6] bg-[#F2F2F7] px-4 py-2 text-sm font-medium text-[#3A3A3C] transition hover:bg-[#007AFF] hover:text-white sm:inline-flex"
              >
                {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </button>
            </div>
          )}
        </header>

        <main
          className={`w-full p-4 sm:p-6 lg:p-8 ${
            activeView === "dashboard"
              ? "min-h-0 overflow-visible"
              : "space-y-6"
          }`}
        >
          {error && (
            <div className="rounded-[20px] bg-[#FF3B30]/10 p-4 text-[#D70015] shadow-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-[20px] bg-[#34C759]/12 p-4 text-[#248A3D] shadow-sm">
              {success}
            </div>
          )}

          {loading ? (
            <div className="rounded-[28px] border border-[#D1D1D6] bg-white p-12 text-center text-[#636366]">
              Loading EduLITE data...
            </div>
          ) : (
            <>
              {activeView === "dashboard" && (
                <DashboardView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  displayedAssessments={displayedAssessments}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  currentSectionLabel={currentSectionLabel}
                  currentSubjectLabel={currentSubjectLabel}
                  classAverage={classAverage}
                  assessedStudents={assessedStudents}
                  displayedStudents={displayedStudents}
                  passingRate={passingRate}
                  passingStudents={passingStudents}
                  atRiskStudents={atRiskStudents}
                  excellentStudents={excellentStudents}
                  verySatisfactoryStudents={verySatisfactoryStudents}
                  satisfactoryStudents={satisfactoryStudents}
                  highPotentialStudents={highPotentialStudents}
                  getPercentage={getPercentage}
                  onEditAssessment={handleEditAssessment}
                  handleDeleteAssessment={handleDeleteAssessment}
                  generateStudentRecommendation={generateStudentRecommendation}
                  generatingRecommendationKey={generatingRecommendationKey}
                  openView={openView}
                  handleRegisterStudent={handleRegisterStudent}
                  handleAddAssessment={handleAddAssessment}
                />
              )}

              {activeView === "students" && (
                <StudentsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  onAddStudent={handleRegisterStudent}
                  onEditStudent={handleEditStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onOpenRecords={(student) => {
                    setSelectedSection(student.section);
                    setSelectedSubject("ALL");
                    openView("records");
                  }}
                />
              )}

              {activeView === "records" && (
                <RecordsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  displayedAssessments={displayedAssessments}
                  studentAnalytics={studentAnalytics}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  currentSectionLabel={currentSectionLabel}
                  currentSubjectLabel={currentSubjectLabel}
                  scoreMap={scoreMap}
                  editingStudentId={editingStudentId}
                  editedScores={editedScores}
                  savingScores={savingScores}
                  getPerformanceStatus={getPerformanceStatus}
                  handleEditedScoreChange={handleEditedScoreChange}
                  startEditingScores={startEditingScores}
                  cancelEditingScores={cancelEditingScores}
                  saveStudentScores={saveStudentScores}
                  getStudentAssessments={getStudentAssessments}
                  onEditStudent={handleEditStudent}
                  handleDeleteStudent={handleDeleteStudent}
                  assessmentRecords={assessmentRecords}
                  expandedStudentId={expandedStudentId}
                  toggleStudentProfile={toggleStudentProfile}
                  studentInsightsById={studentInsightsById}
                  loadingStudentInsightsId={loadingStudentInsightsId}
                  studentInsightErrors={studentInsightErrors}
                  openSavedInsight={openSavedInsight}
                  reloadStudentInsights={loadStudentInsights}
                />
              )}

              {activeView === "sections" && (
                <SectionManagementView
                  sections={sections}
                  newSection={newSection}
                  setNewSection={setNewSection}
                  addingSection={addingSection}
                  handleAddSection={handleAddSection}
                  handleRemoveSection={handleRemoveSection}
                  openDashboardForSection={(sectionName) => {
                    setSelectedSection(sectionName);
                    openView("dashboard");
                  }}
                />
              )}

              {activeView === "subjects" && (
                <SubjectManagementView
                  subjects={subjects}
                  newSubject={newSubject}
                  setNewSubject={setNewSubject}
                  addingSubject={addingSubject}
                  openSubjectStudentPrompt={openSubjectStudentPrompt}
                  handleRenameSubject={handleRenameSubject}
                  handleRemoveSubject={handleRemoveSubject}
                  openDashboardForSubject={(subjectId) => {
                    setSelectedSubject(String(subjectId));
                    openView("dashboard");
                  }}
                />
              )}

              {activeView === "assessments" && (
                <AssessmentsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  displayedAssessments={displayedAssessments}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  currentSubjectLabel={currentSubjectLabel}
                  onAddAssessment={handleAddAssessment}
                  onEditAssessment={handleEditAssessment}
                  onDeleteAssessment={handleDeleteAssessment}
                />
              )}

              {activeView === "aiInsights" && (
                <AiInsightsView
                  students={students}
                  sections={sections}
                  subjects={subjects}
                  assessments={assessments}
                  selectedSection={selectedSection}
                  selectedSubject={selectedSubject}
                  setSelectedSection={setSelectedSection}
                  setSelectedSubject={setSelectedSubject}
                  currentSectionLabel={currentSectionLabel}
                  currentSubjectLabel={currentSubjectLabel}
                  atRiskStudents={atRiskStudents}
                  highPotentialStudents={highPotentialStudents}
                  generateStudentRecommendation={generateStudentRecommendation}
                  generatingRecommendationKey={generatingRecommendationKey}
                />
              )}

              {activeView === "studentForm" && (
                <StudentForm
                  embedded
                  studentId={studentFormId}
                  onCancel={handleStudentFormCancel}
                  onSaved={handleStudentFormSaved}
                />
              )}

              {activeView === "assessmentForm" && (
                <AssessmentForm
                  embedded
                  assessmentId={assessmentFormId}
                  onCancel={handleAssessmentFormCancel}
                  onSaved={handleAssessmentFormSaved}
                />
              )}
            </>
          )}
        </main>
      </div>

      {showSubjectStudentPrompt && (
        <SubjectEnrollmentModal
          subjectName={newSubject.trim()}
          students={students}
          filteredStudents={subjectPromptStudents}
          searchValue={subjectStudentSearch}
          setSearchValue={setSubjectStudentSearch}
          selectedIds={selectedSubjectStudentIds}
          setSelectedIds={setSelectedSubjectStudentIds}
          toggleStudent={toggleNewSubjectStudent}
          addingSubject={addingSubject}
          closeModal={closeSubjectStudentPrompt}
          createSubject={handleAddSubject}
        />
      )}

      {(aiRecommendation || aiRecommendationError) && (
        <AiRecommendationModal
          recommendation={aiRecommendation}
          error={aiRecommendationError}
          closeModal={closeAiRecommendation}
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
  onEditAssessment,
  handleDeleteAssessment,
  generateStudentRecommendation,
  generatingRecommendationKey,
  openView,
  handleRegisterStudent,
  handleAddAssessment,
}) {
  const nextStep =
    sections.length === 0
      ? {
          title: "Create your first section",
          description: "Sections are required before students can be registered.",
          action: () => openView("sections"),
          label: "Open Sections",
        }
      : subjects.length === 0
        ? {
            title: "Create your first subject",
            description: "Subjects are required when registering students.",
            action: () => openView("subjects"),
            label: "Open Subjects",
          }
        : students.length === 0
          ? {
              title: "Register your first student",
              description: "Add learners and assign their section and subjects.",
              action: handleRegisterStudent,
              label: "Register Student",
            }
          : assessments.length === 0
            ? {
                title: "Create your first assessment",
                description: "Record scores to unlock performance analytics.",
                action: handleAddAssessment,
                label: "Create Assessment",
              }
            : {
                title: "Review student performance",
                description: "Your workspace is ready. Review scores and learning needs.",
                action: () => openView("records"),
                label: "Open Records",
              };

  const distribution = [
    {
      label: "Excellent",
      count: excellentStudents.length,
      percentage: getPercentage(excellentStudents.length),
      color: "bg-[#34C759]",
    },
    {
      label: "Very Satisfactory",
      count: verySatisfactoryStudents.length,
      percentage: getPercentage(verySatisfactoryStudents.length),
      color: "bg-[#007AFF]",
    },
    {
      label: "Satisfactory",
      count: satisfactoryStudents.length,
      percentage: getPercentage(satisfactoryStudents.length),
      color: "bg-[#FFCC00]",
    },
    {
      label: "Needs Support",
      count: atRiskStudents.length,
      percentage: getPercentage(atRiskStudents.length),
      color: "bg-[#FF3B30]",
    },
  ];

  const recentAssessments = [...displayedAssessments]
    .sort((first, second) =>
      String(second.date).localeCompare(String(first.date)),
    )
    .slice(0, 3);

  return (
    <div className="dashboard-bento grid auto-rows-auto gap-3 lg:grid-flow-dense lg:grid-cols-12">
      <section className="rounded-[22px] bg-white/90 p-4 text-[#1C1C1E] shadow-[0_8px_24px_rgba(60,60,67,0.10)] backdrop-blur-xl lg:col-span-7">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#007AFF]">
              Recommended next step
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-[#1C1C1E]">
              {nextStep.title}
            </h2>
            <p className="truncate text-xs text-[#636366]">
              {nextStep.description}
            </p>
          </div>
          <button
            type="button"
            onClick={nextStep.action}
            className="shrink-0 rounded-full bg-[#007AFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0066D6]"
          >
            {nextStep.label}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 rounded-[22px] bg-white/90 p-3 text-[#1C1C1E] shadow-[0_8px_24px_rgba(60,60,67,0.08)] backdrop-blur-xl lg:col-span-5">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#636366]/75">
            Section
          </span>
          <select
            value={selectedSection}
            onChange={(event) => setSelectedSection(event.target.value)}
            className="bento-select w-full truncate rounded-[12px] border-0 bg-[#F2F2F7] px-3 py-2 text-xs text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25"
          >
            <option value="ALL">All Sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.name}>
                {section.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#636366]/75">
            Subject
          </span>
          <select
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
            className="bento-select w-full truncate rounded-[12px] border-0 bg-[#F2F2F7] px-3 py-2 text-xs text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={String(subject.id)}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid grid-cols-2 place-items-stretch gap-3 lg:col-span-5">
        <BentoMetric
          label="Class Average"
          value={`${classAverage.toFixed(1)}%`}
          detail={`${currentSectionLabel} · ${currentSubjectLabel}`}
          tone="yellow"
        />
        <BentoMetric
          label="Passing Rate"
          value={`${passingRate.toFixed(1)}%`}
          detail={`${passingStudents.length} passing`}
          tone="green"
        />
        <BentoMetric
          label="Assessed"
          value={assessedStudents.length}
          detail={`${displayedStudents.length} matching students`}
          tone="blue"
        />
        <BentoMetric
          label="At Risk"
          value={atRiskStudents.length}
          detail="Below 75% average"
          tone="red"
        />
      </section>

      <section className="flex min-h-0 flex-col rounded-[22px] bg-white/90 p-4 text-[#1C1C1E] shadow-[0_8px_24px_rgba(60,60,67,0.10)] backdrop-blur-xl lg:col-span-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#636366]/70">
              Performance
            </p>
            <h3 className="text-base font-bold text-[#1C1C1E]">Distribution</h3>
          </div>
          <span className="text-xs text-[#636366]/70">
            {assessedStudents.length} assessed
          </span>
        </div>
        <div className="mt-3 flex flex-1 flex-col justify-around gap-2">
          {distribution.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-[#1C1C1E]">{item.label}</span>
                <span className="text-[#636366]/70">
                  {item.count} · {item.percentage.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/10">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-[22px] bg-white/90 p-4 text-[#1C1C1E] shadow-[0_8px_24px_rgba(60,60,67,0.10)] backdrop-blur-xl lg:col-span-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#636366]/70">
              Setup
            </p>
            <h3 className="text-base font-bold text-[#1C1C1E]">Workspace</h3>
          </div>
          <button
            type="button"
            onClick={() => openView("records")}
            className="text-xs font-semibold text-[#1C1C1E] hover:underline"
          >
            Records
          </button>
        </div>
        <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
          <WorkflowStep label="Sections" value={sections.length} onClick={() => openView("sections")} compact />
          <WorkflowStep label="Subjects" value={subjects.length} onClick={() => openView("subjects")} compact />
          <WorkflowStep label="Students" value={students.length} onClick={() => openView("students")} compact />
          <WorkflowStep label="Assessments" value={assessments.length} onClick={() => openView("assessments")} compact />
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-[22px] bg-white/90 p-4 text-[#1C1C1E] shadow-[0_8px_24px_rgba(60,60,67,0.10)] backdrop-blur-xl lg:col-span-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#636366]/70">
              Learning support
            </p>
            <h3 className="text-base font-bold text-[#1C1C1E]">Priority Insights</h3>
          </div>
          <button
            type="button"
            onClick={() => openView("aiInsights")}
            className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-[#1C1C1E] hover:bg-black/10"
          >
            Open AI Insights
          </button>
        </div>
        <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <BentoInsight
            title="Needs Intervention"
            student={atRiskStudents[0]}
            type="risk"
            onGenerate={generateStudentRecommendation}
            generatingKey={generatingRecommendationKey}
          />
          <BentoInsight
            title="Ready for Enrichment"
            student={highPotentialStudents[0]}
            type="potential"
            onGenerate={generateStudentRecommendation}
            generatingKey={generatingRecommendationKey}
          />
        </div>
      </section>

      <section className="flex min-h-0 flex-col rounded-[22px] bg-white/90 p-4 text-[#1C1C1E] shadow-[0_8px_24px_rgba(60,60,67,0.10)] backdrop-blur-xl lg:col-span-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#636366]/70">
              Latest activity
            </p>
            <h3 className="text-base font-bold text-[#1C1C1E]">Assessments</h3>
          </div>
          <button
            type="button"
            onClick={handleAddAssessment}
            className="text-xs font-semibold text-[#1C1C1E] hover:underline"
          >
            + Create
          </button>
        </div>
        <div className="mt-2 min-h-0 flex-1 space-y-1.5">
          {recentAssessments.map((assessment) => (
            <div
              key={assessment.id}
              className="flex items-center gap-2 rounded-[13px] bg-[#F2F2F7] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#1C1C1E]">
                  {assessment.name}
                </p>
                <p className="truncate text-[10px] text-[#636366]/70">
                  {assessment.subject_name} · {assessment.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditAssessment(assessment.id)}
                className="text-[11px] font-semibold text-[#1C1C1E] hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAssessment(assessment.id)}
                className="text-[11px] font-semibold text-[#636366]/75 hover:text-[#1C1C1E] hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
          {recentAssessments.length === 0 && (
            <div className="flex h-full items-center justify-center rounded-[14px] bg-[#F2F2F7] text-center text-xs text-[#636366]/70">
              No assessments yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function WorkflowStep({ label, value, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-[14px] border-0 bg-[#F2F2F7] text-left text-[#1C1C1E] transition hover:bg-[#E5E5EA] ${
        compact ? "p-2.5" : "p-4"
      }`}
    >
      <span className={`block font-medium text-[#636366]/75 ${compact ? "text-[11px]" : "mt-1 text-sm"}`}>
        {label}
      </span>
      <span className={`block shrink-0 font-bold text-[#1C1C1E] ${compact ? "text-lg" : "text-2xl"}`}>{value}</span>
    </button>
  );
}

function BentoMetric({ label, value, detail, tone = "blue" }) {
  const tones = {
    blue: "bg-[#007AFF]/10 text-[#007AFF]",
    red: "bg-[#FF3B30]/10 text-[#D70015]",
    green: "bg-[#34C759]/12 text-[#248A3D]",
    yellow: "bg-[#FF9500]/12 text-[#8A5A00]",
  };

  return (
    <div
      className={`relative flex min-h-[108px] w-full flex-col justify-between overflow-hidden rounded-[20px] p-4 shadow-sm ${
        tones[tone] ?? tones.blue
      }`}
    >
      <p className="text-[11px] font-semibold text-[#636366]/75">{label}</p>
      <p className="my-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="truncate text-[10px] text-[#636366]/70">{detail}</p>
    </div>
  );
}

function BentoInsight({
  title,
  student,
  type,
  onGenerate,
  generatingKey,
}) {
  const isRisk = type === "risk";
  const supportType = isRisk ? "intervention" : "enrichment";
  const requestKey = student ? `${supportType}-${student.id}` : "";
  const isGenerating = generatingKey === requestKey;

  return (
    <div
      className={`relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[16px] p-3 text-[#1C1C1E] shadow-sm ${
        isRisk ? "bg-[#FF3B30]/10" : "bg-[#34C759]/12"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#636366]/75">
          {title}
        </p>
        {student ? (
          <>
            <p className="mt-1 truncate text-sm font-bold text-[#1C1C1E]">
              {student.name}
            </p>
            <p className="text-[10px] text-[#636366]/70">
              {student.section} · {student.averagePercentage.toFixed(1)}%
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-[#636366]/70">
            No student identified.
          </p>
        )}
      </div>
      {student && (
        <button
          type="button"
          onClick={() => onGenerate(student, supportType)}
          disabled={Boolean(generatingKey)}
          className={`mt-2 rounded-full px-3 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
            isRisk
              ? "bg-[#FF3B30] hover:bg-[#D70015]"
              : "bg-[#34C759] hover:bg-[#248A3D]"
          }`}
        >
          {isGenerating
            ? "Generating..."
            : isRisk
              ? "Generate Intervention"
              : "Generate Enrichment"}
        </button>
      )}
    </div>
  );
}

function StudentsView({
  students,
  sections,
  subjects,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onOpenRecords,
}) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("ALL");

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSection =
        sectionFilter === "ALL" || student.section === sectionFilter;
      const matchesSearch =
        !query ||
        `${student.name} ${student.grade} ${student.section} ${
          student.subjects?.map((subject) => subject.name).join(" ") || ""
        }`
          .toLowerCase()
          .includes(query);

      return matchesSection && matchesSearch;
    });
  }, [students, search, sectionFilter]);

  return (
    <>
      <section className="rounded-[28px] border-2 border-[#1A2CA3] bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0051D5]">
              Student Directory
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#1C1C1E]">
              {students.length} registered student
              {students.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-sm text-[#636366]">
              Search, register, edit, and open student assessment records.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddStudent}
            className="rounded-full bg-[#007AFF] px-5 py-3 font-semibold text-white hover:bg-[#0066D6]"
          >
            + Register Student
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_240px]">
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#636366]">
              Search students
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, grade, section, or subject"
              className="w-full rounded-[16px] border border-[#D1D1D6] px-4 py-3 focus:border-[#007AFF] focus:outline-none focus:ring-4 focus:ring-[#007AFF]/15"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#636366]">
              Section
            </span>
            <select
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              className="w-full rounded-[16px] border border-[#D1D1D6] bg-white px-4 py-3 focus:border-[#007AFF] focus:outline-none"
            >
              <option value="ALL">All Sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.name}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="border-b border-[#E5E5EA] bg-[#F2F2F7]">
              <tr>
                <TableHeading>Student</TableHeading>
                <TableHeading>Grade</TableHeading>
                <TableHeading>Section</TableHeading>
                <TableHeading>Subjects</TableHeading>
                <TableHeading align="right">Actions</TableHeading>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-[#F2F2F7]">
                  <td className="px-6 py-4 font-semibold text-[#1C1C1E]">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 text-[#636366]">{student.grade}</td>
                  <td className="px-6 py-4 text-[#636366]">
                    {student.section}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex max-w-md flex-wrap gap-1.5">
                      {student.subjects?.map((subject) => (
                        <span
                          key={subject.id}
                          className="rounded-full border border-[#007AFF] px-2.5 py-1 text-xs font-medium text-[#0051D5]"
                        >
                          {subject.name}
                        </span>
                      ))}
                      {!student.subjects?.length && (
                        <span className="text-sm text-[#8E8E93]">
                          No subjects assigned
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenRecords(student)}
                      className="mr-2 rounded-full px-3.5 py-2 font-medium text-[#248A3D] hover:bg-[#34C759] hover:text-white"
                    >
                      Records
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditStudent(student.id)}
                      className="mr-2 rounded-full px-3.5 py-2 font-medium text-[#0051D5] hover:bg-[#007AFF] hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteStudent(student.id)}
                      className="rounded-full px-3.5 py-2 font-medium text-[#D70015] hover:bg-[#FF3B30] hover:text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#636366]">
                    {students.length === 0
                      ? "No students registered yet."
                      : "No students match the current search and section filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {subjects.length === 0 && students.length > 0 && (
        <p className="rounded-[18px] border border-[#FFCC00] bg-white p-4 text-sm text-[#8A5A00]">
          Create at least one subject to complete student enrollment.
        </p>
      )}
    </>
  );
}

function AssessmentsView({
  students,
  sections,
  subjects,
  assessments,
  displayedAssessments,
  selectedSection,
  selectedSubject,
  setSelectedSection,
  setSelectedSubject,
  currentSubjectLabel,
  onAddAssessment,
  onEditAssessment,
  onDeleteAssessment,
}) {
  return (
    <>
      <section className="rounded-[28px] border-2 border-[#1A2CA3] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#248A3D]">
              Assessment Workflow
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#1C1C1E]">
              Assessment Library
            </h2>
            <p className="mt-1 text-sm text-[#636366]">
              Create an assessment, enter scores, then review results in Records.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddAssessment}
            className="rounded-full bg-[#34C759] px-5 py-3 font-semibold text-white hover:bg-[#248A3D]"
          >
            + Create Assessment
          </button>
        </div>
      </section>

      <DashboardFilters
        title="Assessment Filters"
        description="Filter the assessment library by subject."
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
      />

      <AssessmentList
        displayedAssessments={displayedAssessments}
        currentSubjectLabel={currentSubjectLabel}
        onEditAssessment={onEditAssessment}
        handleDeleteAssessment={onDeleteAssessment}
      />
    </>
  );
}

function AiInsightsView({
  students,
  sections,
  subjects,
  assessments,
  selectedSection,
  selectedSubject,
  setSelectedSection,
  setSelectedSubject,
  currentSectionLabel,
  currentSubjectLabel,
  atRiskStudents,
  highPotentialStudents,
  generateStudentRecommendation,
  generatingRecommendationKey,
}) {
  return (
    <>
      <DashboardFilters
        title="Insight Filters"
        description="Select the evidence set used for learning-support recommendations."
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
      />

      <section className="rounded-[28px] border-2 border-[#1A2CA3] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0051D5]">
          Evidence scope
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#1C1C1E]">
          {currentSubjectLabel} · {currentSectionLabel}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#636366]">
          Recommendations use the selected subject, the student's recorded
          assessments, and their calculated performance classification.
        </p>
      </section>

      <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <InsightList
          title="Students Needing Intervention"
          students={atRiskStudents}
          type="risk"
          onGenerateRecommendation={generateStudentRecommendation}
          generatingRecommendationKey={generatingRecommendationKey}
        />
        <InsightList
          title="Students Ready for Enrichment"
          students={highPotentialStudents}
          type="potential"
          onGenerateRecommendation={generateStudentRecommendation}
          generatingRecommendationKey={generatingRecommendationKey}
        />
      </section>
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
  onEditStudent,
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
  const totalColumns = displayedAssessments.length + 7;

  return (
    <>
      <DashboardFilters
        title="Record Filters"
        description="Choose a section and subject to narrow the student assessment records."
        students={students}
        sections={sections}
        subjects={subjects}
        assessments={assessments}
        selectedSection={selectedSection}
        selectedSubject={selectedSubject}
        setSelectedSection={setSelectedSection}
        setSelectedSubject={setSelectedSubject}
      />

      <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
        <div className="border-b border-[#E5E5EA] px-6 py-5">
          <h2 className="text-xl font-bold text-[#1C1C1E]">
            Student Assessment Records - {currentSubjectLabel} -{" "}
            {currentSectionLabel}
          </h2>

          <p className="mt-1 text-sm text-[#636366]">
            Click a student's name to expand their complete profile, assessment
            history, and saved Gemini learning insights.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="border-b border-[#E5E5EA] bg-[#F2F2F7]">
              <tr>
                <TableHeading>Student</TableHeading>
                <TableHeading>Grade</TableHeading>
                <TableHeading>Section</TableHeading>
                <TableHeading>Subjects</TableHeading>

                {displayedAssessments.map((assessment) => (
                  <th
                    key={assessment.id}
                    className="min-w-[175px] px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-[#636366]"
                  >
                    <div>{assessment.name}</div>

                    <div className="mt-1 font-normal normal-case text-[#8E8E93]">
                      {assessment.subject_name} - {assessment.type} -{" "}
                      {assessment.total_items} items
                    </div>
                  </th>
                ))}

                <TableHeading>Average</TableHeading>
                <TableHeading>Performance</TableHeading>
                <TableHeading align="right">Actions</TableHeading>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E5E5EA]">
              {studentAnalytics.map((student) => {
                const status = getPerformanceStatus(student.averagePercentage);
                const isEditing = editingStudentId === student.id;
                const isExpanded = expandedStudentId === student.id;

                const studentRecords = assessments
                  .filter((assessment) =>
                    student.subject_ids?.includes(assessment.subject_id),
                  )
                  .map((assessment) => {
                    const record = assessmentRecords.find(
                      (item) =>
                        item.student_id === student.id &&
                        item.assessment_id === assessment.id,
                    );

                    return {
                      id:
                        record?.id ?? `missing-${student.id}-${assessment.id}`,
                      student_id: student.id,
                      assessment_id: assessment.id,
                      assessment_name: assessment.name,
                      subject_id: assessment.subject_id,
                      subject_name: assessment.subject_name,
                      type: assessment.type,
                      date: assessment.date,
                      total_items: assessment.total_items,
                      score: record?.score ?? null,
                    };
                  })
                  .sort((first, second) => {
                    const dateComparison = String(second.date).localeCompare(
                      String(first.date),
                    );

                    return (
                      dateComparison ||
                      String(first.assessment_name).localeCompare(
                        String(second.assessment_name),
                      )
                    );
                  });

                const savedInsights = studentInsightsById[student.id] ?? [];
                const isLoadingInsights =
                  loadingStudentInsightsId === student.id;
                const insightError = studentInsightErrors[student.id] || "";

                return (
                  <Fragment key={student.id}>
                    <tr
                      className={
                        isEditing
                          ? "bg-[#F2F2F7]"
                          : isExpanded
                            ? "bg-[#F2F2F7]"
                            : "hover:bg-[#F2F2F7]"
                      }
                    >
                      <td className="px-5 py-4 font-medium text-[#1C1C1E]">
                        <button
                          type="button"
                          onClick={() => toggleStudentProfile(student)}
                          className="group text-left"
                          aria-expanded={isExpanded}
                        >
                          <span className="block font-semibold text-[#0051D5] group-hover:text-[#007AFF] group-hover:underline">
                            {student.name}
                          </span>

                          <span className="mt-1 block text-xs font-normal text-[#636366]">
                            {isExpanded
                              ? "Hide profile"
                              : "View profile and saved insights"}
                          </span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-[#636366]">
                        {student.grade}
                      </td>

                      <td className="px-5 py-4 text-[#636366]">
                        {student.section}
                      </td>

                      <td className="min-w-[220px] px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {student.subjects?.map((subject) => (
                            <span
                              key={subject.id}
                              className="rounded-full border border-[#007AFF] bg-white px-2.5 py-1 text-xs font-medium text-[#0051D5]"
                            >
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {displayedAssessments.map((assessment) => {
                        const isEnrolled = student.subject_ids?.includes(
                          assessment.subject_id,
                        );

                        const score = scoreMap[student.id]?.[assessment.id];
                        const hasScore = score !== undefined && score !== null;

                        const percentage =
                          hasScore && Number(assessment.total_items) > 0
                            ? (Number(score) / Number(assessment.total_items)) *
                              100
                            : null;

                        return (
                          <td
                            key={assessment.id}
                            className="px-5 py-4 text-center"
                          >
                            {!isEnrolled ? (
                              <span className="text-xs text-[#8E8E93]">
                                Not enrolled
                              </span>
                            ) : isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={assessment.total_items}
                                  step="1"
                                  value={editedScores[assessment.id] ?? ""}
                                  onChange={(event) =>
                                    handleEditedScoreChange(
                                      assessment.id,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="-"
                                  disabled={savingScores}
                                  className="w-20 rounded-[12px] border border-[#D1D1D6] bg-white px-2 py-2 text-center text-[#1C1C1E] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 disabled:bg-[#E5E5EA]"
                                />

                                <span className="text-sm text-[#636366]">
                                  / {assessment.total_items}
                                </span>
                              </div>
                            ) : hasScore ? (
                              <>
                                <div className="font-semibold text-[#1C1C1E]">
                                  {score} / {assessment.total_items}
                                </div>

                                <div className="mt-1 text-xs text-[#636366]">
                                  {percentage.toFixed(1)}%
                                </div>
                              </>
                            ) : (
                              <span className="text-[#8E8E93]">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-5 py-4 font-bold text-[#1C1C1E]">
                        {student.averagePercentage === null
                          ? "-"
                          : `${student.averagePercentage.toFixed(1)}%`}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveStudentScores(student)}
                              disabled={savingScores}
                              className="mr-2 rounded-full bg-[#007AFF] px-3.5 py-2 font-medium text-white hover:bg-[#0066D6] disabled:cursor-not-allowed disabled:bg-[#D1D1D6] disabled:text-[#8E8E93]"
                            >
                              {savingScores ? "Saving..." : "Save Scores"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditingScores}
                              disabled={savingScores}
                              className="rounded-full bg-[#E5E5EA] px-3.5 py-2 font-medium text-[#3A3A3C] hover:bg-[#E5E5EA] disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditStudent(student.id)}
                              className="mr-2 rounded-full bg-white px-3.5 py-2 font-medium text-[#0051D5] hover:bg-[#007AFF] hover:text-white"
                            >
                              Edit Info
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditingScores(student)}
                              disabled={
                                getStudentAssessments(student).length === 0
                              }
                              className="mr-2 rounded-full bg-white px-3.5 py-2 font-medium text-[#8A5A00] hover:bg-[#FFCC00] hover:text-[#1C1C1E] disabled:cursor-not-allowed disabled:bg-[#E5E5EA] disabled:text-[#8E8E93]"
                            >
                              Edit Scores
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="rounded-full bg-white px-3.5 py-2 font-medium text-[#D70015] hover:bg-[#FF3B30] hover:text-white"
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
                          colSpan={totalColumns}
                          className="bg-[#E5E5EA]/70 px-4 py-5 sm:px-6"
                        >
                          <StudentExpandedProfile
                            student={student}
                            status={status}
                            assessmentRecords={studentRecords}
                            savedInsights={savedInsights}
                            loadingInsights={isLoadingInsights}
                            insightError={insightError}
                            openSavedInsight={openSavedInsight}
                            reloadInsights={() =>
                              reloadStudentInsights(student.id, true)
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {studentAnalytics.length === 0 && (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className="px-6 py-12 text-center text-[#636366]"
                  >
                    No students found for {currentSubjectLabel} and{" "}
                    {currentSectionLabel}.
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
  const scoredRecords = assessmentRecords.filter(
    (record) =>
      record.score !== null &&
      record.score !== undefined &&
      Number(record.total_items) > 0,
  );

  const overallAverage =
    scoredRecords.length > 0
      ? scoredRecords.reduce(
          (total, record) =>
            total + (Number(record.score) / Number(record.total_items)) * 100,
          0,
        ) / scoredRecords.length
      : null;

  return (
    <div className="rounded-[28px] border border-[#D1D1D6] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3A3A3C]">
            Student Profile
          </p>

          <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#1C1C1E]">
            {student.name}
          </h3>

          <p className="mt-1 text-sm text-[#636366]">
            Grade {student.grade} - {student.section}
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
          value={student.subject_names?.length ?? 0}
          tone="yellow"
        />

        <ProfileMetric
          label="Recorded assessments"
          value={scoredRecords.length}
          tone="blue"
        />

        <ProfileMetric
          label="Overall average"
          value={
            overallAverage === null
              ? "Not assessed"
              : `${overallAverage.toFixed(1)}%`
          }
          tone="green"
        />

        <ProfileMetric
          label="Saved AI insights"
          value={savedInsights.length}
          tone="red"
        />
      </div>

      <div className="mt-6">
        <h4 className="text-base font-bold text-[#1C1C1E]">
          Enrolled Subjects
        </h4>

        <div className="mt-3 flex flex-wrap gap-2">
          {student.subject_names?.map((subjectName) => (
            <span
              key={subjectName}
              className="rounded-full border border-[#007AFF] bg-white px-3 py-1 text-sm font-medium text-[#0051D5]"
            >
              {subjectName}
            </span>
          ))}

          {!student.subject_names?.length && (
            <span className="text-sm text-[#636366]">
              No enrolled subjects found.
            </span>
          )}
        </div>
      </div>

      <div className="mt-7">
        <div className="mb-3">
          <h4 className="text-base font-bold text-[#1C1C1E]">
            Complete Assessment History
          </h4>

          <p className="mt-1 text-sm text-[#636366]">
            All saved scores for this student, regardless of the current record
            filters.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E5E5EA]">
          <table className="w-full min-w-[760px]">
            <thead className="bg-[#F2F2F7]">
              <tr>
                <TableHeading>Assessment</TableHeading>
                <TableHeading>Subject</TableHeading>
                <TableHeading>Type</TableHeading>
                <TableHeading>Date</TableHeading>
                <TableHeading>Score</TableHeading>
                <TableHeading>Percentage</TableHeading>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E5E5EA]">
              {assessmentRecords.map((record) => {
                const hasScore =
                  record.score !== null && record.score !== undefined;

                const percentage =
                  hasScore && Number(record.total_items) > 0
                    ? (Number(record.score) / Number(record.total_items)) * 100
                    : null;

                return (
                  <tr key={`${record.assessment_id}-${record.id}`}>
                    <td className="px-6 py-4 font-medium text-[#1C1C1E]">
                      {record.assessment_name}
                    </td>

                    <td className="px-6 py-4 text-[#636366]">
                      {record.subject_name}
                    </td>

                    <td className="px-6 py-4 text-[#636366]">
                      {record.type}
                    </td>

                    <td className="px-6 py-4 text-[#636366]">
                      {record.date}
                    </td>

                    <td className="px-6 py-4 text-[#3A3A3C]">
                      {hasScore
                        ? `${record.score} / ${record.total_items}`
                        : "Missing"}
                    </td>

                    <td className="px-6 py-4 font-semibold text-[#1C1C1E]">
                      {percentage === null ? "-" : `${percentage.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}

              {assessmentRecords.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-[#636366]"
                  >
                    No assessment records have been saved for this student.
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
            <h4 className="text-base font-bold text-[#1C1C1E]">
              Saved Gemini Learning Insights
            </h4>

            <p className="mt-1 text-sm text-[#636366]">
              Every generated intervention or enrichment plan is stored in the
              database with a downloadable PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={reloadInsights}
            disabled={loadingInsights}
            className="rounded-full border border-[#D1D1D6] bg-white px-4 py-2 text-sm font-medium text-[#3A3A3C] hover:bg-[#007AFF] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingInsights ? "Refreshing..." : "Refresh insights"}
          </button>
        </div>

        {insightError && (
          <div className="mt-4 rounded-[18px] border border-[#FF3B30] bg-white p-4 text-sm text-[#D70015]">
            {insightError}
          </div>
        )}

        {loadingInsights && savedInsights.length === 0 ? (
          <div className="mt-4 rounded-[18px] border border-[#E5E5EA] bg-white p-6 text-center text-[#636366]">
            Loading saved insights...
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {savedInsights.map((insight) => (
              <article
                key={insight.id}
                className="rounded-[20px] border border-[#E5E5EA] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        insight.supportType === "intervention"
                          ? "bg-[#FF3B30] text-white"
                          : "bg-[#34C759] text-white"
                      }`}
                    >
                      {insight.supportType === "intervention"
                        ? "Intervention"
                        : "Enrichment"}
                    </span>

                    <h5 className="mt-2 font-bold text-[#1C1C1E]">
                      {insight.title}
                    </h5>
                  </div>

                  <span className="text-xs text-[#8E8E93]">#{insight.id}</span>
                </div>

                <dl className="mt-3 space-y-1 text-sm text-[#636366]">
                  <div>
                    <dt className="inline font-semibold text-[#3A3A3C]">
                      Focus:{" "}
                    </dt>
                    <dd className="inline">{insight.focusLabel}</dd>
                  </div>

                  <div>
                    <dt className="inline font-semibold text-[#3A3A3C]">
                      Classification:{" "}
                    </dt>
                    <dd className="inline">{insight.classification}</dd>
                  </div>

                  <div>
                    <dt className="inline font-semibold text-[#3A3A3C]">
                      Saved:{" "}
                    </dt>
                    <dd className="inline">
                      {formatSavedDate(insight.createdAt)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openSavedInsight(insight)}
                    className="rounded-full bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0066D6]"
                  >
                    View insight
                  </button>

                  <a
                    href={`${API_URL}${insight.pdfUrl}`}
                    className="rounded-full border border-[#D1D1D6] bg-white px-4 py-2 text-sm font-semibold text-[#3A3A3C] hover:bg-[#F2F2F7]"
                  >
                    Download PDF
                  </a>
                </div>
              </article>
            ))}

            {savedInsights.length === 0 && !insightError && (
              <div className="rounded-[20px] border border-dashed border-[#D1D1D6] bg-[#F2F2F7] p-8 text-center text-[#636366] xl:col-span-2">
                No Gemini insights have been generated for this student yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileMetric({ label, value, tone = "blue" }) {
  const tones = {
    blue: "border-[#007AFF] bg-[#007AFF] text-white",
    red: "border-[#FF3B30] bg-[#FF3B30] text-white",
    green: "border-[#34C759] bg-[#34C759] text-white",
    yellow: "border-[#FFCC00] bg-[#FFCC00] text-[#1C1C1E]",
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <div className={`rounded-[20px] border p-4 ${selectedTone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
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
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-4 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A5A00]">
            Classroom Setup
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#1C1C1E]">
            Section Management
          </h2>

          <p className="mt-1 text-sm text-[#636366]">
            Add sections before registering students, then manage existing
            section records below.
          </p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFCC00] text-xl font-bold text-[#1C1C1E]">
          S
        </span>
      </div>

      <div className="p-6">
        <form
          onSubmit={handleAddSection}
          className="flex flex-col gap-3 rounded-[40px] border border-[#D1D1D6] bg-[#F2F2F7] p-4 sm:flex-row"
        >
          <input
            type="text"
            value={newSection}
            onChange={(event) => setNewSection(event.target.value)}
            placeholder="Enter section name"
            className="flex-1 rounded-full border border-[#D1D1D6] bg-white px-5 py-3 text-[#1C1C1E] placeholder-[#8E8E93] focus:border-[#34C759] focus:outline-none focus:ring-4 focus:ring-[#34C759]/20"
          />

          <button
            type="submit"
            disabled={addingSection || !newSection.trim()}
            className="rounded-full bg-[#34C759] px-6 py-3 font-medium text-white transition hover:bg-[#248A3D] disabled:cursor-not-allowed disabled:bg-[#D1D1D6] disabled:text-[#8E8E93]"
          >
            {addingSection ? "Adding..." : "+ Add Section"}
          </button>
        </form>

        <div className="mt-6 overflow-hidden rounded-[22px] border border-[#E5E5EA]">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[#E5E5EA] bg-[#F2F2F7] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#636366]">
            <span>Section</span>
            <span>Students</span>
            <span>Action</span>
          </div>

          <div className="divide-y divide-[#E5E5EA]">
            {sections.map((section) => (
              <div
                key={section.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-4 transition hover:bg-[#F2F2F7]"
              >
                <button
                  type="button"
                  onClick={() => openDashboardForSection(section.name)}
                  className="text-left font-semibold text-[#1C1C1E] hover:text-[#8A5A00]"
                >
                  {section.name}
                </button>

                <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-[#8A5A00]">
                  {section.student_count}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveSection(section)}
                  className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#D70015] hover:bg-[#FF3B30] hover:text-white"
                >
                  Remove
                </button>
              </div>
            ))}

            {sections.length === 0 && (
              <div className="px-6 py-12 text-center text-[#636366]">
                No sections have been added.
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
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-4 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#248A3D]">
            Learning Areas
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#1C1C1E]">
            Subject Management
          </h2>

          <p className="mt-1 text-sm text-[#636366]">
            Create a subject, choose its enrolled students, and manage existing
            subjects.
          </p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#34C759] text-xl font-bold text-white">
          B
        </span>
      </div>

      <div className="p-6">
        <form
          onSubmit={openSubjectStudentPrompt}
          className="flex flex-col gap-3 rounded-[40px] border border-[#D1D1D6] bg-[#F2F2F7] p-4 sm:flex-row"
        >
          <input
            type="text"
            value={newSubject}
            onChange={(event) => setNewSubject(event.target.value)}
            placeholder="Enter subject name"
            className="flex-1 rounded-full border border-[#D1D1D6] bg-white px-5 py-3 text-[#1C1C1E] placeholder-[#8E8E93] focus:border-[#007AFF] focus:outline-none focus:ring-4 focus:ring-[#007AFF]/20"
          />

          <button
            type="submit"
            disabled={addingSubject || !newSubject.trim()}
            className="rounded-full bg-[#007AFF] px-6 py-3 font-medium text-white transition hover:bg-[#0066D6] disabled:cursor-not-allowed disabled:bg-[#D1D1D6] disabled:text-[#8E8E93]"
          >
            Choose Students
          </button>
        </form>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {subjects.map((subject, index) => {
            const tone =
              index % 3 === 0
                ? "border-[#FFCC00] bg-white"
                : index % 3 === 1
                  ? "border-[#34C759] bg-white"
                  : "border-[#FF3B30] bg-white";

            return (
              <div
                key={subject.id}
                className={`flex flex-col gap-4 rounded-[22px] border px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${tone}`}
              >
                <button
                  type="button"
                  onClick={() => openDashboardForSubject(subject.id)}
                  className="text-left"
                >
                  <span className="block font-semibold text-[#1C1C1E] hover:underline">
                    {subject.name}
                  </span>

                  <span className="mt-1 block text-sm text-[#636366]">
                    {subject.student_count} students ·{" "}
                    {subject.assessment_count} assessments
                  </span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRenameSubject(subject)}
                    className="rounded-full border border-[#007AFF] bg-white px-3.5 py-2 font-medium text-[#0051D5] hover:bg-[#007AFF] hover:text-white"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(subject)}
                    className="rounded-full bg-[#FF3B30] px-3.5 py-2 font-medium text-white hover:bg-[#D70015]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-[#D1D1D6] bg-[#F2F2F7] px-6 py-12 text-center text-[#636366] lg:col-span-2">
              No subjects have been added.
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
    <section className="rounded-[28px] border-2 border-[#1A2CA3] bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#007AFF] font-bold text-white">
          F
        </span>

        <div>
          <h2 className="text-sm font-semibold text-[#1C1C1E]">{title}</h2>

          <p className="text-xs text-[#636366]">
            Choose a section and subject to update the view.
          </p>

          <p className="sr-only">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-[20px] border border-[#D1D1D6] bg-[#E5E5EA] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A5A00]">
            Section
          </p>

          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={selectedSection === "ALL"}
              label="All"
              title={`${students.length} students`}
              onClick={() => setSelectedSection("ALL")}
              tone="yellow"
            />

            {sections.map((section) => (
              <FilterPill
                key={section.id}
                active={selectedSection === section.name}
                label={section.name}
                title={`${section.student_count} students`}
                onClick={() => setSelectedSection(section.name)}
                tone="yellow"
              />
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[20px] border border-[#D1D1D6] bg-[#E5E5EA] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#248A3D]">
            Subject
          </p>

          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={selectedSubject === "ALL"}
              label="All"
              title={`${assessments.length} assessments`}
              onClick={() => setSelectedSubject("ALL")}
              tone="green"
            />

            {subjects.map((subject) => (
              <FilterPill
                key={subject.id}
                active={String(selectedSubject) === String(subject.id)}
                label={subject.name}
                title={`${subject.student_count} students, ${subject.assessment_count} assessments`}
                onClick={() => setSelectedSubject(String(subject.id))}
                tone="green"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterPill({ active, label, title, tone = "blue", onClick }) {
  const tones = {
    blue: {
      active: "border-[#007AFF] bg-[#007AFF] text-white",
      inactive:
        "border-[#D1D1D6] bg-white text-[#0051D5] hover:border-[#007AFF]",
      check: "bg-[#007AFF] text-white",
    },
    green: {
      active: "border-[#34C759] bg-[#34C759] text-white",
      inactive:
        "border-[#D1D1D6] bg-white text-[#248A3D] hover:border-[#34C759]",
      check: "bg-[#34C759] text-white",
    },
    yellow: {
      active: "border-[#FF9500] bg-[#FFCC00] text-[#3A3A3C]",
      inactive:
        "border-[#D1D1D6] bg-white text-[#8A5A00] hover:border-[#FFCC00]",
      check: "bg-[#FFCC00] text-[#1C1C1E]",
    },
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-4 focus:ring-[#007AFF]/20 ${
        active ? selectedTone.active : selectedTone.inactive
      }`}
    >
      {active && (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${selectedTone.check}`}
        >
          ✓
        </span>
      )}

      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function AssessmentList({
  displayedAssessments,
  currentSubjectLabel,
  onEditAssessment,
  handleDeleteAssessment,
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border-2 border-[#1A2CA3] bg-white">
      <div className="flex flex-col gap-3 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0051D5]">
            Assessment Library
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#1C1C1E]">
            Assessments — {currentSubjectLabel}
          </h2>

          <p className="mt-1 text-sm text-[#636366]">
            {displayedAssessments.length} assessment
            {displayedAssessments.length === 1 ? "" : "s"}
          </p>
        </div>

        <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#007AFF] text-xl font-bold text-white">
          A
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px]">
          <thead className="border-b border-[#E5E5EA] bg-[#F2F2F7]">
            <tr>
              <TableHeading>Assessment</TableHeading>
              <TableHeading>Subject</TableHeading>
              <TableHeading>Type</TableHeading>
              <TableHeading>Date</TableHeading>
              <TableHeading>Total Items</TableHeading>
              <TableHeading align="right">Actions</TableHeading>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E5E5EA]">
            {displayedAssessments.map((assessment) => (
              <tr key={assessment.id} className="transition hover:bg-[#F2F2F7]">
                <td className="px-6 py-4 font-medium text-[#1C1C1E]">
                  {assessment.name}
                </td>

                <td className="px-6 py-4 text-[#636366]">
                  <span className="rounded-full border border-[#34C759] bg-white px-3 py-1 text-sm font-medium text-[#248A3D]">
                    {assessment.subject_name}
                  </span>
                </td>

                <td className="px-6 py-4 text-[#636366]">
                  {assessment.type}
                </td>

                <td className="px-6 py-4 text-[#636366]">
                  {assessment.date}
                </td>

                <td className="px-6 py-4 text-[#636366]">
                  {assessment.total_items}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onEditAssessment(assessment.id)}
                    className="mr-2 rounded-full bg-white px-3.5 py-2 font-medium text-[#0051D5] hover:bg-[#007AFF] hover:text-white"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAssessment(assessment.id)}
                    className="rounded-full bg-white px-3.5 py-2 font-medium text-[#D70015] hover:bg-[#FF3B30] hover:text-white"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {displayedAssessments.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-12 text-center text-[#636366]"
                >
                  No assessments have been added for this subject.
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1C1C1E]/55 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-[30px] border border-[#E5E5EA] bg-white">
        <div className="flex items-start justify-between gap-4 bg-[#FF9500]/12 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8A5A00]">
              New Subject Enrollment
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1C1C1E]">
              {subjectName}
            </h2>

            <p className="mt-1 text-sm text-[#636366]">
              Select every student who is enrolled in this subject.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={addingSubject}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl leading-none text-[#636366] hover:bg-[#F2F2F7] hover:text-[#1C1C1E] disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 border-b border-[#E5E5EA] px-6 py-4">
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search students by name, grade, or section"
            className="w-full rounded-full border border-[#D1D1D6] bg-[#F2F2F7] px-5 py-3 text-[#1C1C1E] placeholder-[#8E8E93] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#007AFF]/20"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#636366]">
              {selectedIds.length} of {students.length} students selected
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(students.map((student) => student.id))
                }
                disabled={students.length === 0 || addingSubject}
                className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#248A3D] hover:bg-[#34C759] hover:text-white disabled:opacity-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0 || addingSubject}
                className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#D70015] hover:bg-[#FF3B30] hover:text-white disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredStudents.map((student) => (
              <label
                key={student.id}
                className={`flex cursor-pointer items-start gap-3 rounded-[20px] border px-4 py-3 transition ${
                  selectedIds.includes(student.id)
                    ? "border-2 border-[#007AFF] bg-white"
                    : "border-[#E5E5EA] bg-white hover:bg-[#F2F2F7]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() => toggleStudent(student.id)}
                  disabled={addingSubject}
                  className="mt-1 h-4 w-4 accent-[#007AFF]"
                />

                <span className="min-w-0">
                  <span className="block font-semibold text-[#1C1C1E]">
                    {student.name}
                  </span>

                  <span className="mt-0.5 block text-sm text-[#636366]">
                    Grade {student.grade} · {student.section}
                  </span>

                  {student.subject_names?.length > 0 && (
                    <span className="mt-1 block text-xs text-[#8E8E93]">
                      Current subjects: {student.subject_names.join(", ")}
                    </span>
                  )}
                </span>
              </label>
            ))}

            {filteredStudents.length === 0 && (
              <div className="rounded-[20px] border border-dashed border-[#D1D1D6] bg-[#F2F2F7] px-4 py-10 text-center text-[#636366] sm:col-span-2">
                {students.length === 0
                  ? "No students are registered yet. You can still create the subject with no enrolled students."
                  : "No students match the search."}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E5E5EA] bg-[#F2F2F7] px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            disabled={addingSubject}
            className="rounded-full border border-[#D1D1D6] bg-white px-5 py-2.5 font-medium text-[#3A3A3C] hover:bg-[#E5E5EA] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={createSubject}
            disabled={addingSubject}
            className="rounded-full bg-[#007AFF] px-5 py-2.5 font-medium text-white hover:bg-[#0066D6] disabled:cursor-not-allowed disabled:bg-[#D1D1D6] disabled:text-[#8E8E93]"
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
  active = false,
  label,
  icon,
  collapsed = false,
  tone = "blue",
  onClick,
}) {
  const tones = {
    blue: {
      active:
        "bg-white/80 text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
      icon: "text-[#007AFF]",
      hover: "hover:bg-white/60 hover:text-[#1d1d1f]",
    },
    red: {
      active:
        "bg-white/80 text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
      icon: "text-[#D70015]",
      hover: "hover:bg-white/60 hover:text-[#1d1d1f]",
    },
    green: {
      active:
        "bg-white/80 text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
      icon: "text-[#248A3D]",
      hover: "hover:bg-white/60 hover:text-[#1d1d1f]",
    },
    yellow: {
      active:
        "bg-white/80 text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.08)]",
      icon: "text-[#9A6700]",
      hover: "hover:bg-white/60 hover:text-[#1d1d1f]",
    },
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.();
      }}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`sidebar-nav-button group flex w-full touch-manipulation items-center rounded-[13px] py-1.5 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/45 ${
        collapsed ? "justify-center px-1" : "gap-2.5 px-2 text-left"
      } ${
        active
          ? selectedTone.active
          : `text-[#636366] ${selectedTone.hover}`
      }`}
    >
      <span
        className={`sidebar-nav-icon flex h-7 w-7 shrink-0 items-center justify-center ${
          active
            ? selectedTone.icon
            : `${selectedTone.icon} group-hover:scale-105`
        }`}
      >
        <span
          className="material-symbols-rounded text-[18px] leading-none"
          style={{
            fontVariationSettings: active
              ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
              : "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24",
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </span>

      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function AnalyticsCard({ title, value, description, tone = "blue" }) {
  const tones = {
    blue: {
      surface: "border-[#007AFF] border-2 bg-white",
      icon: "bg-[#007AFF] text-white",
      text: "text-[#0051D5]",
      symbol: "●",
    },
    red: {
      surface: "border-[#FF3B30] border-2 bg-white",
      icon: "bg-[#FF3B30] text-white",
      text: "text-[#D70015]",
      symbol: "◆",
    },
    green: {
      surface: "border-[#34C759] border-2 bg-white",
      icon: "bg-[#34C759] text-white",
      text: "text-[#248A3D]",
      symbol: "▲",
    },
    yellow: {
      surface: "border-[#FFCC00] border-2 bg-white",
      icon: "bg-[#FFCC00] text-[#1C1C1E]",
      text: "text-[#8A5A00]",
      symbol: "■",
    },
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border p-5 ${selectedTone.surface}`}
    >
      <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-[#E5E5EA]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#636366]">{title}</p>

          <p
            className={`mt-3 text-3xl font-bold tracking-tight ${selectedTone.text}`}
          >
            {value}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${selectedTone.icon}`}
          aria-hidden="true"
        >
          {selectedTone.symbol}
        </span>
      </div>

      <p className="relative mt-3 text-sm leading-6 text-[#636366]">
        {description}
      </p>
    </div>
  );
}

function PerformanceBar({ label, range, count, percentage, barClass }) {
  return (
    <div className="rounded-[18px] border border-[#D1D1D6] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="font-medium text-[#3A3A3C]">{label}</span>
          <span className="ml-2 text-sm text-[#8E8E93]">{range}</span>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-sm text-[#636366]">
          {count} student
          {count === 1 ? "" : "s"} · {percentage.toFixed(1)}%
        </span>
      </div>

      <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#E5E5EA]">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barClass}`}
          style={{
            width: `${percentage}%`,
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
  const isRisk = type === "risk";
  const supportType = isRisk ? "intervention" : "enrichment";

  return (
    <div
      className={`rounded-[24px] border-2 bg-white p-4 ${
        isRisk ? "border-[#FF3B30]" : "border-[#34C759]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-[#1C1C1E]">{title}</h4>

          <p className="mt-1 text-sm text-[#636366]">
            {students.length} student
            {students.length === 1 ? "" : "s"}
          </p>
        </div>

        <span
          className={`flex h-10 w-10 items-center justify-center rounded-[15px] text-lg text-white ${
            isRisk ? "bg-[#FF3B30]" : "bg-[#34C759]"
          }`}
          aria-hidden="true"
        >
          {isRisk ? "!" : "★"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {students.map((student) => {
          const requestKey = `${supportType}-${student.id}`;
          const isGenerating = generatingRecommendationKey === requestKey;
          const anotherRequestIsRunning =
            Boolean(generatingRecommendationKey) && !isGenerating;

          return (
            <div
              key={student.id}
              className="rounded-[18px] border border-[#D1D1D6] bg-white p-4"
            >
              <div className="flex justify-between gap-3">
                <span className="font-medium text-[#1C1C1E]">
                  {student.name}
                </span>

                <span
                  className={
                    isRisk
                      ? "font-bold text-[#D70015]"
                      : "font-bold text-[#248A3D]"
                  }
                >
                  {student.averagePercentage.toFixed(1)}%
                </span>
              </div>

              <p className="mt-1 text-xs text-[#636366]">
                {student.section} · {student.assessmentCount} assessment
                {student.assessmentCount === 1 ? "" : "s"}
              </p>

              <button
                type="button"
                onClick={() => onGenerateRecommendation(student, supportType)}
                disabled={Boolean(generatingRecommendationKey)}
                className={`mt-3 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isRisk
                    ? "bg-[#FF3B30] text-white hover:bg-[#D70015]"
                    : "bg-[#34C759] text-white hover:bg-[#248A3D]"
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
        })}

        {students.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[#D1D1D6] bg-white p-5 text-center text-sm text-[#636366]">
            No students identified.
          </div>
        )}
      </div>
    </div>
  );
}

function AiRecommendationModal({ recommendation, error, closeModal }) {
  const plan = recommendation?.plan;
  const isIntervention = recommendation?.supportType === "intervention";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1C1C1E]/55 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#E5E5EA] bg-white">
        <div
          className={`flex items-start justify-between gap-4 px-6 py-5 ${
            isIntervention
              ? "bg-[#FF3B30]/10"
              : "bg-[#34C759]/12"
          }`}
        >
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-[16px] text-xl font-bold text-white ${
                  isIntervention ? "bg-[#FF3B30]" : "bg-[#34C759]"
                }`}
                aria-hidden="true"
              >
                {isIntervention ? "!" : "★"}
              </span>

              <div>
                <p
                  className={`text-sm font-semibold uppercase tracking-[0.16em] ${
                    isIntervention ? "text-[#D70015]" : "text-[#248A3D]"
                  }`}
                >
                  Gemini Learning Support
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1C1C1E]">
                  {plan?.title || "Learning-Support Recommendation"}
                </h2>
              </div>
            </div>

            {recommendation?.student && (
              <p className="mt-3 text-sm text-[#636366]">
                {recommendation.student.name} · Grade{" "}
                {recommendation.student.grade} ·{" "}
                {recommendation.student.section} · {recommendation.focusLabel}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {recommendation?.savedInsight?.pdfUrl && (
              <a
                href={`${API_URL}${recommendation.savedInsight.pdfUrl}`}
                className="rounded-full bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0066D6]"
              >
                Download PDF
              </a>
            )}

            <button
              type="button"
              onClick={closeModal}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl leading-none text-[#636366] transition hover:bg-[#F2F2F7] hover:text-[#1C1C1E]"
              aria-label="Close recommendation"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-112px)] overflow-y-auto px-6 py-6">
          {error ? (
            <div className="rounded-[22px] border border-[#FF3B30] bg-white p-5 text-[#D70015]">
              <h3 className="font-bold">
                Recommendation could not be generated
              </h3>

              <p className="mt-2 text-sm">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {recommendation?.savedInsight && (
                <div className="rounded-[20px] bg-[#FF9500]/12 p-4 text-sm text-[#8A5A00]">
                  This insight was saved automatically on{" "}
                  {formatSavedDate(recommendation.savedInsight.createdAt)}. Use
                  the Download PDF button to save a copy outside EduLITE.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <RecommendationMetric
                  label="Classification"
                  value={recommendation?.classification || "—"}
                  tone={isIntervention ? "red" : "green"}
                />

                <RecommendationMetric
                  label="Focus Average"
                  value={formatPercentage(
                    recommendation?.analytics?.focusAveragePercentage,
                  )}
                  tone="yellow"
                />

                <RecommendationMetric
                  label="Section Average"
                  value={formatPercentage(
                    recommendation?.analytics?.sectionComparison
                      ?.sectionAveragePercentage,
                  )}
                  tone="blue"
                />

                <RecommendationMetric
                  label="Recent Trend"
                  value={recommendation?.analytics?.recentTrend?.label || "—"}
                  tone="green"
                />
              </div>

              {plan?.overview && (
                <RecommendationSection title="Overview">
                  <div className="rounded-[22px] border border-[#E5E5EA] bg-[#F2F2F7] p-5">
                    <p className="leading-7 text-[#3A3A3C]">{plan.overview}</p>
                  </div>
                </RecommendationSection>
              )}

              {plan?.evidence?.length > 0 && (
                <RecommendationSection title="Evidence Used">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {plan.evidence.map((item, index) => (
                      <div
                        key={`${item.observation}-${index}`}
                        className="rounded-[22px] bg-[#007AFF]/10 p-4"
                      >
                        <p className="font-semibold text-[#0051D5]">
                          {item.observation}
                        </p>

                        <p className="mt-2 text-sm text-[#636366]">
                          {item.dataPoint}
                        </p>
                      </div>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.targetedInterventions?.length > 0 && (
                <RecommendationSection title="Suggested Targeted Interventions">
                  <div className="space-y-4">
                    {plan.targetedInterventions.map((intervention, index) => (
                      <div
                        key={`${intervention.title}-${index}`}
                        className="rounded-[24px] bg-[#FF3B30]/10 p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF3B30] font-bold text-white">
                            {index + 1}
                          </span>

                          <div>
                            <h4 className="text-lg font-bold text-[#1C1C1E]">
                              {intervention.title}
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-[#3A3A3C]">
                              {intervention.rationale}
                            </p>
                          </div>
                        </div>

                        {intervention.actions?.length > 0 && (
                          <ul className="mt-4 list-disc space-y-1 pl-7 text-sm text-[#3A3A3C]">
                            {intervention.actions.map((action, actionIndex) => (
                              <li key={`${action}-${actionIndex}`}>{action}</li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <PlanDetail
                            label="Suggested schedule"
                            value={intervention.schedule}
                          />

                          <PlanDetail
                            label="Success indicator"
                            value={intervention.successIndicator}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.enrichmentActivities?.length > 0 && (
                <RecommendationSection title="Recommended Enrichment Activities">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {plan.enrichmentActivities.map((activity, index) => (
                      <div
                        key={`${activity.title}-${index}`}
                        className="rounded-[24px] bg-[#34C759]/12 p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#34C759] font-bold text-white">
                            {index + 1}
                          </span>

                          <div>
                            <h4 className="text-lg font-bold text-[#1C1C1E]">
                              {activity.title}
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-[#3A3A3C]">
                              {activity.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <PlanDetail
                            label="Implementation"
                            value={activity.implementation}
                          />

                          <PlanDetail
                            label="Expected outcome"
                            value={activity.expectedOutcome}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </RecommendationSection>
              )}

              {plan?.monitoringPlan?.length > 0 && (
                <RecommendationSection title="Progress Monitoring">
                  <div className="overflow-x-auto rounded-[22px] bg-[#FF9500]/12">
                    <table className="w-full min-w-[700px]">
                      <thead className="border-b border-[#FFCC00] bg-white/55">
                        <tr>
                          <TableHeading>Metric</TableHeading>
                          <TableHeading>Frequency</TableHeading>
                          <TableHeading>Target</TableHeading>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#FFCC00]">
                        {plan.monitoringPlan.map((item, index) => (
                          <tr key={`${item.metric}-${index}`}>
                            <td className="px-6 py-4 text-[#3A3A3C]">
                              {item.metric}
                            </td>

                            <td className="px-6 py-4 text-[#3A3A3C]">
                              {item.frequency}
                            </td>

                            <td className="px-6 py-4 text-[#3A3A3C]">
                              {item.target}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </RecommendationSection>
              )}

              {plan?.teacherNotes?.length > 0 && (
                <RecommendationSection title="Teacher Notes">
                  <div className="rounded-[22px] bg-[#007AFF]/10 p-5">
                    <ul className="list-disc space-y-2 pl-5 text-[#3A3A3C]">
                      {plan.teacherNotes.map((note, index) => (
                        <li key={`${note}-${index}`}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </RecommendationSection>
              )}

              <div className="rounded-[22px] border border-[#D1D1D6] bg-[#E5E5EA] p-4 text-sm leading-6 text-[#3A3A3C]">
                Gemini recommendations are generated from recorded academic data
                only. Review them using your professional judgment and knowledge
                of the learner before applying them.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationMetric({ label, value, tone = "blue" }) {
  const tones = {
    blue: "border-[#007AFF] bg-[#007AFF] text-white",
    red: "border-[#FF3B30] bg-[#FF3B30] text-white",
    green: "border-[#34C759] bg-[#34C759] text-white",
    yellow: "border-[#FFCC00] bg-[#FFCC00] text-[#1C1C1E]",
  };

  const selectedTone = tones[tone] ?? tones.blue;

  return (
    <div className={`rounded-[22px] border p-4 ${selectedTone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

function RecommendationSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 text-xl font-bold text-[#1C1C1E]">{title}</h3>
      {children}
    </section>
  );
}

function PlanDetail({ label, value }) {
  return (
    <div className="rounded-[16px] border border-[#D1D1D6] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#636366]">
        {label}
      </p>

      <p className="mt-1 text-sm leading-6 text-[#3A3A3C]">{value || "—"}</p>
    </div>
  );
}

function formatPercentage(value) {
  return value === null || value === undefined
    ? "—"
    : `${Number(value).toFixed(1)}%`;
}

function formatSavedDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Unknown date";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TableHeading({ children, align = "left" }) {
  return (
    <th
      className={`px-6 py-4 text-xs font-semibold uppercase tracking-wide text-[#636366] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}