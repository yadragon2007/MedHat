const Patient = require("../models/Patient");
const Report = require("../models/Report");

async function patientDefultData(req, res, next) {
  let patientData = await Patient.find();

  if (patientData[0]) return next();

  let patient = new Patient({
    name: "Youssef hassan",
    age: 18,
    gender: "male",
    blood_type: "A+",
    phone: "+201095815499",
    address: "فيصل ترسا",
    emergency_contact: [
      {
        name: "Yousef Amr",
        relation: "friend",
        phone: "+201501950053",
      },
      {
        name: "Yehia Alaa",
        relation: "Team leader",
        phone: "+201090520987",
      },
    ],
  });

  await patient.save();
  return next();
}

const home_get = async (req, res) => {
  let patientsData = await Patient.find();
  let reports = await Report.find();
  patientData = patientsData[0];
  res.render("index", {
    patientData,
    reports,
    vapidPublicKey: process.env.WEBPUSHPUPLIC,
  });
};

module.exports = {
  patientDefultData,
  home_get,
};
