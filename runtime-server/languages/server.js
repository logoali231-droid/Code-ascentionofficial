import { WebSocketServer } from "ws";

import { enqueue } from "./queue.js";
import { runDocker } from "./dockerRunner.js";

import { createNodeCommand } from "./languages/node.js";
import { createPythonCommand } from "./languages/python.js";
import { createPHPCommand } from "./languages/php.js";

const wss = new WebSocketServer({
  port: 8080
});

console.log("Runtime online on port 8080");

wss.on("connection", ws => {
  ws.on("message", async message => {
    try {
      const data = JSON.parse(message.toString());

      let command = "";

      switch (data.language) {
        case "javascript":
          command = createNodeCommand(data.code);
          break;

        case "python":
          command = createPythonCommand(data.code);
          break;

        case "php":
          command = createPHPCommand(data.code);
          break;

        default:
          ws.send(JSON.stringify({
            type: "error",
            error: "Unsupported language"
          }));

          return;
      }

      const result = await enqueue(() => runDocker(command));

      ws.send(JSON.stringify({
        type: "result",
        result
      }));

    } catch (err) {
      ws.send(JSON.stringify({
        type: "error",
        error: err.message
      }));
    }
  });
});