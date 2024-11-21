import ejs from 'ejs';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current directory path
const currentFilePath = import.meta.url;
const currentDirectory = dirname(fileURLToPath(currentFilePath));

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "mrrupesh6309@gmail.com", 
    pass: "rgptjdyblecngawr"        
  },
});


const sendEmailVerificationLink = async (email, token, name) => {
  try {
    
    const renderedContent = await ejs.renderFile(`${currentDirectory}/../templates/confirm_email.ejs`, { token, name });

    // Mail options
    const mailOptions = {
      from: "mrrupesh6309@gmail.com",
      to: email,
      subject: "StoryTime - Email Confirmation",
      html: renderedContent, 
    };

    
    const verificationInfo = await transporter.sendMail(mailOptions);
    return verificationInfo; 
  } catch (error) {
   
    return new Error("Failed to send verification email.");
  }
};


const sendPasswordVerificationLink = async (email, token, name) => {
  try {
    
    const renderedContent = await ejs.renderFile(`${currentDirectory}/../templates/reset_password.ejs`, { token, name });

    // Mail options
    const mailOptions = {
      from: "mrrupesh6309@gmail.com",
      to: email,
      subject: "StoryTime - Password Confirmation",
      html: renderedContent, 
    };

    
    const verificationInfo = await transporter.sendMail(mailOptions);
    return verificationInfo; 
  } catch (error) {
   
    return new Error("Failed to send verification email.");
  }
};



export { sendEmailVerificationLink, sendPasswordVerificationLink};
