import express from "express";
import Router from "express-promise-router";
import { check } from "express-validator";
import compression from "compression";
import cors from "cors";
import multer from "multer";
import path from "path";
import DiskStorage from "./storage.js";
import { logRequests, logErrors, logFiles, handleValidationErrors } from "./middleware.js";
import { getCalendarTrends, recalculateConditional, submit } from "./analysis.js";
import { exportWorkspace, importWorkspace } from "./workspace.js";

export function createApi(env) {
  // define middleware
  const storage = new DiskStorage({
    filename: (req, file) => file.originalname,
    destination: (req) => path.resolve(env.INPUT_FOLDER, req.params.id),
  });
  const upload = multer({ storage });
  const validate = check("id").isUUID();

  // register middleware
  const router = Router();
  router.use(express.json({ limit: "100mb" }));
  router.use(compression());
  router.use(cors());
  router.use(logRequests());

  // serve static files under /data
  router.use("/data", express.static(env.DATA_FOLDER));

  // register routes
  router.get("/ping", async (req, res) => res.json(true));

  // router.post("/upload/:id", validate, handleValidationErrors, upload.any(), logFiles(), (req, res) => {
  //   res.json({ id: req.params.id });
  // });

  router.post("/submit/:id", validate, handleValidationErrors, async (req, res) => {
    res.json(await submit(req.body.params, req.body.data));
  });

  router.post("/calendarTrends/:id", validate, handleValidationErrors, async (req, res) => {
    res.json(await getCalendarTrends({ ...req.body, id: req.params.id }, req.app.locals.logger));
  });

  router.post("/recalculateConditional/:id", validate, handleValidationErrors, async (req, res) => {
    res.json(await recalculateConditional({ ...req.body, id: req.params.id }, req.app.locals.logger));
  });

  router.get("/export/:id", validate, handleValidationErrors, async (req, res) => {
    const zipStream = await exportWorkspace(req.params.id, env);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=${req.params.id}.zip`);
    zipStream.pipe(res);
  });

  router.post("/import/:id", validate, handleValidationErrors, upload.single("files"), async (req, res) => {
    res.json(await importWorkspace(req.params.id, req.file.originalname, env));
  });

  router.use(logErrors());
  return router;
}
