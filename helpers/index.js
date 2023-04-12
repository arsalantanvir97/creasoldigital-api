// import {createTransport} from 'nodemailer';
// import { renderFile } from 'ejs'
// import path from 'path';
const { createTransport } = require("nodemailer");
const { renderFile } = require("ejs");
const path = require("path");
const notification = require("../model/notification");
const user = require("../model/user");

const sendEmail = (view, receiver, subject, content) => {
  const transport = createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return new Promise((resolve, reject) => {
    console.log(process.cwd());
    renderFile(
      path.join(process.cwd(), `email-templates/${view}.ejs`),
      { receiver, ...content },
      (err, data) => {
        // renderFile("/app/pages/api/email-templates/confirmation-email.ejs", { receiver, content }, (err, data) => {
        if (err) {
          reject(err);
          console.log(err);
          return;
        }

        var mailOptions = {
          from: `"JOBSatPR" ${process.env.EMAIL_FROM}`,
          to: receiver,
          subject: subject,
          html: data,
          headers: {},
        };

        transport.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
            return console.log(error);
          }
          resolve(info);
          // console.log('Message sent: %s', info.messageId);
        });
      }
    );
  });
};
const sendEmail2 = (email, subject, html) => {
  const transport = createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return new Promise((resolve, reject) => {
    console.log(process.cwd());
    

        var mailOptions = {
          from: `"JOBSatPR" ${process.env.EMAIL_FROM}`,
          to: email,
          subject: subject,
          html: html,
          headers: {},
        };

        transport.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
            return console.log(error);
          }
          resolve(info);
          // console.log('Message sent: %s', info.messageId);
     
      }
    );
  });
};
// nftext => Notification Text
const nftext = {
  Purchase: "has purchased a package.",
  Approved: "has approved the post.",
  Rejected: "has rejected the post.",
  SignUp: "New user signed up.",
  Feedback: "Feedback received from.",
  Form: "has not filled the form. Please remind them through email.",
  Comment: "commented on a post.",
  Created: "Admin has created a post.Please review",

  PostUpdate: "Admin has updated a post.Please review",
};

const NotificationType = {
  Purchase: "Purchase",
  Approved: "Approved",
  Rejected: "Rejected",
  Form: "Form",
  SignUp: "SignUp",
  Created: "Created",

  Feedback: "Feedback",

  Comment: "Comment",
  PostUpdate: "PostUpdate",
};

const createNotification = async (NotificationObject) => {
  try {
    const notification_text = nftext[NotificationObject.notification_type];
    NotificationObject.notification_text = notification_text;
    const CreatedNotification = await notification.create(NotificationObject);
    return CreatedNotification;
  } catch (error) {
    return error;
  }
};

const GetUser = async (id) => {
  try {
    const UserToReturn = await user.findById(id).select("-password");
    return UserToReturn;
  } catch (error) {
    return error;
  }
};

module.exports = {
  sendEmail,
  createNotification,
  NotificationType,
  GetUser,
  sendEmail2
};
