"use client";

import {
exportCognitiveProfile,
importCognitiveProfile,
} from "@/lib/others/profileTransfer";

export default function ProfileTransferPanel() {

async function handleExport() {

const blob =
  await exportCognitiveProfile();

const url =
  URL.createObjectURL(blob);

const a =
  document.createElement("a");

a.href = url;

a.download =
  `codeascension-profile-${Date.now()}.json`;

a.click();

URL.revokeObjectURL(url);

}

async function handleImport(
e: React.ChangeEvent<HTMLInputElement>
) {

const file =
  e.target.files?.[0];

if (!file) return;

await importCognitiveProfile(file);

alert("Profile imported successfully.");

window.location.reload();


}

return ( <div className="flex flex-col gap-4">


  <button
    onClick={handleExport}
    className="border p-3 rounded-xl"
  >
    EXPORT COGNITIVE PROFILE
  </button>

  <label
    className="border p-3 rounded-xl cursor-pointer"
  >
    IMPORT COGNITIVE PROFILE

    <input
      type="file"
      accept=".json"
      hidden
      onChange={handleImport}
    />
  </label>

</div>
);
}
