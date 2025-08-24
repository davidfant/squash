import { TextDecoder, TextEncoder } from "util";
import { MessageChannel } from "worker_threads";

// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
// @ts-ignore
global.MessageChannel = MessageChannel;
