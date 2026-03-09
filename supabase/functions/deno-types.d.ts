// Provide type definitions for normal TypeScript language servers (e.g. VS Code without Deno extension)
// so that Deno-specific globals and JSR imports do not show as errors.

declare namespace Deno {
    export const env: {
        get(key: string): string | undefined;
        set(key: string, value: string): void;
    };
    export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {
    // empty definition to avoid import error
}

declare module "jsr:@supabase/supabase-js@2" {
    export const createClient: any;
}
