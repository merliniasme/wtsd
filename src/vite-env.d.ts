/// <reference types="vite/client" />

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

interface Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          hint?: string;
          prompt?: string;
          callback: (response: {
            access_token?: string;
            expires_in?: number | string;
            error?: string;
            error_description?: string;
          }) => void;
          error_callback?: (error: unknown) => void;
        }) => {
          requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
        };
      };
    };
  };
}
