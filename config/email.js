const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();

module.exports = {
    transporter: nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    })
};