"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProvider = exports.AIProviderFactory = void 0;
const env_1 = require("../config/env");
const lmstudio_provider_1 = require("./lmstudio.provider");
const openai_provider_1 = require("./openai.provider");
class AIProviderFactory {
    static getProvider() {
        switch (env_1.ENV.AI_PROVIDER) {
            case 'openai':
                return new openai_provider_1.OpenAIProvider();
            case 'lm-studio':
                return new lmstudio_provider_1.LMStudioProvider();
            default:
                throw new Error(`Unsupported AI provider: ${env_1.ENV.AI_PROVIDER}`);
        }
    }
}
exports.AIProviderFactory = AIProviderFactory;
exports.aiProvider = AIProviderFactory.getProvider();
