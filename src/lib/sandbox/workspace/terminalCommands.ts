import { workspaceManager } from "../workspace/workspaceManager";

export async function ls() {
  const files =
    workspaceManager.getFiles();

  return files
    .map((f) => f.path)
    .join("\n");
}

export async function pwd() {
  return "/";
}

export async function cat(
  args: string[],
) {
  const file =
    workspaceManager
      .getFiles()
      .find(
        (f) =>
          f.path === args[0],
      );

  if (!file) {
    return "file not found";
  }

  return file.content;
}