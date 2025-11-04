export namespace SquashIframeBridgeCommand {
  export interface Base {
    source: "@squashai/iframe-bridge";
    id: string;
    command: string;
  }

  export namespace Parent {
    export interface CaptureScreenshot extends Base {
      command: "capture-screenshot";
    }

    export interface Token extends Base {
      command: "token";
      token: string;
    }

    export type Any = CaptureScreenshot | Token;
  }

  export namespace Iframe {
    export interface SubmitScreenshot extends Base {
      command: "submit-screenshot";
      mimeType: string;
      base64: string;
    }

    export interface Navigate extends Base {
      command: "navigate";
      path: string;
    }

    export type Any = SubmitScreenshot | Navigate;
  }

  export type Any = Parent.Any | Iframe.Any;
}
