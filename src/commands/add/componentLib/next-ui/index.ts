import { nextUIGenerators } from "./generators.js";
import {
  addContextProviderToRootLayout,
  addToInstallList,
  addToNextUIComponentList,
} from "../../utils.js";
import {
  addPackageToConfig,
  createFile,
  readConfigFile,
  updateConfigFile,
} from "../../../../utils.js";

export const installNextUI = async () => {
  const { rootPath } = readConfigFile();
  const { generateTailwindConfig } = nextUIGenerators;

  // generate tailwind.config.ts
  await createFile("tailwind.config.ts", generateTailwindConfig(rootPath));

  addToInstallList({
    regular: ["@nextui-org/react", "framer-motion"],
    dev: [],
  });
  try {
    await addPackageToConfig("next-ui");
    await updateConfigFile({ componentLib: "next-ui" });
  } catch (error: any) {
    console.log(`Failed to initialize NextUI: ${error.message}`);
  }

  addToNextUIComponentList(["button", "avatar", "input", "dropdown", "navbar"]);

  await addContextProviderToRootLayout("NextUIProdiver");
};
