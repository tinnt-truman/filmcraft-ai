export const LLM_MODEL = process.env.LLM_MODEL ?? "muse-spark-1.2-contributor-free";
export const LLM_MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS) ?? 131072;
export const LLM_TEMPERATURE = Number(process.env.LLM_TEMPERATURE) ?? 0.7;
export const LLM_USE_RESPONSES_API = process.env.LLM_USE_RESPONSES_API === "true";
export const LLM_FAST_MODEL = process.env.LLM_FAST_MODEL ?? "nemotron-3-ultra-free";
export const LLM_FAST_MAX_TOKENS = Number(process.env.LLM_FAST_MAX_TOKENS) ?? 128000;
export const LLM_FAST_TEMPERATURE = Number(process.env.LLM_FAST_TEMPERATURE) ?? 0.3;
export const LLM_CHAT_MODEL = process.env.LLM_CHAT_MODEL ?? "ling-3.0-flash-free";

export const PROJECT_DEFAULT_RATIO = process.env.PROJECT_DEFAULT_RATIO ?? "9:16";
export const PROJECT_DEFAULT_RESOLUTION = process.env.PROJECT_DEFAULT_RESOLUTION ?? "720p";
export const PROJECT_DEFAULT_VIDEO_MODEL = process.env.PROJECT_DEFAULT_VIDEO_MODEL ?? "seedance-2.5";
export const PROJECT_DEFAULT_SUBTITLE_MODE = process.env.PROJECT_DEFAULT_SUBTITLE_MODE ?? "auto";
export const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS) ?? 10;
export const SEGMENT_MAX_DURATION = Number(process.env.SEGMENT_MAX_DURATION) ?? 30;
export const SEGMENT_MIN_DURATION = Number(process.env.SEGMENT_MIN_DURATION) ?? 4;

export const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER ?? "opencode";
export const VIDEO_PROVIDER = process.env.VIDEO_PROVIDER ?? "seedance-2.5";
export const TTS_PROVIDER = process.env.TTS_PROVIDER ?? "elevenlabs";
