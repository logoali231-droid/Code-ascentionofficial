import { WorkspaceFile } from "./types";

export interface TreeNode {
  name: string;

  path: string;

  type: "file" | "directory";

  children?: TreeNode[];
}

export function buildWorkspaceTree(
  files: WorkspaceFile[],
): TreeNode[] {
  const root: TreeNode[] = [];

  const map = new Map<string, TreeNode>();

  for (const file of files) {
    map.set(file.path, {
      name: file.name,
      path: file.path,
      type: file.type,
      children:
        file.type === "directory"
          ? []
          : undefined,
    });
  }

  for (const file of files) {
    const node = map.get(file.path)!;

    if (!file.parent) {
      root.push(node);
      continue;
    }

    const parent =
      map.get(file.parent);

    if (
      parent &&
      parent.children
    ) {
      parent.children.push(node);
    }
  }

  return root;
}