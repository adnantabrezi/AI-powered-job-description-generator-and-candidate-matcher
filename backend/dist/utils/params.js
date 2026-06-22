"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParam = void 0;
const getParam = (value) => {
    return Array.isArray(value) ? value[0] : value;
};
exports.getParam = getParam;
