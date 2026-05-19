"use client";

export async function getWorkspaceRoot(projectId: string) {
  const root = await navigator.storage.getDirectory();

  return await root.getDirectoryHandle(projectId, {
    create: true,
  });
}

export async function writeProjectFile(
  projectId: string,
  path: string,
  content: string,
) {
  const root = await getWorkspaceRoot(projectId);

  const fileHandle = await root.getFileHandle(path, {
    create: true,
  });

  const writable = await fileHandle.createWritable();

  await writable.write(content);
  await writable.close();
}

export async function readProjectFile(
  projectId: string,
  path: string,
) {
  const root = await getWorkspaceRoot(projectId);

  const fileHandle = await root.getFileHandle(path);

  const file = await fileHandle.getFile();

  return await file.text();
}