const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const { v4: uuidv4 } = require("uuid");
const config = require("./config");
const { onRequest } = require("firebase-functions/v2/https");
const { getStorage } = require("firebase-admin/storage");

if (!admin.apps.length) {
  admin.initializeApp();
}

const bucket = getStorage().bucket();

// ======================================================
// 🔹 1. Razorpay Order Creation
// ======================================================
const razorpay = new Razorpay({
  key_id: config.razorpay.key_id,
  key_secret: config.razorpay.key_secret,
});

exports.createRazorpayOrder = functions.https.onRequest(async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    if (!amount || !receipt) {
      return res.status(400).json({ error: "Missing amount or receipt" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      payment_capture: 1,
    });

    console.log("✅ Razorpay order created:", order);
    return res.status(200).json(order);
  } catch (error) {
    console.error("❌ Razorpay order creation failed:", error);
    return res.status(500).json({ error: "Failed to create order" });
  }
});

// ======================================================
// 🔹 2.1. PDF Generation Utility
// ======================================================

async function generatePDFBuffer(orderDetails) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // ✅ Fetch the logo image as a buffer
      const logoUrl =
        "https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/logos%2Flogo2.png?alt=media&token=192d3c40-2147-4053-b692-30db63606a9a";
      const logoRes = await fetch(logoUrl);
      const logoBuffer = Buffer.from(await logoRes.arrayBuffer());

      // === HEADER ===
      doc.fontSize(35).font("Helvetica-Bold").text("INVOICE", 50, 75, { align: "left" });
      doc.image(logoBuffer, 400, 50, { width: 170, align: "right" });
      doc.moveDown(2);

      // Formatting Date
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(orderDetails.orderDate || new Date()));

      // === DATE & ADDRESSES ===
      const yStart = 170;
      doc.fontSize(10).font("Helvetica-Bold").text("Date:", 50, yStart);
      doc.font("Helvetica").text(formattedDate, 80, yStart);
      doc.fontSize(10).font("Helvetica-Bold").text("Order No.", 450, yStart);
      doc.fontSize(10).font("Helvetica").text(`${orderDetails.orderNumber}`, 500, yStart);
      doc.moveDown();

      doc.font("Helvetica-Bold").text("Billed to:", 50, 230);
      const customer = orderDetails.customerInfo || {};
      doc.font("Helvetica").text(`${customer.name || ""}`, 50, 245);
      doc.text(`${customer.shipping_address.address || ""}, ${customer.shipping_address.city}`, 50, 260);
      doc.text(`${customer.shipping_address.state || ""}, ${customer.shipping_address.postalCode}, ${customer.shipping_address.country}`, 50, 275);
      doc.text(`${customer.email || ""}`, 50, 290);

      doc.font("Helvetica-Bold").text("From:", 350, 230);
      doc.font("Helvetica").text("Ujaas Aroma", 350, 245);
      doc.text("124-D, Ittina Abha, Munnekolal, Bengaluru", 350, 260);
      doc.text("Karnataka, 560037, India", 350, 275);
      doc.text("info@ujaasaroma.com", 350, 290);

      // === TABLE HEAD ===
      const tableTop = 320;
      doc.moveTo(50, tableTop).lineTo(550, tableTop).strokeColor("#999999").stroke();
      doc.font("Helvetica-Bold");
      doc.text("Item", 50, tableTop + 10);
      doc.text("Qty", 280, tableTop + 10, { width: 50, align: "right" });
      doc.text("Price", 360, tableTop + 10, { width: 80, align: "right" });
      doc.text("Amount", 460, tableTop + 10, { width: 80, align: "right" });
      doc.moveTo(50, tableTop + 25).lineTo(550, tableTop + 25).strokeColor("#999").stroke();

      // === ITEMS ===
      let y = tableTop + 35;
      const items = orderDetails.cartItems || [];
      doc.font("Helvetica");
      items.forEach((item) => {
        const amount = item.price * item.quantity;
        doc.text(item.title, 50, y);
        doc.text(item.quantity.toString(), 300, y, { width: 30, align: "right" });
        doc.text(`${item.price.toFixed(2)}`, 360, y, { width: 80, align: "right" });
        doc.text(`${amount.toFixed(2)}`, 460, y, { width: 80, align: "right" });
        y += 20;
      });
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#999").stroke();

      // === SUBTOTAL ===
      y += 10;
      const subtotal = orderDetails.subtotal;
      const tax = orderDetails.tax;
      const shipping = orderDetails.shipping.shippingCost
      const discount = orderDetails.discountValue
      const ttotal = subtotal + tax + shipping;
      const total = ttotal - discount;
      doc.font('Helvetica');
      doc.text("Subtotal", 360, y, { width: 80, align: "right" });
      doc.text(`${subtotal.toFixed(2)}`, 460, y, { width: 80, align: "right" });
      y += 15;
      doc.font('Helvetica');
      doc.text("GST", 360, y, { width: 80, align: "right" });
      doc.text(`${tax.toFixed(2)}`, 460, y, { width: 80, align: "right" });
      y += 15;
      doc.font('Helvetica');
      doc.text("Shipping", 360, y, { width: 80, align: "right" });
      doc.text(`${shipping.toFixed(2)}`, 460, y, { width: 80, align: "right" });

      if (orderDetails.discountCode !== null) {
        y += 15;
        doc.font('Helvetica');
        doc.text(`Discount (${orderDetails.discountCode})`, 360, y, { width: 80, align: "right" });
        doc.text(`- ${discount.toFixed(2)}`, 460, y, { width: 80, align: "right" });
      }

      // === TOTAL ===
      y += 30;
      doc.registerFont('NotoSansBold', './NotoSansMono-Bold.ttf');
      doc.font('NotoSansBold');
      doc.text("Total", 360, y, { width: 80, align: "right" });
      doc.text(`₹ ${total.toFixed(2)}`, 460, y, { width: 80, align: "right" });

      y -= 50
      // === PAYMENT DETAILS ===
      doc.fontSize(10).font("Helvetica").text("Payment Status:", 50, y);
      doc.font("Helvetica").text(orderDetails.payment.status, 150, y);
      y += 15;
      doc.fontSize(10).font("Helvetica").text("Reference No.:", 50, y);
      doc.font("Helvetica").text(orderDetails.payment.razorpay_order_id, 150, y);
      y = 550;
      doc.font("Helvetica-Bold").text("Note:", 50, y);
      doc.font("Helvetica").text("Thank you for shopping with us!", 90, y);


      // ✅ Fetch the logo image as a buffer
      const bottomImg =
        "https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/extra_required_images%2FScreenshot%202025-10-12%20at%2012.25.09%E2%80%AFPM.png?alt=media&token=80bd1de4-7e01-418f-807e-ff4a087d9a26";
      const bottomImgRes = await fetch(bottomImg);
      const bottomImgBuffer = Buffer.from(await bottomImgRes.arrayBuffer());

      // === FOOTER (curve) ===
      const footerY = 620;
      doc.save();
      doc.image(bottomImgBuffer, 0, footerY, { width: 600 });
      doc.restore();

      // doc.fontSize(9).fillColor("#666").text("© Ujaas Aroma — Wellness for your senses", 0, 770, {
      //   align: "center",
      //   width: 600,
      // });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}


// ======================================================
// 🔹 2.2 Cloud Function to Generate + Upload (Securely)
// ======================================================
exports.generateInvoicePDF = onRequest({ region: "us-central1" }, async (req, res) => {
  try {
    const payload = req.body || {};
    const orderDetails = payload.orderDetails || payload.order || payload;

    if (!orderDetails || typeof orderDetails !== "object") {
      return res.status(400).json({ error: "Missing or invalid orderDetails" });
    }

    const userId = orderDetails.userId || orderDetails.customerInfo?.uid;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId in orderDetails" });
    }

    if (!Array.isArray(orderDetails.items) && Array.isArray(orderDetails.cartItems)) {
      orderDetails.items = orderDetails.cartItems.map((ci) => ({
        title: ci.title || ci.name || ci.productId || "Item",
        quantity: ci.quantity ?? ci.qty ?? 1,
        price: Number(ci.price ?? 0),
        options: ci.options || [],
      }));
    }

    const toEmail = orderDetails.customerInfo?.email || orderDetails.email || "N/A";
    const pdfBuffer = await generatePDFBuffer(orderDetails, toEmail);

    const filePath = `invoices/${userId}/invoice-${orderDetails.orderNumber}-${uuidv4()}.pdf`;
    const file = bucket.file(filePath);

    // Save buffer securely (no makePublic)
    await file.save(pdfBuffer, {
      metadata: { contentType: "application/pdf" },
      resumable: false,
    });


    return res.status(200).json({
      message: "✅ Secure PDF generated and uploaded successfully.",
      storagePath: filePath,
    });
  } catch (error) {
    console.error("❌ PDF generation/upload failed:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// ======================================================
// 🔹 3. Order Email Sending Function (using Nodemailer)
// ======================================================

exports.sendOrderConfirmation = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    try {
      const { orderDetails } = req.body;

      if (!orderDetails) {
        return res.status(400).send({ error: "Missing order details" });
      }


      const transporter = nodemailer.createTransport({
        host: config.smtpOrder.host,
        port: config.smtpOrder.port,
        secure: config.smtpOrder.secure,
        auth: {
          user: config.smtpOrder.auth.user,
          pass: config.smtpOrder.auth.pass,
        },
      });

      // ✅ Build Elegant HTML Email
      let discountHtml = '';
      if (orderDetails.discountCode !== null) {
        discountHtml = `<tr>
          <td style="text-align: right; padding: 4px;"><strong>Discount (${orderDetails.discountCode}):</strong></td>
          <td style="text-align: right; padding: 4px;">₹ - ${orderDetails.discountValue.toFixed(2)}</td>
        </tr>`
      }
      let customerNotes = '';
      if (orderDetails.customerInfo.notes) {
        customerNotes = ` <p style="margin-top: 20px; color: #666; font-size: 15px; line-height: 1.6; text-align: justify">Special Instructions: ${orderDetails.customerInfo.notes}</p>`
      }

      const ordDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(orderDetails.orderDate || new Date()));

      const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f8f8; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-image: url('https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/extra_required_images%2Fbg-white.png?alt=media&token=9028df4e-284e-4da0-ab0f-eea38165efe7'); background-repeat: repeat; background-size: contain;  border-radius: 12px; overflow: hidden; box-shadow: 0 3px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="text-align: center; padding: 20px 20px;">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/logos%2Flogo2.png?alt=media&token=192d3c40-2147-4053-b692-30db63606a9a" 
              alt="Ujaas Aroma Logo" 
              style="width: 250px; height: auto; margin-bottom: 10px;"
            />
            <p style="color: #888;">Thank you for your order!</p>
          </div>

          <!-- Body -->
          <div style="padding: 0 25px 30px 25px;">
            <h2 style="color: #333; margin-bottom: 10px; text-align: center">Order Confirmation</h2>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px; text-align:justify">
              Hi <strong>${orderDetails.customerInfo.name}</strong>,<br>
              We're delighted to confirm your order placed on <strong>${orderDetails.orderDate}</strong>.<br>
              Our team is working very hard to process your order asap as currently we are running at the capacity. <br>
              Soon you will receive another email when your order will be on shipping.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr>
                  <th style="text-align: left; border-bottom: 2px solid #eee; padding: 8px;">Item</th>
                  <th style="text-align: right; border-bottom: 2px solid #eee; padding: 8px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${orderDetails.cartItems
          .map(
            (item) => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #f1f1f1;">${item.title} x ${item.quantity}</td>
                      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f1f1f1;">${item.price}</td>
                    </tr>
                  `
          )
          .join("")}
              </tbody>
            </table>

            
            <table style="width: 100%; margin-top: 15px; color: #333; border-collapse: collapse;">
            <tr>
              <td style="text-align: right; padding: 4px;"><strong>Subtotal:</strong></td>
              <td style="text-align: right; padding: 4px;">₹ ${orderDetails.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align: right; padding: 4px;"><strong>GST:</strong></td>
              <td style="text-align: right; padding: 4px;">₹ ${orderDetails.tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="text-align: right; padding: 4px;"><strong>Shipping:</strong></td>
              <td style="text-align: right; padding: 4px;">₹ ${orderDetails.shipping.shippingCost.toFixed(2)}</td>
            </tr>
            ${discountHtml}
            <tr>
              <td style="text-align: right; padding: 8px 4px; font-size: 18px; color: #000;"><strong>Total:</strong></td>
              <td style="text-align: right; padding: 8px 4px; font-size: 18px; color: #000;">₹ ${orderDetails.total.toFixed(2)}</td>
            </tr>
          </table>

            ${customerNotes}
            <p style="margin-top: 35px; color: #666; font-size: 14px; line-height: 1.6; text-align: justify">
              We hope your Ujaas Aroma experience inspires tranquility and elegance in every moment.  
              For personalized assistance or to share your thoughts, please connect with us by visiting <a href="https://ujaasaroma.com/contact" style="color: #d17b49; text-decoration: none;">www.ujaasaroma.com/contact</a>.
              or at support@ujaasaroma.com
            </p>

            <p style="margin-top: 15px; color: #666; font-size: 14px; line-height: 1.6; text-align: justify">
              This is the system generated email. Replies to this email are not monitored.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9f4ef; background-image: url('https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/extra_required_images%2Fbg-beige.png?alt=media&token=bce13ebc-283d-43b7-8bbd-171df2d73dbd'); background-repeat: repeat; background-size: contain; text-align: center; padding: 20px;">
            <p style="color: #777; font-size: 13px; margin: 0;">
              © ${new Date().getFullYear()} Ujaas Aroma · All rights reserved
            </p>
            <p style="color: #aaa; font-size: 12px; margin-top: 6px;">
              Crafted with love 💛 for natural living
            </p>
          </div>
        </div>
      </div>
      `;

      // ✅ Mail Options
      const mailOptions = {
        from: `"Ujaas Aroma" <${config.smtpOrder.auth.user}>`,
        to: orderDetails.customerInfo.email,
        subject: `Your Ujaas Aroma Order ${orderDetails.orderNumber} Confirmation`,
        html: htmlBody,
      };

      // ✅ Send Email 
      await transporter.sendMail(mailOptions);

      res.status(200).send({ success: true, message: "Email sent successfully!" });
    } catch (error) {
      console.error("Email send failed:", error);
      res.status(500).send({ success: false, message: error.message });
    }
  }
);


// ======================================================
// 🔹 4. Contact Form Email Sending Function (using Nodemailer)
// ======================================================


exports.sendContactFormConfirmation = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    try {
      const { formDetails } = req.body;

      if (!formDetails) {
        return res.status(400).send({ error: "Missing form details" });
      }

      const transporter = nodemailer.createTransport({
        host: config.smtpContactForm.host,
        port: config.smtpContactForm.port,
        secure: config.smtpContactForm.secure,
        auth: {
          user: config.smtpContactForm.auth.user,
          pass: config.smtpContactForm.auth.pass,
        },
      });

      // HTML admin email template
      const htmlAdminBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Contact Message - Ujaas Aroma</title>
  <style>
    body {
      background: #f7f9fa;
      margin: 0;
      font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 32px auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(30, 40, 90, 0.09);
    }
    .header {
      background: linear-gradient(120deg, #36d1c4 0%, #6ab7f8 100%);
      color: #fff;
      text-align: center;
      padding: 32px 24px 16px 24px;
    }
    .header img {
      max-width: 72px;
      margin-bottom: 12px;
    }
    .header h1 {
      font-weight: 600;
      font-size: 1.15em;
      margin-top: 0;
      letter-spacing: 2px;
    }
    .header p {
      font-size: 1.0em;
      margin-bottom: 8px;
      font-family: 'Fira Mono', monospace;
    }
    .details {
      padding: 24px;
    }
    .details-table {
      width: 100%;
      border: none;
    }
    .details-table td {
      padding: 8px 0;
      vertical-align: top;
      font-size: 1em;
    }
    .details-table .label {
      color: #8aa4af;
      width: 100px;
      font-weight: 600;
    }
    .message-block {
      background: #f1f7fb;
      border-radius: 7px;
      padding: 12px;
      margin-top: 10px;
      font-size: 1.04em;
      color: #346;
    }
    .footer {
      background: #f4f6fc;
      text-align: center;
      padding: 20px 24px 18px 24px;
      font-size: 0.93em;
      border-top: 1px solid #e7ecf2;
    }
    .footer img {
      max-width: 38px;
      margin-right: 9px;
      vertical-align: middle;
    }
    .footer .company {
      font-weight: 600;
      color: #176497;
    }
    .footer .tagline {
      color: #edae27;
      font-style: italic;
      margin: 0 0 4px 0;
    }
    .footer a, .footer .contact {
      color: #1c789a;
      text-decoration: none;
      margin: 0 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/logos%2Flogo2.png?alt=media&token=192d3c40-2147-4053-b692-30db63606a9a" alt="Ujaas Aroma Logo">
      <h1>Hi, Administrator</h1>
      <p>We have an incoming contact message for you.<br>
      See the details below.</p>
    </div>

    <div class="details">
      <table class="details-table">
        <tr>
          <td class="label">Name</td>
          <td>${formDetails.name}</td>
        </tr>
        <tr>
          <td class="label">Email</td>
          <td><a href="mailto:${formDetails.email}">${formDetails.email}</a></td>
        </tr>
        <tr>
          <td class="label">Phone</td>
          <td>${formDetails.phone}</td>
        </tr>
        <tr>
          <td class="label">Message</td>
          <td>
            <div class="message-block">${formDetails.message.replace(/\n/g, "<br>")}</div>
          </td>
        </tr>
        <tr>
          <td class="label">Received on</td>
          <td>${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <img src="https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/logos%2Flogo2.png?alt=media&token=192d3c40-2147-4053-b692-30db63606a9a" alt="Ujaas Aroma Logo">
      <span class="company">Ujaas Aroma</span>
      <div class="tagline">Crafted with love 💛 for natural living</div>
      <div>
        <span class="contact">Email: <a href="mailto:support@ujaasaroma.com">support@ujaasaroma.com</a></span> |
        <span class="contact">Website: <a href="https://www.ujaasaroma.com" target="_blank">www.ujaasaroma.com</a></span>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      // ✅ Mail Options
      const adminMail = {
        from: `"Ujaas Aroma App" <${config.smtpContactForm.auth.user}>`,
        to: "mobileapp_contact_form@ujaasaroma.com",
        subject: `📩 New Contact Message from ${formDetails.name}`,
        html: htmlAdminBody,
      };

      // Simple confirmation email to user (optional: you can further style this similarly)
      const htmlUserBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Contact Message - Ujaas Aroma</title>
  <style>
    body {
      background: #f7f9fa;
      margin: 0;
      font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 32px auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(30, 40, 90, 0.09);
    }
    .header {
      background: linear-gradient(120deg, #36d1c4 0%, #6ab7f8 100%);
      color: #fff;
      text-align: center;
      padding: 32px 24px 16px 24px;
    }
    .header img {
      max-width: 250px;
      margin-bottom: 12px;
    }
    .header h1 {
      font-weight: 600;
      font-size: 1.15em;
      margin-top: 0;
      letter-spacing: 2px;
    }
    .header p {
      font-size: 1.0em;
      margin-bottom: 8px;
      font-family: 'Fira Mono', monospace;
    }
    .details {
      padding: 24px;
    }
    .details-table {
      width: 100%;
      border: none;
    }
    .details-table td {
      padding: 8px 0;
      vertical-align: top;
      font-size: 1em;
    }
    .details-table .label {
      color: #8aa4af;
      width: 100px;
      font-weight: 600;
    }
    .message-block {
      background: #f1f7fb;
      border-radius: 7px;
      padding: 12px;
      font-size: 1.04em;
      color: #346;
    }
    .footer {
      background: #f4f6fc;
      text-align: center;
      padding: 20px 24px 18px 24px;
      font-size: 0.93em;
      border-top: 1px solid #e7ecf2;
    }
    .footer img {
      max-width: 150px;
      margin-right: 9px;
      vertical-align: middle;
    }
    .footer .company {
      font-weight: 600;
      color: #176497;
    }
    .footer .tagline {
      color: #edae27;
      font-style: italic;
      margin: 0 0 4px 0;
    }
    .footer a, .footer .contact {
      color: #1c789a;
      text-decoration: none;
      margin: 0 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/logos%2Flogo2.png?alt=media&token=192d3c40-2147-4053-b692-30db63606a9a" alt="Ujaas Aroma Logo">
      <h1>Hello, ${formDetails.name}</h1>
      <p>We have received your message. Our team will get back to you within 24-48 hours.<br>
      See below the details of your Query.</p>
    </div>

    <div class="details">
      <table class="details-table">
        <tr>
          <td class="label">Name</td>
          <td>${formDetails.name}</td>
        </tr>
        <tr>
          <td class="label">Email</td>
          <td><a href="mailto:${formDetails.email}">${formDetails.email}</a></td>
        </tr>
        <tr>
          <td class="label">Phone</td>
          <td>${formDetails.phone}</td>
        </tr>
        <tr>
          <td class="label">Message</td>
          <td>
            <div class="message-block">${formDetails.message.replace(/\n/g, "<br>")}</div>
          </td>
        </tr>
        <tr>
          <td class="label">Sent on</td>
          <td>${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <img src="https://firebasestorage.googleapis.com/v0/b/ujaas-aroma.firebasestorage.app/o/logos%2Flogo2.png?alt=media&token=192d3c40-2147-4053-b692-30db63606a9a" alt="Ujaas Aroma Logo">
      <div class="tagline">Crafted with love 💛 for natural living</div>
      <div>
        <span class="contact">Email: <a href="mailto:support@ujaasaroma.com">support@ujaasaroma.com</a></span> |
        <span class="contact">Website: <a href="https://www.ujaasaroma.com" target="_blank">www.ujaasaroma.com</a></span>
      </div>
    </div>
  </div>
</body>
</html>`;

      const userMail = {
        from: `"Ujaas Aroma App" <${config.smtpContactForm.auth.user}>`,
        to: formDetails.email,
        subject: `📩 New Contact Message from ${formDetails.name}`,
        html: htmlUserBody,
      };

      await transporter.sendMail(adminMail);
      console.log("✅ Admin email sent");

      await transporter.sendMail(userMail);
      console.log("✅ User confirmation email sent");

      res.status(200).send({ success: true, message: "Email sent successfully!" });
    } catch (error) {
      console.error("Email send failed:", error);
      res.status(500).send({ success: false, message: error.message });
    }
  });
