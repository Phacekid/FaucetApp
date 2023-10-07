import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Config, Wallet, TokenSendRequest } from "mainnet-js";
import requestIp from "request-ip";
//import { verify } from "hcaptcha";

Config.EnforceCashTokenReceiptAddresses = true;
Config.DefaultParentDerivationPath = "m/44'/145'/0'/0/0";

const app = express();
app.use(helmet());
app.set('trust proxy', 1);
app.use(requestIp.mw());

const mins = 1; //number of minutes

const apiLimiter = rateLimit({
    windowMs: mins * 60 * 1000, // 1 minutes
    max: 2,
    keyGenerator: function (req, res) {
        return req.clientIp
    },
    message: `Too many requests, please try again in ${mins} minutes`,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
//app.all('*', function(req, res, next) {
//setTimeout(function() {
//next();
//}, 2000); // 2 seconds
//});

app.get("/", function (req, res) {
    res.render("index", { content: null, txIds: null, image: null, error: null });
});

app.post("/", apiLimiter, async function (req, res) {
    //const seed = process.env.SEED;
    //const wallet = await Wallet.fromSeed(seed, "m/44'/145'/0'/0/0");
    const wif = process.env.WIF;
    const wallet = await Wallet.fromWIF(wif);
    const balanceBch = await wallet.getBalance('bch');
    const balanceUsd = await wallet.getBalance('usd');
    console.log(balanceBch)
    let userAddress = req.body.userAddress;
    // const tokenAmount = 50000000000; // amount of CashTokens to distribute (with decimal places which were 8 decimal places for mesh)
    const tokenAmount = 1000; // amount of CashTokens to distribute (with decimal places)
    const token = "b62431202f3da15b3f1cb1f8f187731d7e0d25933ddfce781368960a983e985e"; // fungible tokenId (category) for belly
    let blacklistAddress = ["bitcoincash:zr3p4sja97wku94uayqqxe0lte32hjz62g80zy8ewk"];
    for (let element of blacklistAddress) {
        if (userAddress.includes(element)) {
            res.render("index", { content: null, txIds: null, image: null, error: "Verification failed" });
            return;
        }
    }
    // if (userAddress = !req.body.userAddress) {
    //     res.render("index", { content: null, txIds: null, image: null, error: "You need to provide CashTokens aware address- bitcoincash:z..." });
    //     return;
    // }
    let text = req.body.userAddress;
    let result = text.match("bitcoincash:z");
    if (userAddress = !result) {
        res.render("index", { content: null, txIds: null, image: null, error: "You need to provide CashTokens aware address- bitcoincash:z..." });
        return;
    }
    //const verifyData = await verify(process.env.HCAPTCHA_SECRET, req.body["h-captcha-response"]);
    //console.log(verifyData);
    //if (userAddress = req.body.userAddress, verifyData.success) {
    if (userAddress = req.body.userAddress) {
        try {
            const { txId } = await wallet.send([new TokenSendRequest(
                {
                    cashaddr: userAddress,
                    amount: tokenAmount,
                    tokenId: token
                }
            )]);
            res.render("index", {
                content: `You got 500 Bellies! You can claim again after ${mins} minutes`,
                txIds: txId,
                error: null
            });
        } catch (e) {
            //console.log("Not enough funds");
            res.render("index", {
                content: null,
                txIds: null,
                error: "Not enough funds. Send 2000 satoshi to bitcoincash:qr2sxypnln30ythtmfza9sp5f7wj8fsmxscpr7kf6t and try again"
            });
        }
        //} else if (! verifyData.success) {
        //res.render("index", { content: null, txIds: null, image: null, error: "Captcha verification failed" });
        //return;
    }
});

app.listen(process.env.PORT, () => {
    console.log("Server listening on port " + process.env.PORT + "!");
});