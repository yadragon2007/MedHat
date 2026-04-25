const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const subject = process.env.WEBPUSH_SUBJECT;
  const publicKey = process.env.WEBPUSHPUPLIC;
  const privateKey = process.env.WEBPUSHPRIVATE;
  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "Missing WEBPUSH_SUBJECT, WEBPUSHPUPLIC, or WEBPUSHPRIVATE in environment",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

function toWebPushSubscription(doc) {
  return {
    endpoint: doc.endpoint,
    keys: {
      p256dh: doc.keys.p256dh,
      auth: doc.keys.auth,
    },
    expirationTime: doc.expirationTime ?? undefined,
  };
}

async function saveSubscription(subscription) {
  const { endpoint, keys, expirationTime } = subscription;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    const err = new Error("Invalid subscription payload");
    err.status = 400;
    throw err;
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      $set: {
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        expirationTime: expirationTime ?? null,
        lastSeen: new Date(),
      },
    },
    { upsert: true, new: true },
  );
}

async function sendPushToAll(payload) {
  ensureVapidConfigured();
  const body = JSON.stringify(payload);
  const docs = await PushSubscription.find().lean();
  let sent = 0;
  let failed = 0;

  for (const doc of docs) {
    const sub = toWebPushSubscription(doc);
    try {
      await webpush.sendNotification(sub, body);
      sent += 1;
    } catch (err) {
      const status = err.statusCode;
      if (status === 410 || status === 404) {
        await PushSubscription.deleteOne({ endpoint: doc.endpoint });
      } else {
        failed += 1;
        console.error("web-push send error:", status, err.message);
      }
    }
  }

  return { sent, failed };
}

function alertPayloadFromPiData(data = {}) {
  const d = typeof data === "object" && data !== null ? data : {};
  return {
    title: d.title != null ? String(d.title) : "Patient alert",
    body:
      d.body != null
        ? String(d.body)
        : "Check the patient monitor immediately.",
    url: d.url != null ? String(d.url) : "/",
    level: d.level != null ? String(d.level) : "critical",
  };
}

module.exports = {
  ensureVapidConfigured,
  saveSubscription,
  sendPushToAll,
  alertPayloadFromPiData,
};
