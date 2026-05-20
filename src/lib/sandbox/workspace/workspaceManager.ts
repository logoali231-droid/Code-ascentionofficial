import { file } from "jszip";
import {
  SandboxWorkspace,
  WorkspaceFile,
} from "./types";

import {
  writeWorkspaceFile,
  readWorkspaceFile,
  listWorkspaceFiles,
  saveWorkspaceMetadata,
  loadWorkspaceMetadata,
} from "./workspaceStorage";

export class WorkspaceManager {
  private workspace:
    SandboxWorkspace | null = null;

  private activeFile:
    string | null = null;

  async createWorkspace(
    workspace: SandboxWorkspace
  ) {
    this.workspace = workspace;

    await saveWorkspaceMetadata(
      workspace
    );

    for (const file of workspace.files) {
      await writeWorkspaceFile(
        workspace.id,
        file.path,
        file.content
      );
    }
  }

  async loadWorkspace(
    workspaceId: string
  ) {
    const metadata =
      await loadWorkspaceMetadata(
        workspaceId
      );

    if (!metadata) {
      throw new Error(
        "Workspace not found"
      );
    }

    const filePaths =
      await listWorkspaceFiles(
        workspaceId
      );

    const filesMap = new Map<string, WorkspaceFile>(); for (const path of filePaths) {
      if (
        path === "metadata.json"
      ) {
        continue;
      }

      const content =
        await readWorkspaceFile(
          workspaceId,
          path
        );

      filesMap.set(path, {
        id: crypto.randomUUID(),

        path,

        name: path.split("/").pop() || path,

        type: "file",

        parent:
          path.includes("/")
            ? path.split("/").slice(0, -1).join("/")
            : undefined,

        content,

        language: this.detectLanguage(path),

        updatedAt: Date.now(),

        createdAt: Date.now(),

        size: content.length,
      });
    }

    this.workspace = {
      ...metadata,
      files: Array.from(filesMap.values()),
    };

    return this.workspace;
  }

  getWorkspace() {
    return this.workspace;
  }

  getFiles() {
    return (
      this.workspace?.files ?? []
    );
  }

  getActiveFile() {
    return this.activeFile;
  }

  setActiveFile(path: string) {
    this.activeFile = path;
  }

  async updateFile(
    path: string,
    content: string
  ) {
    if (!this.workspace) {
      return;
    }

    const file =
      this.workspace.files.find(
        (f) => f.path === path
      );

    if (!file) {
      return;
    }

    file.content = content;

    file.updatedAt =
      Date.now();

    this.workspace.updatedAt =
      Date.now();

    await writeWorkspaceFile(
      this.workspace.id,
      path,
      content
    );

    await saveWorkspaceMetadata(
      this.workspace
    );
  }

  async createFile(
    path: string,
    content = ""
  ) {
    if (!this.workspace) {
      return;
    }

    const file: WorkspaceFile = {
      path,
      content,
      language: this.detectLanguage(path),
      updatedAt: Date.now(),
      createdAt: Date.now(),
      id: "",
      name: "",
      type: "file"
    };

    this.workspace.files.push(
      file
    );

    await writeWorkspaceFile(
      this.workspace.id,
      path,
      content
    );

    await saveWorkspaceMetadata(
      this.workspace
    );
  }

  async deleteFile(
    path: string
  ) {
    if (!this.workspace) {
      return;
    }

    this.workspace.files =
      this.workspace.files.filter(
        (f) => f.path !== path
      );

    await saveWorkspaceMetadata(
      this.workspace
    );
  }

  private detectLanguage(
    path: string
  ) {
    if (
      path.endsWith(".ts")
    )
      return "typescript";

    if (
      path.endsWith(".tsx")
    )
      return "typescriptreact";

    if (
      path.endsWith(".js")
    )
      return "javascript";

    if (
      path.endsWith(".py")
    )
      return "python";

    if (
      path.endsWith(".rs")
    )
      return "rust";

    if (
      path.endsWith(".cpp")
    )
      return "cpp";

    return "plaintext";
  }

  async updateFileContent(
    path: string,
    content: string
  ) {
    const workspace =
      this.getWorkspace();

    if (!workspace) {
      return;
    }

    workspace.files =
      workspace.files.map((file) =>
        file.path === path
          ? {
            ...file,
            content,
          }
          : file
      );

    this.workspace = workspace;
  }
}




export const workspaceManager =
  new WorkspaceManager();

