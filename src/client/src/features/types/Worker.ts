export interface Worker {
    id: string;
    name?: string;
    specs: {
        platform: string;
        userAgent: string;
        language: string;
        hardwareConcurrency: number;
        deviceMemory: string | number;
    };
    performance: {
        benchmarkScore: number;
        latency: number;
    };
}