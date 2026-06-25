"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProvider = exports.AIProviderFactory = void 0;
const env_1 = require("../config/env");
const ollama_provider_1 = require("./ollama.provider");
const openai_provider_1 = require("./openai.provider");
const claude_provider_1 = require("./claude.provider");
// ── Factory ──
class AIProviderFactory {
    static getProvider() {
        switch (env_1.ENV.AI_PROVIDER) {
            case 'claude':
                return new claude_provider_1.ClaudeProvider();
            case 'openai':
                return new openai_provider_1.OpenAIProvider();
            case 'ollama':
                return new ollama_provider_1.OllamaProvider();
            default:
                throw new Error(`Unsupported AI provider: ${env_1.ENV.AI_PROVIDER}`);
        }
    }
}
exports.AIProviderFactory = AIProviderFactory;
exports.aiProvider = AIProviderFactory.getProvider();
