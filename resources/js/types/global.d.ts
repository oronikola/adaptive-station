declare function route(
    name?: string,
    params?: Record<string, unknown> | number | string,
    absolute?: boolean,
): string & {
    current(): string;
    current(name: string): boolean;
    current(name: string, params: Record<string, unknown>): boolean;
};

declare namespace route {
    function current(): string;
    function current(name: string): boolean;
    function current(name: string, params: Record<string, unknown>): boolean;
}

interface ImportMetaEnv {
    readonly VITE_APP_NAME: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
    glob(pattern: string): Record<string, () => Promise<{ default: React.ComponentType }>>;
}

declare module '*.css' {
    const content: Record<string, string>;
    export default content;
}

declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}
