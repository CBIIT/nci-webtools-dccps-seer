import express from "express";
import Router from "express-promise-router";
import { check } from "express-validator";
import compression from "compression";
import cors from "cors";
import multer from "multer";
import path from "path";
import DiskStorage from "./storage.js";
import { logRequests, logErrors, logFiles, handleValidationErrors } from "./middleware.js";
import { submit, query } from "./analysis.js";

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

  router.post("/upload/:id", validate, handleValidationErrors, upload.any(), logFiles(), (req, res) => {
    res.json({ id: req.params.id });
  });

  router.post("/submit/:id", validate, handleValidationErrors, async (req, res) => {
    res.json(await submit({ ...req.body, id: req.params.id }));
  });

  router.post("/query/:id", async (req, res) => {
    res.json(await query({ ...req.body, id: req.params.id }, process.env));
  });

  router.use(logErrors());
  return router;
}
