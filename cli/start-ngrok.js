const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
console.log(process.env.NGROK_AUTHTOKEN);

const ngrok = require("@ngrok/ngrok");
const qrcode = require("qrcode-terminal");

(async function startNgrokWithQR(port = 7000) {
  console.log(`Starting ngrok on port ${port}...`);

  // Connect to ngrok
  const listener = await ngrok.forward({
    addr: port,
    authtoken: process.env.NGROK_AUTHTOKEN,
  });

  const url = listener.url();
  console.log(`\nNgrok URL: ${url}\n`);

  // Generate and print QR code to terminal
  console.log("Scan this QR code to access the URL:");
  // The purpose of this script is to generate QR code so i don't have to
  // copy paste the urls.
  qrcode.generate(url, { small: true });
})();

process.stdin.resume();
