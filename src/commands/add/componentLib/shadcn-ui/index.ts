import { consola } from "consola";
import { existsSync } from "fs";
import {
  addPackageToConfig,
  createFile,
  readConfigFile,
  replaceFile,
  updateConfigFile,
} from "../../../../utils.js";
import {
  addContextProviderToAppLayout,
  addContextProviderToRootLayout,
  addToInstallList,
  addToShadcnComponentList,
} from "../../utils.js";
import { shadcnGenerators } from "./generators.js";
import { generateLoadingPage } from "../../auth/lucia/generators.js";
import { formatFilePath, getFilePaths } from "../../../filePaths/index.js";
import { eta } from "../../../../eta.js";

const manualInstallShadCn = async (rootPath: string) => {
  const {
    generateComponentsJson,
    generateGlobalsCss,
    generateLibUtilsTs,
    generateTailwindConfig,
    generateThemeProvider,
    generateThemeToggler,
  } = shadcnGenerators;
  const { shared } = getFilePaths();
  const { alias } = readConfigFile();

  addToInstallList({
    regular: [
      "@tanstack/react-table",
      "tailwindcss-animate",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "lucide-react",
      "next-themes",
    ],
    dev: [],
  });

  // add tailwind.config.ts
  await createFile("tailwind.config.ts", generateTailwindConfig(rootPath));
  // update globals.css
  await replaceFile(
    formatFilePath(shared.init.globalCss, {
      prefix: "rootPath",
      removeExtension: false,
    }),
    generateGlobalsCss()
  );
  // add cn helper (lib/utils.ts)
  await createFile(rootPath.concat("lib/utils.ts"), generateLibUtilsTs());
  // create components.json
  await createFile("components.json", generateComponentsJson(rootPath));

  await createFile(rootPath.concat("app/loading.tsx"), generateLoadingPage());

  // todo: install theme switcher
  // create theme provider
  await createFile(
    rootPath.concat("components/ThemeProvider.tsx"),
    generateThemeProvider()
  );
  //generate theme toggler
  await createFile(
    rootPath.concat("components/ui/ThemeToggle.tsx"),
    generateThemeToggler()
  );

  // generate base Data Table
  createFile(
    rootPath.concat("components/ui/DataTable/index.tsx"),
    eta.render("DataTable/index.eta", {
      alias,
    })
  );
  createFile(
    rootPath.concat("components/ui/DataTable/pagination.tsx"),
    eta.render("DataTable/pagination.eta", {
      alias,
    })
  );

  // add context provider to layout
  await addContextProviderToRootLayout("ThemeProvider");
};

export const installShadcnUI = async () => {
  const { rootPath } = readConfigFile();
  const filePath = "components.json";

  if (existsSync(filePath)) {
    consola.info("Shadcn is already installed. Adding Shadcn UI to config...");
    await addPackageToConfig("shadcn-ui");

    await updateConfigFile({ componentLib: "shadcn-ui" });
  } else {
    try {
      await manualInstallShadCn(rootPath);

      await addPackageToConfig("shadcn-ui");

      await updateConfigFile({ componentLib: "shadcn-ui" });
    } catch (error: any) {
      consola.error(`Failed to initialize Shadcn: ${error.message}`);
    }
  }

  addToShadcnComponentList([
    "button",
    "sonner",
    "avatar",
    "input",
    "label",
    "dropdown-menu",
  ]);

  await addContextProviderToAppLayout("ShadcnToast");
};
