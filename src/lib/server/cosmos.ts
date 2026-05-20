import { CosmosClient } from "@azure/cosmos";

const cosmos = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const database = cosmos.database("codeascension");

export const cosmosContainers = {
  users: database.container("users"),
  courses: database.container("courses"),
  telemetry: database.container("telemetry"),
  memory: database.container("memory"),
};