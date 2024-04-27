import { Eta } from "eta";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const eta = new Eta({ views: path.join(__dirname, "templates") });
