import { Router } from "express";
import fs from "fs";

const router = Router();

const CLEARVOICE_LOGO_PATH =
  "/root/.cursor/projects/opt-gatewayglobal-aibizbot-dev-gatewayglobal-ai/assets/c__Users_jason_AppData_Roaming_Cursor_User_workspaceStorage_c4b9076a108e14f62554772eec05be98_images_LETS_GET_STARTED__5_-b548549c-9e7a-4306-81e8-ba65406b0b8e.png";

router.get("/clearvoice-logo", (_req, res) => {
  if (!fs.existsSync(CLEARVOICE_LOGO_PATH)) {
    return res.status(404).json({ message: "Logo not found." });
  }

  const fileBuffer = fs.readFileSync(CLEARVOICE_LOGO_PATH);
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Content-Length", String(fileBuffer.length));
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).end(fileBuffer);
});

export default router;
