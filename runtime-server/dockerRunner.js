import { exec } from "child_process";

export function runDocker(command) {
  return new Promise((resolve, reject) => {
    const process = exec(command, {
      timeout: 10000
    });

    let output = "";
    let error = "";

    process.stdout.on("data", data => {
      output += data;
    });

    process.stderr.on("data", data => {
      error += data;
    });

    process.on("close", code => {
      resolve({
        code,
        output,
        error
      });
    });

    process.on("error", reject);
  });
}