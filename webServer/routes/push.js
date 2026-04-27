const express = require("express");
const router = express.Router();
const {
  saveSubscription,
  sendPushToAll,
} = require("../lib/push");

router.post("/subscribe", async (req, res) => {
  try {
    const { subscription } = req.body || {};
    if (!subscription) {
      return res.status(400).json({ error: "Missing subscription" });
    }
    await saveSubscription(subscription);
    return res.status(204).send();
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error("push subscribe:", err);
    }
    return res.status(status).json({ error: err.message || "Subscribe failed" });
  }
});

router.post("/alert", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      title: body.title != null ? String(body.title) : "Emergency SOS",
      body:
        body.body != null
          ? String(body.body)
          : "Immediate medical attention is required.",
      url: body.url != null ? String(body.url) : "/",
      level: body.level != null ? String(body.level) : "critical",
    };
    const { sent, failed } = await sendPushToAll(payload);
    return res.json({ sent, failed });
  } catch (err) {
    console.error("push alert:", err);
    return res.status(500).json({ error: err.message || "Alert failed" });
  }
});

module.exports = router;
