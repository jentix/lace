import { createRoot } from "react-dom/client";
import { AdminApp } from "./app.js";
import { createBrowserSessionSource } from "./session.js";
import "./styles.css";

const element = document.querySelector("#root");
if (element === null) throw new Error("Lace admin mount element is missing.");

createRoot(element).render(<AdminApp sessionSource={createBrowserSessionSource()} />);
