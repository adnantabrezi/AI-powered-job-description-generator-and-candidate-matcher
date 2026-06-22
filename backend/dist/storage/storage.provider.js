"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageProvider = exports.LocalStorageProvider = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class LocalStorageProvider {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    async save(file, subfolder) {
        const dir = path_1.default.join(this.baseDir, subfolder);
        await promises_1.default.mkdir(dir, { recursive: true });
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path_1.default.extname(file.originalname)}`;
        const relativePath = path_1.default.join(subfolder, filename);
        const absolutePath = path_1.default.join(this.baseDir, relativePath);
        await promises_1.default.rename(file.path, absolutePath);
        return relativePath.replace(/\\/g, '/');
    }
    async delete(filePath) {
        const absolutePath = this.getAbsolutePath(filePath);
        try {
            await promises_1.default.unlink(absolutePath);
        }
        catch {
            // File may already be removed
        }
    }
    getAbsolutePath(relativePath) {
        return path_1.default.join(this.baseDir, relativePath);
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
exports.storageProvider = new LocalStorageProvider(path_1.default.join(__dirname, '../../uploads'));
