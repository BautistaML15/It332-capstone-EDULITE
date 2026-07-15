import {
  useEffect,
  useMemo,
  useState
} from "react";

import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:3000";

const PASSING_PERCENTAGE = 75;
const HIGH_POTENTIAL_PERCENTAGE = 90;


export default function Dashboard() {
  const [students, setStudents] =
    useState([]);

  const [sections, setSections] =
    useState([]);

  const [assessments, setAssessments] =
    useState([]);

  const [
    assessmentRecords,
    setAssessmentRecords
  ] = useState([]);

  const [
    selectedSection,
    setSelectedSection
  ] = useState("ALL");

  const [newSection, setNewSection] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    addingSection,
    setAddingSection
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
    Score-editing states.
  */
  const [
    editingStudentId,
    setEditingStudentId
  ] = useState(null);

  const [
    editedScores,
    setEditedScores
  ] = useState({});

  const [
    savingScores,
    setSavingScores
  ] = useState(false);

  const navigate = useNavigate();


  useEffect(() => {
    const user =
      localStorage.getItem("user");

    if (!user) {
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
        assessmentResponse,
        recordResponse
      ] = await Promise.all([
        axios.get(
          `${API_URL}/students`
        ),

        axios.get(
          `${API_URL}/sections`
        ),

        axios.get(
          `${API_URL}/assessments`
        ),

        axios.get(
          `${API_URL}/assessment-records`
        )
      ]);

      setStudents(
        studentResponse.data
      );

      setSections(
        sectionResponse.data
      );

      setAssessments(
        assessmentResponse.data
      );

      setAssessmentRecords(
        recordResponse.data
      );

      if (
        selectedSection !== "ALL" &&
        !sectionResponse.data.some(
          (section) =>
            section.name ===
            selectedSection
        )
      ) {
        setSelectedSection("ALL");
      }
    } catch (error) {
      console.error(
        "Error loading dashboard:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load the dashboard."
      );
    } finally {
      setLoading(false);
    }
  };


  const handleAddSection = async (
    event
  ) => {
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
          name: sectionName
        }
      );

      setNewSection("");

      await fetchDashboardData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to add the section."
      );
    } finally {
      setAddingSection(false);
    }
  };


  const handleRemoveSection = async (
    section
  ) => {
    const confirmed =
      window.confirm(
        `Remove section "${section.name}"?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(
        `${API_URL}/sections/${section.id}`
      );

      if (
        selectedSection ===
        section.name
      ) {
        setSelectedSection("ALL");
      }

      await fetchDashboardData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to remove the section."
      );
    }
  };


  const handleDeleteStudent = async (
    studentId
  ) => {
    const confirmed =
      window.confirm(
        "Remove this student and their assessment scores?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(
        `${API_URL}/students/${studentId}`
      );

      await fetchDashboardData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to delete the student."
      );
    }
  };


  const handleDeleteAssessment = async (
    assessmentId
  ) => {
    const confirmed =
      window.confirm(
        "Delete this assessment and all recorded scores?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await axios.delete(
        `${API_URL}/assessments/${assessmentId}`
      );

      await fetchDashboardData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to delete the assessment."
      );
    }
  };


  const handleRegisterStudent = () => {
    if (sections.length === 0) {
      setError(
        "Add at least one section before registering a student."
      );

      return;
    }

    navigate("/student-form");
  };


  const handleAddAssessment = () => {
    navigate("/assessment-form");
  };


  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };


  const displayedStudents =
    useMemo(() => {
      if (selectedSection === "ALL") {
        return students;
      }

      return students.filter(
        (student) =>
          student.section ===
          selectedSection
      );
    }, [
      students,
      selectedSection
    ]);


  /*
    scoreMap[studentId][assessmentId]
  */
  const scoreMap =
    useMemo(() => {
      const map = {};

      for (
        const record
        of assessmentRecords
      ) {
        if (!map[record.student_id]) {
          map[record.student_id] = {};
        }

        map[
          record.student_id
        ][record.assessment_id] =
          record.score;
      }

      return map;
    }, [assessmentRecords]);


  /*
    Open score editing for one student.
  */
  const startEditingScores = (
    student
  ) => {
    const currentScores = {};

    for (const assessment of assessments) {
      const currentScore =
        scoreMap[
          student.id
        ]?.[
          assessment.id
        ];

      currentScores[assessment.id] =
        currentScore === undefined ||
        currentScore === null
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


  const handleEditedScoreChange = (
    assessmentId,
    value
  ) => {
    /*
      Allow a blank value or whole
      non-negative numbers.
    */
    if (
      value !== "" &&
      !/^\d+$/.test(value)
    ) {
      return;
    }

    setEditedScores(
      (currentScores) => ({
        ...currentScores,
        [assessmentId]: value
      })
    );
  };


  /*
    Save every assessment score for
    the selected student with one
    backend request.
  */
  const saveStudentScores = async (
    student
  ) => {
    if (savingScores) {
      return;
    }

    setError("");
    setSuccess("");

    const scoreList = [];

    for (const assessment of assessments) {
      const enteredValue =
        editedScores[
          assessment.id
        ];

      const isBlank =
        enteredValue === "" ||
        enteredValue === null ||
        enteredValue === undefined;

      if (!isBlank) {
        const numericScore =
          Number(enteredValue);

        if (
          !Number.isInteger(numericScore) ||
          numericScore < 0 ||
          numericScore >
            Number(assessment.total_items)
        ) {
          setError(
            `${student.name}'s score for "${assessment.name}" must be between 0 and ${assessment.total_items}.`
          );

          return;
        }
      }

      scoreList.push({
        assessment_id:
          assessment.id,

        score: isBlank
          ? null
          : Number(enteredValue)
      });
    }

    setSavingScores(true);

    try {
      const response = await axios.put(
        `${API_URL}/students/${student.id}/assessment-scores`,
        {
          scores: scoreList
        }
      );

      /*
        Close editing before reloading
        the records.
      */
      setEditingStudentId(null);
      setEditedScores({});

      /*
        Reload updated records so the
        table and analytics change
        immediately.
      */
      await fetchDashboardData();

      setSuccess(
        response.data?.message ||
          "Scores updated successfully."
      );
    } catch (error) {
      console.error(
        "Error saving student scores:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to update the student scores."
      );
    } finally {
      setSavingScores(false);
    }
  };


  /*
    Calculate every student's average
    percentage from their recorded
    assessments.
  */
  const studentAnalytics =
    useMemo(() => {
      return displayedStudents.map(
        (student) => {
          const studentRecords =
            assessmentRecords.filter(
              (record) =>
                record.student_id ===
                student.id
            );

          const percentages =
            studentRecords
              .filter(
                (record) =>
                  Number(
                    record.total_items
                  ) > 0
              )
              .map(
                (record) =>
                  (
                    Number(record.score) /
                    Number(
                      record.total_items
                    )
                  ) * 100
              );

          const averagePercentage =
            percentages.length > 0
              ? percentages.reduce(
                  (
                    total,
                    percentage
                  ) =>
                    total + percentage,
                  0
                ) / percentages.length
              : null;

          return {
            ...student,
            averagePercentage,
            assessmentCount:
              percentages.length
          };
        }
      );
    }, [
      displayedStudents,
      assessmentRecords
    ]);


  const assessedStudents =
    studentAnalytics.filter(
      (student) =>
        student.averagePercentage !== null
    );


  const classAverage =
    assessedStudents.length > 0
      ? assessedStudents.reduce(
          (total, student) =>
            total +
            student.averagePercentage,
          0
        ) / assessedStudents.length
      : 0;


  const excellentStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >= 90
    );


  const verySatisfactoryStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >= 85 &&
        student.averagePercentage < 90
    );


  const satisfactoryStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >= 75 &&
        student.averagePercentage < 85
    );


  const atRiskStudents =
    assessedStudents
      .filter(
        (student) =>
          student.averagePercentage <
          PASSING_PERCENTAGE
      )
      .sort(
        (firstStudent, secondStudent) =>
          firstStudent.averagePercentage -
          secondStudent.averagePercentage
      );


  const highPotentialStudents =
    assessedStudents
      .filter(
        (student) =>
          student.averagePercentage >=
          HIGH_POTENTIAL_PERCENTAGE
      )
      .sort(
        (firstStudent, secondStudent) =>
          secondStudent.averagePercentage -
          firstStudent.averagePercentage
      );


  const passingStudents =
    assessedStudents.filter(
      (student) =>
        student.averagePercentage >=
        PASSING_PERCENTAGE
    );


  const passingRate =
    assessedStudents.length > 0
      ? (
          passingStudents.length /
          assessedStudents.length
        ) * 100
      : 0;


  const currentSectionLabel =
    selectedSection === "ALL"
      ? "All Sections"
      : selectedSection;


  const getPercentage = (count) => {
    if (assessedStudents.length === 0) {
      return 0;
    }

    return (
      count /
      assessedStudents.length
    ) * 100;
  };


  const getPerformanceStatus = (
    averagePercentage
  ) => {
    if (averagePercentage === null) {
      return {
        label: "Not Assessed",

        className:
          "bg-slate-100 text-slate-600 border-slate-200"
      };
    }

    if (averagePercentage >= 90) {
      return {
        label: "Excellent",

        className:
          "bg-green-100 text-green-700 border-green-200"
      };
    }

    if (averagePercentage >= 85) {
      return {
        label: "Very Satisfactory",

        className:
          "bg-blue-100 text-blue-700 border-blue-200"
      };
    }

    if (averagePercentage >= 75) {
      return {
        label: "Satisfactory",

        className:
          "bg-amber-100 text-amber-700 border-amber-200"
      };
    }

    return {
      label: "At Risk",

      className:
        "bg-red-100 text-red-700 border-red-200"
    };
  };


  return (
    <div className="min-h-screen bg-white">

      {/* HEADER */}

      <header
        className="
          bg-white
          border-b
          border-slate-200
          sticky
          top-0
          z-20
        "
      >
        <div
          className="
            max-w-7xl
            mx-auto
            px-4
            md:px-8
            py-4
            flex
            flex-col
            lg:flex-row
            lg:items-center
            justify-between
            gap-4
          "
        >
          <div>
            <h1
              className="
                text-2xl
                font-bold
                text-slate-900
              "
            >
              EduLITE Dashboard
            </h1>

            <p
              className="
                text-slate-500
                text-sm
                mt-1
              "
            >
              Student assessment records and
              learning-support analytics
            </p>
          </div>


          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={
                handleRegisterStudent
              }
              className="
                bg-blue-600
                hover:bg-blue-700
                text-white
                px-4
                py-2.5
                rounded-lg
                font-medium
                shadow-sm
                transition
              "
            >
              + Register Student
            </button>

            <button
              type="button"
              onClick={
                handleAddAssessment
              }
              className="
                bg-green-600
                hover:bg-green-700
                text-white
                px-4
                py-2.5
                rounded-lg
                font-medium
                shadow-sm
                transition
              "
            >
              + Add Assessment
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="
                bg-red-600
                hover:bg-red-700
                text-white
                px-4
                py-2.5
                rounded-lg
                font-medium
                shadow-sm
                transition
              "
            >
              Logout
            </button>
          </div>
        </div>
      </header>


      <main
        className="
          max-w-7xl
          mx-auto
          p-4
          md:p-8
          space-y-8
        "
      >

        {error && (
          <div
            className="
              bg-red-50
              border
              border-red-200
              text-red-700
              p-4
              rounded-xl
            "
          >
            {error}
          </div>
        )}


        {success && (
          <div
            className="
              bg-green-50
              border
              border-green-200
              text-green-700
              p-4
              rounded-xl
            "
          >
            {success}
          </div>
        )}


        {/* SECTION MANAGEMENT */}

        <section
          className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            shadow-sm
            p-6
          "
        >
          <div
            className="
              grid
              grid-cols-1
              xl:grid-cols-2
              gap-8
            "
          >
            <div>
              <h2
                className="
                  text-xl
                  font-bold
                  text-slate-900
                "
              >
                Section Management
              </h2>

              <p
                className="
                  text-slate-500
                  text-sm
                  mt-1
                "
              >
                Create sections before
                registering students.
              </p>

              <form
                onSubmit={
                  handleAddSection
                }
                className="
                  flex
                  flex-col
                  sm:flex-row
                  gap-3
                  mt-5
                "
              >
                <input
                  type="text"
                  value={newSection}
                  onChange={(event) =>
                    setNewSection(
                      event.target.value
                    )
                  }
                  placeholder="Enter section name"
                  className="
                    flex-1
                    bg-white
                    border
                    border-slate-300
                    rounded-lg
                    px-4
                    py-3
                    text-slate-900
                    placeholder-slate-400
                    focus:outline-none
                    focus:ring-2
                    focus:ring-purple-500
                    focus:border-purple-500
                  "
                />

                <button
                  type="submit"
                  disabled={
                    addingSection ||
                    !newSection.trim()
                  }
                  className="
                    bg-purple-600
                    hover:bg-purple-700
                    disabled:bg-purple-300
                    disabled:cursor-not-allowed
                    text-white
                    px-6
                    py-3
                    rounded-lg
                    font-medium
                    shadow-sm
                    transition
                  "
                >
                  {addingSection
                    ? "Adding..."
                    : "+ Add Section"}
                </button>
              </form>
            </div>


            <div>
              <label
                className="
                  block
                  text-slate-700
                  text-sm
                  font-medium
                  mb-2
                "
              >
                View records for
              </label>

              <select
                value={selectedSection}
                onChange={(event) =>
                  setSelectedSection(
                    event.target.value
                  )
                }
                className="
                  w-full
                  bg-white
                  border
                  border-slate-300
                  rounded-lg
                  px-4
                  py-3
                  text-slate-900
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
              >
                <option value="ALL">
                  All Sections
                  {" ("}
                  {students.length}
                  {" students)"}
                </option>

                {sections.map(
                  (section) => (
                    <option
                      key={section.id}
                      value={section.name}
                    >
                      {section.name}
                      {" ("}
                      {section.student_count}
                      {" students)"}
                    </option>
                  )
                )}
              </select>


              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                  mt-4
                "
              >
                {sections.map(
                  (section) => (
                    <div
                      key={section.id}
                      className="
                        flex
                        items-center
                        border
                        border-slate-200
                        rounded-lg
                        overflow-hidden
                        bg-slate-50
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSection(
                            section.name
                          )
                        }
                        className="
                          px-3
                          py-2
                          text-slate-700
                          hover:bg-slate-100
                          font-medium
                        "
                      >
                        {section.name}
                        {" "}
                        ({section.student_count})
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveSection(
                            section
                          )
                        }
                        className="
                          px-3
                          py-2
                          bg-red-50
                          text-red-600
                          hover:bg-red-100
                          border-l
                          border-slate-200
                        "
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>


        {loading ? (
          <div
            className="
              bg-white
              border
              border-slate-200
              rounded-2xl
              p-12
              text-center
              text-slate-500
              shadow-sm
            "
          >
            Loading assessment records...
          </div>
        ) : (
          <>

            {/* ANALYTICS */}

            <section>
              <div className="mb-5">
                <p
                  className="
                    text-blue-600
                    text-sm
                    font-semibold
                    uppercase
                    tracking-wider
                  "
                >
                  Performance Analytics
                </p>

                <h2
                  className="
                    text-2xl
                    font-bold
                    text-slate-900
                    mt-1
                  "
                >
                  {currentSectionLabel}
                </h2>
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  xl:grid-cols-4
                  gap-5
                "
              >
                <AnalyticsCard
                  title="Class Average"
                  value={
                    `${classAverage.toFixed(1)}%`
                  }
                  description={
                    "Average from recorded assessments"
                  }
                  accentClass={
                    "border-t-blue-500"
                  }
                />

                <AnalyticsCard
                  title="Students Assessed"
                  value={
                    assessedStudents.length
                  }
                  description={
                    `${displayedStudents.length} registered students`
                  }
                  accentClass={
                    "border-t-purple-500"
                  }
                />

                <AnalyticsCard
                  title="Passing Rate"
                  value={
                    `${passingRate.toFixed(1)}%`
                  }
                  description={
                    `${passingStudents.length} students have passing averages`
                  }
                  accentClass={
                    "border-t-green-500"
                  }
                />

                <AnalyticsCard
                  title="Students at Risk"
                  value={
                    atRiskStudents.length
                  }
                  description={
                    "Average percentage below 75"
                  }
                  accentClass={
                    "border-t-red-500"
                  }
                />
              </div>
            </section>


            {/* PERFORMANCE SUMMARY */}

            <section
              className="
                grid
                grid-cols-1
                xl:grid-cols-2
                gap-6
              "
            >
              <div
                className="
                  bg-white
                  border
                  border-slate-200
                  rounded-2xl
                  shadow-sm
                  p-6
                "
              >
                <h3
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                    mb-6
                  "
                >
                  Class Performance Summary
                </h3>

                <div className="space-y-5">
                  <PerformanceBar
                    label="Excellent"
                    range="90–100%"
                    count={
                      excellentStudents.length
                    }
                    percentage={
                      getPercentage(
                        excellentStudents.length
                      )
                    }
                    barClass="bg-green-500"
                  />

                  <PerformanceBar
                    label="Very Satisfactory"
                    range="85–89%"
                    count={
                      verySatisfactoryStudents.length
                    }
                    percentage={
                      getPercentage(
                        verySatisfactoryStudents.length
                      )
                    }
                    barClass="bg-blue-500"
                  />

                  <PerformanceBar
                    label="Satisfactory"
                    range="75–84%"
                    count={
                      satisfactoryStudents.length
                    }
                    percentage={
                      getPercentage(
                        satisfactoryStudents.length
                      )
                    }
                    barClass="bg-amber-500"
                  />

                  <PerformanceBar
                    label="Needs Support"
                    range="Below 75%"
                    count={
                      atRiskStudents.length
                    }
                    percentage={
                      getPercentage(
                        atRiskStudents.length
                      )
                    }
                    barClass="bg-red-500"
                  />
                </div>
              </div>


              <div
                className="
                  bg-white
                  border
                  border-slate-200
                  rounded-2xl
                  shadow-sm
                  p-6
                "
              >
                <h3
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                    mb-5
                  "
                >
                  Learning Insights
                </h3>

                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    gap-4
                  "
                >
                  <InsightList
                    title="Students at Risk"
                    students={atRiskStudents}
                    type="risk"
                  />

                  <InsightList
                    title="High Potential"
                    students={
                      highPotentialStudents
                    }
                    type="potential"
                  />
                </div>
              </div>
            </section>


            {/* ASSESSMENT LIST */}

            <section
              className="
                bg-white
                border
                border-slate-200
                rounded-2xl
                shadow-sm
                overflow-hidden
              "
            >
              <div
                className="
                  px-6
                  py-5
                  border-b
                  border-slate-200
                "
              >
                <h2
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Assessments
                </h2>

                <p
                  className="
                    text-slate-500
                    text-sm
                    mt-1
                  "
                >
                  {assessments.length}
                  {" assessment"}
                  {assessments.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>


              <div className="overflow-x-auto">
                <table
                  className="
                    w-full
                    min-w-[700px]
                  "
                >
                  <thead
                    className="
                      bg-slate-50
                      border-b
                      border-slate-200
                    "
                  >
                    <tr>
                      <TableHeading>
                        Assessment
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
                        Action
                      </TableHeading>
                    </tr>
                  </thead>


                  <tbody
                    className="
                      divide-y
                      divide-slate-200
                    "
                  >
                    {assessments.map(
                      (assessment) => (
                        <tr
                          key={assessment.id}
                          className="
                            hover:bg-slate-50
                          "
                        >
                          <td
                            className="
                              px-6
                              py-4
                              text-slate-900
                              font-medium
                            "
                          >
                            {assessment.name}
                          </td>

                          <td
                            className="
                              px-6
                              py-4
                              text-slate-600
                            "
                          >
                            {assessment.type}
                          </td>

                          <td
                            className="
                              px-6
                              py-4
                              text-slate-600
                            "
                          >
                            {assessment.date}
                          </td>

                          <td
                            className="
                              px-6
                              py-4
                              text-slate-600
                            "
                          >
                            {
                              assessment.total_items
                            }
                          </td>

                          <td
                            className="
                              px-6
                              py-4
                              text-right
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAssessment(
                                  assessment.id
                                )
                              }
                              className="
                                bg-red-50
                                text-red-700
                                hover:bg-red-100
                                px-3
                                py-1.5
                                rounded-lg
                                font-medium
                              "
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    )}


                    {assessments.length === 0 && (
                      <tr>
                        <td
                          colSpan="5"
                          className="
                            px-6
                            py-12
                            text-center
                            text-slate-500
                          "
                        >
                          No assessments have
                          been added.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>


            {/* STUDENT ASSESSMENT RECORDS */}

            <section
              className="
                bg-white
                border
                border-slate-200
                rounded-2xl
                shadow-sm
                overflow-hidden
              "
            >
              <div
                className="
                  px-6
                  py-5
                  border-b
                  border-slate-200
                "
              >
                <h2
                  className="
                    text-xl
                    font-bold
                    text-slate-900
                  "
                >
                  Student Assessment Records —
                  {" "}
                  {currentSectionLabel}
                </h2>

                <p
                  className="
                    text-slate-500
                    text-sm
                    mt-1
                  "
                >
                  Click Edit Scores to update
                  or clear a student's scores.
                </p>
              </div>


              <div className="overflow-x-auto">
                <table
                  className="
                    w-full
                    min-w-max
                  "
                >
                  <thead
                    className="
                      bg-slate-50
                      border-b
                      border-slate-200
                    "
                  >
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

                      {assessments.map(
                        (assessment) => (
                          <th
                            key={assessment.id}
                            className="
                              px-5
                              py-4
                              text-center
                              text-xs
                              font-semibold
                              uppercase
                              tracking-wide
                              text-slate-600
                              min-w-[165px]
                            "
                          >
                            <div>
                              {assessment.name}
                            </div>

                            <div
                              className="
                                normal-case
                                font-normal
                                text-slate-400
                                mt-1
                              "
                            >
                              {assessment.type}
                              {" · "}
                              {
                                assessment.total_items
                              }
                              {" items"}
                            </div>
                          </th>
                        )
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


                  <tbody
                    className="
                      divide-y
                      divide-slate-200
                    "
                  >
                    {studentAnalytics.map(
                      (student) => {
                        const status =
                          getPerformanceStatus(
                            student.averagePercentage
                          );

                        const isEditing =
                          editingStudentId ===
                          student.id;

                        return (
                          <tr
                            key={student.id}
                            className={
                              isEditing
                                ? "bg-blue-50/50"
                                : "hover:bg-slate-50"
                            }
                          >
                            <td
                              className="
                                px-5
                                py-4
                                text-slate-900
                                font-medium
                              "
                            >
                              {student.name}
                            </td>

                            <td
                              className="
                                px-5
                                py-4
                                text-slate-600
                              "
                            >
                              {student.grade}
                            </td>

                            <td
                              className="
                                px-5
                                py-4
                                text-slate-600
                              "
                            >
                              {student.section}
                            </td>


                            {assessments.map(
                              (assessment) => {
                                const score =
                                  scoreMap[
                                    student.id
                                  ]?.[
                                    assessment.id
                                  ];

                                const hasScore =
                                  score !== undefined &&
                                  score !== null;

                                const percentage =
                                  hasScore &&
                                  Number(
                                    assessment.total_items
                                  ) > 0
                                    ? (
                                        Number(score) /
                                        Number(
                                          assessment.total_items
                                        )
                                      ) * 100
                                    : null;

                                return (
                                  <td
                                    key={
                                      assessment.id
                                    }
                                    className="
                                      px-5
                                      py-4
                                      text-center
                                    "
                                  >
                                    {isEditing ? (
                                      <div
                                        className="
                                          flex
                                          items-center
                                          justify-center
                                          gap-2
                                        "
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          max={
                                            assessment.total_items
                                          }
                                          step="1"
                                          value={
                                            editedScores[
                                              assessment.id
                                            ] ?? ""
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            handleEditedScoreChange(
                                              assessment.id,
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          placeholder="—"
                                          disabled={
                                            savingScores
                                          }
                                          className="
                                            w-20
                                            bg-white
                                            border
                                            border-blue-300
                                            rounded-lg
                                            px-2
                                            py-2
                                            text-center
                                            text-slate-900
                                            focus:outline-none
                                            focus:ring-2
                                            focus:ring-blue-500
                                            focus:border-blue-500
                                            disabled:bg-slate-100
                                          "
                                        />

                                        <span
                                          className="
                                            text-slate-500
                                            text-sm
                                          "
                                        >
                                          /
                                          {" "}
                                          {
                                            assessment.total_items
                                          }
                                        </span>
                                      </div>
                                    ) : hasScore ? (
                                      <>
                                        <div
                                          className="
                                            text-slate-900
                                            font-semibold
                                          "
                                        >
                                          {score}
                                          {" / "}
                                          {
                                            assessment.total_items
                                          }
                                        </div>

                                        <div
                                          className="
                                            text-slate-500
                                            text-xs
                                            mt-1
                                          "
                                        >
                                          {
                                            percentage.toFixed(
                                              1
                                            )
                                          }
                                          %
                                        </div>
                                      </>
                                    ) : (
                                      <span
                                        className="
                                          text-slate-400
                                        "
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                            )}


                            <td
                              className="
                                px-5
                                py-4
                                text-slate-900
                                font-bold
                              "
                            >
                              {
                                student.averagePercentage ===
                                null
                                  ? "—"
                                  : `${student.averagePercentage.toFixed(
                                      1
                                    )}%`
                              }
                            </td>

                            <td
                              className="
                                px-5
                                py-4
                              "
                            >
                              <span
                                className={`
                                  inline-flex
                                  border
                                  px-3
                                  py-1
                                  rounded-full
                                  text-xs
                                  font-semibold
                                  ${status.className}
                                `}
                              >
                                {status.label}
                              </span>
                            </td>

                            <td
                              className="
                                px-5
                                py-4
                                text-right
                                whitespace-nowrap
                              "
                            >
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveStudentScores(
                                        student
                                      )
                                    }
                                    disabled={
                                      savingScores
                                    }
                                    className="
                                      bg-green-600
                                      hover:bg-green-700
                                      disabled:bg-green-300
                                      disabled:cursor-not-allowed
                                      text-white
                                      px-3
                                      py-1.5
                                      rounded-lg
                                      font-medium
                                      mr-2
                                    "
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
                                    className="
                                      bg-slate-100
                                      text-slate-700
                                      hover:bg-slate-200
                                      disabled:opacity-50
                                      px-3
                                      py-1.5
                                      rounded-lg
                                      font-medium
                                    "
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
                                        `/student-form/${student.id}`
                                      )
                                    }
                                    className="
                                      bg-blue-50
                                      text-blue-700
                                      hover:bg-blue-100
                                      px-3
                                      py-1.5
                                      rounded-lg
                                      font-medium
                                      mr-2
                                    "
                                  >
                                    Edit Info
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEditingScores(
                                        student
                                      )
                                    }
                                    disabled={
                                      assessments.length ===
                                      0
                                    }
                                    className="
                                      bg-amber-50
                                      text-amber-700
                                      hover:bg-amber-100
                                      disabled:bg-slate-100
                                      disabled:text-slate-400
                                      disabled:cursor-not-allowed
                                      px-3
                                      py-1.5
                                      rounded-lg
                                      font-medium
                                      mr-2
                                    "
                                  >
                                    Edit Scores
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteStudent(
                                        student.id
                                      )
                                    }
                                    className="
                                      bg-red-50
                                      text-red-700
                                      hover:bg-red-100
                                      px-3
                                      py-1.5
                                      rounded-lg
                                      font-medium
                                    "
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}


                    {studentAnalytics.length === 0 && (
                      <tr>
                        <td
                          colSpan={
                            assessments.length +
                            6
                          }
                          className="
                            px-6
                            py-12
                            text-center
                            text-slate-500
                          "
                        >
                          No students found in
                          {" "}
                          {currentSectionLabel}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}


function AnalyticsCard({
  title,
  value,
  description,
  accentClass
}) {
  return (
    <div
      className={`
        bg-white
        border
        border-slate-200
        border-t-4
        ${accentClass}
        rounded-2xl
        p-5
        shadow-sm
      `}
    >
      <p
        className="
          text-slate-500
          text-sm
          font-medium
        "
      >
        {title}
      </p>

      <p
        className="
          text-3xl
          font-bold
          text-slate-900
          mt-3
        "
      >
        {value}
      </p>

      <p
        className="
          text-slate-500
          text-sm
          mt-2
        "
      >
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
  barClass
}) {
  return (
    <div>
      <div
        className="
          flex
          justify-between
          items-center
          gap-3
          mb-2
        "
      >
        <div>
          <span
            className="
              text-slate-800
              font-medium
            "
          >
            {label}
          </span>

          <span
            className="
              text-slate-400
              text-sm
              ml-2
            "
          >
            {range}
          </span>
        </div>

        <span
          className="
            text-slate-500
            text-sm
          "
        >
          {count}
          {" student"}
          {count === 1 ? "" : "s"}
          {" · "}
          {percentage.toFixed(1)}
          %
        </span>
      </div>

      <div
        className="
          w-full
          h-3
          bg-slate-100
          rounded-full
          overflow-hidden
        "
      >
        <div
          className={`
            h-full
            ${barClass}
            rounded-full
          `}
          style={{
            width: `${percentage}%`
          }}
        />
      </div>
    </div>
  );
}


function InsightList({
  title,
  students,
  type
}) {
  const isRisk =
    type === "risk";

  return (
    <div
      className={`
        border
        rounded-xl
        p-4

        ${
          isRisk
            ? "border-red-200 bg-red-50"
            : "border-green-200 bg-green-50"
        }
      `}
    >
      <h4
        className="
          font-bold
          text-slate-900
        "
      >
        {title}
      </h4>

      <p
        className="
          text-slate-500
          text-sm
          mt-1
          mb-4
        "
      >
        {students.length}
        {" student"}
        {students.length === 1
          ? ""
          : "s"}
      </p>

      <div className="space-y-2">
        {students.map(
          (student) => (
            <div
              key={student.id}
              className="
                bg-white
                border
                border-slate-200
                rounded-lg
                p-3
              "
            >
              <div
                className="
                  flex
                  justify-between
                  gap-3
                "
              >
                <span
                  className="
                    text-slate-900
                    font-medium
                  "
                >
                  {student.name}
                </span>

                <span
                  className={
                    isRisk
                      ? "text-red-600 font-bold"
                      : "text-green-600 font-bold"
                  }
                >
                  {
                    student.averagePercentage.toFixed(
                      1
                    )
                  }
                  %
                </span>
              </div>

              <p
                className="
                  text-slate-500
                  text-xs
                  mt-1
                "
              >
                {student.section}
                {" · "}
                {student.assessmentCount}
                {" assessment"}
                {
                  student.assessmentCount === 1
                    ? ""
                    : "s"
                }
              </p>
            </div>
          )
        )}


        {students.length === 0 && (
          <p
            className="
              text-slate-500
              text-sm
            "
          >
            No students identified.
          </p>
        )}
      </div>
    </div>
  );
}


function TableHeading({
  children,
  align = "left"
}) {
  return (
    <th
      className={`
        px-6
        py-4
        text-xs
        font-semibold
        uppercase
        tracking-wide
        text-slate-600

        ${
          align === "right"
            ? "text-right"
            : "text-left"
        }
      `}
    >
      {children}
    </th>
  );
}