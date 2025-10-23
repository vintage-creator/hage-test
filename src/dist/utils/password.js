"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStrongPassword = void 0;
const isStrongPassword = (pwd) => {
    const lengthOk = pwd.length >= 8;
    const hasLetter = /[A-Za-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-\\[\]\\/~`+=;'']/g.test(pwd);
    return lengthOk && hasLetter && hasNumber && hasSpecial;
};
exports.isStrongPassword = isStrongPassword;
