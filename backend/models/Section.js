import mongoose from "mongoose";

const sectionSchema =
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
          "Section name is required.",
        ],
        trim: true,
      },

      nameKey: {
        type: String,
        required: true,
      },
    },
    {
      timestamps: true,
      collection: "sections",
    },
  );

sectionSchema.pre(
  "validate",
  function normalizeSection() {
    if (typeof this.name === "string") {
      this.name = this.name
        .trim()
        .replace(/\s+/g, " ");

      this.nameKey =
        this.name.toLowerCase();
    }
  },
);

sectionSchema.index(
  {
    ownerId: 1,
    nameKey: 1,
  },
  {
    unique: true,
    name:
      "unique_section_name_per_owner",
  },
);

const Section =
  mongoose.models.Section ||
  mongoose.model(
    "Section",
    sectionSchema,
  );

export default Section;