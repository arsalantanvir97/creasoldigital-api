const { response } = require("express");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../model/user");
const Order = require("../model/order");
const moment = require("moment");
const order = require("../model/order");
const post = require("../model/post");
const payments = require("../model/payments");

router.get("/dashboard", auth, async (req, res) => {
  const { query } = req;
  const year = query.year;
  const graph = await getGraphData(year);
  const packageData = await getPopularPackageData();
  res.status(200).send({
    graph,
    packageData,
  });
});
router.get("/paymentloggs", auth, async (req, res) => {
  const { query } = req;
  const year = query.year;
  const graph = await getSalespermonth(year);
  res.status(200).send({
    graph,
  });
});
const getGraphData = async (year) => {
  const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  try {
    const start_date = moment().set({ year }).startOf("year").toDate();
    const end_date = moment().set({ year }).endOf("year").toDate();
    const query = [
      {
        $match: {
          createdAt: {
            $gte: start_date,
            $lte: end_date,
          },
        },
      },
      {
        $addFields: {
          date: {
            $month: "$createdAt",
          },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
      {
        $addFields: {
          month: "$_id",
        },
      },
      {
        $project: {
          _id: 0,
          month: 1,
          count: 1,
        },
      },
    ];
    const user_data = await User.aggregate(query);
    user_data.forEach((data) => {
      if (data) arr[data.month - 1] = data.count;
    });
    return arr;
  } catch (err) {
    console.log(err);
    return arr;
  }
};

const getPopularPackageData = async (year) => {
  try {
    const start_date = moment().set({ year }).startOf("year").toDate();
    const end_date = moment().set({ year }).endOf("year").toDate();
    const query = [
      {
        $match: {
          createdAt: {
            $gte: start_date,
            $lte: end_date,
          },
        },
      },
      {
        $addFields: {
          packageName: "$pkg_name",
        },
      },
      {
        $group: {
          _id: "$pkg_name",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          packageName: 1,
          count: 1,
        },
      },
    ];
    const packageData = await Order.aggregate(query);

    const packages = ["Bronze", "Silver", "Gold"];

    return packages.map((pkg, idx) => {
      const index = packageData.findIndex((pd) => pd._id == pkg);

      if (index < 0) {
        return {
          _id: pkg,
          count: 0,
        };
      }
      return packageData[index];
    });

    return packageData;
  } catch (err) {
    console.log(err);
    return arr;
  }
};
const getSalespermonth = async (year) => {
  const arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  try {
    const start_date = moment().set({ year }).startOf("year").toDate();
    const end_date = moment().set({ year }).endOf("year").toDate();
    const query = [
      {
        $match: {
          createdAt: {
            $gte: start_date,
            $lte: end_date,
          },
        },
      },
      {
        $addFields: {
          date: {
            $month: "$createdAt",
          },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: "$amount" }
        },
      },
      {
        $addFields: {
          month: "$_id",
        },
      },
      {
        $project: {
          _id: 0,
          month: 1,
          count: 1,
        },
      },
    ];
    const user_data = await payments.aggregate(query);
    user_data.forEach((data) => {
      if (data) arr[data.month - 1] = data.count;
    });
    return arr;
  } catch (err) {
    console.log(err);
    return arr;
  }
};
router.get("/user-dashboard", auth, async (req, res) => {
  let timer=[]
  try {
    const UserId = req.user.user_id;
    const subscribedPackages = await order.find({
      status: "Active",
      user: UserId,
    });
    
    const posts = await post.find({ user: UserId }).sort({ createdAt: -1 });
    const approvedPosts = posts.filter((p) => p.status === "Approved").length;
    const pendingPosts = posts.filter(
      (p) => p.status === "Pending Approval"
    ).length;
    const recentPosts = posts.slice(0, 4);
    const chartData = {
      approved: posts.filter((p) => p.status === "Approved").length,
      pending: posts.filter((p) => p.status === "Pending Approval").length,
      rejected: posts.filter((p) => p.status === "Rejected with Comments")
        .length,
    };
    if(subscribedPackages.length>0){
     timer = subscribedPackages.filter(
      (pkgs) => pkgs.form_status === "Not Submitted"
    )[0].form_filltime;}
    const subscribedpkgsLength = subscribedPackages.length;
    const dashboardDataToSend = {
      subscribedPackages: subscribedpkgsLength,
      approvedPosts,
      pendingPosts,
      recentPosts,
      chartData,
      timer: timer,
    };
    console.log(dashboardDataToSend);
    return res.status(200).json(dashboardDataToSend);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

module.exports = router;
