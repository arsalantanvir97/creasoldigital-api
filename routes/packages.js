const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Package = require("../model/package");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.post("/packages", auth, async (req, res) => {
  await Package.deleteMany();

  [
    {
      name: "Bronze",
      price: 95,
      description: [
        "2 social media posts per",
        "week (2 platforms)",
        "1 300-word blog",
      ],
      duration: 1,
      interval: "month",
    },
    {
      name: "Silver",
      price: 190,
      description: [
        "4 Social media Posts per",
        "week (4 platforms)",
        "2 300-word blog",
      ],
      duration: 1,
      interval: "month",
    },
    {
      name: "Gold",
      price: 340,
      description: [
        "6 Social media posts per week (5 platforms)",
        "week (2 300-word blogs2 platforms)",
        "1 300-word blogs",
      ],
      duration: 1,
      interval: "month",
    },
  ].forEach(async (package) => {
    const pkg = await Package.findOne({ name: package.name });

    if (!pkg) {
      await Package.create(package);
    } else {
      Package.findByIdAndUpdate(pkg._id, package);
    }
  });

  return res.status(201).send({
    message: "Packages created!",
  });
});

router.get("/packages/stripe", auth, async (req, res) => {
  const pkgs = await stripe.prices.list({
    // lookup_keys: ['bronze', 'silver', 'gold'],
    expand: ["data.product"],
  });

  const pkg = pkgs.data.filter((price) =>
    ["bronze", "silver", "gold"].includes(price.product.name)
  );
  // const product = await stripe.products.list({
  //     active: true
  // });
  return res.status(201).send({ pkg, pkgs });
});

router.get("/packages", auth, async (req, res) => {
  const packages = await Package.find({});

  return res.status(201).send(packages);
});

module.exports = router;
