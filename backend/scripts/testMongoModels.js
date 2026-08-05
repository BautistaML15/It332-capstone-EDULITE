import dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import {
  connectMongoDatabase,
  disconnectMongoDatabase,
} from "../database/mongo.js";

import User from "../models/User.js";
import Section from "../models/Section.js";
import Subject from "../models/Subject.js";
import Student from "../models/Student.js";
import Assessment from "../models/Assessment.js";
import AssessmentScore from "../models/AssessmentScore.js";
import StudentAiInsight from "../models/StudentAiInsight.js";

const MODELS = [
  User,
  Section,
  Subject,
  Student,
  Assessment,
  AssessmentScore,
  StudentAiInsight,
];

async function collectionExists(
  database,
  collectionName,
) {
  const collections = await database
    .listCollections(
      {
        name: collectionName,
      },
      {
        nameOnly: true,
      },
    )
    .toArray();

  return collections.length > 0;
}

async function createCollectionIfMissing(
  database,
  collectionName,
) {
  const exists = await collectionExists(
    database,
    collectionName,
  );

  if (exists) {
    console.log(
      `Collection already exists: ${collectionName}`,
    );

    return;
  }

  await database.createCollection(
    collectionName,
  );

  console.log(
    `Collection created: ${collectionName}`,
  );
}

async function createModelIndexes(
  database,
  Model,
) {
  const collectionName =
    Model.collection.collectionName;

  const indexes =
    Model.schema.indexes();

  for (const [keys, options] of indexes) {
    const indexName =
      options.name ||
      Object.entries(keys)
        .map(
          ([field, direction]) =>
            `${field}_${direction}`,
        )
        .join("_");

    const existingIndexes =
      await database
        .collection(collectionName)
        .indexes();

    if (
      existingIndexes.some(
        (index) =>
          index.name === indexName,
      )
    ) {
      console.log(
        `Index already exists: ${collectionName}.${indexName}`,
      );

      continue;
    }

    await database
      .collection(collectionName)
      .createIndex(
        keys,
        {
          ...options,
          name: indexName,
        },
      );

    console.log(
      `Index created: ${collectionName}.${indexName}`,
    );
  }
}

async function testMongoModels() {
  try {
    await connectMongoDatabase();

    const database =
      mongoose.connection.db;

    console.log(
      `Connected database: ${mongoose.connection.name}`,
    );

    await database.command({
      ping: 1,
    });

    console.log(
      "MongoDB ping successful.",
    );

    for (const Model of MODELS) {
      const collectionName =
        Model.collection.collectionName;

      console.log(
        `Preparing ${Model.modelName} model...`,
      );

      await createCollectionIfMissing(
        database,
        collectionName,
      );

      await createModelIndexes(
        database,
        Model,
      );

      const documentCount =
        await database
          .collection(collectionName)
          .countDocuments();

      console.log(
        `${collectionName}: ${documentCount} document(s)`,
      );
    }

    console.log(
      "All EduLITE MongoDB collections and indexes initialized successfully.",
    );
  } catch (error) {
    console.error(
      "MongoDB model initialization failed:",
      error,
    );

    process.exitCode = 1;
  } finally {
    await disconnectMongoDatabase();
  }
}

testMongoModels();