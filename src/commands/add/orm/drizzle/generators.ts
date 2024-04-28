import fs from "fs";
import path from "path";
import { createFile, readConfigFile, replaceFile } from "../../../../utils.js";
import {
  DBProvider,
  DBType,
  DotEnvItem,
  ORMType,
  PMType,
} from "../../../../types.js";
import {
  formatFilePath,
  getDbIndexPath,
  getFilePaths,
} from "../../../filePaths/index.js";
import stripJsonComments from "strip-json-comments";
import { addToInstallList } from "../../utils.js";
import { formatFileContentWithPrettier } from "../../../init/utils.js";
import { consola } from "consola";

const configDriverMappings = {
  postgresjs: "pg",
  "node-postgres": "pg",
  "vercel-pg": "pg",
  neon: "pg",
  supabase: "pg",
  aws: "pg",
  planetscale: "mysql2",
  "mysql-2": "mysql2",
  "better-sqlite3": "better-sqlite",
  turso: "turso",
};

export const createDrizzleConfig = async (
  libPath: string,
  provider: DBProvider
) => {
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  await createFile(
    "drizzle.config.ts",
    `import type { Config } from "drizzle-kit";
import { env } from "${formatFilePath(envMjs, {
      removeExtension: false,
      prefix: "alias",
    })}";

export default {
  schema: "./${libPath}/db/schema",
  out: "./${libPath}/db/migrations",
  driver: "${configDriverMappings[provider]}",
  dbCredentials: {
    ${
      provider === "turso"
        ? `url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN`
        : provider === "better-sqlite3"
          ? "url: env.DATABASE_URL"
          : provider === "mysql-2" || provider === "planetscale"
            ? "uri: env.DATABASE_URL"
            : "connectionString: env.DATABASE_URL"
    }${provider === "vercel-pg" ? '.concat("?sslmode=require")' : ""},
  }
} satisfies Config;`
  );
};

export const createIndexTs = async (dbProvider: DBProvider) => {
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();

  const dbIndex = getDbIndexPath("drizzle");

  const { imports, connectionLogic } =
    getDbImportAndConnectionLogic(dbProvider);

  const indexTS = `
  import { env } from "${formatFilePath(envMjs, {
    removeExtension: false,
    prefix: "alias",
  })}";
  ${imports}
  ${connectionLogic}
`;

  await createFile(
    formatFilePath(dbIndex, { prefix: "rootPath", removeExtension: false }),
    indexTS
  );
};

export const createMigrateTs = async (dbProvider: DBProvider) => {
  const {
    drizzle: { dbMigrate, migrationsDir },
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();

  const { imports, connectionLogic } = getDbImportAndConnectionLogic(
    dbProvider,
    true
  );

  const template = `import { env } from "${formatFilePath(envMjs, {
    removeExtension: false,
    prefix: "alias",
  })}";
  ${imports}

const runMigrate = async () => {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  ${connectionLogic}

  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: '${formatFilePath(migrationsDir, {
    removeExtension: false,
    prefix: "rootPath",
  })}' });

  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});`;

  await createFile(
    formatFilePath(dbMigrate, { prefix: "rootPath", removeExtension: false }),
    template
  );
};

const getDbImportAndConnectionLogic = (
  dbProvider: DBProvider,
  includeMigrator = false
) => {
  let imports = "";
  let connectionLogic = "";

  switch (dbProvider) {
    case "postgresjs":
      imports = `
import { drizzle } from "drizzle-orm/postgres-js";
${includeMigrator ? `import { migrate } from "drizzle-orm/postgres-js/migrator";` : ""}
import postgres from "postgres";
`;
      connectionLogic = `
const conn = postgres(env.DATABASE_URL, { max: 1 });

const db = drizzle(conn);
`;
      break;
    case "node-postgres":
      imports = `
import { drizzle } from "drizzle-orm/node-postgres";
${includeMigrator ? `import { migrate } from "drizzle-orm/node-postgres/migrator";` : ""}
import { Client } from "pg";
`;
      connectionLogic = `
const conn = new Client({
  connectionString: env.DATABASE_URL,
});

await conn.connect();
const db = drizzle(conn);
`;
      break;
    case "neon":
      imports = `
import { drizzle } from "drizzle-orm/neon-http";
${includeMigrator ? `import { migrate } from "drizzle-orm/neon-http/migrator";` : ""}
import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
`;
      connectionLogic = `
neonConfig.fetchConnectionCache = true;
 
const conn: NeonQueryFunction<boolean, boolean> = neon(env.DATABASE_URL);
const db = drizzle(conn);
`;
      break;
    case "vercel-pg":
      imports = `
import { drizzle } from "drizzle-orm/vercel-postgres";
${includeMigrator ? `import { migrate } from "drizzle-orm/vercel-postgres/migrator";` : ""}
import { conn } from '@vercel/postgres';
`;
      connectionLogic = `
  const db = drizzle(conn);
`;
      break;
    case "supabase":
      imports = `
import { drizzle } from "drizzle-orm/postgres-js";
${includeMigrator ? `import { migrate } from "drizzle-orm/postgres-js/migrator";` : ""}
import postgres from "postgres";
`;
      connectionLogic = `
  const conn = postgres(env.DATABASE_URL, { max: 1 });

  const db = drizzle(conn);
`;
      break;
    //     case "aws":
    //       imports = `
    // import { drizzle } from 'drizzle-orm/aws-data-api/pg';
    // ${includeMigrator ? `import { migrate } from "drizzle-orm/aws-data-api/pg/migrator";`: ""}
    // import { RDSDataClient } from '@aws-sdk/client-rds-data';
    // import { fromIni } from '@aws-sdk/credential-providers';
    // `;
    //       connectionLogic = `
    // const conn = new RDSDataClient({
    //   	credentials: fromIni({ profile: env['PROFILE'] }),
    // 		region: 'us-east-1',
    // });

    // const db = drizzle(conn, {
    //   database: env['DATABASE']!,
    //   secretArn: env['SECRET_ARN']!,
    //   resourceArn: env['RESOURCE_ARN']!,
    // });
    // `;
    //       break;
    case "planetscale":
      imports = `
import { drizzle } from "drizzle-orm/planetscale-serverless";
${includeMigrator ? `import { migrate } from "drizzle-orm/planetscale-serverless/migrator";` : ""}
import { connect } from "@planetscale/database";`;
      connectionLogic = `
const conn = connect({ url: env.DATABASE_URL });
 
const db = drizzle(conn);
`;
      break;
    case "mysql-2":
      imports = `
import { drizzle } from "drizzle-orm/mysql2";
${includeMigrator ? `import { migrate } from "drizzle-orm/mysql2/migrator";` : ""}
import mysql from "mysql2/promise";
`;
      connectionLogic = `
  const conn = await mysql.createConnection(env.DATABASE_URL);
  const db = drizzle(conn);
`;
      break;
    case "better-sqlite3":
      imports = `
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
${includeMigrator ? `import { migrate } from "drizzle-orm/better-sqlite3/migrator";` : ""}
import Database from 'better-sqlite3';`;
      connectionLogic = `
const conn = new Database('sqlite.db');
const db: BetterSQLite3Database = drizzle(conn);
`;
      break;
    case "turso":
      imports = `
import { createClient } from "@libsql/client";
import { drizzle } from 'drizzle-orm/libsql';
${includeMigrator ? `import { migrate } from "drizzle-orm/libsql/migrator";` : ""}`;
      connectionLogic = `
  const conn = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(conn);
`;
      break;
    // case "bun-sqlite":
    //   imports = `import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
    //  import { Database } from 'bun:sqlite'; `;

    //   connectionLogic = `
    //  const conn = new Database('sqlite.db');
    //  export const db: BunSQLiteDatabase = drizzle(conn);
    //  `;
    //   break;
    default:
      break;
  }
  return { imports, connectionLogic };
};

export const createInitSchema = async (libPath?: string, dbType?: DBType) => {
  const { packages, driver, rootPath } = readConfigFile();
  const {
    shared: {
      auth: { authSchema },
    },
  } = getFilePaths();
  const path = `${rootPath}lib/db/schema/computers.ts`;
  const dbDriver = dbType ?? driver;
  let initModel = "";
  switch (dbDriver) {
    case "pg":
      initModel = `import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";${
        packages.includes("next-auth")
          ? `\nimport { users } from "${formatFilePath(authSchema, {
              removeExtension: true,
              prefix: "alias",
            })}";`
          : ""
      }

export const computers = pgTable("computers", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  cores: integer("cores").notNull(),${
    packages.includes("next-auth")
      ? '\nuserId: integer("user_id").notNull().references(() => users.id)'
      : ""
  }
});`;
      break;

    case "mysql":
      initModel = `import { mysqlTable, serial, varchar, int } from "drizzle-orm/mysql-core";${
        packages.includes("next-auth")
          ? `\nimport { users } from "${formatFilePath(authSchema, {
              removeExtension: true,
              prefix: "alias",
            })}";`
          : ""
      }

export const computers = mysqlTable("computers", {
  id: serial("id").primaryKey(),
  brand: varchar("brand", {length: 256}).notNull(),
  cores: int("cores").notNull(),${
    packages.includes("next-auth")
      ? '\nuserId: integer("user_id").notNull().references(() => users.id)'
      : ""
  }
});`;
      break;
    case "sqlite":
      initModel = `import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";${
        packages.includes("next-auth")
          ? `\nimport { users } from "${formatFilePath(authSchema, {
              removeExtension: true,
              prefix: "alias",
            })}";`
          : ""
      }

export const computers = sqliteTable("computers", {
  id: integer("id").primaryKey(),
  brand: text("brand").notNull(),
  cores: integer("cores").notNull(),${
    packages.includes("next-auth")
      ? '\nuserId: integer("user_id").notNull().references(() => users.id)'
      : ""
  }
});`;
      break;
    default:
      break;
  }
  const sharedImports = `import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';`;
  const sharedSchemas = `// Schema for CRUD - used to validate API requests
export const insertComputerSchema = createInsertSchema(computers);
export const selectComputerSchema = createSelectSchema(computers);
export const computerIdSchema = selectComputerSchema.pick({ id: true });
export const updateComputerSchema = selectComputerSchema;

export type Computer = z.infer<typeof selectComputerSchema>;
export type NewComputer = z.infer<typeof insertComputerSchema>;
export type ComputerId = z.infer<typeof computerIdSchema>["id"];`;

  const finalDoc = `${sharedImports}\n${initModel}\n${sharedSchemas}`;
  await createFile(path, finalDoc);
};

export const addScriptsToPackageJson = async (
  libPath: string,
  driver: DBType,
  preferredPackageManager: PMType
) => {
  // Define the path to package.json
  const packageJsonPath = path.resolve("package.json");

  // Read package.json
  const packageJsonData = fs.readFileSync(packageJsonPath, "utf-8");

  // Parse package.json content
  const packageJson = JSON.parse(packageJsonData);

  const newItems = {
    "db:generate": `drizzle-kit generate:${driver}`,
    "db:migrate": `tsx ${libPath}/db/migrate.ts`,
    "db:drop": "drizzle-kit drop",
    "db:pull": `drizzle-kit introspect:${driver}`,
    "db:push": `drizzle-kit push:${driver}`,
    "db:studio": "drizzle-kit studio",
    "db:check": `drizzle-kit check:${driver}`,
  };
  packageJson.scripts = {
    ...packageJson.scripts,
    ...newItems,
  };

  // Stringify the updated content
  const updatedPackageJsonData = JSON.stringify(packageJson, null, 2);

  // Write the updated content back to package.json
  fs.writeFileSync(
    packageJsonPath,
    await formatFileContentWithPrettier(updatedPackageJsonData, packageJsonPath)
  );

  // consola.success("Scripts added to package.json");
};

export const installDependencies = async (
  dbType: DBProvider,
  preferredPackageManager: PMType
) => {
  const packages: {
    [key in DBProvider]: { regular: string[]; dev: string[] };
  } = {
    postgresjs: { regular: ["postgres"], dev: ["pg"] },
    "node-postgres": { regular: ["pg"], dev: ["@types/pg"] },
    neon: { regular: ["@neondatabase/serverless"], dev: ["pg"] },
    "vercel-pg": { regular: ["@vercel/postgres"], dev: ["pg"] },
    supabase: { regular: ["postgres"], dev: ["pg"] },
    aws: { regular: [""], dev: [""] }, // disabled
    planetscale: { regular: ["@planetscale/database"], dev: ["mysql2"] },
    "mysql-2": { regular: ["mysql2"], dev: [""] },
    "better-sqlite3": {
      regular: ["better-sqlite3"],
      dev: ["@types/better-sqlite3"],
    },
    turso: { regular: ["@libsql/client"], dev: [""] },
    // "bun-sqlite": { regular: "drizzle-orm", dev: "drizzle-kit" },
  };
  // note this change hasnt been tested yet
  const dbSpecificPackage = packages[dbType];
  if (dbSpecificPackage) {
    addToInstallList({
      regular: [
        "drizzle-orm",
        "drizzle-zod",
        "@t3-oss/env-nextjs",
        "zod",
        "nanoid",
        ...dbSpecificPackage.regular,
      ],
      dev: ["drizzle-kit", "tsx", "dotenv", ...dbSpecificPackage.dev],
    });
    // await installPackages(
    //   {
    //     regular: `drizzle-orm drizzle-zod @t3-oss/env-nextjs zod ${dbSpecificPackage.regular}`,
    //     dev: `drizzle-kit tsx dotenv ${dbSpecificPackage.dev}`,
    //   },
    //   preferredPackageManager
    // );
  }
};

export const createDotEnv = async (
  orm: ORMType,
  preferredPackageManager: PMType,
  databaseUrl?: string,
  usingPlanetscale: boolean = false,
  rootPathOld: string = ""
) => {
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  const dburl =
    databaseUrl ?? "postgresql://postgres:postgres@localhost:5432/{DB_NAME}";

  const envPath = path.resolve(".env");
  const envExists = fs.existsSync(envPath);
  if (!envExists)
    await createFile(
      ".env",
      `${
        orm === "drizzle" && usingPlanetscale
          ? `# When using the PlanetScale driver with Drizzle, your connection string must end with ?ssl={"rejectUnauthorized":true} instead of ?sslaccept=strict.\n`
          : ""
      }DATABASE_URL=${dburl}`,
      true
    );

  const envmjsfilePath = formatFilePath(envMjs, {
    prefix: "rootPath",
    removeExtension: false,
  });

  const envMjsExists = fs.existsSync(envmjsfilePath);

  if (!envMjsExists)
    await createFile(
      envmjsfilePath,
      generateEnvMjs(preferredPackageManager, orm),
      false
    );
};

export const addToDotEnv = async (
  items: DotEnvItem[],
  rootPathOld?: string,
  excludeDbUrlIfBlank = false
) => {
  const { orm, preferredPackageManager } = readConfigFile();
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();

  // handling dotenv
  const envPath = path.resolve(".env");
  const envExists = fs.existsSync(envPath);
  const newData = items.map((item) => `${item.key}=${item.value}`).join("\n");
  let content = newData;

  if (envExists) {
    const envData = fs.readFileSync(envPath, "utf-8");
    content = `${envData}\n${newData}`;
  }

  fs.writeFileSync(
    envPath,
    await formatFileContentWithPrettier(content, envPath, true)
  );

  // handling env.mjs
  const envmjsfilePath = formatFilePath(envMjs, {
    removeExtension: false,
    prefix: "rootPath",
  });
  const envMjsExists = fs.existsSync(envmjsfilePath);
  if (!envMjsExists && orm === null) {
    return;
  }
  if (!envMjsExists)
    await createFile(
      envmjsfilePath,
      generateEnvMjs(preferredPackageManager, orm, excludeDbUrlIfBlank)
    );

  let envmjsfileContents = fs.readFileSync(envmjsfilePath, "utf-8");

  const formatItemForDotEnvMjs = (item: DotEnvItem) =>
    `${item.key}: ${
      item.customZodImplementation ??
      `z.string().${item.isUrl ? "url()" : "min(1)"}`
    },`;

  const formatPublicItemForRuntimeEnv = (item: DotEnvItem) =>
    `${item.key}: process.env.${item.key},`;

  const serverItems = items
    .filter((item) => !item.public)
    .map(formatItemForDotEnvMjs)
    .join("\n    ");
  const clientItems = items
    .filter((item) => item.public)
    .map(formatItemForDotEnvMjs)
    .join("\n    ");
  const runtimeEnvItems = items
    .filter((item) => item.public)
    .map(formatPublicItemForRuntimeEnv)
    .join("\n    ");

  const regex = /\s*},\n\s*client:\s*{\n/;

  const endofClientIndex = envmjsfileContents.match(regex);
  const beforeClientBlockEnd = envmjsfileContents.lastIndexOf(
    "\n",
    endofClientIndex.index
  );
  const endOfClientBlock = envmjsfileContents.slice(0, beforeClientBlockEnd);
  const hasCommaBeforeClient = endOfClientBlock.endsWith(",");

  // Construct the replacement string for both server and client sections
  const replacementStr = `${hasCommaBeforeClient ? "" : ","}\n    ${serverItems}\n  },\n  client: {\n    ${clientItems}\n`;

  // Replace content using the known pattern
  envmjsfileContents = envmjsfileContents.replace(regex, replacementStr);

  const runtimeEnvRegex = /experimental__runtimeEnv: {\n/s;
  envmjsfileContents = envmjsfileContents.replace(
    runtimeEnvRegex,
    `experimental__runtimeEnv: {\n    ${runtimeEnvItems}\n`
  );

  // Write the updated contents back to the file
  fs.writeFileSync(
    envmjsfilePath,
    await formatFileContentWithPrettier(envmjsfileContents, envmjsfilePath)
  );
};

export async function updateTsConfigTarget() {
  // Define the path to the tsconfig.json file
  const tsConfigPath = path.join(process.cwd(), "tsconfig.json");

  // Read the file
  fs.readFile(tsConfigPath, "utf8", async (err, data) => {
    if (err) {
      console.error(
        `An error occurred while reading the tsconfig.json file: ${err}`
      );
      return;
    }

    // Parse the content as JSON
    const tsConfig = JSON.parse(stripJsonComments(data));

    // Modify the target property
    tsConfig.compilerOptions.target = "esnext";
    tsConfig.compilerOptions.baseUrl = "./";

    // Convert the modified object back to a JSON string
    const updatedContent = JSON.stringify(tsConfig, null, 2); // 2 spaces indentation

    // Write the updated content back to the file
    await replaceFile(tsConfigPath, updatedContent);
    // consola.success(
    //   "Updated tsconfig.json target to esnext to support Drizzle-Kit."
    // );
  });
}

export async function createQueriesAndMutationsFolders(
  libPath: string,
  driver: DBType
) {
  const dbIndex = getDbIndexPath("drizzle");
  // create computers queries
  const query = `import { db } from "${formatFilePath(dbIndex, {
    removeExtension: true,
    prefix: "alias",
  })}";
import { eq } from "drizzle-orm";
import { computerIdSchema, computers, ComputerId } from "${formatFilePath(
    "lib/db/schema/computers.ts",
    { removeExtension: true, prefix: "alias" }
  )}";

export const getComputers = async () => {
  const c = await db.select().from(computers);
  return { computers: c };
};

export const getComputerById = async (id: ComputerId) => {
  const { id: computerId } = computerIdSchema.parse({ id });
  const [c] = await db.select().from(computers).where(eq(computers.id, computerId));

  return { computer: c };
};`;

  const mutation = `import { db } from "${formatFilePath(dbIndex, {
    removeExtension: true,
    prefix: "alias",
  })}";
import { eq } from "drizzle-orm";
import { NewComputer, insertComputerSchema, computers, computerIdSchema, ComputerId } from "${formatFilePath(
    "lib/db/schema/computers.ts",
    { removeExtension: true, prefix: "alias" }
  )}";

export const createComputer = async (computer: NewComputer) => {
  const newComputer = insertComputerSchema.parse(computer);
  try {
    ${
      driver === "mysql" ? "" : "const [c] = "
    } await db.insert(computers).values(newComputer)${
      driver === "mysql"
        ? "\n    return { success: true }"
        : ".returning();\n    return { computer: c }"
    }
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};

export const updateComputer = async (id: ComputerId, computer: NewComputer) => {
  const { id: computerId } = computerIdSchema.parse({ id });
  const newComputer = insertComputerSchema.parse(computer);
  try {
    ${driver === "mysql" ? "" : "const [c] = "}await db
     .update(computers)
     .set(newComputer)
     .where(eq(computers.id, computerId!))${
       driver === "mysql"
         ? "\n    return { success: true };"
         : ".returning();\n    return { computer: c };"
     }
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again"
    console.error(message);
    throw { error: message };
  }
};

export const deleteComputer = async (id: ComputerId) => {
  const { id: computerId } = computerIdSchema.parse({ id });
  try {
    ${
      driver === "mysql" ? "" : "const [c] = "
    }await db.delete(computers).where(eq(computers.id, computerId!))${
      driver === "mysql"
        ? "\n    return { success: true };"
        : ".returning();\n    return { computer: c };"
    }
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again"
    console.error(message);
    throw { error: message };
  }
};`;
  await createFile(
    formatFilePath("lib/api/computers/queries.ts", {
      removeExtension: false,
      prefix: "rootPath",
    }),
    query
  );
  await createFile(
    formatFilePath("lib/api/computers/mutations.ts", {
      prefix: "rootPath",
      removeExtension: false,
    }),
    mutation
  );
}

const generateEnvMjs = (
  preferredPackageManager: PMType,
  ormType: ORMType,
  blank = false
) => {
  return `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";${
    preferredPackageManager !== "bun" && ormType === "drizzle"
      ? '\nimport "dotenv/config";'
      : ""
  }

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    ${blank ? "// " : ""}DATABASE_URL: z.string().min(1)
  },
  client: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: z.string().min(1)
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY
  // },
  // For Next.js >= 13.4.4, you only need to destructure client variables:
  experimental__runtimeEnv: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY
  },
});
`;
};
