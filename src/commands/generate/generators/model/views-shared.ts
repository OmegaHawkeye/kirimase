import { existsSync, readFileSync } from "fs";
import { formatFilePath } from "../../../filePaths/index.js";
import { formatTableName } from "../../utils.js";
import { replaceFile } from "../../../../utils.js";

export const addLinkToNavbar = async (tableName: string) => {
  const { tableNameKebabCase, tableNameNormalEnglishCapitalised } =
    formatTableName(tableName);
  const navbarSidebarConfigPath = formatFilePath("config/nav.ts", {
    prefix: "rootPath",
    removeExtension: false,
  });
  const configExists = existsSync(navbarSidebarConfigPath);
  if (!configExists) return;

  const configContents = readFileSync(navbarSidebarConfigPath, "utf-8");
  const initContents: string =
    "export const additionalNavbarLinks: AdditionalLinks[] = [];";
  const replacedInitContents = `export const additionalNavbarLinks: AdditionalLinks[] = [
    {
      href: "/${tableNameKebabCase}",
      title: "${tableNameNormalEnglishCapitalised}",
    },
  ];
`;
  let newContent: string;
  if (configContents.indexOf(initContents) !== -1) {
    newContent = configContents.replace(initContents, replacedInitContents);
  } else {
    if (configContents.indexOf(tableNameKebabCase) !== -1) return;

    const searchQuery = `export const additionalNavbarLinks = [`;
    const replacement = `{ href: "/${tableNameKebabCase}", title: "${tableNameNormalEnglishCapitalised}",},`;
    newContent = configContents.replace(searchQuery, replacement);
  }

  await replaceFile(navbarSidebarConfigPath, newContent);
};
