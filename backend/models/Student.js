import mongoose from "mongoose";

const studentSchema =
  new mongoose.Schema(
    {
      legacyId: {
        type: Number,
        default: null,
      },

      ownerId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: [
          true,
          "Student name is required.",
        ],
        trim: true,
      },

      grade: {
        type: Number,
        required: true,
        min: 1,
        validate: {
          validator: Number.isInteger,
          message:
            "Grade must be a whole number.",
        },
      },

      sectionId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Section",
        required: true,
        index: true,
      },

      subjectIds: {
        type: [
          {
            type:
              mongoose.Schema.Types
                .ObjectId,
            ref: "Subject",
          },
        ],
        required: true,
        validate: {
          validator(value) {
            return (
              Array.isArray(value) &&
              value.length > 0
            );
          },
          message:
            "Select at least one subject for the student.",
        },
      },
    },
    {
      timestamps: true,
      collection: "students",
    },
  );

studentSchema.pre(
  "validate",
  function normalizeStudent() {
    if (typeof this.name === "string") {
      this.name = this.name
        .trim()
        .replace(/\s+/g, " ");
    }

    if (Array.isArray(this.subjectIds)) {
      this.subjectIds = [
        ...new Map(
          this.subjectIds.map(
            (subjectId) => [
              String(subjectId),
              subjectId,
            ],
          ),
        ).values(),
      ];
    }
  },
);

studentSchema.index({
  ownerId: 1,
  subjectIds: 1,
});

studentSchema.index({
  ownerId: 1,
  grade: 1,
  sectionId: 1,
  name: 1,
});

const Student =
  mongoose.models.Student ||
  mongoose.model(
    "Student",
    studentSchema,
  );

export default Student;