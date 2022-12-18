// import {createTransport} from 'nodemailer';
// import { renderFile } from 'ejs'
// import path from 'path';
const { createTransport } = require('nodemailer');
const { renderFile } = require('ejs');
const path = require('path');

const sendEmail = (view, receiver, subject, content) => {

    const transport = createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        },
    });
    
    return new Promise((resolve, reject) => {
        console.log(process.cwd());
        renderFile(path.join(process.cwd(), `email-templates/${view}.ejs`), { receiver, ...content }, (err, data) => {
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
                headers: {}
            };

            transport.sendMail(mailOptions, (error, info) => {
                if (error) {
                    reject(error)
                    return console.log(error);
                }
                resolve(info)
                // console.log('Message sent: %s', info.messageId);
            });
        });
    })
}

module.exports = {
    sendEmail
}