import "dotenv/config";
import app from "./app.js";
import { PORT } from "./config/index.js";

app.listen(PORT, () => {
  console.log(`ASR server listening on ${PORT}`);
});
