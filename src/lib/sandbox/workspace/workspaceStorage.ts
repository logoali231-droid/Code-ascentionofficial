import { SandboxWorkspace } from "./types";

async function getRootDirectory() {
  return await navigator.storage.getDirectory();
}

export async function getProjectsDirectory() {
  const root = await getRootDirectory();

  return await root.getDirectoryHandle(
    "projects",
    {
      create: true,
    }
  );
}

export async function getWorkspaceDirectory(
  workspaceId: string
) {
  const projectsDir =
    await getProjectsDirectory();

  return await projectsDir.getDirectoryHandle(
    workspaceId,
    {
      create: true,
    }
  );
}

async function ensureDirectoryPath(
  base: FileSystemDirectoryHandle,
  parts: string[]
) {
  let current = base;

  for (const part of parts) {
    current =
      await current.getDirectoryHandle(
        part,
        {
          create: true,
        }
      );
  }

  return current;
}

export async function writeWorkspaceFile(
  workspaceId: string,
  path: string,
  content: string
) {
  const workspaceDir =
    await getWorkspaceDirectory(
      workspaceId
    );

  const parts = path.split("/");

  const fileName = parts.pop();

  if (!fileName) {
    throw new Error(
      "Invalid file path"
    );
  }

  const targetDir =
    await ensureDirectoryPath(
      workspaceDir,
      parts
    );

  const fileHandle =
    await targetDir.getFileHandle(
      fileName,
      {
        create: true,
      }
    );

  const writable =
    await fileHandle.createWritable();

  await writable.write(content);

  await writable.close();
}

export async function readWorkspaceFile(
  workspaceId: string,
  path: string
) {
  const workspaceDir =
    await getWorkspaceDirectory(
      workspaceId
    );

  const parts = path.split("/");

  const fileName = parts.pop();

  if (!fileName) {
    throw new Error(
      "Invalid file path"
    );
  }

  let current: FileSystemDirectoryHandle =
    workspaceDir;

  for (const part of parts) {
    current =
      await current.getDirectoryHandle(
        part
      );
  }

  const fileHandle =
    await current.getFileHandle(
      fileName
    );

  const file = await fileHandle.getFile();

  return await file.text();
}

export async function deleteWorkspaceFile(
  workspaceId: string,
  path: string
) {
  const workspaceDir =
    await getWorkspaceDirectory(
      workspaceId
    );

  const parts = path.split("/");

  const fileName = parts.pop();

  if (!fileName) {
    throw new Error(
      "Invalid file path"
    );
  }

  let current: FileSystemDirectoryHandle =
    workspaceDir;

  for (const part of parts) {
    current =
      await current.getDirectoryHandle(
        part
      );
  }

  await current.removeEntry(fileName);
}

export async function listWorkspaceFiles(
  workspaceId: string
): Promise<string[]> {
  const workspaceDir =
    await getWorkspaceDirectory(
      workspaceId
    );

  const results: string[] = [];

  async function walk(
    dir: FileSystemDirectoryHandle,
    prefix = ""
  ) {
    for await (const [
      name,
      handle,
    ] of dir.entries()) {
      const fullPath = prefix
        ? `${prefix}/${name}`
        : name;

      if (
        handle.kind === "file"
      ) {
        results.push(fullPath);
      } else {
        await walk(
          handle,
          fullPath
        );
      }
    }
  }

  await walk(workspaceDir);

  return results;
}

export async function saveWorkspaceMetadata(
  workspace: SandboxWorkspace
) {
  const workspaceDir =
    await getWorkspaceDirectory(
      workspace.id
    );

  const fileHandle =
    await workspaceDir.getFileHandle(
      "metadata.json",
      {
        create: true,
      }
    );

  const writable =
    await fileHandle.createWritable();

  await writable.write(
    JSON.stringify(workspace, null, 2)
  );

  await writable.close();
}

export async function loadWorkspaceMetadata(
  workspaceId: string
): Promise<SandboxWorkspace | null> {
  try {
    const workspaceDir =
      await getWorkspaceDirectory(
        workspaceId
      );

    const fileHandle =
      await workspaceDir.getFileHandle(
        "metadata.json"
      );

    const file =
      await fileHandle.getFile();

    const text =
      await file.text();

    return JSON.parse(text);
  } catch {
    return null;
  }
}