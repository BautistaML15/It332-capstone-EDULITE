import mongoose from "mongoose";

const ASSESSMENT_TYPES = [
  "Major Exam",
  "Activity",
  "Quiz",
];

const assessmentSchema =
  new mongoose.Schema(
    {
      ownerId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: [
          true,
          "Assessment owner is required.",
        ],
        index: true,
      },

      name: {
        type: String,
        required: [
          true,
          "Assessment name is required.",
        ],
        trim: true,
      },

      type: {
        type: String,
        required: [
          true,
          "Assessment type is required.",
        ],
        enum: {
          values:
            ASSESSMENT_TYPES,

          message:
            "Type must be Major Exam, Activity, or Quiz.",
        },
      },

      date: {
        type: Date,
        required: [
          true,
          "Assessment date is required.",
        ],
        index: true,
      },

      totalItems: {
        type: Number,
        required: [
          true,
          "Total items are required.",
        ],
        min: [
          1,
          "Total items must be at least 1.",
        ],
        validate: {
          validator:
            Number.isInteger,

          message:
            "Total items must be a whole number.",
        },
      },

      subjectId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Subject",
        required: [
          true,
          "Assessment subject is required.",
        ],
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
      collection: "assessments",
    },
  );

assessmentSchema.index({
  ownerId: 1,
  subjectId: 1,
  date: -1,
});

const Assessment =
  mongoose.models.Assessment ||
  mongoose.model(
    "Assessment",
    assessmentSchema,
  );

export default Assessment;