const Patient = require("../models/Patient");
const Report = require("../models/Report");

const report_create_get = async (req, res) => {
  res.render("add_report");
};

const report_create_post = async (req, res) => {
  try {
    const { title, datetime, maxBpm, minBpm, avgBpm, condition, notes } =
      req.body;

    console.log(req.body); // check what's actually arriving

    const report = new Report({
      title,
      datetime,
      maxBpm,
      minBpm,
      avgBpm,
      condition,
      notes,
    });
    await report.save();

    return res.redirect("/");
  } catch (err) {
    console.error(err.message); // this will tell you exactly which field failed
    return res.status(400).send(err.message);
  }
};


const report_get = async (req,res) => {
  const {id:reportId} = req.params;
  const reportData = await Report.findById(reportId);
  res.render("report" , {
    reportData
  });

}

module.exports = {
  report_create_get,
  report_create_post,
  report_get
};
