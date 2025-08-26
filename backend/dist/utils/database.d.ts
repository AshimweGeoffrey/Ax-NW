import { PrismaClient } from "@prisma/client";
declare let prisma: PrismaClient;
declare global {
    var __prisma: PrismaClient | undefined;
}
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export { prisma };
//# sourceMappingURL=database.d.ts.map