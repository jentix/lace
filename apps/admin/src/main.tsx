import { createRoot } from "react-dom/client";
import { AdminApp } from "./app/AdminApp/index.js";
import { createBrowserSessionSource } from "./entities/session/index.js";
import "./app/styles/styles.css";

const element = document.querySelector("#root");
if (element === null) throw new Error("Lace admin mount element is missing.");

createRoot(element).render(<AdminApp sessionSource={createBrowserSessionSource()} />);
