import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import {
  connectMongoDatabase,
  disconnectMongoDatabase,
} from "../database/mongo.js";

const ACADEMIC_COLLECTIONS = [
  "studentAiInsights",
  "assessmentScores",
  "assessments",
  "students",
  "subjects",
  "sections",
];

async function dropIndexIfPresent(
  collection,
  indexName,
) {
  const indexes =
    await collection.indexes();

  if (
    indexes.some(
      (index) =>
        index.name === indexName,
    )
  ) {
    await collection.dropIndex(
      indexName,
    );

    console.log(
      `Dropped old index: ${collection.collectionName}.${indexName}`,
    );
  }
}

async function resetSharedAcademicData() {
  let session;

  try {
    await connectMongoDatabase();

    const database =
      mongoose.connection.db;

    session =
      await mongoose.startSession();

    await session.withTransaction(
      async () => {
        for (
          const collectionName
          of ACADEMIC_COLLECTIONS
        ) {
          const result =
            await database
              .collection(
                collectionName,
              )
              .deleteMany(
                {},
                { session },
              );

          console.log(
            `Deleted ${result.deletedCount} document(s) from ${collectionName}.`,
          );
        }
      },
    );

    /*
      Remove old globally unique indexes.

      These must be replaced by indexes
      that are unique only within one
      account.
    */
    await dropIndexIfPresent(
      database.collection(
        "sections",
      ),
      "nameKey_1",
    );

    await dropIndexIfPresent(
      database.collection(
        "subjects",
      ),
      "nameKey_1",
    );

    await dropIndexIfPresent(
      database.collection(
        "assessmentScores",
      ),
      "unique_student_assessment_score",
    );

    /*
      Create per-account indexes.
    */
    await database
      .collection("sections")
      .createIndex(
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

    await database
      .collection("subjects")
      .createIndex(
        {
          ownerId: 1,
          nameKey: 1,
        },
        {
          unique: true,
          name:
            "unique_subject_name_per_owner",
        },
      );

    await database
      .collection(
        "assessmentScores",
      )
      .createIndex(
        {
          ownerId: 1,
          studentId: 1,
          assessmentId: 1,
        },
        {
          unique: true,
          name:
            "unique_owner_student_assessment_score",
        },
      );

    console.log(
      "Shared academic data was removed successfully.",
    );

    console.log(
      "Registered accounts were preserved.",
    );
  } catch (error) {
    console.error(
      "Unable to reset academic data:",
      error,
    );

    process.exitCode = 1;
  } finally {
    if (session) {
      await session.endSession();
    }

    await disconnectMongoDatabase();
  }
}

resetSharedAcademicData();