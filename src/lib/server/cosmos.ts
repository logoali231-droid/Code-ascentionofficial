import { CosmosClient } from "@azure/cosmos";

function getCosmosClient() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error("Missing COSMOS env vars");
  }

  return new CosmosClient({
    endpoint,
    key,
  });
}

const database = getCosmosClient().database("codeascension");

export const cosmosContainers = {
  users: database.container("users"),
  courses: database.container("courses"),
  telemetry: database.container("telemetry"),
  memory: database.container("memory"),
};